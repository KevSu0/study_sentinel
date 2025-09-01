import { format } from 'date-fns';
import { db } from './db';
import { rotateRetention } from './backup-retention';
import { aesGcmEncrypt, aesGcmDecrypt, type EncMeta, aesGcmEncryptWithRawKey, aesGcmDecryptWithRawKey } from './backup-crypto';
import { ensureKeyfile, keyfileRawBytes, KEYFILE_NAME, readKeyfile } from './backup-keyfile';

type BackupHeader = {
  format: 'study-sentinel';
  schemaVersion: 1;
  appVersion?: string;
  backupId: string;
  createdAt: string;
  timezone: string;
  counts: Record<string, number>;
  hashSha256: string;
};

type BackupPayload = {
  plans: any[];
  users: any[];
  sessions: any[];
  stats_daily: any[];
  routines: any[];
  logs: any[];
  badges: any[];
  meta: any[];
  userPreferences: any[];
  // Optional/advanced tables
  syncConflicts?: any[];
  cachedAIResponses?: any[];
  outbox?: any[];
};

type BackupBundle = { header: BackupHeader; payload: BackupPayload };

async function collectAllDataTxn(): Promise<BackupPayload & { _counts: Record<string, number> }> {
  return await db.transaction('r', db.tables, async () => {
    const payload: BackupPayload = {
      plans: await db.plans.toArray(),
      users: await db.users.toArray(),
      sessions: await db.sessions.toArray(),
      stats_daily: await db.stats_daily.toArray(),
      routines: await db.routines.toArray(),
      logs: await db.logs.toArray(),
      badges: await db.badges.toArray(),
      meta: await db.meta.toArray(),
      userPreferences: await db.userPreferences.toArray(),
      // optional
      syncConflicts: (db as any).syncConflicts ? await (db as any).syncConflicts.toArray() : undefined,
      cachedAIResponses: (db as any).cachedAIResponses ? await (db as any).cachedAIResponses.toArray() : undefined,
      outbox: (db as any).outbox ? await (db as any).outbox.toArray() : undefined,
    };
    const counts: Record<string, number> = {};
    Object.entries(payload).forEach(([k, v]) => { if (Array.isArray(v)) counts[k] = v.length; });
    return Object.assign(payload, { _counts: counts });
  });
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function gzipEncode(bytes: Uint8Array): Promise<Uint8Array> {
  if ('CompressionStream' in self) {
    const cs = new CompressionStream('gzip');
    const stream = new Blob([bytes]).stream().pipeThrough(cs);
    const gzBlob = await new Response(stream).blob();
    return new Uint8Array(await gzBlob.arrayBuffer());
  }
  // Fallback: return raw if CompressionStream not available
  return bytes;
}

export async function createBackupBundle(): Promise<BackupBundle> {
  const { _counts, ...payload } = await collectAllDataTxn();
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(JSON.stringify(payload));
  const hash = await sha256Hex(payloadBytes);
  const header: BackupHeader = {
    format: 'study-sentinel',
    schemaVersion: 1,
    appVersion: (globalThis as any).__APP_VERSION__ || undefined,
    backupId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    counts: _counts,
    hashSha256: hash,
  };
  return { header, payload };
}

export async function createBackupBlob(): Promise<Blob> {
  const bundle = await createBackupBundle();
  const bytes = new TextEncoder().encode(JSON.stringify(bundle));
  const gz = await gzipEncode(bytes);
  return new Blob([gz], { type: 'application/gzip' });
}

function makeFileName(dateStr: string, backupId: string) {
  return `study_sentinel_backup_${dateStr}_${backupId}.json.gz`;
}

function isoDateUTC(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

type EncryptOpts =
  | { mode: 'password'; password: string }
  | { mode: 'keyfile'; userDir: FileSystemDirectoryHandle };

export async function writeBackup(opts?: { encrypt?: EncryptOpts }) {
  const { header, payload } = await createBackupBundle();
  const bundleJson = JSON.stringify({ header, payload });
  const gzBytes = await gzipEncode(new TextEncoder().encode(bundleJson));

  const encrypted = !!opts?.encrypt;
  let outBytes = gzBytes;
  let prelude: string | null = null;

  if (encrypted && opts!.encrypt!.mode === 'password') {
    const { ct, meta } = await aesGcmEncrypt(gzBytes, (opts!.encrypt as any).password);
    outBytes = ct;
    prelude = JSON.stringify({ header, enc: { ...meta, mode: 'password' as const } }) + '\n';
  } else if (encrypted && opts!.encrypt!.mode === 'keyfile') {
    const userDir = (opts!.encrypt as any).userDir as FileSystemDirectoryHandle;
    const keyDoc = await ensureKeyfile(userDir);
    const raw = keyfileRawBytes(keyDoc);
    const { ct, iv } = await aesGcmEncryptWithRawKey(gzBytes, raw);
    outBytes = ct;
    prelude = JSON.stringify({ header, enc: { mode: 'keyfile' as const, alg: 'AES-GCM', kid: keyDoc.kid, ivB64: btoa(String.fromCharCode(...iv)) } }) + '\n';
  }

  const root = await (navigator.storage as any).getDirectory();
  const dir = await root.getDirectoryHandle('backups', { create: true });
  const fname = `study_sentinel_backup_${isoDateUTC()}_${header.backupId}.${encrypted ? 'json.gz.enc' : 'json.gz'}`;

  // OPFS write
  const fh = await dir.getFileHandle(fname, { create: true });
  const ws = await fh.createWritable();
  if (prelude) await ws.write(new TextEncoder().encode(prelude));
  await ws.write(outBytes);
  await ws.close();

  // user folder write if present
  const userDir = await getUserBackupDirHandleOrNull();
  if (userDir) {
    try {
      const uf = await userDir.getFileHandle(fname, { create: true });
      const uw = await uf.createWritable();
      if (prelude) await uw.write(new TextEncoder().encode(prelude));
      await uw.write(outBytes);
      await uw.close();
    } catch {}
  }

  try { await rotateRetention(dir, userDir); } catch {}
  return { filename: fname, counts: header.counts, hash: header.hashSha256 };
}

// Origin Private File System backup (no user prompt). Note: clearing site data removes OPFS.
export async function saveBackupToOPFS(customName?: string) {
  if (!('storage' in navigator) || !(navigator as any).storage?.getDirectory) {
    // Not supported (Firefox/Safari). Silently skip.
    return { ok: false, reason: 'OPFS not supported' } as const;
  }
  const bundle = await createBackupBundle();
  const blob = await createBackupBlob();
  const name = customName || makeFileName(format(new Date(), 'yyyy-MM-dd'), bundle.header.backupId);
  const root: FileSystemDirectoryHandle = await (navigator as any).storage.getDirectory();
  const dir = await root.getDirectoryHandle('backups', { create: true });
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
  return { ok: true } as const;
}

// User-chosen folder backups survive browser data clearing.
export async function chooseBackupDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!(window as any).showDirectoryPicker) return null;
  try {
    const dir: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    await db.meta.put({ key: 'backupDirHandle', value: dir });
    return dir;
  } catch {
    return null;
  }
}

async function getSavedBackupDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const record = await db.meta.get('backupDirHandle');
    return (record?.value as FileSystemDirectoryHandle) || null;
  } catch {
    return null;
  }
}

export async function getUserBackupDirHandleOrNull() {
  return getSavedBackupDirectory();
}

export async function saveBackupToDirectory(dir?: FileSystemDirectoryHandle | null, customName?: string) {
  const handle = dir || (await getSavedBackupDirectory());
  if (!handle) return { ok: false, reason: 'No directory handle' } as const;
  try {
    const bundle = await createBackupBundle();
    const blob = await createBackupBlob();
    const name = customName || makeFileName(format(new Date(), 'yyyy-MM-dd'), bundle.header.backupId);
    const fh = await handle.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(blob);
    await w.close();
    return { ok: true } as const;
  } catch (e) {
    return { ok: false, reason: 'write-failed' } as const;
  }
}

export async function maybeRunDailyBackup() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const runBackup = async () => {
    try {
      const last = await db.meta.get('lastBackupDate');
      if (last?.value === today) return false;
    } catch {}

    await saveBackupToOPFS();
    const dir = await getSavedBackupDirectory();
    if (dir) {
      await saveBackupToDirectory(dir).catch(() => {});
    }
    // Retention rotation (best-effort)
    try {
      const root = await (navigator.storage as any).getDirectory();
      const backups = await root.getDirectoryHandle('backups', { create: true });
      await rotateRetention(backups, dir);
    } catch {}
    await db.meta.put({ key: 'lastBackupDate', value: today });
    return true;
  };

  if ('locks' in navigator && (navigator as any).locks?.request) {
    return (navigator as any).locks.request('daily-backup', { mode: 'exclusive' }, async () => {
      return await runBackup();
    });
  }
  return await runBackup();
}

export async function requestPersistentStorage() {
  if (!('storage' in navigator) || !(navigator as any).storage?.persist) return false;
  try {
    return await (navigator as any).storage.persist();
  } catch {
    return false;
  }
}

export async function exportBackupDownload() {
  const blob = await createBackupBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const bundle = await createBackupBundle();
  a.href = url;
  a.download = makeFileName(format(new Date(), 'yyyy-MM-dd'), bundle.header.backupId);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function rotateBackupsNow() {
  try {
    const root = await (navigator.storage as any).getDirectory();
    const backups = await root.getDirectoryHandle('backups', { create: true });
    const dir = await getSavedBackupDirectory();
    await rotateRetention(backups, dir);
  } catch (e) {
    console.warn('rotateBackupsNow failed', e);
  }
}
// ---------- Import / Preview / Merge helpers ----------
const PK: Record<string, string> = {
  plans: 'id',
  users: 'id',
  sessions: 'id',
  stats_daily: 'id',
  routines: 'id',
  logs: 'id',
  badges: 'id',
  meta: 'key',
  userPreferences: 'key',
  syncConflicts: 'id',
  cachedAIResponses: 'id',
  outbox: 'id',
};

async function gunzipDecode(bytes: Uint8Array): Promise<Uint8Array> {
  if ('DecompressionStream' in self) {
    // @ts-ignore
    const ds = new DecompressionStream('gzip');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const blob = await new Response(stream).blob();
    return new Uint8Array(await blob.arrayBuffer());
  }
  return bytes;
}

type ParseOpts = { password?: string; keyfileRaw?: Uint8Array; userDir?: FileSystemDirectoryHandle };
export async function parseBackupFile(file: File, opts: ParseOpts | string | undefined): Promise<BackupBundle> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const options: ParseOpts = typeof opts === 'string' ? { password: opts } : (opts || {} as ParseOpts);
  // Detect envelope prelude for encrypted backups
  const head = new TextDecoder().decode(raw.slice(0, Math.min(raw.length, 4096)));
  const nl = head.indexOf('\n');
  const firstLine = nl >= 0 ? head.slice(0, nl) : '';
  const isEnc = firstLine.includes('"enc"') && firstLine.includes('"header"');
  let gzBytes = raw;
  if (isEnc) {
    const env: any = JSON.parse(firstLine);
    const ct = raw.slice(firstLine.length + 1);
    if (env.enc?.mode === 'password') {
      if (!options.password) throw new Error('Encrypted backup (password). Provide password.');
      const plain = await aesGcmDecrypt(ct, env.enc as EncMeta, options.password);
      gzBytes = plain;
    } else if (env.enc?.mode === 'keyfile') {
      let rawKey = options.keyfileRaw;
      if (!rawKey && options.userDir) {
        const kdoc = await readKeyfile(options.userDir);
        if (!kdoc) throw new Error(`Keyfile ${KEYFILE_NAME} not found in chosen folder.`);
        rawKey = keyfileRawBytes(kdoc);
      }
      if (!rawKey) throw new Error('Encrypted backup (keyfile). Provide keyfile bytes or choose backup folder.');
      const iv = new Uint8Array(atob(env.enc.ivB64).split('').map((c: string) => c.charCodeAt(0)));
      const plain = await aesGcmDecryptWithRawKey(ct, iv, rawKey);
      gzBytes = plain;
    } else {
      throw new Error('Unknown encryption mode.');
    }
  }
  const ungz = await gunzipDecode(gzBytes);
  const text = new TextDecoder().decode(ungz);
  const bundle = JSON.parse(text) as BackupBundle | any;
  if (!bundle?.header || !bundle?.payload) throw new Error('Invalid backup file');
  const payloadBytes = new TextEncoder().encode(JSON.stringify(bundle.payload));
  const hash = await sha256Hex(payloadBytes);
  if (hash !== bundle.header.hashSha256) throw new Error('Corrupt backup: hash mismatch');
  if (bundle.header.schemaVersion !== 1) throw new Error('Unsupported schema');
  return bundle as BackupBundle;
}

export async function getLocalTableCounts(): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  await db.transaction('r', db.tables, async () => {
    for (const t of db.tables) {
      try { result[(t as any).name] = await (t as any).count(); } catch {}
    }
  });
  return result;
}

export type PreviewReport = { header: BackupHeader; incomingCounts: Record<string, number> };
export async function validateBackupFile(file: File, password?: string, keyfileRaw?: Uint8Array, userDir?: FileSystemDirectoryHandle): Promise<PreviewReport> {
  const { header, payload } = await parseBackupFile(file, { password, keyfileRaw, userDir });
  const incomingCounts: Record<string, number> = {};
  for (const [t, rows] of Object.entries(payload)) {
    if (Array.isArray(rows)) incomingCounts[t] = rows.length;
  }
  return { header, incomingCounts };
}

export type MergeImpact = { table: string; adds: number; updates: number; unchanged: number; conflicts: number };
export async function estimateMergeImpact(file: File, password?: string, keyfileRaw?: Uint8Array, userDir?: FileSystemDirectoryHandle): Promise<MergeImpact[]> {
  const { payload } = await parseBackupFile(file, { password, keyfileRaw, userDir });
  const impacts: MergeImpact[] = [];
  await db.transaction('r', db.tables, async () => {
    for (const [tableName, rows] of Object.entries(payload)) {
      const table = (db as any)[tableName];
      if (!Array.isArray(rows) || !table) continue;
      const pk = PK[tableName] ?? 'id';
      const ids = rows.map((r: any) => r?.[pk]).filter(Boolean);
      const existing = await table.bulkGet(ids);
      let adds = 0, updates = 0, unchanged = 0, conflicts = 0;
      for (let i = 0; i < rows.length; i++) {
        const inc: any = rows[i];
        const cur: any = existing[i];
        if (!cur) { adds++; continue; }
        const iu = inc?.updatedAt ? Date.parse(inc.updatedAt) : NaN;
        const cu = cur?.updatedAt ? Date.parse(cur.updatedAt) : NaN;
        if (Number.isNaN(iu) || Number.isNaN(cu)) { unchanged++; }
        else if (iu > cu) { updates++; }
        else if (iu < cu) { unchanged++; }
        else { conflicts++; }
      }
      impacts.push({ table: tableName, adds, updates, unchanged, conflicts });
    }
  });
  return impacts;
}

export async function sampleMergeDiff(file: File, maxPerBucket = 10, password?: string, keyfileRaw?: Uint8Array, userDir?: FileSystemDirectoryHandle) {
  const { payload } = await parseBackupFile(file, { password, keyfileRaw, userDir });
  const out: Record<string, { adds: string[]; updates: string[]; conflicts: string[] }> = {};
  await db.transaction('r', db.tables, async () => {
    for (const [tableName, rows] of Object.entries(payload)) {
      const table = (db as any)[tableName];
      if (!Array.isArray(rows) || !table) continue;
      const pk = PK[tableName] ?? 'id';
      const keys = rows.map((r: any) => r?.[pk]).filter(Boolean);
      const existing = await table.bulkGet(keys);
      const adds: string[] = [], updates: string[] = [], conflicts: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        if (adds.length >= maxPerBucket && updates.length >= maxPerBucket && conflicts.length >= maxPerBucket) break;
        const inc: any = rows[i];
        const cur: any = existing[i];
        const id = String(inc?.[pk]);
        if (!cur) { if (adds.length < maxPerBucket) adds.push(id); continue; }
        const iu = inc?.updatedAt ? Date.parse(inc.updatedAt) : NaN;
        const cu = cur?.updatedAt ? Date.parse(cur.updatedAt) : NaN;
        if (!Number.isNaN(iu) && !Number.isNaN(cu)) {
          if (iu > cu && updates.length < maxPerBucket) updates.push(id);
          else if (iu === cu && conflicts.length < maxPerBucket) conflicts.push(id);
        }
      }
      out[tableName] = { adds, updates, conflicts };
    }
  });
  return out;
}

type ImportMode = 'replace' | 'merge';
export async function importBackupFromFile(file: File, opts: { mode?: ImportMode; _validateOnly?: boolean; password?: string; keyfileRaw?: Uint8Array; userDir?: FileSystemDirectoryHandle } = {}) {
  const mode: ImportMode = opts.mode ?? 'replace';
  const bundle = await parseBackupFile(file, { password: opts.password, keyfileRaw: opts.keyfileRaw, userDir: opts.userDir });
  if (opts._validateOnly) return { ok: true, header: bundle.header } as const;

  if (mode === 'replace') {
    await db.transaction('rw', db.tables, async () => { for (const t of db.tables) await (t as any).clear(); });
  }

  await db.transaction('rw', db.tables, async () => {
    for (const [tableName, rows] of Object.entries(bundle.payload)) {
      const table = (db as any)[tableName];
      if (!Array.isArray(rows) || !table) continue;
      if (mode === 'replace') {
        if (rows.length) await table.bulkPut(rows);
      } else {
        const pk = PK[tableName] ?? 'id';
        const ids = rows.map((r: any) => r?.[pk]).filter(Boolean);
        const existing = await table.bulkGet(ids);
        const toPut: any[] = [];
        for (let i = 0; i < rows.length; i++) {
          const inc: any = rows[i];
          const cur: any = existing[i];
          if (!cur) { toPut.push(inc); continue; }
          const iu = inc?.updatedAt ? Date.parse(inc.updatedAt) : NaN;
          const cu = cur?.updatedAt ? Date.parse(cur.updatedAt) : NaN;
          if (!Number.isNaN(iu) && !Number.isNaN(cu) && iu > cu) {
            toPut.push({ ...cur, ...inc });
          }
        }
        if (toPut.length) await table.bulkPut(toPut);
      }
    }
  });

  return { ok: true, header: bundle.header } as const;
}

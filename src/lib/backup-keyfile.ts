export const KEYFILE_NAME = 'study_sentinel.key';

export type KeyfileDoc = {
  format: 'study-sentinel-key@1';
  kid: string; // key id
  alg: 'A256GCM';
  keyB64: string; // raw 32-byte AES key (base64)
  createdAt: string; // ISO UTC
};

function b64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}
function b64dec(s: string) {
  return new Uint8Array(atob(s).split('').map(c => c.charCodeAt(0)));
}

export async function readKeyfile(userDir: FileSystemDirectoryHandle): Promise<KeyfileDoc | null> {
  try {
    const fh = await userDir.getFileHandle(KEYFILE_NAME, { create: false });
    const file = await fh.getFile();
    return JSON.parse(await file.text()) as KeyfileDoc;
  } catch {
    return null;
  }
}

export async function ensureKeyfile(
  userDir: FileSystemDirectoryHandle,
  { regenerate = false }: { regenerate?: boolean } = {}
): Promise<KeyfileDoc> {
  if (!regenerate) {
    const existing = await readKeyfile(userDir);
    if (existing) return existing;
  }
  const key = crypto.getRandomValues(new Uint8Array(32));
  const kid = crypto.randomUUID();
  const doc: KeyfileDoc = {
    format: 'study-sentinel-key@1',
    kid,
    alg: 'A256GCM',
    keyB64: b64(key),
    createdAt: new Date().toISOString(),
  };
  const fh = await userDir.getFileHandle(KEYFILE_NAME, { create: true });
  const w = await fh.createWritable();
  await w.write(new TextEncoder().encode(JSON.stringify(doc, null, 2)));
  await w.close();
  return doc;
}

export function keyfileRawBytes(doc: KeyfileDoc): Uint8Array {
  return b64dec(doc.keyB64);
}


// Keeps last 30 daily, 12 weekly, 24 monthly backups.
// Filenames expected like: study_sentinel_backup_YYYY-MM-DD_<id>.json.gz

export async function rotateRetention(
  opfsDir: FileSystemDirectoryHandle,
  userDir?: FileSystemDirectoryHandle | null
) {
  await rotateInDir(opfsDir);
  if (userDir) {
    try { await rotateInDir(userDir); } catch {}
  }
}

async function rotateInDir(dir: FileSystemDirectoryHandle) {
  const entries: { name: string; date: Date }[] = [];
  const RX = /^study_sentinel_backup_(\d{4}-\d{2}-\d{2})_[\w-]+\.(json\.gz|json\.gz\.enc)$/;
  // @ts-ignore
  for await (const [name, handle] of (dir as any).entries()) {
    // @ts-ignore
    if ((handle as any).kind !== 'file') continue;
    const m = name.match(RX);
    const iso = m?.[1];
    if (!iso) continue;
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) entries.push({ name, date });
  }

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  const keep = new Set<string>();
  const byDay = new Map<string, string>();
  const byWeek = new Map<string, string>();
  const byMonth = new Map<string, string>();

  const kDay = (d: Date) => d.toISOString().slice(0, 10);
  const kWeek = (d: Date) => {
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dow = (t.getUTCDay() + 6) % 7; // Mon=0
    t.setUTCDate(t.getUTCDate() - dow);
    const jan1 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const week = Math.floor((+t - +jan1) / (7 * 24 * 3600 * 1000)) + 1;
    return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  };
  const kMonth = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

  for (const e of entries) {
    const kd = kDay(e.date), kw = kWeek(e.date), km = kMonth(e.date);
    if (!byDay.has(kd)) byDay.set(kd, e.name);
    if (!byWeek.has(kw)) byWeek.set(kw, e.name);
    if (!byMonth.has(km)) byMonth.set(km, e.name);
  }

  const daily = [...byDay.values()].slice(0, 30);
  const weekly = [...byWeek.values()].slice(0, 12);
  const monthly = [...byMonth.values()].slice(0, 24);
  [...daily, ...weekly, ...monthly].forEach(n => keep.add(n));

  // @ts-ignore
  for await (const [name, handle] of (dir as any).entries()) {
    // @ts-ignore
    if ((handle as any).kind === 'file' && name.startsWith('study_sentinel_backup_') && !keep.has(name)) {
      await dir.removeEntry(name);
    }
  }
}

const KEY = 'routineSubjectMap_v1';

type SubjectMap = Record<string, string>;

function safeParse(json: string | null): SubjectMap {
  if (!json) return {};
  try { return JSON.parse(json) as SubjectMap; } catch { return {}; }
}

function getStore(): SubjectMap {
  if (typeof window === 'undefined') return {};
  return safeParse(window.localStorage.getItem(KEY));
}

function setStore(map: SubjectMap) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}

export function setRoutineSubject(routineId: string, dateStr: string, subject: string) {
  const key = `${routineId}|${dateStr}`;
  const map = getStore();
  if (subject) map[key] = subject; else delete map[key];
  setStore(map);
}

export function getRoutineSubject(routineId: string, dateStr: string): string | undefined {
  const map = getStore();
  return map[`${routineId}|${dateStr}`];
}


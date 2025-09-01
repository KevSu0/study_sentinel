"use client";

// Minimal, test-friendly localStorage helpers used by the new modular state

export function loadJSON<T>(key: string): T | null {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    /* istanbul ignore next */
    return null;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // ignore persistence errors in tests/environments without storage
  }
}

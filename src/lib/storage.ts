export function readJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;

  try {
    return JSON.parse(stored) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write ${key} to localStorage`, error);
  }
}

export function migrateJson<T>(newKey: string, oldKey: string, fallback: T): T {
  const current = localStorage.getItem(newKey);
  if (current) return readJson(newKey, fallback);

  const old = localStorage.getItem(oldKey);
  if (!old) return fallback;

  try {
    const parsed = JSON.parse(old) as T;
    writeJson(newKey, parsed);
    return parsed;
  } catch {
    localStorage.removeItem(oldKey);
    return fallback;
  }
}

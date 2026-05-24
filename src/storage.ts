// localStorage wrapper tolerant to blocked access (private mode, quotas).

const LS_KEY = 'statique-pouet:instance';

export function getStoredInstance(): string | null {
  try {
    return localStorage.getItem(LS_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredInstance(value: string): void {
  try {
    localStorage.setItem(LS_KEY, value);
  } catch {
    // ignore: quota exceeded, sandboxed context, etc.
  }
}

export function clearStoredInstance(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}

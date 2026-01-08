export type StoredProfile = {
  name: string;
};

export type StoredFinalize = {
  storyId: string;
  title: string;
  value: string;
  at: number;
};

export type StoredSessionHistory = {
  sessionId: string;
  items: StoredFinalize[];
  updatedAt: number;
};

const KEY_PROFILE = "pp:profile:v1";
const KEY_HISTORY = "pp:history:v1"; // Record<sessionId, StoredSessionHistory>
const KEY_HOST_KEYS = "pp:hostKeys:v1"; // Record<sessionId, hostKey>

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadProfile(): StoredProfile {
  const v = safeParse<StoredProfile>(localStorage.getItem(KEY_PROFILE));
  return { name: v?.name || "" };
}

export function saveProfile(p: StoredProfile) {
  localStorage.setItem(KEY_PROFILE, JSON.stringify({ name: (p.name || "").slice(0, 32) }));
}

export function loadHistoryAll(): Record<string, StoredSessionHistory> {
  return safeParse<Record<string, StoredSessionHistory>>(localStorage.getItem(KEY_HISTORY)) || {};
}

export function upsertFinalize(sessionId: string, item: StoredFinalize) {
  const all = loadHistoryAll();
  const existing = all[sessionId] || { sessionId, items: [], updatedAt: Date.now() };
  const nextItems = [item, ...existing.items].slice(0, 200);
  all[sessionId] = { sessionId, items: nextItems, updatedAt: Date.now() };
  localStorage.setItem(KEY_HISTORY, JSON.stringify(all));
}

export function loadHostKeys(): Record<string, string> {
  return safeParse<Record<string, string>>(localStorage.getItem(KEY_HOST_KEYS)) || {};
}

export function getHostKey(sessionId: string): string | null {
  const all = loadHostKeys();
  return all[sessionId] ?? null;
}

export function setHostKey(sessionId: string, hostKey: string) {
  const all = loadHostKeys();
  all[sessionId] = hostKey.slice(0, 80);
  localStorage.setItem(KEY_HOST_KEYS, JSON.stringify(all));
}



const KEY_PROFILE = "pp:profile:v1";
const KEY_HISTORY = "pp:history:v1"; // Record<sessionId, StoredSessionHistory>
const KEY_HOST_KEYS = "pp:hostKeys:v1"; // Record<sessionId, hostKey>

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadProfile() {
  const v = safeParse(localStorage.getItem(KEY_PROFILE));
  return { name: v?.name || "" };
}

export function saveProfile(p) {
  localStorage.setItem(KEY_PROFILE, JSON.stringify({ name: (p.name || "").slice(0, 32) }));
}

export function loadHistoryAll() {
  return safeParse(localStorage.getItem(KEY_HISTORY)) || {};
}

export function upsertFinalize(sessionId, item) {
  const all = loadHistoryAll();
  const existing = all[sessionId] || { sessionId, items: [], updatedAt: Date.now() };
  const nextItems = [item, ...existing.items].slice(0, 200);
  all[sessionId] = { sessionId, items: nextItems, updatedAt: Date.now() };
  localStorage.setItem(KEY_HISTORY, JSON.stringify(all));
}

export function loadHostKeys() {
  return safeParse(localStorage.getItem(KEY_HOST_KEYS)) || {};
}

export function getHostKey(sessionId) {
  const all = loadHostKeys();
  return all[sessionId] ?? null;
}

export function setHostKey(sessionId, hostKey) {
  const all = loadHostKeys();
  all[sessionId] = hostKey.slice(0, 80);
  localStorage.setItem(KEY_HOST_KEYS, JSON.stringify(all));
}


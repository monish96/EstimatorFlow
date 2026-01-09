const KEY = "pp:settings:v1";

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadSettings() {
  const v = safeParse(localStorage.getItem(KEY)) || {};
  return {
    observerMode: Boolean(v.observerMode),
    darkMode: v.darkMode === false ? false : true, // default true
    screenShare: Boolean(v.screenShare),
    hideMyVote: Boolean(v.hideMyVote)
  };
}

export function saveSettings(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
}


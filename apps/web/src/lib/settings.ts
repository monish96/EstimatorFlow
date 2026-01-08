export type Settings = {
  observerMode: boolean;
  darkMode: boolean;
  screenShare: boolean;
  hideMyVote: boolean;
};

const KEY = "pp:settings:v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadSettings(): Settings {
  const v = safeParse<Partial<Settings>>(localStorage.getItem(KEY)) || {};
  return {
    observerMode: Boolean(v.observerMode),
    darkMode: v.darkMode === false ? false : true, // default true
    screenShare: Boolean(v.screenShare),
    hideMyVote: Boolean(v.hideMyVote)
  };
}

export function saveSettings(next: Settings) {
  localStorage.setItem(KEY, JSON.stringify(next));
}



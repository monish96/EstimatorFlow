import React, { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { loadProfile, saveProfile, setHostKey } from "../lib/storage";
import { loadSettings, saveSettings } from "../lib/settings";
import { SettingsMenu } from "../components/SettingsMenu";

function parseSessionId(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("s");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // not a URL
  }
  // allow plain id
  return raw.replaceAll("/", "").slice(0, 32);
}

export function Landing() {
  const nav = useNavigate();
  const initial = useMemo(() => loadProfile(), []);
  const initialSettings = useMemo(() => loadSettings(), []);
  const [name, setName] = useState(initial.name);
  const [joinValue, setJoinValue] = useState("");
  const [observerMode, setObserverMode] = useState(initialSettings.observerMode);
  const [darkMode, setDarkMode] = useState(initialSettings.darkMode);
  const [screenShare, setScreenShare] = useState(initialSettings.screenShare);

  function persistName(n: string) {
    setName(n);
    saveProfile({ name: n });
  }

  function persistSettings(next: { observerMode?: boolean; darkMode?: boolean; screenShare?: boolean }) {
    const s = loadSettings();
    const merged = {
      ...s,
      ...next
    };
    saveSettings(merged);
    setObserverMode(merged.observerMode);
    setDarkMode(merged.darkMode);
    setScreenShare(merged.screenShare);
  }

  React.useEffect(() => {
    document.body.classList.toggle("light", !darkMode);
  }, [darkMode]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const k = e.key.toLowerCase();
      if (k === "d") persistSettings({ darkMode: !darkMode });
      if (k === "o") persistSettings({ observerMode: !observerMode });
      if (k === "s") persistSettings({ screenShare: !screenShare });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [darkMode, observerMode, screenShare]);

  function createSession() {
    const sid = nanoid(10);
    const hk = nanoid(18);
    setHostKey(sid, hk);
    persistName(name);
    nav(`/s/${sid}?host=1&hk=${encodeURIComponent(hk)}`);
  }

  function joinSession() {
    const sid = parseSessionId(joinValue);
    if (!sid) return;
    persistName(name);
    nav(`/s/${sid}`);
  }

  return (
    <>
      <div className="glass header">
        <div className="brand">
          <div className="brandMark" />
          <div>
            <h1 className="title">EstimateFlow</h1>
            <div className="subtitle">Modern • real-time • beautifully animated</div>
          </div>
        </div>
        <div className="row">
          <div className="pill">No accounts. Your history lives in localStorage.</div>
          <SettingsMenu
            observerMode={observerMode}
            darkMode={darkMode}
            screenShare={screenShare}
            onToggleObserver={() => persistSettings({ observerMode: !observerMode })}
            onToggleDark={() => persistSettings({ darkMode: !darkMode })}
            onToggleScreenShare={() => persistSettings({ screenShare: !screenShare })}
          />
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="grid cols2">
        <div className="glass card">
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="pill">You</div>
            <div className="spacer" />
          </div>
          <label className="subtitle">Display name</label>
          <div style={{ height: 8 }} />
          <input
            className="input"
            value={name}
            placeholder="e.g. Alex"
            onChange={(e) => persistName(e.target.value)}
          />
          <div style={{ height: 12 }} />
          <div className="row">
            <button className="btn btnPrimary" onClick={createSession}>
              <Sparkles size={18} />
              Create new session (host)
            </button>
          </div>

          <div style={{ height: 14 }} />
          <div className="subtitle">
            Tip: after you create a session, you’ll get a share button to copy the link.
          </div>
        </div>

        <div className="glass card">
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="pill">Join</div>
            <div className="spacer" />
          </div>
          <label className="subtitle">Session link or ID</label>
          <div style={{ height: 8 }} />
          <input
            className="input"
            value={joinValue}
            placeholder="Paste the link (…/s/abcd1234) or type the ID"
            onChange={(e) => setJoinValue(e.target.value)}
          />
          <div style={{ height: 12 }} />
          <div className="row">
            <button className="btn btnPrimary" onClick={joinSession}>
              Join session
            </button>
          </div>

          <div style={{ height: 14 }} />
          <div className="subtitle">
            If you don’t have a link yet, ask the host to click “Copy link”.
          </div>
        </div>
      </div>

    </>
  );
}



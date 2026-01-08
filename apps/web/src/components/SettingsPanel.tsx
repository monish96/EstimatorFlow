import React from "react";
import { MonitorUp, Moon, Sun, UserRoundSearch } from "lucide-react";
import { cx } from "../lib/util";

export function SettingsPanel({
  observerMode,
  darkMode,
  screenShare,
  onToggleObserver,
  onToggleDark,
  onToggleScreenShare
}: {
  observerMode: boolean;
  darkMode: boolean;
  screenShare: boolean;
  onToggleObserver: () => void;
  onToggleDark: () => void;
  onToggleScreenShare: () => void;
}) {
  return (
    <div className="glass card">
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="pill">Settings</div>
        <div className="spacer" />
        <div className="pill">Shortcuts: D / O / S / H</div>
      </div>

      <div className="toggleRow">
        <div className="toggleLabel">
          <UserRoundSearch size={22} />
          <div>
            <div className="toggleTitle">Observer mode</div>
            <div className="toggleSub">Join the room, but don’t vote</div>
          </div>
        </div>
        <button
          className={cx("switch", observerMode && "switchOn")}
          onClick={onToggleObserver}
          aria-pressed={observerMode}
          title="Toggle observer mode"
        >
          <span className="knob" />
        </button>
      </div>

      <div style={{ height: 10 }} />

      <div className="toggleRow">
        <div className="toggleLabel">
          {darkMode ? <Moon size={22} /> : <Sun size={22} />}
          <div>
            <div className="toggleTitle">Dark mode</div>
            <div className="toggleSub">Switch between dark and light themes</div>
          </div>
        </div>
        <button
          className={cx("switch", darkMode && "switchOn")}
          onClick={onToggleDark}
          aria-pressed={darkMode}
          title="Toggle dark mode"
        >
          <span className="knob" />
        </button>
      </div>

      <div style={{ height: 10 }} />

      <div className="toggleRow">
        <div className="toggleLabel">
          <MonitorUp size={22} />
          <div>
            <div className="toggleTitle">Screen sharing</div>
            <div className="toggleSub">Use H to hide your vote on your screen</div>
          </div>
        </div>
        <button
          className={cx("switch", screenShare && "switchOn")}
          onClick={onToggleScreenShare}
          aria-pressed={screenShare}
          title="Toggle screen sharing mode"
        >
          <span className="knob" />
        </button>
      </div>
    </div>
  );
}



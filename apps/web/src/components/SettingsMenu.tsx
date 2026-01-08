import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Settings } from "lucide-react";
import { SettingsPanel } from "./SettingsPanel";

export function SettingsMenu({
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
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const id = useMemo(() => `pp-settings-${Math.random().toString(16).slice(2)}`, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        className="btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        title="Settings"
      >
        <Settings size={18} />
        Settings
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={id}
            className="menuPanel"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
          >
            <SettingsPanel
              observerMode={observerMode}
              darkMode={darkMode}
              screenShare={screenShare}
              onToggleObserver={onToggleObserver}
              onToggleDark={onToggleDark}
              onToggleScreenShare={onToggleScreenShare}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}



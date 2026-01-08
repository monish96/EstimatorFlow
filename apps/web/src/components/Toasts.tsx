import { AnimatePresence, motion } from "framer-motion";
import React from "react";

export type Toast = {
  id: string;
  title: string;
  body?: string;
};

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toastWrap" aria-live="polite" aria-relevant="additions removals">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className="toast"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          >
            <div className="toastTitle">{t.title}</div>
            {t.body ? <div className="toastBody">{t.body}</div> : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}



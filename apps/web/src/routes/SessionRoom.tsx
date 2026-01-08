import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  Crown,
  Download,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  RefreshCcw,
  Sparkles,
  Trash2
} from "lucide-react";
import { nanoid } from "nanoid";
import { createSocket, SessionUpdate, VoteValue } from "../lib/socket";
import { getHostKey, loadProfile, saveProfile, setHostKey, upsertFinalize } from "../lib/storage";
import { loadSettings, saveSettings } from "../lib/settings";
import { copyToClipboard, cx, shortId } from "../lib/util";
import { Toast, Toasts } from "../components/Toasts";
import { SettingsMenu } from "../components/SettingsMenu";

const DECK: VoteValue[] = ["1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"];

function medianNumeric(values: string[]): string | null {
  const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!nums.length) return null;
  return String(nums[Math.floor(nums.length / 2)]);
}

export function SessionRoom() {
  const { sessionId = "" } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const asHost = sp.get("host") === "1";
  const hkParam = sp.get("hk") || "";

  const profile = useMemo(() => loadProfile(), []);
  const initialSettings = useMemo(() => loadSettings(), []);
  const [name, setName] = useState(profile.name || "");
  const [socketReady, setSocketReady] = useState(false);

  const sockRef = useRef<ReturnType<typeof createSocket> | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [state, setState] = useState<SessionUpdate | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [storyTitle, setStoryTitle] = useState("");
  const [storyNotes, setStoryNotes] = useState("");
  const [myVote, setMyVote] = useState<VoteValue | null>(null);

  const [observerMode, setObserverMode] = useState(initialSettings.observerMode);
  const [darkMode, setDarkMode] = useState(initialSettings.darkMode);
  const [screenShare, setScreenShare] = useState(initialSettings.screenShare);
  const [hideMyVote, setHideMyVote] = useState(initialSettings.hideMyVote);

  const seenFinalizeRef = useRef<Record<string, number>>({});
  const hostKeyRef = useRef<string>("");

  const participants = state?.participants ?? [];
  const me = participants.find((p) => p.id === meId) ?? null;
  const isHost = Boolean(me?.isHost);
  const stories = state?.stories ?? [];
  const currentStory = stories.find((s) => s.id === state?.currentStoryId) ?? null;
  const round = state?.round ?? null;

  function toast(title: string, body?: string) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((xs) => [...xs, { id, title, body }]);
    window.setTimeout(() => setToasts((xs) => xs.filter((t) => t.id !== id)), 2600);
  }

  // Host key: used only to keep host privileges sticky across reconnects.
  // Never included in "Copy link" (we copy clean session link).
  useEffect(() => {
    const existing = getHostKey(sessionId);
    if (hkParam) {
      setHostKey(sessionId, hkParam);
      hostKeyRef.current = hkParam;
      // scrub hk from the URL so it isn't accidentally shared
      nav(`/s/${sessionId}?host=${asHost ? "1" : "0"}`, { replace: true });
      return;
    }
    if (existing) {
      hostKeyRef.current = existing;
      return;
    }
    if (asHost) {
      const created = nanoid(18);
      setHostKey(sessionId, created);
      hostKeyRef.current = created;
    }
  }, [sessionId]); // intentionally only keyed by sessionId

  useEffect(() => {
    if (!name) {
      // generate a fun default if empty
      const generated = `Player ${Math.floor(Math.random() * 900 + 100)}`;
      setName(generated);
      saveProfile({ name: generated });
    }
  }, [name]);

  function persistSettings(next: Partial<Parameters<typeof saveSettings>[0]>) {
    const s = loadSettings();
    const merged = { ...s, ...next };
    saveSettings(merged);
    setObserverMode(merged.observerMode);
    setDarkMode(merged.darkMode);
    setScreenShare(merged.screenShare);
    setHideMyVote(merged.hideMyVote);

    // reflect in live session when possible
    if (typeof next.observerMode === "boolean") {
      sockRef.current?.emit("participant:update", {
        sessionId,
        isObserver: next.observerMode,
        hostKey: hostKeyRef.current || undefined
      });
    }
  }

  useEffect(() => {
    document.body.classList.toggle("light", !darkMode);
  }, [darkMode]);

  // shortcuts: D/O/S/H (avoid typing inputs)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const k = e.key.toLowerCase();
      if (k === "d") persistSettings({ darkMode: !darkMode });
      if (k === "o") persistSettings({ observerMode: !observerMode });
      if (k === "s") {
        const next = !screenShare;
        persistSettings({ screenShare: next, hideMyVote: next ? true : hideMyVote });
        toast(next ? "Screen share mode" : "Screen share off", next ? "Press H to toggle hiding your vote." : undefined);
      }
      if (k === "h") {
        if (!screenShare) return;
        persistSettings({ hideMyVote: !hideMyVote });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [darkMode, observerMode, screenShare, hideMyVote]); // ok for small app

  useEffect(() => {
    const sock = createSocket();
    sockRef.current = sock;

    const onConnect = () => {
      setSocketReady(true);
      sock.emit(
        "session:join",
        {
          sessionId,
          name: name || "Anon",
          asHost,
          observer: observerMode,
          hostKey: hostKeyRef.current || undefined
        },
        (resp: any) => {
          if (!resp?.ok) {
            toast("Couldn’t join", resp?.error || "Unknown error");
            nav("/", { replace: true });
            return;
          }
          setMeId(resp.participantId);
          toast("Connected", `Session ${shortId(sessionId)}`);
        }
      );
    };
    const onDisconnect = () => setSocketReady(false);
    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on("session:update", (u: SessionUpdate) => setState(u));

    return () => {
      try {
        if (sock.connected) sock.emit("session:leave", sessionId);
      } catch {
        // ignore
      }
      sock.disconnect();
      sockRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // keep name synced (local + next join)
  useEffect(() => {
    saveProfile({ name });
    sockRef.current?.emit("participant:update", {
      sessionId,
      name,
      hostKey: hostKeyRef.current || undefined
    });
  }, [name]);

  // track my vote from server state (source of truth)
  useEffect(() => {
    if (!round || !meId) return;
    const v = round.votesByParticipantId?.[meId] ?? null;
    setMyVote(v);
  }, [round?.updatedAt, meId]); // eslint-disable-line react-hooks/exhaustive-deps

  // persist finalized stories into localStorage history
  useEffect(() => {
    if (!state) return;
    for (const s of state.stories) {
      if (!s.finalized) continue;
      const key = s.id;
      const at = s.finalized.at;
      if (seenFinalizeRef.current[key] === at) continue;
      seenFinalizeRef.current[key] = at;
      upsertFinalize(state.sessionId, { storyId: s.id, title: s.title, value: s.finalized.value, at });
      toast("Saved locally", `“${s.title}” → ${s.finalized.value}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.stories]);

  async function copyLink() {
    const link = `${window.location.origin}/s/${sessionId}`;
    const ok = await copyToClipboard(link);
    toast(ok ? "Link copied" : "Copy failed", ok ? "Share it with the squad." : "Browser blocked clipboard.");
  }

  function addStory() {
    if (!storyTitle.trim()) return;
    sockRef.current?.emit("story:add", { sessionId, title: storyTitle, notes: storyNotes });
    setStoryTitle("");
    setStoryNotes("");
    toast("Story added", "Let’s vibe.");
  }

  function setCurrentStory(storyId: string) {
    sockRef.current?.emit("story:setCurrent", { sessionId, storyId });
  }

  function setVote(value: VoteValue) {
    if (observerMode) {
      toast("Observer mode", "Disable observer mode to vote.");
      return;
    }
    sockRef.current?.emit("vote:set", { sessionId, value });
  }

  function reveal() {
    sockRef.current?.emit("round:reveal", { sessionId });
  }

  function reset() {
    sockRef.current?.emit("round:reset", { sessionId });
  }

  function finalize(value: VoteValue) {
    sockRef.current?.emit("round:finalize", { sessionId, value });
  }

  function exportSnapshot() {
    if (!isHost) {
      toast("Host only", "Only the host can export session data.");
      return;
    }
    sockRef.current?.emit("session:snapshot", { sessionId }, (resp: any) => {
      if (!resp?.ok) {
        toast("Export failed", resp?.error || "Could not export snapshot.");
        return;
      }
      const snapshot = resp.snapshot;
      const dataStr = JSON.stringify(snapshot, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `estimateflow-snapshot-${sessionId}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("Snapshot exported", "Session data downloaded as JSON.");
    });
  }

  function clearSessionData() {
    if (!isHost) {
      toast("Host only", "Only the host can clear session data.");
      return;
    }
    if (!window.confirm("Are you sure you want to clear all session data? This will remove all stories, participants, and votes. This action cannot be undone.")) {
      return;
    }
    sockRef.current?.emit("session:clear", { sessionId }, (resp: any) => {
      if (!resp?.ok) {
        toast("Clear failed", resp?.error || "Could not clear session data.");
        return;
      }
      toast("Session cleared", "All data has been removed from the server.");
    });
  }

  const revealed = Boolean(round?.revealed);
  const votes = round?.votesByParticipantId ?? {};
  const voteValues = Object.values(votes).filter((v): v is string => Boolean(v));
  const suggested = medianNumeric(voteValues);
  const voterCount = participants.filter((p) => !p.isObserver).length;

  return (
    <>
      <Toasts toasts={toasts} />
      <div className="glass header">
        <div className="brand">
          <div className="brandMark" />
          <div>
            <h1 className="title">Session {shortId(sessionId)}</h1>
            <div className="subtitle">
              {socketReady ? "Live" : "Reconnecting…"} • your history auto-saves to localStorage
            </div>
          </div>
        </div>
        <div className="row">
          <SettingsMenu
            observerMode={observerMode}
            darkMode={darkMode}
            screenShare={screenShare}
            onToggleObserver={() => persistSettings({ observerMode: !observerMode })}
            onToggleDark={() => persistSettings({ darkMode: !darkMode })}
            onToggleScreenShare={() =>
              persistSettings({ screenShare: !screenShare, hideMyVote: !screenShare ? true : hideMyVote })
            }
          />
          {isHost && (
            <>
              <button className="btn" onClick={exportSnapshot} title="Export session snapshot as JSON">
                <Download size={18} /> Export
              </button>
              <button className="btn btnDanger" onClick={clearSessionData} title="Clear all session data from server">
                <Trash2 size={18} /> Clear Data
              </button>
            </>
          )}
          <button className="btn" onClick={copyLink}>
            <Copy size={18} /> Copy link
          </button>
          <button className="btn" onClick={() => nav("/", { replace: true })}>
            <LogOut size={18} /> Leave
          </button>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="grid cols3">
        {/* Room first */}
        <div className="glass card">
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="pill">Room</div>
            <div className="spacer" />
            {isHost ? (
              <div className="pill">
                <Crown size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
                Host
              </div>
            ) : me?.isObserver ? (
              <div className="pill">Observer</div>
            ) : (
              <div className="pill">Guest</div>
            )}
          </div>

          <label className="subtitle">Your name</label>
          <div style={{ height: 8 }} />
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ height: 12 }} />

          <div className="participants">
            {participants.map((p) => {
              const voted = votes?.[p.id] != null;
              const isMe = p.id === meId;
              const hiddenMine = Boolean(screenShare && hideMyVote && isMe);
              const playerVote = revealed ? (hiddenMine ? null : votes?.[p.id] ?? null) : null;
              return (
                <div className="person" key={p.id}>
                  <div className="dot" style={{ background: p.color }} />
                  <div style={{ flex: 1 }}>
                    <div className="personName">
                      {p.name} {p.isHost ? "👑" : ""}
                      {isMe ? " (you)" : ""}
                      {playerVote != null && (
                        <span className="personVote" style={{ marginLeft: 8, color: "var(--accent)", fontWeight: 700 }}>
                          → {playerVote}
                        </span>
                      )}
                    </div>
                    <div className="subtitle">
                      {p.isObserver ? "Observer" : revealed ? (playerVote != null ? "Voted" : "No vote") : voted ? "Card selected" : "Thinking…"}
                    </div>
                  </div>
                  <div className="personMeta">
                    {revealed ? (
                      <div className="pill" style={{ minWidth: 50, textAlign: "center" }}>
                        {hiddenMine ? "Hidden" : (votes?.[p.id] ?? "—")}
                      </div>
                    ) : voted ? (
                      <div className="pill">✓</div>
                    ) : (
                      <div className="pill">…</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass card">
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="pill">Stories</div>
            <div className="spacer" />
            <div className="pill">{stories.length} total</div>
          </div>

          <div className="row">
            <input
              className="input"
              value={storyTitle}
              placeholder="Story title (e.g. Add SSO login)"
              onChange={(e) => setStoryTitle(e.target.value)}
            />
          </div>
          <div style={{ height: 10 }} />
          <textarea
            className="textarea"
            value={storyNotes}
            placeholder="Optional notes / acceptance criteria…"
            onChange={(e) => setStoryNotes(e.target.value)}
          />
          <div style={{ height: 10 }} />
          <div className="row">
            <button className="btn btnPrimary" onClick={addStory}>
              <Sparkles size={18} /> Add story
            </button>
          </div>

          <div style={{ height: 14 }} />
          <div className="grid">
            {stories.length ? (
              stories.map((s) => (
                <div
                  key={s.id}
                  className={cx("storyItem", state?.currentStoryId === s.id && "active")}
                  onClick={() => isHost && setCurrentStory(s.id)}
                  title={isHost ? "Click to set current story" : "Host controls story selection"}
                >
                  <div className="row">
                    <div style={{ fontWeight: 800 }}>{s.title}</div>
                    <div className="spacer" />
                    {s.finalized ? <div className="pill">Final: {s.finalized.value}</div> : null}
                  </div>
                  {s.notes ? <div className="subtitle">{s.notes}</div> : null}
                </div>
              ))
            ) : (
              <div className="subtitle">No stories yet. Add one to start the ritual.</div>
            )}
          </div>
        </div>

        <div className="glass card">
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="pill">Vote</div>
            <div className="spacer" />
            <div className="pill">
              {currentStory ? (
                <>
                  Current: <b>{currentStory.title}</b>
                </>
              ) : (
                "Add a story to begin"
              )}
            </div>
          </div>

          {!state ? (
            <div className="row">
              <Loader2 className="spin" /> <div className="subtitle">Connecting…</div>
            </div>
          ) : currentStory ? (
            <>
              <div className="subtitle" style={{ marginBottom: 10 }}>
                Pick a card. Host reveals when everyone’s ready.
              </div>
              <div className="deck" aria-label="Estimation cards">
                {DECK.map((v) => (
                  <motion.button
                    key={v}
                    className={cx("voteCard", myVote === v && "selected")}
                    onClick={() => setVote(v)}
                    whileHover={{ y: -6, rotate: -1, scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    disabled={revealed}
                    title={revealed ? "Round is revealed (host can reset)" : `Vote ${v}`}
                  >
                    <span>{v}</span>
                  </motion.button>
                ))}
              </div>

              <div style={{ height: 14 }} />

              <div className="row">
                {isHost ? (
                  <>
                    <button className="btn btnPrimary" onClick={revealed ? reset : reveal}>
                      {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
                      {revealed ? "Reset round" : "Reveal"}
                    </button>
                    <button className="btn" onClick={reset}>
                      <RefreshCcw size={18} /> Clear votes
                    </button>
                  </>
                ) : (
                  <div className="pill">Waiting for host to reveal…</div>
                )}
                <div className="spacer" />
                <div className="pill">
                  Your pick: <b>{screenShare && hideMyVote ? "Hidden" : (myVote ?? "—")}</b>
                </div>
              </div>

              <AnimatePresence>
                {revealed ? (
                  <motion.div
                    className="glass"
                    style={{ marginTop: 14, padding: 12 }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  >
                    <div className="row">
                      <div className="pill">
                        Revealed • {voteValues.length}/{voterCount} votes
                      </div>
                      <div className="spacer" />
                      {suggested ? <div className="pill">Median: {suggested}</div> : null}
                    </div>

                    {isHost ? (
                      <>
                        <div style={{ height: 10 }} />
                        <div className="row" style={{ flexWrap: "wrap" }}>
                          <div className="subtitle">Finalize estimate:</div>
                          {DECK.filter((v) => v !== "☕").map((v) => (
                            <button key={v} className="btn" onClick={() => finalize(v)} title="Save">
                              <CheckCircle2 size={18} /> {v}
                            </button>
                          ))}
                          {suggested ? (
                            <button className="btn btnPrimary" onClick={() => finalize(suggested)}>
                              <CheckCircle2 size={18} /> Use median ({suggested})
                            </button>
                          ) : null}
                        </div>
                      </>
                    ) : currentStory.finalized ? (
                      <div style={{ height: 10 }} className="subtitle">
                        Finalized: <b>{currentStory.finalized.value}</b> by {currentStory.finalized.by}
                      </div>
                    ) : (
                      <div style={{ height: 10 }} className="subtitle">
                        Host will finalize an estimate (it saves into your localStorage).
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </>
          ) : (
            <div className="subtitle">No active story yet. Add one on the left.</div>
          )}
        </div>
      </div>
    </>
  );
}



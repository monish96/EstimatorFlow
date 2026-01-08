import express, { Request, Response } from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

type VoteValue = string; // keep flexible for "☕" / "?" etc

type Participant = {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  isObserver: boolean;
  joinedAt: number;
};

type Story = {
  id: string;
  title: string;
  notes?: string;
  createdAt: number;
  finalized?: {
    value: VoteValue;
    by: string;
    at: number;
  };
};

type RoundState = {
  storyId: string | null;
  revealed: boolean;
  votesByParticipantId: Record<string, VoteValue | null>;
  updatedAt: number;
};

type Session = {
  id: string;
  createdAt: number;
  hostKey?: string;
  participants: Record<string, Participant>;
  stories: Story[];
  currentStoryId: string | null;
  round: RoundState;
};

type ClientHello = {
  sessionId: string;
  name: string;
  asHost?: boolean;
  observer?: boolean;
  hostKey?: string;
};

// Use a dev-friendly port unlikely to collide with Vite (which prefers 5173/5174/etc.)
const PORT = Number(process.env.PORT ?? 5050);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN; // comma-separated allowed origins (recommended in prod)

function parseAllowedOrigins() {
  if (!CLIENT_ORIGIN) return null;
  return CLIENT_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  if (allowedOrigins) return allowedOrigins.includes(origin);
  // dev default: allow any localhost origin
  return /^https?:\/\/localhost:\d+$/.test(origin);
}

const app = express();
app.use(
  cors({
    origin(origin, cb) {
      cb(null, isAllowedOrigin(origin ?? undefined));
    },
    credentials: true
  })
);
app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin(origin, cb) {
      cb(null, isAllowedOrigin(origin ?? undefined));
    },
    credentials: true
  }
});

const sessions = new Map<string, Session>();

function now() {
  return Date.now();
}

function pickColor(seed: string) {
  // deterministic modern palette
  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#3b82f6"
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function createSession(sessionId?: string): Session {
  const id = sessionId ?? nanoid(10);
  const createdAt = now();
  const emptyRound: RoundState = {
    storyId: null,
    revealed: false,
    votesByParticipantId: {},
    updatedAt: createdAt
  };
  return {
    id,
    createdAt,
    hostKey: undefined,
    participants: {},
    stories: [],
    currentStoryId: null,
    round: emptyRound
  };
}

function ensureSession(sessionId: string): Session {
  const existing = sessions.get(sessionId);
  if (existing) return existing;
  const created = createSession(sessionId);
  sessions.set(sessionId, created);
  return created;
}

function getHostId(session: Session): string | null {
  const p = Object.values(session.participants).find((x) => x.isHost);
  return p?.id ?? null;
}

function setHost(session: Session, participantId: string) {
  for (const pid of Object.keys(session.participants)) {
    session.participants[pid] = { ...session.participants[pid], isHost: pid === participantId };
  }
}

function assignHostIfNeeded(session: Session) {
  if (getHostId(session)) return;
  const oldest = Object.values(session.participants).sort((a, b) => a.joinedAt - b.joinedAt)[0];
  if (oldest) setHost(session, oldest.id);
}

function resetRound(session: Session, storyId: string | null) {
  session.round = {
    storyId,
    revealed: false,
    votesByParticipantId: Object.fromEntries(
      Object.keys(session.participants).map((pid) => [pid, null])
    ),
    updatedAt: now()
  };
}

function emitSession(session: Session) {
  io.to(session.id).emit("session:update", {
    sessionId: session.id,
    createdAt: session.createdAt,
    participants: Object.values(session.participants),
    stories: session.stories,
    currentStoryId: session.currentStoryId,
    round: session.round
  });
}

io.on("connection", (socket) => {
  socket.on("session:join", (hello: ClientHello, ack?: (resp: any) => void) => {
    try {
      const session = ensureSession(hello.sessionId);
      const participantId = socket.id;
      const name = (hello.name || "Anon").slice(0, 32);

      // Host is protected by a secret hostKey.
      // - First host join can set the hostKey.
      // - Later joins can re-claim host if they present the same hostKey (e.g. after reconnect).
      const presentedHostKey = typeof hello.hostKey === "string" ? hello.hostKey.slice(0, 80) : "";
      const canClaimHost = Boolean(presentedHostKey) && session.hostKey === presentedHostKey;
      const isFirstHostClaim = Boolean(hello.asHost) && !session.hostKey && Boolean(presentedHostKey);

      if (isFirstHostClaim) session.hostKey = presentedHostKey;
      const isHost = isFirstHostClaim || canClaimHost;
      const isObserver = Boolean(hello.observer);

      session.participants[participantId] = {
        id: participantId,
        name,
        color: pickColor(participantId),
        isHost,
        isObserver,
        joinedAt: now()
      };
      if (isHost) setHost(session, participantId);
      assignHostIfNeeded(session);

      // ensure vote slots exist
      if (!(participantId in session.round.votesByParticipantId)) {
        session.round.votesByParticipantId[participantId] = null;
        session.round.updatedAt = now();
      }

      socket.join(session.id);
      emitSession(session);
      ack?.({ ok: true, sessionId: session.id, participantId });
    } catch (e: any) {
      ack?.({ ok: false, error: e?.message ?? "join_failed" });
    }
  });

  socket.on("session:leave", (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) return;
    delete session.participants[socket.id];
    delete session.round.votesByParticipantId[socket.id];
    assignHostIfNeeded(session);
    emitSession(session);
    socket.leave(session.id);
  });

  socket.on("story:add", (payload: { sessionId: string; title: string; notes?: string }) => {
    const session = sessions.get(payload.sessionId);
    if (!session) return;
    const title = (payload.title || "").trim().slice(0, 120);
    const notes = (payload.notes || "").trim().slice(0, 800);
    if (!title) return;

    const story: Story = { id: nanoid(8), title, notes: notes || undefined, createdAt: now() };
    session.stories.push(story);

    if (!session.currentStoryId) {
      session.currentStoryId = story.id;
      resetRound(session, story.id);
    }
    emitSession(session);
  });

  socket.on(
    "participant:update",
    (payload: { sessionId: string; name?: string; isObserver?: boolean; hostKey?: string }) => {
      const session = sessions.get(payload.sessionId);
      if (!session) return;
      const p = session.participants[socket.id];
      if (!p) return;

      const nextName =
        typeof payload.name === "string" ? payload.name.trim().slice(0, 32) : undefined;
      const nextObserver = typeof payload.isObserver === "boolean" ? payload.isObserver : undefined;
      const presentedHostKey = typeof payload.hostKey === "string" ? payload.hostKey.slice(0, 80) : "";
      const canClaimHost = Boolean(presentedHostKey) && session.hostKey === presentedHostKey;

      session.participants[socket.id] = {
        ...p,
        name: nextName ?? p.name,
        isObserver: nextObserver ?? p.isObserver
      };

      if (canClaimHost) setHost(session, socket.id);

      // If they become an observer, clear any vote they previously set
      if (nextObserver === true && session.round.votesByParticipantId[socket.id] != null) {
        session.round.votesByParticipantId[socket.id] = null;
        session.round.updatedAt = now();
      }

      emitSession(session);
    }
  );

  socket.on("story:setCurrent", (payload: { sessionId: string; storyId: string }) => {
    const session = sessions.get(payload.sessionId);
    if (!session) return;
    const p = session.participants[socket.id];
    if (!p?.isHost) return;
    if (!session.stories.some((s) => s.id === payload.storyId)) return;

    session.currentStoryId = payload.storyId;
    resetRound(session, payload.storyId);
    emitSession(session);
  });

  socket.on("vote:set", (payload: { sessionId: string; value: VoteValue }) => {
    const session = sessions.get(payload.sessionId);
    if (!session) return;
    if (!session.currentStoryId) return;
    if (!(socket.id in session.participants)) return;
    if (session.participants[socket.id]?.isObserver) return;

    if (session.round.revealed) return;
    session.round.storyId = session.currentStoryId;
    session.round.votesByParticipantId[socket.id] = String(payload.value).slice(0, 8);
    session.round.updatedAt = now();
    emitSession(session);
  });

  socket.on("round:reveal", (payload: { sessionId: string }) => {
    const session = sessions.get(payload.sessionId);
    if (!session) return;
    const p = session.participants[socket.id];
    if (!p?.isHost) return;
    session.round.revealed = true;
    session.round.updatedAt = now();
    emitSession(session);
  });

  socket.on("round:reset", (payload: { sessionId: string }) => {
    const session = sessions.get(payload.sessionId);
    if (!session) return;
    const p = session.participants[socket.id];
    if (!p?.isHost) return;
    resetRound(session, session.currentStoryId);
    emitSession(session);
  });

  socket.on("round:finalize", (payload: { sessionId: string; value: VoteValue }) => {
    const session = sessions.get(payload.sessionId);
    if (!session) return;
    const p = session.participants[socket.id];
    if (!p?.isHost) return;
    const storyId = session.currentStoryId;
    if (!storyId) return;
    const story = session.stories.find((s) => s.id === storyId);
    if (!story) return;

    story.finalized = { value: String(payload.value).slice(0, 8), by: p.name, at: now() };
    emitSession(session);
  });

  socket.on("disconnect", () => {
    // remove from all sessions it might be in (typically 1)
    for (const session of sessions.values()) {
      if (session.participants[socket.id]) {
        delete session.participants[socket.id];
        delete session.round.votesByParticipantId[socket.id];
        assignHostIfNeeded(session);
        emitSession(session);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[pp-server] listening on http://localhost:${PORT} (CORS ${
      allowedOrigins?.join(",") ?? "localhost:*"
    })`
  );
});



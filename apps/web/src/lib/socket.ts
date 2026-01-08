import { io, Socket } from "socket.io-client";

export type VoteValue = string;

export type Participant = {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  isObserver: boolean;
  joinedAt: number;
};

export type Story = {
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

export type RoundState = {
  storyId: string | null;
  revealed: boolean;
  votesByParticipantId: Record<string, VoteValue | null>;
  updatedAt: number;
};

export type SessionUpdate = {
  sessionId: string;
  createdAt: number;
  participants: Participant[];
  stories: Story[];
  currentStoryId: string | null;
  round: RoundState;
};

export function createSocket(): Socket {
  const url = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (url) {
    return io(url, { transports: ["websocket", "polling"] });
  }
  // dev default: same-origin via Vite proxy on /socket.io -> server
  return io({ path: "/socket.io", transports: ["websocket", "polling"] });
}



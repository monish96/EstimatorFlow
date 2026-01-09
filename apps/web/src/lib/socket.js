import { io } from "socket.io-client";

export function createSocket() {
  const url = import.meta.env.VITE_SERVER_URL;
  if (url) {
    return io(url, { transports: ["websocket", "polling"] });
  }
  // dev default: same-origin via Vite proxy on /socket.io -> server
  return io({ path: "/socket.io", transports: ["websocket", "polling"] });
}


import type { RealtimeConnectionStatus } from "@/types/view-model";
import { normalizeRealtimeSnapshot } from "@/core/models/normalizers";

export interface ClientsSocketCallbacks {
  onError(error: Error): void;
  onMessage(snapshot: ReturnType<typeof normalizeRealtimeSnapshot>): void;
  onStateChange(status: RealtimeConnectionStatus): void;
}

export interface ClientsSocketController {
  connect(): void;
  disconnect(): void;
  requestSnapshot(): void;
}

export function createClientsSocketController(
  origin: string,
  path: string,
  callbacks: ClientsSocketCallbacks
): ClientsSocketController {
  let reconnectTimer: number | null = null;
  let socket: WebSocket | null = null;
  let destroyed = false;

  const scheduleReconnect = () => {
    if (destroyed || reconnectTimer !== null) {
      return;
    }

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 3_000);
  };

  const connect = () => {
    if (destroyed || socket) {
      return;
    }

    callbacks.onStateChange("connecting");

    const url = new URL(path, origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

    socket = new WebSocket(url.toString());
    socket.addEventListener("open", () => {
      callbacks.onStateChange("open");
      socket?.send("get");
    });
    socket.addEventListener("message", (event) => {
      try {
        callbacks.onMessage(normalizeRealtimeSnapshot(JSON.parse(event.data)));
      } catch (error) {
        callbacks.onError(
          error instanceof Error
            ? error
            : new Error("Failed to parse realtime payload")
        );
      }
    });
    socket.addEventListener("error", () => {
      callbacks.onStateChange("error");
      callbacks.onError(new Error("Realtime connection error"));
    });
    socket.addEventListener("close", () => {
      socket = null;
      callbacks.onStateChange("closed");
      scheduleReconnect();
    });
  };

  return {
    connect,
    disconnect() {
      destroyed = true;

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      callbacks.onStateChange("closed");
      socket?.close();
      socket = null;
    },
    requestSnapshot() {
      socket?.send("get");
    }
  };
}

// src/services/socket.ts
import { BASE_URL, getCurrentUserId } from "./api";

const WS_URL = BASE_URL.replace(/^http/, "ws") + "/ws";

type MessageHandler = (data: any) => void;

class SocketManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  connect() {
    const userId = getCurrentUserId();
    if (!userId) return;

    this.shouldReconnect = true;
    this._connect(userId);
  }

  private _connect(userId: string) {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }

    this.ws = new WebSocket(`${WS_URL}?userId=${userId}`);

    this.ws.onopen = () => {
      console.log("🔌 WebSocket connected");
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._emit(data.type, data);
        this._emit("*", data);
      } catch (e) {
        console.warn("WS parse error", e);
      }
    };

    this.ws.onerror = (e) => {
      console.warn("WS error", e);
    };

    this.ws.onclose = () => {
      console.log("🔴 WebSocket disconnected");
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => {
          const uid = getCurrentUserId();
          if (uid) this._connect(uid);
        }, 3000);
      }
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("WS not open, message dropped");
    }
  }

  sendMessage(conversationId: string, content: string) {
    this.send({ type: "send_message", conversationId, content });
  }

  sendTyping(conversationId: string) {
    this.send({ type: "typing", conversationId });
  }

  joinConversation(conversationId: string) {
    this.send({ type: "join_conversation", conversationId });
  }

  on(event: string, handler: MessageHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: MessageHandler) {
    this.listeners.get(event)?.delete(handler);
  }

  private _emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((h) => h(data));
  }
}

export const socketManager = new SocketManager();
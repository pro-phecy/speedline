// src/services/api.ts
// Change this to your backend URL (e.g., your local IP when testing on a device)
export const BASE_URL = "https://speedline-backend-1w6k.onrender.com"; // Android emulator
// export const BASE_URL = "http://localhost:3000"; // iOS simulator
// export const BASE_URL = "http://YOUR_LOCAL_IP:3000"; // Physical device

let currentUserId: string | null = null;

export function setCurrentUserId(id: string | null) {
  currentUserId = id;
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (currentUserId) {
    headers["x-user-id"] = currentUserId;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }

  return res.json() as Promise<T>;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export async function registerUser(
  username: string,
  password: string,
  avatar_url?: string
): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify({ username, password, avatar_url }),
  });
}

export async function loginUser(
  username: string,
  password: string
): Promise<User> {
  return request<User>("/users/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getUser(id: string): Promise<User> {
  return request<User>(`/users/${id}`);
}

export async function searchUsers(query: string): Promise<User[]> {
  return request<User[]>(`/users?q=${encodeURIComponent(query)}`);
}

// ─── Conversations ─────────────────────────────────────────────────────────────

export interface LastMessage {
  content: string;
  created_at: string;
  sender_id: string;
}

export interface ConversationMember {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_message: LastMessage | null;
  members: ConversationMember[] | null;
}

export async function getConversations(): Promise<Conversation[]> {
  return request<Conversation[]>("/conversations");
}

export async function startDirectMessage(
  target_user_id: string
): Promise<Conversation> {
  return request<Conversation>("/conversations/direct", {
    method: "POST",
    body: JSON.stringify({ target_user_id }),
  });
}

export async function createGroupChat(
  name: string,
  member_ids: string[],
  avatar_url?: string
): Promise<Conversation> {
  return request<Conversation>("/conversations/group", {
    method: "POST",
    body: JSON.stringify({ name, member_ids, avatar_url }),
  });
}

export async function getMembers(
  conversationId: string
): Promise<ConversationMember[]> {
  return request<ConversationMember[]>(
    `/conversations/${conversationId}/members`
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface MessageSender {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface Message {
  id: string;
  content: string;
  created_at: string;
  sender: MessageSender;
}

export async function getMessages(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<Message[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.append("before", before);
  return request<Message[]>(
    `/conversations/${conversationId}/messages?${params}`
  );
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<Message> {
  return request<Message>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
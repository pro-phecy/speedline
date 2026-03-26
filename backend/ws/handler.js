const { sql } = require("../db");
const {
  registerClient,
  unregisterClient,
  joinRoom,
  broadcastToConversation,
} = require("./manager");

/**
 * Handle an incoming WebSocket connection.
 *
 * Client connects with:
 *   ws://localhost:3000?userId=<uuid>
 *
 * Once connected, clients send JSON messages:
 *
 * SEND a message:
 *   { type: "send_message", conversationId: "...", content: "Hello!" }
 *
 * Typing indicator:
 *   { type: "typing", conversationId: "..." }
 *
 * Join a new conversation room (after creating one via REST):
 *   { type: "join_conversation", conversationId: "..." }
 */
async function handleConnection(ws, req) {
  const url = new URL(req.url, "http://localhost");
  const userId = url.searchParams.get("userId");

  if (!userId) {
    ws.send(JSON.stringify({ type: "error", message: "userId is required" }));
    return ws.close();
  }

  // Verify user exists
  const [user] = await sql`
    SELECT id, username, avatar_url FROM users WHERE id = ${userId}
  `;
  if (!user) {
    ws.send(JSON.stringify({ type: "error", message: "User not found" }));
    return ws.close();
  }

  ws.user = user;
  await registerClient(ws, userId);

  ws.send(JSON.stringify({ type: "connected", userId }));
  console.log(`🟢 WS connected: ${user.username} (${userId})`);

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
    }

    try {
      await handleMessage(ws, msg);
    } catch (err) {
      console.error("WS message error:", err);
      ws.send(JSON.stringify({ type: "error", message: "Internal error" }));
    }
  });

  ws.on("close", () => {
    unregisterClient(ws);
    console.log(`🔴 WS disconnected: ${user.username}`);
  });
}

async function handleMessage(ws, msg) {
  const { type, conversationId } = msg;

  // Verify membership for all message types that need a conversationId
  if (conversationId) {
    const [membership] = await sql`
      SELECT 1 FROM conversation_members
      WHERE conversation_id = ${conversationId} AND user_id = ${ws.user.id}
    `;
    if (!membership) {
      return ws.send(JSON.stringify({ type: "error", message: "Not a member of this conversation" }));
    }
  }

  switch (type) {
    case "send_message": {
      const { content } = msg;
      if (!content?.trim()) {
        return ws.send(JSON.stringify({ type: "error", message: "content required" }));
      }

      const [message] = await sql`
        INSERT INTO messages (conversation_id, sender_id, content)
        VALUES (${conversationId}, ${ws.user.id}, ${content.trim()})
        RETURNING id, conversation_id, sender_id, content, created_at
      `;

      const payload = {
        ...message,
        sender: {
          id: ws.user.id,
          username: ws.user.username,
          avatar_url: ws.user.avatar_url,
        },
      };

      // Broadcast to all room members (including sender for confirmation)
      broadcastToConversation(conversationId, {
        type: "new_message",
        payload,
      });
      break;
    }

    case "typing": {
      // Broadcast typing indicator to others in the room (not sender)
      broadcastToConversation(
        conversationId,
        {
          type: "typing",
          userId: ws.user.id,
          username: ws.user.username,
          conversationId,
        },
        ws // exclude sender
      );
      break;
    }

    case "join_conversation": {
      // Called after creating a new conversation via REST so the WS client joins its room
      joinRoom(ws, conversationId);
      ws.send(JSON.stringify({ type: "joined_conversation", conversationId }));
      break;
    }

    default:
      ws.send(JSON.stringify({ type: "error", message: `Unknown type: ${type}` }));
  }
}

module.exports = { handleConnection };
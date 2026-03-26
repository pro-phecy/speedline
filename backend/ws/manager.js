const { sql } = require("../db");

/**
 * rooms: Map<conversationId, Set<WebSocket>>
 * Each connected client is registered in every conversation room they belong to.
 */
const rooms = new Map();

function addToRoom(conversationId, ws) {
  if (!rooms.has(conversationId)) {
    rooms.set(conversationId, new Set());
  }
  rooms.get(conversationId).add(ws);
}

function removeFromRoom(conversationId, ws) {
  const room = rooms.get(conversationId);
  if (!room) return;
  room.delete(ws);
  if (room.size === 0) rooms.delete(conversationId);
}

function broadcastToConversation(conversationId, data, excludeWs = null) {
  const room = rooms.get(conversationId);
  if (!room) return;

  const json = JSON.stringify(data);
  for (const client of room) {
    if (client !== excludeWs && client.readyState === 1 /* OPEN */) {
      client.send(json);
    }
  }
}

/**
 * Register a WebSocket client.
 * Fetches all their conversations from the DB so they join the right rooms.
 */
async function registerClient(ws, userId) {
  ws.userId = userId;
  ws.rooms = new Set();

  const conversations = await sql`
    SELECT conversation_id FROM conversation_members WHERE user_id = ${userId}
  `;

  for (const { conversation_id } of conversations) {
    addToRoom(conversation_id, ws);
    ws.rooms.add(conversation_id);
  }
}

/**
 * Join a single new room (called after creating/joining a conversation).
 */
function joinRoom(ws, conversationId) {
  addToRoom(conversationId, ws);
  ws.rooms.add(conversationId);
}

/**
 * Clean up all rooms when a client disconnects.
 */
function unregisterClient(ws) {
  if (!ws.rooms) return;
  for (const conversationId of ws.rooms) {
    removeFromRoom(conversationId, ws);
  }
}

module.exports = {
  registerClient,
  unregisterClient,
  joinRoom,
  broadcastToConversation,
};
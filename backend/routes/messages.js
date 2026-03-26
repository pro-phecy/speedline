const router = require("express").Router();
const { sql } = require("../db");
const { authenticate } = require("../middleware/auth");
const { broadcastToConversation } = require("../ws/manager");

// GET /conversations/:id/messages — paginated message history
router.get("/:id/messages", authenticate, async (req, res) => {
  // Verify the requester is a member
  const [membership] = await sql`
    SELECT 1 FROM conversation_members
    WHERE conversation_id = ${req.params.id} AND user_id = ${req.user.id}
  `;
  if (!membership) return res.status(403).json({ error: "Not a member" });

  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  // cursor = created_at of the oldest message already loaded (for "load more")
  const before = req.query.before ?? null;

  const messages = await sql`
    SELECT
      m.id,
      m.content,
      m.created_at,
      json_build_object(
        'id', u.id,
        'username', u.username,
        'avatar_url', u.avatar_url
      ) AS sender
    FROM messages m
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ${req.params.id}
    ${before ? sql`AND m.created_at < ${before}` : sql``}
    ORDER BY m.created_at DESC
    LIMIT ${limit}
  `;

  // Return oldest-first for the client to append
  res.json(messages.reverse());
});

// POST /conversations/:id/messages — send a message (REST fallback)
// The primary send path is via WebSocket, but this is useful for testing
router.post("/:id/messages", authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) {
    return res.status(400).json({ error: "content is required" });
  }

  const [membership] = await sql`
    SELECT 1 FROM conversation_members
    WHERE conversation_id = ${req.params.id} AND user_id = ${req.user.id}
  `;
  if (!membership) return res.status(403).json({ error: "Not a member" });

  const [message] = await sql`
    INSERT INTO messages (conversation_id, sender_id, content)
    VALUES (${req.params.id}, ${req.user.id}, ${content.trim()})
    RETURNING id, conversation_id, sender_id, content, created_at
  `;

  const payload = {
    ...message,
    sender: {
      id: req.user.id,
      username: req.user.username,
      avatar_url: req.user.avatar_url,
    },
  };

  // Push to all connected WebSocket clients in this conversation
  broadcastToConversation(req.params.id, {
    type: "new_message",
    payload,
  });

  res.status(201).json(payload);
});

module.exports = router;
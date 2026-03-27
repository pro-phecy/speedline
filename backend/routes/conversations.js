const router = require("express").Router();
const { sql } = require("../db");
const { authenticate } = require("../middleware/auth");

// GET /conversations
router.get("/", authenticate, async (req, res) => {
  try {
    const conversations = await sql`
      SELECT
        c.id,
        c.type,
        c.name,
        c.avatar_url,
        c.created_at,
        (
          SELECT row_to_json(msg)
          FROM (
            SELECT m.content, m.created_at, m.sender_id
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) msg
        ) AS last_message,
        (
          SELECT json_agg(row_to_json(mem))
          FROM (
            SELECT u.id, u.username, u.avatar_url
            FROM conversation_members cm2
            JOIN users u ON u.id = cm2.user_id
            WHERE cm2.conversation_id = c.id
            AND u.id != ${req.user.id}
          ) mem
        ) AS members
      FROM conversations c
      JOIN conversation_members cm ON cm.conversation_id = c.id
      WHERE cm.user_id = ${req.user.id}
      ORDER BY c.created_at DESC
    `;
    res.json(conversations);
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ error: "Failed to get conversations" });
  }
});

// POST /conversations/direct
router.post("/direct", authenticate, async (req, res) => {
  try {
    const { target_user_id } = req.body;
    if (!target_user_id) {
      return res.status(400).json({ error: "target_user_id is required" });
    }

    const [existing] = await sql`
      SELECT c.id FROM conversations c
      JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ${req.user.id}
      JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ${target_user_id}
      WHERE c.type = 'direct'
      LIMIT 1
    `;

    if (existing) return res.json(existing);

    const [conversation] = await sql`
      INSERT INTO conversations (type) VALUES ('direct') RETURNING id, type, created_at
    `;

    await sql`
      INSERT INTO conversation_members (conversation_id, user_id)
      VALUES
        (${conversation.id}, ${req.user.id}),
        (${conversation.id}, ${target_user_id})
    `;

    res.status(201).json(conversation);
  } catch (err) {
    console.error("Start DM error:", err);
    res.status(500).json({ error: "Failed to start conversation" });
  }
});

// POST /conversations/group
router.post("/group", authenticate, async (req, res) => {
  try {
    const { name, avatar_url, member_ids = [] } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const [conversation] = await sql`
      INSERT INTO conversations (type, name, avatar_url)
      VALUES ('group', ${name}, ${avatar_url ?? null})
      RETURNING id, type, name, avatar_url, created_at
    `;

    const allMembers = [...new Set([req.user.id, ...member_ids])];

    await sql`
      INSERT INTO conversation_members (conversation_id, user_id)
      SELECT ${conversation.id}, unnest(${allMembers}::uuid[])
    `;

    res.status(201).json(conversation);
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// POST /conversations/:id/members
router.post("/:id/members", authenticate, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const [membership] = await sql`
      SELECT 1 FROM conversation_members
      WHERE conversation_id = ${req.params.id} AND user_id = ${req.user.id}
    `;
    if (!membership) return res.status(403).json({ error: "Not a member" });

    await sql`
      INSERT INTO conversation_members (conversation_id, user_id)
      VALUES (${req.params.id}, ${user_id})
      ON CONFLICT DO NOTHING
    `;

    res.json({ ok: true });
  } catch (err) {
    console.error("Add member error:", err);
    res.status(500).json({ error: "Failed to add member" });
  }
});

// GET /conversations/:id/members
router.get("/:id/members", authenticate, async (req, res) => {
  try {
    const members = await sql`
      SELECT u.id, u.username, u.avatar_url, cm.joined_at
      FROM conversation_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.conversation_id = ${req.params.id}
      ORDER BY cm.joined_at ASC
    `;
    res.json(members);
  } catch (err) {
    console.error("Get members error:", err);
    res.status(500).json({ error: "Failed to get members" });
  }
});

module.exports = router;
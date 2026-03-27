const router = require("express").Router();
const { sql } = require("../db");
const { authenticate } = require("../middleware/auth");

// GET /conversations
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("USER:", req.user);
    console.log("USER ID:", userId);

    // Step 1: get all conversation IDs this user belongs to
    const memberships = await sql`
      SELECT conversation_id 
      FROM conversation_members 
      WHERE user_id = ${userId}
    `;

    if (memberships.length === 0) {
      return res.json([]);
    }

    const conversationIds = memberships.map((m) => m.conversation_id);

    // Step 2: get conversation base info
    const conversations = await sql`
      SELECT id, type, name, avatar_url, created_at
      FROM conversations
      WHERE id = ANY(${conversationIds})
    `;

    // Step 3: get last message per conversation
    const lastMessages = await sql`
      SELECT DISTINCT ON (conversation_id)
        conversation_id,
        content,
        created_at,
        sender_id
      FROM messages
      WHERE conversation_id = ANY(${conversationIds})
      ORDER BY conversation_id, created_at DESC
    `;

    // Step 4: get all members (excluding current user)
    const members = await sql`
      SELECT cm.conversation_id, u.id, u.username, u.avatar_url
      FROM conversation_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.conversation_id = ANY(${conversationIds})
        AND u.id != ${userId}
    `;

    // Step 5: assemble maps
    const lastMessageMap = {};
    for (const msg of lastMessages) {
      lastMessageMap[msg.conversation_id] = {
        content: msg.content,
        created_at: msg.created_at,
        sender_id: msg.sender_id,
      };
    }

    const membersMap = {};
    for (const m of members) {
      if (!membersMap[m.conversation_id]) {
        membersMap[m.conversation_id] = [];
      }
      membersMap[m.conversation_id].push({
        id: m.id,
        username: m.username,
        avatar_url: m.avatar_url,
      });
    }

    // Step 6: assemble and sort by latest activity
    const result = conversations
      .map((c) => ({
        ...c,
        last_message: lastMessageMap[c.id] ?? null,
        members: membersMap[c.id] ?? [],
      }))
      .sort((a, b) => {
        const aTime = a.last_message?.created_at ?? a.created_at;
        const bTime = b.last_message?.created_at ?? b.created_at;
        return new Date(bTime) - new Date(aTime);
      });

    res.json(result);
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
      SELECT c.id 
      FROM conversations c
      JOIN conversation_members cm1 
        ON cm1.conversation_id = c.id AND cm1.user_id = ${req.user.id}
      JOIN conversation_members cm2 
        ON cm2.conversation_id = c.id AND cm2.user_id = ${target_user_id}
      WHERE c.type = 'direct'
      LIMIT 1
    `;

    if (existing) return res.json(existing);

    const [conversation] = await sql`
      INSERT INTO conversations (type) 
      VALUES ('direct') 
      RETURNING id, type, created_at
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

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const [conversation] = await sql`
      INSERT INTO conversations (type, name, avatar_url)
      VALUES ('group', ${name}, ${avatar_url ?? null})
      RETURNING id, type, name, avatar_url, created_at
    `;

    const allMembers = [...new Set([req.user.id, ...member_ids])];

    await sql`
      INSERT INTO conversation_members (conversation_id, user_id)
      SELECT ${conversation.id}, unnest(${allMembers})
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

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const [membership] = await sql`
      SELECT 1 
      FROM conversation_members
      WHERE conversation_id = ${req.params.id} 
        AND user_id = ${req.user.id}
    `;

    if (!membership) {
      return res.status(403).json({ error: "Not a member" });
    }

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
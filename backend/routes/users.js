const router = require("express").Router();
const { sql } = require("../db");
const { authenticate } = require("../middleware/auth");

// POST /users — register a new user
router.post("/", async (req, res) => {
  const { username, avatar_url } = req.body;

  if (!username) {
    return res.status(400).json({ error: "username is required" });
  }

  try {
    const [user] = await sql`
      INSERT INTO users (username,password,avatar_url)
      VALUES (${username}, ${password}, ${avatar_url ?? null})
      RETURNING id, username, avatar_url, created_at
    `;
    res.status(201).json(user);
  } catch (err) {
    if (err.message.includes("unique")) {
      return res.status(409).json({ error: "Username already taken" });
    }
    throw err;
  }
});

// GET /users/:id — get a user's public profile
router.get("/:id", authenticate, async (req, res) => {
  const [user] = await sql`
    SELECT id, username, password, avatar_url, created_at
    FROM users WHERE id = ${req.params.id}
  `;

  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// GET /users — search users by username
router.get("/", authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "q query param required" });

  const users = await sql`
    SELECT id, username, avatar_url
    FROM users
    WHERE username ILIKE ${"%" + q + "%"}
    AND id != ${req.user.id}
    LIMIT 20
  `;
  res.json(users);
});

module.exports = router;
const router = require("express").Router();
const { sql } = require("../db");
const { authenticate } = require("../middleware/auth");

// POST /users — register a new user
router.post("/", async (req, res) => {
  const { username, password, full_name, role, avatar_url } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  if (!full_name) {
    return res.status(400).json({ error: "full_name is required" });
  }

  try {
    const [user] = await sql`
      INSERT INTO users (username, password, full_name, role, avatar_url)
      VALUES (${username}, ${password}, ${full_name}, ${role ?? null}, ${avatar_url ?? null})
      RETURNING id, username, full_name, role, avatar_url, created_at
    `;
    res.status(201).json(user);
  } catch (err) {
    if (err.message.includes("unique")) {
      return res.status(409).json({ error: "Username already taken" });
    }
    throw err;
  }
});

// POST /users/login — sign in
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const [user] = await sql`
    SELECT id, username, full_name, role, avatar_url, created_at
    FROM users
    WHERE username = ${username} AND password = ${password}
  `;

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json(user);
});

// GET /users/:id — get a user's public profile
router.get("/:id", authenticate, async (req, res) => {
  const [user] = await sql`
    SELECT id, username, full_name, role, avatar_url, created_at
    FROM users WHERE id = ${req.params.id}
  `;

  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// PATCH /users/:id — update own profile
router.patch("/:id", authenticate, async (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: "You can only update your own profile" });
  }

  const { full_name, role, bio, avatar_url } = req.body;

  const [user] = await sql`
    UPDATE users SET
      full_name  = COALESCE(${full_name  ?? null}, full_name),
      role       = COALESCE(${role       ?? null}, role),
      bio        = COALESCE(${bio        ?? null}, bio),
      avatar_url = COALESCE(${avatar_url ?? null}, avatar_url),
      updated_at = NOW()
    WHERE id = ${req.params.id}
    RETURNING id, username, full_name, role, bio, avatar_url, updated_at
  `;

  res.json(user);
});

// GET /users — search users by username or role
router.get("/", authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "q query param required" });

  const users = await sql`
    SELECT id, username, full_name, role, avatar_url
    FROM users
    WHERE (
      username  ILIKE ${"%" + q + "%"} OR
      full_name ILIKE ${"%" + q + "%"} OR
      role      ILIKE ${"%" + q + "%"}
    )
    AND id != ${req.user.id}
    LIMIT 20
  `;
  res.json(users);
});

module.exports = router;
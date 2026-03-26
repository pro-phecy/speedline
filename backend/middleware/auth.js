const { sql } = require("../db");

/**
 * Auth middleware.
 * Expects header:  x-user-id: <uuid>
 *
 * For a real app, swap this out for JWT verification:
 *   const token = req.headers.authorization?.split(" ")[1];
 *   const payload = jwt.verify(token, process.env.JWT_SECRET);
 *   req.user = payload;
 */
async function authenticate(req, res, next) {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ error: "Missing x-user-id header" });
  }

  const [user] = await sql`
    SELECT id, username, password, avatar_url FROM users WHERE id = ${userId}
  `;

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  req.user = user;
  next();
}

module.exports = { authenticate };
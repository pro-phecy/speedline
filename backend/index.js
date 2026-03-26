require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { WebSocketServer } = require("ws");

const { initSchema } = require("./db");
const { handleConnection } = require("./ws/handler");

const usersRouter = require("./routes/users");
const conversationsRouter = require("./routes/conversations");
const messagesRouter = require("./routes/messages");

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── REST Routes ──────────────────────────────────────────────────────────────
app.use("/users", usersRouter);
app.use("/conversations", conversationsRouter);
app.use("/conversations", messagesRouter);

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── HTTP + WebSocket Server ───────────────────────────────────────────────────
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", handleConnection);

// ─── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

async function start() {
  await initSchema();
  server.listen(PORT, () => {
    console.log(`🚀 HTTP server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server running on ws://localhost:${PORT}/ws`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
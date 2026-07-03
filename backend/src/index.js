require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth.routes");
const listingRoutes = require("./routes/listing.routes");
const tenantRoutes = require("./routes/tenant.routes");
const interestRoutes = require("./routes/interest.routes");
const chatRoutes = require("./routes/chat.routes");
const adminRoutes = require("./routes/admin.routes");
const { initChatSocket } = require("./sockets/chatSocket");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});
initChatSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Rent & Flatmate Finder API running on port ${PORT}`);
});

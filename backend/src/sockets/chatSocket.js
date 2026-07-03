const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { assertParticipant } = require("../controllers/chat.controller");

/**
 * One Socket.IO room per Interest (accepted tenant<->owner thread).
 * Room name: `interest:<interestId>`
 */
function initChatSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_room", async ({ interestId }, ack) => {
      const { error, message } = await assertParticipant(interestId, socket.user.id);
      if (error) {
        return ack?.({ ok: false, error: message });
      }
      socket.join(`interest:${interestId}`);
      ack?.({ ok: true });
    });

    socket.on("send_message", async ({ interestId, content }, ack) => {
      if (!content || !content.trim()) {
        return ack?.({ ok: false, error: "Message content cannot be empty" });
      }

      const { error, message } = await assertParticipant(interestId, socket.user.id);
      if (error) {
        return ack?.({ ok: false, error: message });
      }

      const saved = await prisma.message.create({
        data: {
          interestId,
          senderId: socket.user.id,
          content: content.trim(),
        },
        include: { sender: { select: { id: true, name: true } } },
      });

      io.to(`interest:${interestId}`).emit("new_message", saved);
      ack?.({ ok: true, message: saved });
    });

    socket.on("disconnect", () => {
      // no-op: rooms are cleaned up automatically by Socket.IO
    });
  });
}

module.exports = { initChatSocket };

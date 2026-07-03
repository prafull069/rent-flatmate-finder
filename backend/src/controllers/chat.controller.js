const prisma = require("../config/db");

async function assertParticipant(interestId, userId) {
  const interest = await prisma.interest.findUnique({
    where: { id: interestId },
    include: { listing: true },
  });
  if (!interest) return { error: 404, message: "Chat thread not found" };
  if (interest.status !== "ACCEPTED") {
    return { error: 403, message: "Chat is only available once interest has been accepted" };
  }
  const isTenant = interest.tenantId === userId;
  const isOwner = interest.listing.ownerId === userId;
  if (!isTenant && !isOwner) {
    return { error: 403, message: "You are not part of this conversation" };
  }
  return { interest };
}

async function getMessages(req, res) {
  const { interestId } = req.params;
  const { error, message, interest } = await assertParticipant(interestId, req.user.id);
  if (error) return res.status(error).json({ error: message });

  const messages = await prisma.message.findMany({
    where: { interestId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true } } },
  });

  return res.json({ interest, messages });
}

module.exports = { getMessages, assertParticipant };

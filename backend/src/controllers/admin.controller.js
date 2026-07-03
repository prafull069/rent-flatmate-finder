const prisma = require("../config/db");

async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isBanned: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ users });
}

async function setUserBan(req, res) {
  const { id } = req.params;
  const { isBanned } = req.body;
  const user = await prisma.user.update({
    where: { id },
    data: { isBanned: Boolean(isBanned) },
  });
  return res.json({ user });
}

async function listAllListings(req, res) {
  const listings = await prisma.listing.findMany({
    include: { owner: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ listings });
}

async function deleteListing(req, res) {
  const { id } = req.params;
  await prisma.listing.delete({ where: { id } });
  return res.json({ success: true });
}

async function activitySummary(req, res) {
  const [userCount, listingCount, activeListingCount, interestCount, messageCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: "ACTIVE" } }),
      prisma.interest.count(),
      prisma.message.count(),
    ]);

  return res.json({
    userCount,
    listingCount,
    activeListingCount,
    interestCount,
    messageCount,
  });
}

module.exports = { listUsers, setUserBan, listAllListings, deleteListing, activitySummary };

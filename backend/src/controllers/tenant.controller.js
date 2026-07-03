const prisma = require("../config/db");

async function upsertProfile(req, res) {
  const { preferredLocation, budgetMin, budgetMax, moveInDate } = req.body;

  if (!preferredLocation || budgetMin == null || budgetMax == null || !moveInDate) {
    return res.status(400).json({
      error: "preferredLocation, budgetMin, budgetMax, and moveInDate are required",
    });
  }
  if (Number(budgetMin) > Number(budgetMax)) {
    return res.status(400).json({ error: "budgetMin cannot be greater than budgetMax" });
  }

  const profile = await prisma.tenantProfile.upsert({
    where: { userId: req.user.id },
    update: {
      preferredLocation,
      budgetMin: Number(budgetMin),
      budgetMax: Number(budgetMax),
      moveInDate: new Date(moveInDate),
    },
    create: {
      userId: req.user.id,
      preferredLocation,
      budgetMin: Number(budgetMin),
      budgetMax: Number(budgetMax),
      moveInDate: new Date(moveInDate),
    },
  });

  return res.json({ profile });
}

async function getMyProfile(req, res) {
  const profile = await prisma.tenantProfile.findUnique({
    where: { userId: req.user.id },
  });
  return res.json({ profile });
}

module.exports = { upsertProfile, getMyProfile };

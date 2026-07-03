const prisma = require("../config/db");
const { getOrComputeScore } = require("../services/scoringService");
const {
  notifyOwnerHighScoreInterest,
  notifyTenantInterestDecision,
} = require("../services/emailService");

const HIGH_SCORE_THRESHOLD = Number(process.env.HIGH_SCORE_THRESHOLD || 80);

async function sendInterest(req, res) {
  const { listingId } = req.body;
  if (!listingId) return res.status(400).json({ error: "listingId is required" });

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { owner: true },
  });
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.status === "FILLED") {
    return res.status(400).json({ error: "This listing has already been filled" });
  }

  const tenantProfile = await prisma.tenantProfile.findUnique({
    where: { userId: req.user.id },
  });
  if (!tenantProfile) {
    return res.status(400).json({ error: "Complete your tenant profile before expressing interest" });
  }

  const existing = await prisma.interest.findUnique({
    where: { tenantId_listingId: { tenantId: req.user.id, listingId } },
  });
  if (existing) {
    return res.status(409).json({ error: "You have already expressed interest in this listing" });
  }

  const interest = await prisma.interest.create({
    data: { tenantId: req.user.id, listingId },
  });

  // Ensure a score exists (cached) so we know whether to notify the owner
  const score = await getOrComputeScore(tenantProfile, listing);

  if (score.score > HIGH_SCORE_THRESHOLD) {
    const tenant = await prisma.user.findUnique({ where: { id: req.user.id } });
    await notifyOwnerHighScoreInterest({
      owner: listing.owner,
      tenant,
      listing,
      score: score.score,
    });
  }

  return res.status(201).json({ interest, compatibility: score });
}

async function respondToInterest(req, res) {
  const { id } = req.params;
  const { decision } = req.body; // "ACCEPTED" | "DECLINED"

  if (!["ACCEPTED", "DECLINED"].includes(decision)) {
    return res.status(400).json({ error: "decision must be ACCEPTED or DECLINED" });
  }

  const interest = await prisma.interest.findUnique({
    where: { id },
    include: { listing: true, tenant: true },
  });
  if (!interest) return res.status(404).json({ error: "Interest request not found" });
  if (interest.listing.ownerId !== req.user.id) {
    return res.status(403).json({ error: "You do not own the listing for this interest" });
  }

  const updated = await prisma.interest.update({
    where: { id },
    data: { status: decision },
  });

  await notifyTenantInterestDecision({
    tenant: interest.tenant,
    listing: interest.listing,
    status: decision,
  });

  return res.json({ interest: updated });
}

async function myInterests(req, res) {
  const interests = await prisma.interest.findMany({
    where: { tenantId: req.user.id },
    include: { listing: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ interests });
}

module.exports = { sendInterest, respondToInterest, myInterests };

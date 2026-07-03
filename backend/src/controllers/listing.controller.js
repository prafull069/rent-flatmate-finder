const prisma = require("../config/db");
const { scoreListingsForTenant, getOrComputeScore } = require("../services/scoringService");

async function createListing(req, res) {
  const { location, rent, availableFrom, roomType, furnishing, photos } = req.body;

  if (!location || !rent || !availableFrom || !roomType || !furnishing) {
    return res.status(400).json({
      error: "location, rent, availableFrom, roomType, and furnishing are required",
    });
  }

  const listing = await prisma.listing.create({
    data: {
      ownerId: req.user.id,
      location,
      rent: Number(rent),
      availableFrom: new Date(availableFrom),
      roomType,
      furnishing,
      photos: photos || [],
    },
  });

  return res.status(201).json({ listing });
}

async function updateListing(req, res) {
  const { id } = req.params;
  const listing = await prisma.listing.findUnique({ where: { id } });

  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.ownerId !== req.user.id) {
    return res.status(403).json({ error: "You do not own this listing" });
  }

  const { location, rent, availableFrom, roomType, furnishing, photos, status } = req.body;

  const updated = await prisma.listing.update({
    where: { id },
    data: {
      ...(location && { location }),
      ...(rent && { rent: Number(rent) }),
      ...(availableFrom && { availableFrom: new Date(availableFrom) }),
      ...(roomType && { roomType }),
      ...(furnishing && { furnishing }),
      ...(photos && { photos }),
      ...(status && { status }),
    },
  });

  return res.json({ listing: updated });
}

async function markFilled(req, res) {
  const { id } = req.params;
  const listing = await prisma.listing.findUnique({ where: { id } });

  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.ownerId !== req.user.id) {
    return res.status(403).json({ error: "You do not own this listing" });
  }

  const updated = await prisma.listing.update({
    where: { id },
    data: { status: "FILLED" },
  });

  return res.json({ listing: updated });
}

async function myListings(req, res) {
  const listings = await prisma.listing.findMany({
    where: { ownerId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: { interests: { include: { tenant: true } } },
  });
  return res.json({ listings });
}

/**
 * Public browse endpoint. If the caller is an authenticated tenant with a
 * profile, results are enriched with compatibility scores and sorted
 * descending by score. Otherwise plain filtered listings are returned.
 */
async function browseListings(req, res) {
  const { location, budgetMin, budgetMax } = req.query;

  const where = {
    status: "ACTIVE",
    ...(location && { location: { contains: String(location), mode: "insensitive" } }),
    ...(budgetMax && { rent: { lte: Number(budgetMax) } }),
  };
  if (budgetMin) {
    where.rent = { ...(where.rent || {}), gte: Number(budgetMin) };
  }

  const listings = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { id: true, name: true } } },
  });

  // Enrich with compatibility scores if the requester is a tenant with a profile
  if (req.user && req.user.role === "TENANT") {
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (tenantProfile) {
      const ranked = await scoreListingsForTenant(tenantProfile, listings);
      return res.json({ listings: ranked });
    }
  }

  return res.json({ listings });
}

async function getListing(req, res) {
  const { id } = req.params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  if (!listing) return res.status(404).json({ error: "Listing not found" });

  let compatibility = null;
  if (req.user && req.user.role === "TENANT") {
    const tenantProfile = await prisma.tenantProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (tenantProfile) {
      compatibility = await getOrComputeScore(tenantProfile, listing);
    }
  }

  return res.json({ listing, compatibility });
}

module.exports = {
  createListing,
  updateListing,
  markFilled,
  myListings,
  browseListings,
  getListing,
};

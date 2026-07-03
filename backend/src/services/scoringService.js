const prisma = require("../config/db");
const { callLLM } = require("./llmService");
const { computeRuleBasedScore } = require("../utils/ruleBasedScore");

/**
 * Returns the compatibility score for a (tenant, listing) pair.
 * - If already computed, returns the cached row (no recomputation).
 * - Otherwise calls the LLM; on any failure, falls back to the rule-based
 *   scorer so the user always gets a result.
 */
async function getOrComputeScore(tenantProfile, listing) {
  const existing = await prisma.compatibilityScore.findUnique({
    where: {
      tenantId_listingId: {
        tenantId: tenantProfile.id,
        listingId: listing.id,
      },
    },
  });

  if (existing) return existing;

  let result;
  let source;

  try {
    result = await callLLM(listing, tenantProfile);
    source = "LLM";
  } catch (err) {
    console.error("LLM scoring failed, using rule-based fallback:", err.message);
    result = computeRuleBasedScore(listing, tenantProfile);
    source = "FALLBACK";
  }

  const saved = await prisma.compatibilityScore.create({
    data: {
      tenantId: tenantProfile.id,
      listingId: listing.id,
      score: result.score,
      explanation: result.explanation,
      source,
    },
  });

  return saved;
}

/** Bulk-compute scores for a tenant across many listings (used on browse). */
async function scoreListingsForTenant(tenantProfile, listings) {
  const results = await Promise.all(
    listings.map(async (listing) => {
      const score = await getOrComputeScore(tenantProfile, listing);
      return { ...listing, compatibility: score };
    })
  );

  return results.sort((a, b) => b.compatibility.score - a.compatibility.score);
}

module.exports = { getOrComputeScore, scoreListingsForTenant };

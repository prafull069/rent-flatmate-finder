/**
 * Deterministic fallback scorer used when the LLM is unavailable or returns
 * an unparsable response. Mirrors the same budget/location factors the LLM
 * is asked to weigh, so scores stay roughly comparable across sources.
 */
function computeRuleBasedScore(listing, tenantProfile) {
  let score = 100;
  const reasons = [];

  // --- Location match ---
  const listingLoc = (listing.location || "").trim().toLowerCase();
  const prefLoc = (tenantProfile.preferredLocation || "").trim().toLowerCase();

  if (listingLoc && prefLoc) {
    if (listingLoc === prefLoc) {
      reasons.push("location matches exactly");
    } else if (listingLoc.includes(prefLoc) || prefLoc.includes(listingLoc)) {
      score -= 15;
      reasons.push("location is a partial match");
    } else {
      score -= 40;
      reasons.push("location does not match the tenant's preference");
    }
  }

  // --- Budget match ---
  const rent = listing.rent;
  const { budgetMin, budgetMax } = tenantProfile;

  if (rent > budgetMax) {
    const overagePct = (rent - budgetMax) / budgetMax;
    const penalty = Math.min(50, Math.round(overagePct * 100));
    score -= penalty;
    reasons.push(`rent exceeds the tenant's max budget by ${Math.round(overagePct * 100)}%`);
  } else if (rent < budgetMin) {
    // Not necessarily bad, but flag as a mismatch in expectations
    score -= 10;
    reasons.push("rent is notably below the tenant's expected budget range");
  } else {
    reasons.push("rent falls within the tenant's budget range");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const explanation =
    `Rule-based estimate (LLM unavailable): ${reasons.join("; ")}.`;

  return { score, explanation };
}

module.exports = { computeRuleBasedScore };

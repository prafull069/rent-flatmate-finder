/**
 * Wraps the Anthropic Messages API to produce a compatibility score.
 * Any failure (network, timeout, bad JSON) throws, and the caller
 * (scoringService) is responsible for falling back to the rule-based scorer.
 */

const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 8000);
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

function buildPrompt(listing, tenantProfile) {
  return `Given this room listing:
${JSON.stringify(
  {
    location: listing.location,
    rent: listing.rent,
    roomType: listing.roomType,
    furnishing: listing.furnishing,
    availableFrom: listing.availableFrom,
  },
  null,
  2
)}

and this tenant profile:
${JSON.stringify(
  {
    preferredLocation: tenantProfile.preferredLocation,
    budgetMin: tenantProfile.budgetMin,
    budgetMax: tenantProfile.budgetMax,
    moveInDate: tenantProfile.moveInDate,
  },
  null,
  2
)}

Compute a compatibility score from 0 to 100 based on budget and location match.
Respond with ONLY valid JSON, no markdown fences, no extra text, in exactly this shape:
{ "score": number, "explanation": string }`;
}

async function callLLM(listing, tenantProfile) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: buildPrompt(listing, tenantProfile) }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const rawText = (data.content || [])
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    if (
      typeof parsed.score !== "number" ||
      parsed.score < 0 ||
      parsed.score > 100 ||
      typeof parsed.explanation !== "string"
    ) {
      throw new Error("LLM response did not match expected shape");
    }

    return {
      score: Math.round(parsed.score),
      explanation: parsed.explanation.trim(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { callLLM };

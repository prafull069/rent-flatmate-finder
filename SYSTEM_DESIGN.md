# System Design — Keyhold (Rent & Flatmate Finder)

## Compatibility scoring design

The core design decision is that a compatibility score is a **fact about a
(tenant, listing) pair**, not a property of a request. It's computed once and
persisted in a `CompatibilityScore` table with a unique `(tenantId, listingId)`
constraint, tagged with its `source` (`LLM` or `FALLBACK`). Every subsequent
read — browsing, viewing a listing, sending interest — checks this table first
and only calls the LLM on a cache miss. This does three things: it keeps
latency predictable on browse (no LLM round-trip per listing after the first
view), it keeps LLM spend bounded (linear in distinct pairs, not in page
views), and it gives an audit trail — an admin or a support conversation can
see exactly what score a tenant was shown and why, rather than a number that
might change between requests.

The browse endpoint (`GET /listings`) enriches results server-side: if the
caller is an authenticated tenant with a saved profile, each active listing is
scored (cache-first) and the list is sorted descending by score before it's
returned. This keeps ranking logic in one place (the backend) instead of
duplicating it in the frontend, and means the API contract already reflects
"what should this tenant see first" rather than making the client re-sort raw
data.

## LLM integration and fallback

`llmService.js` builds a single, tightly-scoped prompt: it hands the model the
listing's location/rent/type/furnishing/availability and the tenant's
preferred location/budget/move-in date, and asks for strict JSON output
(`{ score, explanation }`), explicitly forbidding markdown fences or
commentary. The call goes through the Anthropic Messages API with an
`AbortController` timeout (`LLM_TIMEOUT_MS`, default 8s) so a slow or hanging
call can't stall the request indefinitely.

Failure handling is centralized in `scoringService.js`: the LLM call is
wrapped in try/catch, and *any* failure mode — missing API key, network error,
timeout, non-200 response, or a response that doesn't parse into the expected
`{score, explanation}` shape — is treated identically and routes to
`computeRuleBasedScore()`. This rule-based scorer mirrors the same two factors
the LLM is asked to weigh (location match, budget fit) using simple, auditable
arithmetic: an exact location match keeps the score at 100, a partial/substring
match costs 15 points, a non-match costs 40; rent above the tenant's max budget
is penalized proportionally to how far over (capped at 50), rent below the
minimum costs a flat 10. The result is clamped to [0, 100] and saved with
`source: FALLBACK`, and the frontend renders a small "estimated · AI scoring
unavailable" label on fallback scores so tenants aren't misled into thinking
every score came from the LLM. Because both paths write into the same table
with the same shape, nothing downstream (ranking, notification thresholds,
chat gating) needs to know or care which path produced a given score — the
degradation is fully transparent to the rest of the system.

## Chat implementation

Chat is modeled as one Socket.IO room per accepted `Interest`
(`interest:<id>`), not a general-purpose DM system — this is deliberate: it
means chat access control reduces to "is this interest accepted, and is this
user the tenant or the listing's owner on it," which is checked identically on
both the REST history endpoint and every socket event via a shared
`assertParticipant()` helper. The socket layer authenticates once at
connection time (JWT passed in the `auth` handshake payload, verified in
`io.use()` middleware) rather than trusting a client-supplied user ID per
event. `send_message` writes to Postgres via Prisma *before* broadcasting, so
the emitted `new_message` event and the persisted row are always consistent —
a page refresh replays exactly what was broadcast in real time via the REST
history endpoint, which loads on mount before the socket connects.

## Notification flow

Email notifications are intentionally synchronous and best-effort rather than
queued, appropriate for a project of this scope: `emailService.js` wraps
`nodemailer.sendMail` in a try/catch so an SMTP outage degrades gracefully
(logged, not thrown) instead of failing the triggering API request — a tenant
expressing interest should never see a 500 because an email provider is down.
Two triggers are wired into the business logic rather than as a generic event
bus, since there are only two: (1) `POST /interests` computes/fetches the
compatibility score as part of creating the interest, and if it exceeds
`HIGH_SCORE_THRESHOLD` (default 80), emails the owner immediately with the
tenant's name and score; (2) `PATCH /interests/:id/respond` emails the tenant
the moment the owner accepts or declines. Every send is also logged to a
`Notification` table (type + JSON payload), which gives the admin panel and
future debugging a durable record independent of the email provider's own
logs, and would be the natural place to plug in a retry queue later without
changing calling code.

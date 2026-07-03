const jwt = require("jsonwebtoken");

// Used on public routes that behave differently for logged-in users
// (e.g. browsing listings as a tenant adds compatibility scores).
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // ignore invalid token on optional routes
  }
  next();
}

module.exports = { optionalAuth };

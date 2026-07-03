const express = require("express");
const {
  createListing,
  updateListing,
  markFilled,
  myListings,
  browseListings,
  getListing,
} = require("../controllers/listing.controller");
const { authRequired } = require("../middleware/auth");
const { optionalAuth } = require("../middleware/optionalAuth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

router.get("/", optionalAuth, browseListings);
router.get("/mine", authRequired, requireRole("OWNER"), myListings);
router.get("/:id", optionalAuth, getListing);
router.post("/", authRequired, requireRole("OWNER"), createListing);
router.patch("/:id", authRequired, requireRole("OWNER"), updateListing);
router.patch("/:id/fill", authRequired, requireRole("OWNER"), markFilled);

module.exports = router;

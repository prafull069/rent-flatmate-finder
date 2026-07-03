const express = require("express");
const {
  listUsers,
  setUserBan,
  listAllListings,
  deleteListing,
  activitySummary,
} = require("../controllers/admin.controller");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();
router.use(authRequired, requireRole("ADMIN"));

router.get("/users", listUsers);
router.patch("/users/:id/ban", setUserBan);
router.get("/listings", listAllListings);
router.delete("/listings/:id", deleteListing);
router.get("/activity", activitySummary);

module.exports = router;

const express = require("express");
const { sendInterest, respondToInterest, myInterests } = require("../controllers/interest.controller");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

router.post("/", authRequired, requireRole("TENANT"), sendInterest);
router.get("/mine", authRequired, requireRole("TENANT"), myInterests);
router.patch("/:id/respond", authRequired, requireRole("OWNER"), respondToInterest);

module.exports = router;

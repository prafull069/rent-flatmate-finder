const express = require("express");
const { upsertProfile, getMyProfile } = require("../controllers/tenant.controller");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

router.get("/profile", authRequired, requireRole("TENANT"), getMyProfile);
router.put("/profile", authRequired, requireRole("TENANT"), upsertProfile);

module.exports = router;

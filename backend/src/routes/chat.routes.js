const express = require("express");
const { getMessages } = require("../controllers/chat.controller");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/:interestId/messages", authRequired, getMessages);

module.exports = router;

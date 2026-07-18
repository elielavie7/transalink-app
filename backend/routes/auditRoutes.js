const express = require("express");
const router = express.Router();

const auditController = require("../controllers/auditController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", protect, auditController.getAuditLogs);

module.exports = router;
const express = require("express");
const router = express.Router();

const backupController = require("../controllers/backupController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", protect, backupController.getBackups);
router.post("/create", protect, backupController.createBackup);
router.get("/download/:filename", protect, backupController.downloadBackup);

module.exports = router;
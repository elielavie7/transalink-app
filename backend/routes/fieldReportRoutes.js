const express = require("express");
const router = express.Router();

const fieldReportController = require("../controllers/fieldReportController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/submit", protect, fieldReportController.submitFieldReport);
router.get("/", protect, fieldReportController.getFieldReports);

module.exports = router;
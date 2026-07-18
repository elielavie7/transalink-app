const express = require("express");
const router = express.Router();

const agencyController = require("../controllers/agencyController");
const auth = require("../middlewares/authMiddleware");

router.get("/", auth.protect, agencyController.getAgencies);

module.exports = router;
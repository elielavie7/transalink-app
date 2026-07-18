const express = require("express");
const router = express.Router();

const returnCodeController = require("../controllers/returnCodeController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../config/upload");

router.post("/create", protect, returnCodeController.createReturnCode);
router.get("/", protect, returnCodeController.getReturnCodes);
router.put("/release/:id", protect, returnCodeController.releaseReturnCode);
router.put("/cancel/:id", protect, returnCodeController.cancelReturnCode);

router.put(
    "/audio/:id",
    protect,
    upload.single("audio"),
    returnCodeController.uploadReturnCodeAudio
);

module.exports = router;
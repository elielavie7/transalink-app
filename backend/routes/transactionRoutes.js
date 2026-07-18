const express = require("express");
const router = express.Router();

const transactionController = require("../controllers/transactionController");
const { protect } = require("../middlewares/authMiddleware");

const upload = require("../config/upload");

router.put(
  "/sent/:id",
  protect,
  upload.single("receipt"),
  transactionController.markTransactionSent
);
router.put(
  "/audio/:id",
  protect,
  upload.single("audio"),
  transactionController.uploadTransactionAudio
);

router.post("/create", protect, transactionController.createTransaction);
router.get("/", protect, transactionController.getTransactions);
router.put("/status/:id", protect, transactionController.updateTransactionStatus);
router.put("/cancel/:id", protect, transactionController.cancelTransaction);

module.exports = router;
const express = require("express");
const router = express.Router();

const transactionController = require("../controllers/transactionController");
const { protect } = require("../middlewares/authMiddleware");

const upload = require("../config/upload");

router.put(
  "/sent/:id",
  protect,
  upload.single("receipt"),
  transactionController.markTransactionSent,
);
router.put(
  "/audio/:id",
  protect,
  upload.single("audio"),
  transactionController.uploadTransactionAudio,
);

router.post("/create", protect, transactionController.createTransaction);
router.get("/", protect, transactionController.getTransactions);
router.put(
  "/status/:id",
  protect,
  transactionController.updateTransactionStatus,
);
router.put("/cancel/:id", protect, transactionController.cancelTransaction);

// Marquer une transaction comme vue par l'agent
router.put("/seen/agent/:id", protect, transactionController.markAgentSeen);

// Marquer la réponse comme vue par le terrain
router.put("/seen/terrain/:id", protect, transactionController.markTerrainSeen);

module.exports = router;

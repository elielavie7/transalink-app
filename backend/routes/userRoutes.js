const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/create", userController.createUser);

router.get("/me", protect, userController.getMe);
router.put("/name", protect, userController.updateName);
router.put("/password", protect, userController.changePassword);
router.put("/transaction-pin", protect, userController.changeTransactionPin);

router.put("/heartbeat", protect, userController.heartbeat);
router.get("/presence", protect, userController.getPresence);

router.get("/presence-target", protect, userController.getPresenceTarget);

module.exports = router;

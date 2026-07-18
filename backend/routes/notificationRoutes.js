const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", protect, notificationController.getNotifications);
router.get("/unread-count", protect, notificationController.getUnreadCount);
router.put("/read/:id", protect, notificationController.markAsRead);
router.put("/read-all", protect, notificationController.markAllAsRead);
router.put("/read-types", protect, notificationController.markTypesAsRead);
router.delete("/", protect, notificationController.deleteMyNotifications);

module.exports = router;
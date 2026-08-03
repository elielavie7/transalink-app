const express = require("express");

const router = express.Router();

const deviceController = require("../controllers/deviceController");
const { protect } = require("../middlewares/authMiddleware");
const {
  sendNotificationToUser,
} = require("../services/firebaseNotificationService");

router.post("/register", protect, deviceController.registerDeviceToken);

router.delete("/unregister", protect, deviceController.unregisterDeviceToken);

router.get("/me", protect, deviceController.getMyDevices);

router.post("/test-notification", protect, async (req, res) => {
  try {
    const result = await sendNotificationToUser(
      req.user.id,
      "Test TransaLink",
      "Votre première notification Android fonctionne 🎉",
      {
        type: "test",
        reference_id: "1",
      },
    );

    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error("Erreur test notification :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur pendant l’envoi de la notification.",
      error: error.message,
    });
  }
});

module.exports = router;

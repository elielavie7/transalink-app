const express = require("express");

const router = express.Router();

const deviceController = require("../controllers/deviceController");
const { protect } = require("../middlewares/authMiddleware");

router.post(
  "/register",
  protect,
  deviceController.registerDeviceToken,
);

router.delete(
  "/unregister",
  protect,
  deviceController.unregisterDeviceToken,
);

router.get(
  "/me",
  protect,
  deviceController.getMyDevices,
);

module.exports = router;
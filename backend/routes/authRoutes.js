const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { JsonWebTokenError } = require("jsonwebtoken");

router.post("/login", authController.login);

module.exports = router;
const express = require("express");
const router = express.Router();

const incomeController = require("../controllers/incomeController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/create", protect, incomeController.createIncome);
router.get("/", protect, incomeController.getIncomes);
router.delete("/:id", protect, incomeController.deleteIncome);

module.exports = router;
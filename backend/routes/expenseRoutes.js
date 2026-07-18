const express = require("express");
const router = express.Router();

const expenseController = require("../controllers/expenseController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/create", protect, expenseController.createExpense);
router.get("/", protect, expenseController.getExpenses);
router.delete("/:id", protect, expenseController.deleteExpense);

module.exports = router;
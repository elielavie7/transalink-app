const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const pool = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

/* ===========================
   ROUTES API
=========================== */

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const agencyRoutes = require("./routes/agencyRoutes");
app.use("/api/agencies", agencyRoutes);

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const transactionRoutes = require("./routes/transactionRoutes");
app.use("/api/transactions", transactionRoutes);

const returnCodeRoutes = require("./routes/returnCodeRoutes");
app.use("/api/return-codes", returnCodeRoutes);

const expenseRoutes = require("./routes/expenseRoutes");
app.use("/api/expenses", expenseRoutes);

const incomeRoutes = require("./routes/incomeRoutes");
app.use("/api/incomes", incomeRoutes);

const reportRoutes = require("./routes/reportRoutes");
app.use("/api/report", reportRoutes);

const fieldReportRoutes = require("./routes/fieldReportRoutes");
app.use("/api/field-reports", fieldReportRoutes);

const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

const auditRoutes = require("./routes/auditRoutes");
app.use("/api/audit", auditRoutes);

const backupRoutes = require("./routes/backupRoutes");
app.use("/api/backups", backupRoutes);



/* ===========================
   DOSSIERS STATIQUES
=========================== */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===========================
   FRONTEND TRANSALINK
   Structure :
   TRANSALINK/
   ├── backend/
   └── frontend/
=========================== */

const frontendPath = path.join(__dirname, "..", "frontend");

app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/pages/:page", (req, res) => {
  res.sendFile(path.join(frontendPath, "pages", req.params.page));
});

/* ===========================
   TEST POSTGRESQL
=========================== */

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");

    res.json({
      success: true,
      message: "Connexion PostgreSQL réussie",
      time: result.rows[0].current_time,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur connexion PostgreSQL",
      error: error.message,
    });
  }
});

/* ===========================
   404 API
=========================== */

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      message: "Route API introuvable",
    });
  }

  next();
});

/* ===========================
   SERVEUR
=========================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 TransaLink lancé sur http://localhost:${PORT}`);
});
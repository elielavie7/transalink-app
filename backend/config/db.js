const { Pool } = require("pg");
require("dotenv").config();

let pool;

if (process.env.DATABASE_URL) {
  // CONFIGURATION POUR RENDER (En ligne)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Obligatoire sur Render
  });
} else {
  // CONFIGURATION POUR VOTRE MACHINE (En local)
  pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // Pas de SSL en local !
  });
}

pool.on("connect", () => {
  console.log("✅ PostgreSQL connecté avec succès");
});

pool.on("error", (err) => {
  console.error("❌ Erreur PostgreSQL :", err.message);
});

module.exports = pool;

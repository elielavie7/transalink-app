const bcrypt = require("bcryptjs");
const pool = require("./config/db");

async function setPins() {
  try {
    const pinElie = await bcrypt.hash("1234", 10);
    const pinFrere = await bcrypt.hash("4321", 10);

    await pool.query(
      "UPDATE users SET transaction_pin = $1 WHERE name = $2",
      [pinElie, "Elie"]
    );

    await pool.query(
      "UPDATE users SET transaction_pin = $1 WHERE name = $2",
      [pinFrere, "Frere Terrain"]
    );

    console.log("✅ PIN transactions configurés");
    process.exit();
  } catch (error) {
    console.error("❌ Erreur :", error.message);
    process.exit(1);
  }
}

setPins();
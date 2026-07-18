const bcrypt = require("bcryptjs");
const pool = require("./config/db");

async function createUser() {
  try {
    const password = await bcrypt.hash("PROMESSE2026", 10);

    await pool.query(
      `
      INSERT INTO users
      (
        name,
        role,
        password,
        pin,
        transaction_pin,
        agency_id
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [
        "PROMESSE",
        "agent",
        password,
        "1234",
        "5678",
        2
      ]
    );

    console.log("✅ Utilisateur créé !");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit();
  }
}

createUser();
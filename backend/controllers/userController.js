const pool = require("../config/db");
const bcrypt = require("bcryptjs");

async function verifySecret(input, stored) {
  if (!stored) return false;

  if (String(stored).startsWith("$2")) {
    return await bcrypt.compare(input, stored);
  }

  return input === stored;
}
exports.createUser = async (req, res) => {
  try {
    const { name, role, password, pin } = req.body;

    if (!name || !role || !password || !pin) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont obligatoires",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(pin, 10);

    const result = await pool.query(
      `INSERT INTO users (name, role, password, transaction_pin)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, role, created_at`,
      [name.trim(), role, hashedPassword, hashedPin]
    );

    res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès",
      user: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur création utilisateur",
      error: error.message,
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, role, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur profil",
      error: error.message,
    });
  }
};

exports.updateName = async (req, res) => {
  try {
    const { current_name, new_name, password } = req.body;

    if (!current_name || !new_name || !password) {
      return res.status(400).json({
        success: false,
        message: "Ancien nom, nouveau nom et mot de passe obligatoires",
      });
    }

    const user = await pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    const dbUser = user.rows[0];

    if (dbUser.name !== current_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Ancien nom incorrect",
      });
    }

    const validPassword = await verifySecret(password, dbUser.password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe incorrect",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET name = $1
       WHERE id = $2
       RETURNING id, name, role`,
      [new_name.trim(), req.user.id]
    );

    res.json({
      success: true,
      message: "Nom modifié avec succès",
      user: result.rows[0],
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur modification nom",
      error: error.message,
    });
  }
};
exports.changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Ancien et nouveau mot de passe obligatoires",
      });
    }

    const user = await pool.query(`SELECT password FROM users WHERE id = $1`, [req.user.id]);

    const valid = await verifySecret(old_password, user.rows[0].password);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Ancien mot de passe incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      `UPDATE users SET password = $1 WHERE id = $2`,
      [hashedPassword, req.user.id]
    );

    res.json({
      success: true,
      message: "Mot de passe modifié avec succès",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur modification mot de passe",
      error: error.message,
    });
  }
};

exports.changeTransactionPin = async (req, res) => {
  try {
    const { old_pin, new_pin } = req.body;

    if (!old_pin || !new_pin) {
      return res.status(400).json({
        success: false,
        message: "Ancien et nouveau PIN obligatoires",
      });
    }

    if (!/^\d{4,6}$/.test(new_pin)) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau PIN doit contenir entre 4 et 6 chiffres",
      });
    }

    const user = await pool.query(
      `SELECT transaction_pin FROM users WHERE id = $1`,
      [req.user.id]
    );

    const valid = await verifySecret(old_pin, user.rows[0].transaction_pin);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Ancien PIN incorrect",
      });
    }

    const hashedPin = await bcrypt.hash(new_pin, 10);

    await pool.query(
      `UPDATE users SET transaction_pin = $1 WHERE id = $2`,
      [hashedPin, req.user.id]
    );

    res.json({
      success: true,
      message: "PIN transaction modifié avec succès",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur modification PIN",
      error: error.message,
    });
  }
};
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { name, password } = req.body;

    const user = await pool.query(
      `
SELECT
    u.*,
    a.name AS agency_name
FROM users u
LEFT JOIN agencies a
ON u.agency_id = a.id
WHERE u.name = $1
`,
      [name],
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    const dbUser = user.rows[0];

    const validPassword = await bcrypt.compare(password, dbUser.password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe incorrect",
      });
    }
    if (!dbUser.is_active) {
      return res.status(403).json({
        success: false,
        message: "Ce compte est désactivé.",
      });
    }
    const token = jwt.sign(
      {
        id: dbUser.id,
        role: dbUser.role,
        agency_id: dbUser.agency_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.json({
      success: true,
      message: "Connexion réussie",
      token,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        role: dbUser.role,
        agency_id: dbUser.agency_id,
        agency_name: dbUser.agency_name,
        is_active: dbUser.is_active,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

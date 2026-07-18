const pool = require("../config/db");

exports.getAgencies = async (req, res) => {
  try {
  const result = await pool.query(`
SELECT
    a.id,
    a.name,
    u.name AS agent
FROM agencies a
LEFT JOIN users u
    ON u.agency_id = a.id
   AND u.role = 'agent'
   AND u.is_active = true
ORDER BY a.name;
`);
    res.json({
      success: true,
      agencies: result.rows,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur récupération agences",
      error: error.message,
    });
  }
};
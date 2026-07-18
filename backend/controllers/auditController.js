const pool = require("../config/db");

exports.createAuditLog = async ({
  user_id,
  action,
  entity_type,
  entity_id,
  amount = 0,
  details = null
}) => {
  try {
    await pool.query(
      `
      INSERT INTO audit_logs
      (
        user_id,
        action,
        entity_type,
        entity_id,
        amount,
        details
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [
        user_id,
        action,
        entity_type,
        entity_id,
        amount,
        details
      ]
    );
  } catch (error) {
    console.error("Audit error:", error.message);
  }
};

exports.getAuditLogs = async (req, res) => {
  try {

    if (req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Accès refusé"
      });
    }

    const result = await pool.query(`
      SELECT
        a.*,
        u.name AS user_name
      FROM audit_logs a
      LEFT JOIN users u
      ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 500
    `);

    res.json({
      success: true,
      logs: result.rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur audit",
      error: error.message
    });
  }
};
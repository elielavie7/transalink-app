const pool = require("../config/db");
const notificationController = require("./notificationController");

// Ajouter une entrée manuelle
exports.createIncome = async (req, res) => {
  try {
    const { amount, source, note } = req.body;

    if (req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Seul l’agent peut ajouter une entrée.",
      });
    }
    const agent = await pool.query(
      `
SELECT agency_id
FROM users
WHERE id=$1
`,
      [req.user.id],
    );

    const agency_id = agent.rows[0].agency_id;

    if (!agency_id) {
      return res.status(400).json({
        success: false,
        message: "Aucune agence associée.",
      });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Le montant est obligatoire.",
      });
    }

    if (!source || !source.trim()) {
      return res.status(400).json({
        success: false,
        message: "La source est obligatoire.",
      });
    }

    const result = await pool.query(
      `INSERT INTO incomes
(
amount,
source,
note,
created_by,
agency_id
)
VALUES
(
$1,$2,$3,$4,$5
)
       RETURNING *`,
      [amount, source.trim(), note || null, req.user.id, agency_id],
    );
    await require("./auditController").createAuditLog({
      user_id: req.user.id,
      action: "CREATE_INCOME",
      entity_type: "income",
      entity_id: result.rows[0].id,
      amount: amount,
      details: `Entrée ajoutée : ${source}`,
    });

    // Notifications terrain
    const terrainUsers = await pool.query(
      `SELECT id FROM users WHERE role = 'terrain'`,
    );

    for (const terrain of terrainUsers.rows) {
      await notificationController.createNotification({
        user_id: terrain.id,
        title: "Nouvelle entrée caisse",
        message: `Une entrée de ${Number(amount).toLocaleString("fr-FR")} FC a été ajoutée.`,
        type: "income",
        related_id: result.rows[0].id,
        agency_id: agency_id,
      });
    }

    res.status(201).json({
      success: true,
      message: "Entrée enregistrée avec succès.",
      incomes: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur création entrée",
      error: error.message,
    });
  }
};

// Voir toutes les entrées
exports.getIncomes = async (req, res) => {
  try {
    let agency_id;

    if (req.user.role === "agent") {
      const user = await pool.query(
        `
        SELECT agency_id
        FROM users
        WHERE id=$1
      `,
        [req.user.id],
      );

      agency_id = user.rows[0].agency_id;
    } else {
      agency_id = req.query.agency_id;
    }

    const result = await pool.query(
      `
      SELECT
        i.*,
        u.name AS created_by_name
      FROM incomes i
      LEFT JOIN users u
      ON i.created_by=u.id
      WHERE i.agency_id=$1
      ORDER BY i.created_at DESC
    `,
      [agency_id],
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// Supprimer une entrée
exports.deleteIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await pool.query(
      `
SELECT agency_id
FROM users
WHERE id=$1
`,
      [req.user.id],
    );

    const agency_id = agent.rows[0].agency_id;

    if (req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Seul l’agent peut supprimer une entrée.",
      });
    }

    const result = await pool.query(
      `DELETE FROM incomes
WHERE id=$1
AND agency_id=$2
RETURNING *`,
      [id, agency_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Entrée introuvable.",
      });
    }

    const notificationController = require("./notificationController");

    const terrainUsers = await pool.query(
      `SELECT id FROM users WHERE role = 'terrain'`,
    );

    for (const terrain of terrainUsers.rows) {
      await notificationController.createNotification({
        user_id: terrain.id,
        title: "Entrée supprimée",
        message: `Une entrée de ${Number(result.rows[0].amount).toLocaleString("fr-FR")} FC a été supprimée.`,
        type: "income_deleted",
        related_id: result.rows[0].id,
        agency_id: agency_id,
      });
    }
    await require("./auditController").createAuditLog({
      user_id: req.user.id,
      action: "DELETE_INCOME",
      entity_type: "income",
      entity_id: result.rows[0].id,
      amount: result.rows[0].amount,
      details: "Suppression entrée",
    });

    res.json({
      success: true,
      message: "Entrée supprimée.",
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur suppression entrée",
      error: error.message,
    });
  }
};

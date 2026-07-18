const pool = require("../config/db");
const notificationController = require("./notificationController");
const auditController = require("./auditController");

// Ajouter une dépense
exports.createExpense = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    if (req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Seul l’agent peut ajouter une dépense.",
      });
    }
    const agent = await pool.query(
`
SELECT agency_id
FROM users
WHERE id=$1
`,
[
req.user.id
]
);

const agency_id = agent.rows[0].agency_id;

if (!agency_id) {
    return res.status(400).json({
        success: false,
        message: "Aucune agence associée."
    });
}

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Le montant est obligatoire.",
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Le motif est obligatoire.",
      });
    }

    const result = await pool.query(
      `INSERT INTO expenses
(
amount,
reason,
created_by,
agency_id
)
VALUES
(
$1,$2,$3,$4
)
       RETURNING *`,
      [amount, reason.trim(), req.user.id, agency_id]
    );

    await auditController.createAuditLog({
      user_id: req.user.id,
      action: "CREATE_EXPENSE",
      entity_type: "expense",
      entity_id: result.rows[0].id,
      amount: amount,
      details: `Dépense ajoutée : ${reason}`
    });

    // Notifications terrain
 const terrainUsers = await pool.query(
`
SELECT id
FROM users
WHERE role='terrain'
`
);

    for (const terrain of terrainUsers.rows) {
      await notificationController.createNotification({
        user_id: terrain.id,
        title: "Nouvelle dépense",
        message: `Une dépense de ${Number(amount).toLocaleString("fr-FR")} FC a été enregistrée.`,
        type: "expense",
        related_id: result.rows[0].id,
        agency_id
      });
    }

    res.status(201).json({
      success: true,
      message: "Dépense enregistrée avec succès.",
      expense: result.rows[0],
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur création dépense",
      error: error.message,
    });
  }
};

// Voir toutes les dépenses
exports.getExpenses = async (req, res) => {

  try {

    let agency_id;

    if (req.user.role === "agent") {

      const agent = await pool.query(
`
SELECT agency_id
FROM users
WHERE id=$1
`,
[
req.user.id
]
      );

      agency_id = agent.rows[0].agency_id;

    } else {

      agency_id = req.query.agency_id;

    }

    if (!agency_id) {

      return res.status(400).json({
        success:false,
        message:"Aucune agence sélectionnée."
      });

    }

    const result = await pool.query(
`
SELECT
e.*,
u.name AS created_by_name
FROM expenses e
LEFT JOIN users u
ON e.created_by=u.id
WHERE e.agency_id=$1
ORDER BY e.created_at DESC
`,
[
agency_id
]
    );

    res.json({
      success:true,
      expenses:result.rows
    });

  } catch(error){

    res.status(500).json({
      success:false,
      message:"Erreur récupération dépenses",
      error:error.message
    });

  }

};
// Supprimer une dépense
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await pool.query(
`
SELECT agency_id
FROM users
WHERE id=$1
`,
[
req.user.id
]
);

const agency_id = agent.rows[0].agency_id;

    if (req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Seul l’agent peut supprimer une dépense.",
      });
    }

    const result = await pool.query(
      `DELETE FROM expenses
WHERE id=$1
AND agency_id=$2
       RETURNING *`,
      [id, agency_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Dépense introuvable.",
      });
    }
    const notificationController = require("./notificationController");

  const terrainUsers = await pool.query(
`
SELECT id
FROM users
WHERE role='terrain'
`
);

    for (const terrain of terrainUsers.rows) {
      await notificationController.createNotification({
        user_id: terrain.id,
        title: "Dépense supprimée",
        message: `Une dépense de ${Number(result.rows[0].amount).toLocaleString("fr-FR")} FC a été supprimée.`,
        type: "expense_deleted",
        related_id: result.rows[0].id,
        agency_id
      });
    }

    await auditController.createAuditLog({
      user_id: req.user.id,
      action: "DELETE_EXPENSE",
      entity_type: "expense",
      entity_id: result.rows[0].id,
      amount: result.rows[0].amount,
      details: `Suppression dépense : ${result.rows[0].reason}`
    });
    res.json({
      success: true,
      message: "Dépense supprimée.",
      expense: result.rows[0],
    });


  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur suppression dépense",
      error: error.message,
    });
  }
};
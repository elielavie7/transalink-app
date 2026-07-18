const pool = require("../config/db");
const notificationController = require("./notificationController");
const auditController = require("./auditController");

// Ajouter code retour - Agent
exports.createReturnCode = async (req, res) => {
  try {
    const {
      amount,
      income_amount,
      sender_number,
      note
    } = req.body;

    if (req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Seul l’agent peut créer un code retour.",
      });
    }
    const agent = await pool.query(
    `SELECT agency_id
     FROM users
     WHERE id = $1`,
    [req.user.id]
);

const agency_id = agent.rows[0].agency_id;

if (!agency_id) {
    return res.status(400).json({
        success: false,
        message: "Aucune agence associée à cet agent."
    });
}

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Le montant à libérer est obligatoire.",
      });
    }

    if (!income_amount || Number(income_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Le montant à ajouter dans la caisse est obligatoire.",
      });
    }

    const terrainUser = await pool.query(
      `SELECT id, name FROM users WHERE role = 'terrain' ORDER BY id ASC LIMIT 1`
    );

    if (terrainUser.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucun frère terrain trouvé dans le système.",
      });
    }

    const assigned_to = terrainUser.rows[0].id;

    const result = await pool.query(
      `INSERT INTO return_codes
       (amount, income_amount, sender_number, note, status, assigned_to, agency_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        amount,
        income_amount,
        sender_number || null,
        note || null,
        "pending",
        assigned_to,
        agency_id
      ]
    );

    const code = result.rows[0];

    await auditController.createAuditLog({
      user_id: req.user.id,
      action: "CREATE_RETURN_CODE",
      entity_type: "return_code",
      entity_id: code.id,
      amount: code.amount,
      details: `Code retour créé`
    });

    await notificationController.createNotification({
      user_id: assigned_to,
      title: "Nouveau code retour",
      message: `Un code retour de ${Number(amount).toLocaleString("fr-FR")} FC est à libérer.`,
      type: "return_code_created",
      related_id: code.id,
      agency_id: code.agency_id
    });

    res.status(201).json({
      success: true,
      message: "Code retour créé avec succès.",
      data: code,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur création code retour", 
      error: error.message,
    });
  }
};

// Voir codes retour
exports.getReturnCodes = async (req, res) => {
  try {
    let query = `
      SELECT 
        rc.*,
        assigned_user.name AS assigned_name,
        released_user.name AS released_name
      FROM return_codes rc
      LEFT JOIN users assigned_user ON rc.assigned_to = assigned_user.id
      LEFT JOIN users released_user ON rc.released_by = released_user.id
    `;

    const params = [];

    if (req.user.role === "terrain") {
      const agency_id = req.query.agency_id;

      if (!agency_id) {
        return res.status(400).json({
          success: false,
          message: "Agence non sélectionnée.",
        });
      }

      query += `
        WHERE rc.assigned_to = $1
        AND rc.agency_id = $2
      `;

      params.push(req.user.id, agency_id);
    }

    if (req.user.role === "agent") {
      const agent = await pool.query(
        `SELECT agency_id FROM users WHERE id = $1`,
        [req.user.id]
      );

      const agency_id = agent.rows[0]?.agency_id;

      if (!agency_id) {
        return res.status(400).json({
          success: false,
          message: "Aucune agence associée à cet agent.",
        });
      }

      query += `
        WHERE rc.agency_id = $1
      `;

      params.push(agency_id);
    }

    query += ` ORDER BY rc.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur récupération codes retour",
      error: error.message,
    });
  }
};
// Marquer libéré - Terrain
exports.releaseReturnCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { audio_url } = req.body;

   const agency_id = req.query.agency_id;

const check = await pool.query(
`
SELECT *
FROM return_codes
WHERE id=$1
AND agency_id=$2
`,
[
id,
agency_id
]
);

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Code retour introuvable.",
      });
    }

    const code = check.rows[0];

    if (req.user.role !== "terrain") {
      return res.status(403).json({
        success: false,
        message: "Seul le frère terrain peut libérer un code retour.",
      });
    }

    if (Number(code.assigned_to) !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Ce code retour ne vous est pas assigné.",
      });
    }

    if (code.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Ce code retour n’est plus en attente.",
      });
    }

    const result = await pool.query(
      `UPDATE return_codes
       SET status = 'released',
           released_by = $1,
           released_at = CURRENT_TIMESTAMP,
           audio_url = COALESCE($2, audio_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [req.user.id, audio_url || null, id]
    );

    const releasedCode = result.rows[0];

    await auditController.createAuditLog({
      user_id: req.user.id,
      action: "RELEASE_RETURN_CODE",
      entity_type: "return_code",
      entity_id: releasedCode.id,
      amount: releasedCode.amount,
      details: `Code retour libéré`
    });

   const agentUser = await pool.query(
`
SELECT id
FROM users
WHERE role='agent'
AND agency_id = $1
LIMIT 1
`,
[
releasedCode.agency_id
]
);

    if (agentUser.rows.length > 0) {
      await notificationController.createNotification({
    user_id: agentUser.rows[0].id,
    title: "Code retour libéré",
    message: `Le frère terrain a libéré ${Number(releasedCode.amount).toLocaleString("fr-FR")} FC.`,
    type: "return_code_released",
    related_id: releasedCode.id,
    agency_id: releasedCode.agency_id
      });
    }

    res.json({
      success: true,
      message: "Code retour libéré avec succès.",
      data: releasedCode,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur libération code retour",
      error: error.message,
    });
  }
};

// Annuler code retour - Agent seulement
exports.cancelReturnCode = async (req, res) => {
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
        message: "Seul l’agent peut annuler un code retour.",
      });
    }

    const result = await pool.query(
      `UPDATE return_codes
       SET status = 'cancelled',
           updated_at = CURRENT_TIMESTAMP
       WHERE id=$1
AND agency_id=$2
AND status='pending'
       RETURNING *`,
      [id,agency_id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Code introuvable ou déjà traité.",
      });
    }

    const code = result.rows[0];

    await auditController.createAuditLog({
      user_id: req.user.id,
      action: "CANCEL_RETURN_CODE",
      entity_type: "return_code",
      entity_id: code.id,
      amount: code.amount,
      details: `Code retour annulé`
    });

    if (code.assigned_to) {
     await notificationController.createNotification({
    user_id: code.assigned_to,
    title: "Code retour annulé",
    message: `Le code retour de ${Number(code.amount).toLocaleString("fr-FR")} FC a été annulé.`,
    type: "return_code_cancelled",
    related_id: code.id,
    agency_id: code.agency_id
});
    }

    res.json({
      success: true,
      message: "Code retour annulé.",
      data: code,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur annulation code retour",
      error: error.message,
    });
  }
};

// Upload audio confirmation code retour
exports.uploadReturnCodeAudio = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Aucun audio reçu.",
      });
    }

    const audioUrl = `/uploads/audios/${req.file.filename}`;

    const result = await pool.query(
      `UPDATE return_codes
       SET audio_url = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [audioUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Code retour introuvable.",
      });
    }

    res.json({
      success: true,
      message: "Audio code retour enregistré.",
      audio_url: audioUrl,
      data: result.rows[0],
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur upload audio code retour",
      error: error.message,
    });
  }
};
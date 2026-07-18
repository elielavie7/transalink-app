const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const notificationController = require("./notificationController");
async function getAgencyCashRemaining(agency_id) {
  const incomes = await pool.query(
    `
SELECT COALESCE(SUM(amount),0) AS total
FROM incomes
WHERE agency_id=$1
`,
    [agency_id],
  );

  const returnCodes = await pool.query(
    `
SELECT COALESCE(SUM(income_amount),0) AS total
FROM return_codes
WHERE agency_id=$1
AND status!='cancelled'
`,
    [agency_id],
  );

  const sentTransactions = await pool.query(
    `
SELECT COALESCE(SUM(amount),0) AS total
FROM transactions
WHERE agency_id=$1
AND status='sent'
`,
    [agency_id],
  );

  const expenses = await pool.query(
    `
SELECT COALESCE(SUM(amount),0) AS total
FROM expenses
WHERE agency_id=$1
`,
    [agency_id],
  );

  const totalIn =
    Number(incomes.rows[0].total || 0) + Number(returnCodes.rows[0].total || 0);

  const totalOut =
    Number(sentTransactions.rows[0].total || 0) +
    Number(expenses.rows[0].total || 0);
  console.log("===== CASH =====");

  console.log("Agency :", agency_id);

  console.log("Entrées :", incomes.rows[0].total);

  console.log("Codes retour :", returnCodes.rows[0].total);

  console.log("Envoyés :", sentTransactions.rows[0].total);

  console.log("Dépenses :", expenses.rows[0].total);

  console.log("Total restant :", totalIn - totalOut);
  return totalIn - totalOut;
}

exports.createTransaction = async (req, res) => {
  try {
    const {
      amount,
      phone,
      client_name,
      type,
      created_by,
      note,
      transaction_pin,
      original_message,
      agency_id,
    } = req.body;
    if (!amount || !phone || !type || !created_by || !transaction_pin) {
      return res.status(400).json({
        success: false,
        message: "Montant, numéro, type, utilisateur et PIN sont obligatoires",
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Le numéro doit contenir exactement 10 chiffres",
      });
    }

    const userResult = await pool.query(
      `
  SELECT
      id,
      transaction_pin
  FROM users
  WHERE id = $1
  `,
      [created_by],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    const validPin = await bcrypt.compare(
      transaction_pin,
      userResult.rows[0].transaction_pin,
    );

    if (!validPin) {
      return res.status(401).json({
        success: false,
        message: "PIN transaction incorrect",
      });
    }

    // const agency_id = userResult.rows[0].agency_id;

    if (!agency_id) {
      return res.status(400).json({
        success: false,
        message: "Aucune agence associée à cet utilisateur.",
      });
    }

    const result = await pool.query(
      `INSERT INTO transactions
(
  amount,
  phone,
  client_name,
  type,
  status,
  created_by,
  note,
  original_message,
  agency_id
)
VALUES
(
  $1,$2,$3,$4,$5,$6,$7,$8,$9
)
RETURNING *`,
      [
        amount,
        phone,
        client_name || null,
        type,
        "pending",
        created_by,
        note || null,
        original_message || null,
        agency_id,
      ],
    );

    const agents = await pool.query(
      `
SELECT id
FROM users
WHERE role='agent'
AND agency_id=$1
`,
      [agency_id],
    );

    for (const agent of agents.rows) {
      await notificationController.createNotification({
        user_id: agent.id,
        title: "Nouvelle demande reçue",
        message:
          original_message || `Nouvelle demande de ${amount} FC au ${phone}`,
        type: "transaction_created",
        related_id: result.rows[0].id,
        agency_id,
      });
    }

    res.status(201).json({
      success: true,
      message: "Demande de transaction créée avec succès",
      transaction: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur création transaction",
      error: error.message,
    });
  }
};
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    // On récupère l'utilisateur connecté
    const userResult = await pool.query(
      `
      SELECT
        id,
        role,
        agency_id
      FROM users
      WHERE id = $1
      `,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    const currentUser = userResult.rows[0];

    let sql = `
      SELECT
        t.*,
        u.name AS created_by_name
      FROM transactions t
      LEFT JOIN users u
        ON u.id = t.created_by
    `;

    let params = [];

    // ==========================
    // AGENT
    // ==========================

    if (currentUser.role === "agent") {
      sql += `
        WHERE t.agency_id = $1
        ORDER BY t.created_at DESC
      `;

      params.push(currentUser.agency_id);
    }

    // ==========================
    // TERRAIN
    // ==========================
    else if (currentUser.role === "terrain") {
      const selectedAgency = req.query.agency_id;

      if (!selectedAgency) {
        return res.status(400).json({
          success: false,
          message: "Agence non sélectionnée.",
        });
      }

      sql += `
        WHERE t.agency_id = $1
        ORDER BY t.created_at DESC
      `;

      params.push(selectedAgency);
    }

    // ==========================
    // ADMIN
    // ==========================
    else {
      sql += `
        ORDER BY t.created_at DESC
      `;
    }

    const result = await pool.query(sql, params);

    res.json({
      success: true,
      transactions: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur récupération transactions",
      error: error.message,
    });
  }
};

exports.updateTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      validated_by,
      final_client_name,
      final_message,
      rejection_reason,
    } = req.body;

    const allowedStatuses = [
      "pending",
      "approved",
      "rejected",
      "sent",
      "cancelled",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Statut invalide",
      });
    }

    const current = await pool.query(
      `
SELECT
status,
agency_id
FROM transactions
WHERE id=$1
`,
      [id],
    );
    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction non trouvée",
      });
    }

    const currentStatus = current.rows[0].status;

    if (currentStatus === "sent") {
      return res.status(400).json({
        success: false,
        message: "Impossible de modifier une transaction déjà envoyée",
      });
    }

    if (status === "cancelled" && currentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Seule une transaction en attente peut être annulée",
      });
    }

    if (status === "sent" && currentStatus !== "approved") {
      return res.status(400).json({
        success: false,
        message: "La transaction doit être validée avant d'être envoyée",
      });
    }

    const result = await pool.query(
      `UPDATE transactions
   SET status = $1::varchar,
       validated_by = $2,
       final_client_name = COALESCE($3::varchar, final_client_name),
       final_message = COALESCE($4::text, final_message),
       rejection_reason = COALESCE($5::text, rejection_reason),
       completed_at = CASE 
         WHEN $1::varchar IN ('sent', 'rejected') THEN CURRENT_TIMESTAMP 
         ELSE completed_at 
       END
   WHERE id = $6
   RETURNING *`,
      [
        status,
        validated_by || null,
        final_client_name || null,
        final_message || null,
        rejection_reason || null,
        id,
      ],
    );
    const updatedTransaction = result.rows[0];

    let notificationTitle = null;
    let notificationMessage = null;

    if (status === "approved") {
      notificationTitle = "Demande validée";
      notificationMessage = `Votre demande de ${Number(updatedTransaction.amount).toLocaleString("fr-FR")} FC a été validée.`;
    }

    if (status === "sent") {
      notificationTitle = "Argent envoyé";
      notificationMessage =
        final_message ||
        `✅ ${Number(updatedTransaction.amount).toLocaleString("fr-FR")} FC ina enda kwa ${updatedTransaction.final_client_name || updatedTransaction.phone}.`;
    }

    if (status === "rejected") {
      notificationTitle = "Demande refusée";
      notificationMessage = rejection_reason || "❌ Demande refusée.";
    }

    if (notificationTitle) {
      await notificationController.createNotification({
        user_id: updatedTransaction.created_by,
        agency_id: updatedTransaction.agency_id,
        title: notificationTitle,
        message: notificationMessage,
        type: `transaction_${status}`,
        related_id: updatedTransaction.id,
      });
    }

    res.json({
      success: true,
      message: "Statut mis à jour",
      transaction: updatedTransaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur mise à jour",
      error: error.message,
    });
  }
};

exports.cancelTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const current = await pool.query(
      `SELECT id, status, created_by, agency_id
FROM transactions 
WHERE id = $1`,
      [id],
    );

    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction non trouvée",
      });
    }

    const transaction = current.rows[0];

    if (transaction.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez annuler que vos propres demandes",
      });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Seule une demande en attente peut être annulée",
      });
    }

    const result = await pool.query(
      `UPDATE transactions
       SET status = 'cancelled'
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    const agents = await pool.query(
      `
SELECT id
FROM users
WHERE role='agent'
AND agency_id=$1
`,
      [transaction.agency_id],
    );

    for (const agent of agents.rows) {
      await notificationController.createNotification({
        user_id: agent.id,
        agency_id: transaction.agency_id,
        title: "Demande annulée",
        message: "Une demande terrain a été annulée avant validation.",
        type: "transaction_cancelled",
        related_id: result.rows[0].id,
      });
    }

    res.json({
      success: true,
      message: "Demande annulée avec succès",
      transaction: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur annulation demande",
      error: error.message,
    });
  }
};
exports.markTransactionSent = async (req, res) => {
  try {
    const { id } = req.params;
    const { final_client_name, validated_by } = req.body;

    if (!final_client_name) {
      return res.status(400).json({
        success: false,
        message: "Nom du client obligatoire",
      });
    }

    const current = await pool.query(
      `SELECT * FROM transactions WHERE id = $1`,
      [id],
    );

    if (current.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction non trouvée",
      });
    }

    const transaction = current.rows[0];

    if (transaction.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "La transaction doit être validée avant d'être envoyée",
      });
    }
    const cashRemaining = await getAgencyCashRemaining(transaction.agency_id);
    const transactionAmount = Number(transaction.amount || 0);

    if (transactionAmount > cashRemaining) {
      return res.status(400).json({
        success: false,
        message: `Fonds insuffisants. Reste caisse disponible : ${cashRemaining.toLocaleString("fr-FR")} FC.`,
        available_balance: cashRemaining,
        requested_amount: transactionAmount,
      });
    }

    const amountFormatted = Number(transaction.amount).toLocaleString("fr-FR");
    const finalMessage = `✅ ${amountFormatted} FC ina enda kwa ${final_client_name}.`;

    const receiptUrl = req.file
      ? `/uploads/receipts/${req.file.filename}`
      : null;

    const result = await pool.query(
      `UPDATE transactions
       SET status = 'sent',
           validated_by = $1,
           final_client_name = $2,
           final_message = $3,
           receipt_image_url = $4,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [validated_by || null, final_client_name, finalMessage, receiptUrl, id],
    );

    await notificationController.createNotification({
      user_id: transaction.created_by,
      title: "Argent envoyé",
      message: finalMessage,
      type: "transaction_sent",
      related_id: id,
      agency_id: transaction.agency_id,
    });

    res.json({
      success: true,
      message: "Transaction marquée comme envoyée",
      transaction: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur envoi transaction",
      error: error.message,
    });
  }
};
exports.uploadTransactionAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const { audio_type, agency_id } = req.body;

    if (!agency_id) {
      return res.status(400).json({
        success: false,
        message: "Aucune agence sélectionnée.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Aucun audio reçu",
      });
    }

    if (!["terrain", "agent"].includes(audio_type)) {
      return res.status(400).json({
        success: false,
        message: "Type audio invalide",
      });
    }

    const column =
      audio_type === "terrain" ? "terrain_audio_url" : "agent_audio_url";
    const audioUrl = `/uploads/audios/${req.file.filename}`;

    const result = await pool.query(
      `
UPDATE transactions
SET ${column}=$1
WHERE id=$2
AND agency_id=$3
RETURNING *
`,
      [audioUrl, id, agency_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction introuvable.",
      });
    }

    res.json({
      success: true,
      message: "Audio enregistré avec succès",
      audio_url: audioUrl,
      transaction: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur enregistrement audio",
      error: error.message,
    });
  }
};

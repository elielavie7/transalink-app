const pool = require("../config/db");

exports.submitFieldReport = async (req, res) => {
  try {
    const {
      week_start,
      week_end,
      declared_balance,
      note
    } = req.body;

    if (req.user.role !== "terrain") {
      return res.status(403).json({
        success: false,
        message: "Seul le frère terrain peut soumettre le rapport.",
      });
    }

    if (!week_start || !week_end || declared_balance === undefined) {
      return res.status(400).json({
        success: false,
        message: "week_start, week_end et declared_balance sont obligatoires",
      });
    }
    const agency = await pool.query(
`
SELECT agency_id
FROM users
WHERE id=$1
`,
[
req.user.id
]
);

const agency_id = agency.rows[0].agency_id;

if (!agency_id) {
    return res.status(400).json({
        success:false,
        message:"Aucune agence associée."
    });
}

    const existingReport = await pool.query(
      `SELECT *
   FROM field_reports
  WHERE user_id=$1
AND agency_id=$2
AND week_start=$3
AND week_end=$4
   LIMIT 1`,
      [req.user.id,agency_id, week_start, week_end]
    );

    if (existingReport.rows.length > 0) {
      return res.status(400).json({
        success: false,
        already_submitted: true,
        message: "Le rapport de cette période a déjà été soumis.",
        report: existingReport.rows[0],
      });
    }

    const params = [
agency_id,
week_start,
week_end];

   const dateFilter = `
agency_id=$1
AND created_at >= $2::date
AND created_at < ($3::date + interval '1 day')
`;

    const incomes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM incomes
       WHERE ${dateFilter}`,
      params
    );

    const returnCodes = await pool.query(
      `SELECT COALESCE(SUM(income_amount), 0) AS total
       FROM return_codes
       WHERE status != 'cancelled'
       AND ${dateFilter}`,
      params
    );

    const transactions = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE status = 'sent'
       AND ${dateFilter}`,
      params
    );

    const expenses = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE ${dateFilter}`,
      params
    );

    const manualIncomes = Number(incomes.rows[0].total || 0);
    const returnCodeIncomes = Number(returnCodes.rows[0].total || 0);
    const sentTransactions = Number(transactions.rows[0].total || 0);
    const totalExpenses = Number(expenses.rows[0].total || 0);

    const totalIn = manualIncomes + returnCodeIncomes;
    const totalOut = sentTransactions + totalExpenses;
    const systemBalance = totalIn - totalOut;

    const declaredBalance = Number(declared_balance || 0);
    const difference = declaredBalance - systemBalance;

    const status = difference === 0 ? "balanced" : "difference_detected";

    const result = await pool.query(
      `INSERT INTO field_reports
(
user_id,
agency_id,
week_start,
week_end,
declared_balance,
system_balance,
difference,
note,
status
)
VALUES
(
$1,$2,$3,$4,$5,$6,$7,$8,$9
)
       RETURNING *`,
      [
        req.user.id,
        agency_id,
        week_start,
        week_end,
        declaredBalance,
        systemBalance,
        difference,
        note || null,
        status,
      ]
    );

    await require("./auditController").createAuditLog({
      user_id: req.user.id,
      action: "SUBMIT_FIELD_REPORT",
      entity_type: "field_report",
      entity_id: result.rows[0].id,
      amount: declaredBalance,
      details: `Rapport dimanche soumis`
    });

    // Notification agent principal
   const agents = await pool.query(
`
SELECT id
FROM users
WHERE role='agent'
AND agency_id=$1
`,
[
agency_id
]
);
    

    for (const agent of agents.rows) {
      await require("./notificationController").createNotification({
        user_id: agent.id,
        title: "Rapport terrain soumis",
        message: `Le frère terrain a soumis un rapport dimanche.`,
        type: "field_report",
        related_id: result.rows[0].id,
        agency_id
      });
    }

    res.status(201).json({
      success: true,
      message: difference === 0
        ? "Rapport équilibré soumis avec succès."
        : "Rapport soumis avec écart détecté.",
      report: {
        ...result.rows[0],
        details: {
          manual_incomes: manualIncomes,
          return_codes_income: returnCodeIncomes,
          sent_transactions: sentTransactions,
          expenses: totalExpenses,
          total_in: totalIn,
          total_out: totalOut,
        }
      },
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        already_submitted: true,
        message: "Le rapport de cette période a déjà été soumis.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Erreur soumission rapport terrain",
      error: error.message,
    });
  }
};

exports.getFieldReports = async (req, res) => {
  try {
    let query = `
      SELECT 
        fr.*,
        u.name AS user_name
      FROM field_reports fr
      LEFT JOIN users u ON fr.user_id = u.id
    `;

   const agency_id = req.query.agency_id;

if (!agency_id) {
    return res.status(400).json({
        success: false,
        message: "Agence non spécifiée."
    });
}
const params = [];

if (req.user.role === "terrain") {

    query += `
    WHERE fr.user_id=$1
    AND fr.agency_id=$2
    `;

    params.push(req.user.id);
    params.push(agency_id);

} else {

    query += `
    WHERE fr.agency_id=$1
    `;

    params.push(agency_id);

}

    query += ` ORDER BY fr.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      reports: result.rows,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur récupération rapports terrain",
      error: error.message,
    });
  }
};
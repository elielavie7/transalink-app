const pool = require("../config/db");

async function getMovementTotals(
    agency_id,
    dateCondition = "",
    params = []
) {
 const incomes = await pool.query(
`
SELECT COALESCE(SUM(amount),0) AS total
FROM incomes
WHERE agency_id=$1
${dateCondition}
`,
[
agency_id,
...params
]
);

 const returnCodes = await pool.query(
`
SELECT COALESCE(SUM(income_amount),0) AS total
FROM return_codes
WHERE agency_id=$1
AND status!='cancelled'
${dateCondition}
`,
[
agency_id,
...params
]
);

const transactions = await pool.query(
`
SELECT COALESCE(SUM(amount),0) AS total
FROM transactions
WHERE agency_id=$1
AND status='sent'
${dateCondition}
`,
[
agency_id,
...params
]
);

 const expenses = await pool.query(
`
SELECT COALESCE(SUM(amount),0) AS total
FROM expenses
WHERE agency_id=$1
${dateCondition}
`,
[
agency_id,
...params
]
);

  const manualIncomes = Number(incomes.rows[0].total || 0);
  const returnCodeIncomes = Number(returnCodes.rows[0].total || 0);
  const sentTransactions = Number(transactions.rows[0].total || 0);
  const totalExpenses = Number(expenses.rows[0].total || 0);

  return {
    manualIncomes,
    returnCodeIncomes,
    sentTransactions,
    totalExpenses,
    totalIn: manualIncomes + returnCodeIncomes,
    totalOut: sentTransactions + totalExpenses,
  };
}

exports.getWeeklyReport = async (req, res) => {
  console.log("===== REPORT =====");
console.log(req.user);
console.log("Agency :", req.query.agency_id);
  try {
    const { start, end, mode } = req.query;
    const agency_id = req.query.agency_id;
    if (!agency_id) {
    return res.status(400).json({
        success:false,
        message:"agency_id obligatoire"
    });
}

    if (mode === "global") {
      const totals = await getMovementTotals(agency_id);

      const cashRemaining = totals.totalIn - totals.totalOut;

      return res.json({
        success: true,
        period: "global",
        report: {
          opening_balance: 0,
          manual_incomes: totals.manualIncomes,
          return_codes_income: totals.returnCodeIncomes,
          sent_transactions: totals.sentTransactions,
          expenses: totals.totalExpenses,
          total_in: totals.totalIn,
          total_out: totals.totalOut,
          cash_remaining: cashRemaining,
          balance: cashRemaining,
          incomes: totals.manualIncomes,
          transactions: totals.sentTransactions,
        },
      });
    }

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "Dates start et end requises",
      });
    }

    const openingParams = [start];

   const openingCondition = `
AND created_at < $2::date
`;
    const periodParams = [start, end];

  const periodCondition = `
AND created_at >= $2::date
AND created_at < ($3::date + INTERVAL '1 day')
`;
const openingTotals = await getMovementTotals(
    agency_id,
    openingCondition,
    openingParams
);

const periodTotals = await getMovementTotals(
    agency_id,
    periodCondition,
    periodParams
);
    const openingBalance = openingTotals.totalIn - openingTotals.totalOut;

    const cashRemaining =
      openingBalance +
      periodTotals.totalIn -
      periodTotals.totalOut;

    res.json({
      success: true,
      period: { start, end },
      report: {
        opening_balance: openingBalance,

        manual_incomes: periodTotals.manualIncomes,
        return_codes_income: periodTotals.returnCodeIncomes,
        sent_transactions: periodTotals.sentTransactions,
        expenses: periodTotals.totalExpenses,

        total_in: periodTotals.totalIn,
        total_out: periodTotals.totalOut,

        cash_remaining: cashRemaining,

        incomes: periodTotals.manualIncomes,
        transactions: periodTotals.sentTransactions,
        balance: cashRemaining,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur rapport",
      error: error.message,
    });
  }
};
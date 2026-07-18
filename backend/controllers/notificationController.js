const pool = require("../config/db");

exports.createNotification = async ({
  user_id,
  title,
  message,
  type,
  related_id,
  agency_id,
}) => {
  await pool.query(
    `
INSERT INTO notifications
(
user_id,
title,
message,
type,
related_id,
agency_id
)
VALUES($1,$2,$3,$4,$5,$6)
`,
    [user_id, title, message, type, related_id || null, agency_id || null],
  );
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const agency_id = req.query.agency_id;

    const result = await pool.query(
      `
SELECT *
FROM notifications
WHERE user_id=$1
AND agency_id=$2
ORDER BY created_at DESC
LIMIT 50
`,
      [userId, agency_id],
    );

    res.json({
      success: true,
      notifications: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur récupération notifications",
      error: error.message,
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const agency_id = req.query.agency_id;

    const result = await pool.query(
      `
SELECT COUNT(*) AS total
FROM notifications
WHERE user_id=$1
AND agency_id=$2
AND is_read=false
`,
      [userId, agency_id],
    );

    res.json({
      success: true,
      unread: Number(result.rows[0].total),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur compteur notifications",
      error: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );

    res.json({
      success: true,
      message: "Notification lue",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lecture notification",
      error: error.message,
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const agency_id = req.query.agency_id;

    if (!agency_id) {
      return res.status(400).json({
        success: false,
        message: "L’agence est obligatoire.",
      });
    }

    await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1
      AND agency_id = $2
      `,
      [userId, agency_id],
    );

    res.json({
      success: true,
      message: "Toutes les notifications de cette agence sont lues",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lecture notifications",
      error: error.message,
    });
  }
};
exports.deleteMyNotifications = async (req, res) => {
  try {
    await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [
      req.user.id,
    ]);

    res.json({
      success: true,
      message: "Notifications supprimées.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur suppression notifications",
      error: error.message,
    });
  }
};

exports.markTypesAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { agency_id, types } = req.body;

    if (!agency_id) {
      return res.status(400).json({
        success: false,
        message: "L’agence est obligatoire.",
      });
    }

    if (!Array.isArray(types) || types.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Les types de notifications sont obligatoires.",
      });
    }

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1
      AND agency_id = $2
      AND type = ANY($3::text[])
      AND is_read = false
      RETURNING id
      `,
      [userId, agency_id, types],
    );

    res.json({
      success: true,
      message: "Notifications marquées comme lues.",
      updated: result.rowCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lecture des notifications",
      error: error.message,
    });
  }
};

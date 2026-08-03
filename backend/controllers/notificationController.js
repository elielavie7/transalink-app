const pool = require("../config/db");

const {
  sendNotificationToUser,
} = require("../services/firebaseNotificationService");

/*
 * Crée une notification interne PostgreSQL,
 * calcule le nombre total de notifications non lues,
 * puis envoie la notification Android au destinataire exact.
 */
exports.createNotification = async ({
  user_id,
  title,
  message,
  type,
  related_id,
  agency_id,
}) => {
  try {
    if (!user_id) {
      throw new Error("Le destinataire de la notification est obligatoire.");
    }

    const inserted = await pool.query(
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
      VALUES ($1, $2, $3, $4, $5, $6)

      RETURNING *
      `,
      [user_id, title, message, type, related_id || null, agency_id || null],
    );

    const notification = inserted.rows[0];

    /*
     * Compteur global des notifications non lues
     * pour ce compte utilisateur.
     */
    const unreadResult = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM notifications
      WHERE user_id = $1
      AND is_read = false
      `,
      [user_id],
    );

    const unreadCount = Number(unreadResult.rows[0]?.total || 0);

    /*
     * L’échec d’une notification Firebase ne doit jamais
     * annuler l’opération métier déjà enregistrée.
     */
    try {
      const pushResult = await sendNotificationToUser(
        user_id,
        title,
        message,
        {
          type: type || "general",
          related_id:
            related_id !== undefined && related_id !== null
              ? String(related_id)
              : "",
          agency_id:
            agency_id !== undefined && agency_id !== null
              ? String(agency_id)
              : "",
          notification_id: String(notification.id),
          unread_count: String(unreadCount),
        },
        unreadCount,
      );

      if (!pushResult.success) {
        console.log(
          `ℹ️ Notification interne créée, mais aucun push envoyé à user_id=${user_id}`,
          pushResult,
        );
      }
    } catch (pushError) {
      console.error(
        `❌ Erreur push pour user_id=${user_id} :`,
        pushError.message,
      );
    }

    return notification;
  } catch (error) {
    console.error("Erreur création notification :", error);

    throw error;
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const agency_id = req.query.agency_id;

    if (!agency_id) {
      return res.status(400).json({
        success: false,
        message: "L’agence est obligatoire.",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      AND agency_id = $2
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId, agency_id],
    );

    return res.json({
      success: true,
      notifications: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
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

    if (!agency_id) {
      return res.status(400).json({
        success: false,
        message: "L’agence est obligatoire.",
      });
    }

    const result = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM notifications
      WHERE user_id = $1
      AND agency_id = $2
      AND is_read = false
      `,
      [userId, agency_id],
    );

    return res.json({
      success: true,
      unread: Number(result.rows[0].total),
    });
  } catch (error) {
    return res.status(500).json({
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

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
      AND user_id = $2
      RETURNING id
      `,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification introuvable.",
      });
    }

    return res.json({
      success: true,
      message: "Notification lue",
    });
  } catch (error) {
    return res.status(500).json({
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

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1
      AND agency_id = $2
      AND is_read = false
      RETURNING id
      `,
      [userId, agency_id],
    );

    return res.json({
      success: true,
      message: "Toutes les notifications de cette agence sont lues",
      updated: result.rowCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur lecture notifications",
      error: error.message,
    });
  }
};

exports.deleteMyNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM notifications
      WHERE user_id = $1
      RETURNING id
      `,
      [req.user.id],
    );

    return res.json({
      success: true,
      message: "Notifications supprimées.",
      deleted: result.rowCount,
    });
  } catch (error) {
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: "Notifications marquées comme lues.",
      updated: result.rowCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur lecture des notifications",
      error: error.message,
    });
  }
};

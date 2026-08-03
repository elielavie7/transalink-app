const pool = require("../config/db");

const { messaging } = require("../config/firebase");

exports.sendNotificationToUser = async (
  userId,
  title,
  body,
  data = {},
  unreadCount = 1,
) => {
  const result = await pool.query(
    `
    SELECT
      id,
      token
    FROM device_tokens
    WHERE user_id = $1
    `,
    [userId],
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      message: "Aucun appareil enregistré pour cet utilisateur.",
    };
  }

  let sent = 0;
  let failed = 0;

  const errors = [];

  const normalizedData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value === null || value === undefined ? "" : String(value),
    ]),
  );

  for (const device of result.rows) {
    try {
      const messageId = await messaging.send({
        token: device.token,

        notification: {
          title,
          body,
        },

        data: normalizedData,

        android: {
          priority: "high",

          notification: {
            channelId: "transalink_notifications",

            sound: "default",

            notificationCount: Math.max(0, Number(unreadCount) || 0),
          },
        },
      });

      sent += 1;

      console.log(`✅ Push envoyé à user_id=${userId}`, messageId);
    } catch (error) {
      failed += 1;

      const errorCode = error?.code || "firebase_error_unknown";

      const errorMessage = error?.message || "Erreur Firebase inconnue";

      errors.push({
        device_id: device.id,
        code: errorCode,
        message: errorMessage,
      });

      console.error(
        `❌ Push refusé pour user_id=${userId}`,
        errorCode,
        errorMessage,
      );

      /*
       * Suppression uniquement des tokens
       * définitivement invalides.
       */
      if (
        errorCode === "messaging/registration-token-not-registered" ||
        errorCode === "messaging/invalid-registration-token"
      ) {
        await pool.query(
          `
          DELETE FROM device_tokens
          WHERE id = $1
          `,
          [device.id],
        );
      }
    }
  }

  return {
    success: sent > 0,
    sent,
    failed,
    errors,
  };
};

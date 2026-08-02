const pool = require("../config/db");
const { messaging } = require("../config/firebase");

exports.sendNotificationToUser = async (
    userId,
    title,
    body,
    data = {}
) => {
    try {

        const result = await pool.query(
            `
            SELECT token
            FROM device_tokens
            WHERE user_id = $1
            `,
            [userId]
        );

        if (result.rows.length === 0) {
            console.log("Aucun appareil enregistré.");
            return;
        }

        for (const device of result.rows) {

            try {

                await messaging.send({

                    token: device.token,

                    notification: {
                        title,
                        body,
                    },

                    data,

                    android: {
                        priority: "high",
                    },

                });

                console.log("✅ Notification envoyée");

            } catch (err) {

                console.log("Erreur Firebase :", err.message);

            }

        }

    } catch (error) {

        console.log(error);

    }
};
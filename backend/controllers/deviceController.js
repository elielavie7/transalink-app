const pool = require("../config/db");

/*
 * Enregistrer ou actualiser le token Firebase
 * du téléphone actuellement connecté.
 */
exports.registerDeviceToken = async (req, res) => {
  try {
    const { token, platform, device_name } = req.body;

    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non identifié.",
      });
    }

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "Le token Firebase est obligatoire.",
      });
    }

    const cleanedToken = token.trim();

    /*
     * Si Firebase attribue ce token à un autre compte
     * après une reconnexion, on le rattache au compte actuel.
     */
    const result = await pool.query(
      `
      INSERT INTO device_tokens
      (
        user_id,
        token,
        platform,
        device_name,
        updated_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)

      ON CONFLICT (token)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        device_name = EXCLUDED.device_name,
        updated_at = CURRENT_TIMESTAMP

      RETURNING
        id,
        user_id,
        platform,
        device_name,
        created_at,
        updated_at
      `,
      [
        userId,
        cleanedToken,
        platform || "android",
        device_name || null,
      ],
    );

    return res.json({
      success: true,
      message: "Appareil enregistré avec succès.",
      device: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur enregistrement appareil :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur lors de l’enregistrement de l’appareil.",
      error: error.message,
    });
  }
};

/*
 * Supprimer le token lors d’une déconnexion.
 */
exports.unregisterDeviceToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "Le token Firebase est obligatoire.",
      });
    }

    await pool.query(
      `
      DELETE FROM device_tokens
      WHERE user_id = $1
      AND token = $2
      `,
      [userId, token.trim()],
    );

    return res.json({
      success: true,
      message: "Appareil retiré avec succès.",
    });
  } catch (error) {
    console.error("Erreur suppression appareil :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur lors du retrait de l’appareil.",
      error: error.message,
    });
  }
};

/*
 * Route temporaire de vérification.
 * Elle permet de voir les appareils du compte connecté.
 */
exports.getMyDevices = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        platform,
        device_name,
        created_at,
        updated_at
      FROM device_tokens
      WHERE user_id = $1
      ORDER BY updated_at DESC
      `,
      [req.user.id],
    );

    return res.json({
      success: true,
      devices: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur récupération des appareils.",
      error: error.message,
    });
  }
};
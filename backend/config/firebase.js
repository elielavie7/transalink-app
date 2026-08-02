const fs = require("fs");
const path = require("path");

const { cert, getApps, initializeApp } = require("firebase-admin/app");

const { getMessaging } = require("firebase-admin/messaging");

/*
 * En local :
 * backend/config/firebase-service-account.json
 *
 * Sur Render :
 * /etc/secrets/firebase-service-account.json
 */
const renderSecretPath = "/etc/secrets/firebase-service-account.json";

const localSecretPath = path.join(__dirname, "firebase-service-account.json");

const serviceAccountPath = fs.existsSync(renderSecretPath)
  ? renderSecretPath
  : localSecretPath;

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    "Clé Firebase Admin introuvable. " +
      "Ajoutez firebase-service-account.json " +
      "dans backend/config en local ou dans les Secret Files de Render.",
  );
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

const firebaseApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
      });

const messaging = getMessaging(firebaseApp);

console.log("🔥 Firebase Admin initialisé avec succès");

module.exports = {
  firebaseApp,
  messaging,
};

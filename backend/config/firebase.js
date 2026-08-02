const path = require("path");

const { cert, getApps, initializeApp } = require("firebase-admin/app");

const { getMessaging } = require("firebase-admin/messaging");

/*
 * Clé privée Firebase Admin.
 * Ce fichier ne doit jamais être envoyé sur GitHub.
 */
const serviceAccountPath = path.join(
  __dirname,
  "firebase-service-account.json",
);

const serviceAccount = require(serviceAccountPath);

/*
 * Évite d’initialiser Firebase plusieurs fois
 * lors des redémarrages ou imports multiples.
 */
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

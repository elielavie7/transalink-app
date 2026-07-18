const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const backupDir = path.join(__dirname, "..", "backups");

function ensureBackupDir() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

function makeFileName() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `transalink-backup-${stamp}.json`;
}

exports.createBackup = async (req, res) => {
  try {
    if (req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Seul l’agent peut créer un backup.",
      });
    }

    ensureBackupDir();

    const tables = [
      "users",
      "transactions",
      "return_codes",
      "incomes",
      "expenses",
      "field_reports",
      "notifications",
      "audit_logs",
    ];

    const backup = {
      app: "TransaLink",
      created_at: new Date().toISOString(),
      created_by: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role,
      },
      tables: {},
    };

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT * FROM ${table} ORDER BY id ASC`);
        backup.tables[table] = result.rows;
      } catch (error) {
        backup.tables[table] = {
          error: `Table ignorée ou introuvable : ${error.message}`,
        };
      }
    }

    const fileName = makeFileName();
    const filePath = path.join(backupDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), "utf8");

    res.status(201).json({
      success: true,
      message: "Backup créé avec succès.",
      file: fileName,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur création backup",
      error: error.message,
    });
  }
};

exports.getBackups = async (req, res) => {
  try {
    if (req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Accès refusé.",
      });
    }

    ensureBackupDir();

    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith(".json"))
      .map(file => {
        const stat = fs.statSync(path.join(backupDir, file));

        return {
          file,
          size: stat.size,
          created_at: stat.birthtime,
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      backups: files,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur récupération backups",
      error: error.message,
    });
  }
};

exports.downloadBackup = async (req, res) => {
  try {
    if (req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Accès refusé.",
      });
    }

    const { filename } = req.params;

    if (!filename || filename.includes("..") || !filename.endsWith(".json")) {
      return res.status(400).json({
        success: false,
        message: "Nom de fichier invalide.",
      });
    }

    const filePath = path.join(backupDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Backup introuvable.",
      });
    }

    res.download(filePath, filename);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur téléchargement backup",
      error: error.message,
    });
  }
};
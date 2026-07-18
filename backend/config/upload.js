const multer = require("multer");
const fs = require("fs");
const path = require("path");

const receiptDir = path.join(__dirname, "../uploads/receipts");
const audioDir = path.join(__dirname, "../uploads/audios");

[receiptDir, audioDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "audio") {
      cb(null, audioDir);
    } else {
      cb(null, receiptDir);
    }
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  },
});

module.exports = multer({ storage });
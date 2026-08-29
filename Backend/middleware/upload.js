const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images, PDFs, documents, and video files
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|webm|mp4|avi|mov|mkv|3gp|ogg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  // Check mimetype (includes video/* and octet-stream fallback when extension is valid)
  const allowedMimeTypes = /image\/.*|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|video\/.*|application\/octet-stream/;
  const mimetype = allowedMimeTypes.test(file.mimetype);

  if (mimetype || extname) {
    return cb(null, true);
  } else {
    console.warn(`[Upload Filter] Rejected file: ${file.originalname} (MIME: ${file.mimetype})`);
    cb(new Error(`File type not allowed: ${file.originalname} (${file.mimetype})`));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB limit for recordings & documents
  },
  fileFilter: fileFilter
});

module.exports = upload;

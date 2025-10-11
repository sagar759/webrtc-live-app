const express = require('express');
const router = express.Router();
const { createClaim, getAllClaims, getClaimById, updateClaimStatus, uploadCapturedImage, uploadSignature, saveLocation, uploadRecording, submitClaimForm, generateClaimPDF, getClaimPDFLink } = require('../controllers/claimController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log(`\n[CLAIM ROUTE] ${req.method} ${req.path}`);
  console.log('Full URL:', req.originalUrl);
  console.log('Params:', req.params);
  next();
});

// Upload signature - no auth required for patient signatures
router.post('/:id/signature', upload.single('signature'), uploadSignature);

// Save location - no auth required for patient location
router.post('/:id/location', saveLocation);

// Generate and download claim PDF - no auth required
router.get('/:id/pdf', generateClaimPDF);

// Get PDF download link - no auth required
router.get('/:id/pdf-link', getClaimPDFLink);

// All other routes require authentication
router.use(protect);

// Create claim with file upload (multiple files)
router.post('/', upload.array('documents', 10), createClaim);

// Get all claims
router.get('/', getAllClaims);

// Get single claim
router.get('/:id', getClaimById);

// Update claim status
router.put('/:id/status', updateClaimStatus);

// Upload captured image during video call
router.post('/:id/capture-image', upload.single('image'), uploadCapturedImage);

// Upload screen recording during video call (Doctor only)
router.post('/:id/recording', upload.single('recording'), uploadRecording);

// Submit detailed claim form (Doctor only)
router.post('/:id/form', upload.array('documents', 10), submitClaimForm);

module.exports = router;

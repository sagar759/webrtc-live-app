const Claim = require('../models/Claim');
const { generateClaimPDF } = require('../utils/pdfGenerator');
const path = require('path');
const fs = require('fs');

// @desc    Create new claim
// @route   POST /api/claims
// @access  Private (Doctor)
exports.createClaim = async (req, res) => {
  try {
    console.log('Received claim data:', req.body);
    console.log('Received files:', req.files);
    
    const { claimId, patientName, patientMobile, hospitalCity, hospitalState, patientLanguage } = req.body;

    // Validation with detailed error
    if (!claimId || !patientName || !patientMobile || !hospitalCity || !hospitalState || !patientLanguage) {
      const missingFields = [];
      if (!claimId) missingFields.push('claimId');
      if (!patientName) missingFields.push('patientName');
      if (!patientMobile) missingFields.push('patientMobile');
      if (!hospitalCity) missingFields.push('hospitalCity');
      if (!hospitalState) missingFields.push('hospitalState');
      if (!patientLanguage) missingFields.push('patientLanguage');
      
      return res.status(400).json({ 
        message: 'Please provide all required fields',
        missingFields: missingFields
      });
    }

    // Check if claim ID already exists
    const claimExists = await Claim.findOne({ claimId });
    if (claimExists) {
      return res.status(400).json({ message: 'Claim ID already exists' });
    }

    // Process uploaded files
    const documents = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        documents.push({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
        });
      });
    }

    // Create claim
    const claim = await Claim.create({
      claimId,
      patientName,
      patientMobile,
      hospitalCity,
      hospitalState,
      patientLanguage,
      documents,
      createdBy: req.user._id,
      doctorName: req.user.name,
      doctorEmail: req.user.email,
    });

    res.status(201).json({
      success: true,
      message: 'Claim created successfully',
      data: claim,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all claims
// @route   GET /api/claims
// @access  Private (Doctor/Admin)
exports.getAllClaims = async (req, res) => {
  try {
    const claims = await Claim.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: claims.length,
      data: claims,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to find claim by either MongoDB _id or custom claimId
const findClaimByIdOrCustomId = async (id) => {
  if (!id) return null;
  let claim = null;
  if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
    claim = await Claim.findById(id);
  }
  if (!claim) {
    claim = await Claim.findOne({ claimId: id });
  }
  return claim;
};

// @desc    Get single claim
// @route   GET /api/claims/:id
// @access  Private (Doctor/Admin)
exports.getClaimById = async (req, res) => {
  try {
    let claim = null;
    if (req.params.id && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      claim = await Claim.findById(req.params.id)
        .populate('createdBy', 'name email')
        .populate('capturedImages.capturedBy', 'name email');
    }
    if (!claim) {
      claim = await Claim.findOne({ claimId: req.params.id })
        .populate('createdBy', 'name email')
        .populate('capturedImages.capturedBy', 'name email');
    }

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    res.status(200).json({
      success: true,
      data: claim,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update claim status
// @route   PUT /api/claims/:id/status
// @access  Private (Doctor/Admin)
exports.updateClaimStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Please provide status' });
    }

    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    claim.status = status;
    
    // Set completedAt timestamp when claim is closed
    if (status === 'closed' && !claim.completedAt) {
      claim.completedAt = new Date();
    }
    
    await claim.save();

    res.status(200).json({
      success: true,
      message: 'Claim status updated successfully',
      data: claim,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Upload captured image to claim
// @route   POST /api/claims/:id/capture-image
// @access  Private (Doctor)
exports.uploadCapturedImage = async (req, res) => {
  try {
    const claimId = req.params.id;
    const { imageType } = req.body; // 'doctor' or 'patient'

    console.log(`\n=== Image Capture Request ===`);
    console.log(`Claim ID: ${claimId}`);
    console.log(`Image Type: ${imageType}`);
    console.log(`Doctor ID: ${req.user._id}`);
    console.log(`File:`, req.file ? req.file.filename : 'No file');

    if (!imageType || !['doctor', 'patient'].includes(imageType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide valid image type (doctor or patient)' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Please upload an image' 
      });
    }

    const claim = await Claim.findById(claimId);

    if (!claim) {
      return res.status(404).json({ 
        success: false,
        message: `Claim not found with ID: ${claimId}` 
      });
    }

    console.log(`Found Claim: ${claim.claimId}`);
    console.log(`Current captured images count: ${claim.capturedImages.length}`);

    // Add captured image to claim
    const capturedImage = {
      filename: req.file.filename,
      path: req.file.path,
      type: imageType,
      capturedBy: req.user._id,
      capturedAt: new Date(),
    };

    claim.capturedImages.push(capturedImage);
    await claim.save();

    console.log(`Image saved successfully!`);
    console.log(`Total captured images now: ${claim.capturedImages.length}`);
    console.log(`===========================\n`);

    res.status(200).json({
      success: true,
      message: `${imageType === 'doctor' ? 'Doctor' : 'Patient'} image captured and saved successfully`,
      data: {
        claimId: claim.claimId,
        claimMongoId: claim._id,
        capturedImage: claim.capturedImages[claim.capturedImages.length - 1],
        totalCapturedImages: claim.capturedImages.length,
      },
    });
  } catch (error) {
    console.error('Error uploading captured image:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Upload signature to claim
// @route   POST /api/claims/:id/signature
// @access  Private (Doctor) / Public for patient signature
exports.uploadSignature = async (req, res) => {
  try {
    const claimId = req.params.id;
    const { signedBy, signerName } = req.body; // 'doctor' or 'patient'

    console.log(`\n=== Signature Upload Request ===`);
    console.log(`Claim ID: ${claimId}`);
    console.log(`Signed By: ${signedBy}`);
    console.log(`Signer Name: ${signerName}`);
    console.log(`File:`, req.file ? req.file.filename : 'No file');

    if (!signedBy || !['doctor', 'patient'].includes(signedBy)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide valid signer type (doctor or patient)' 
      });
    }

    if (!signerName) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide signer name' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Please upload a signature image' 
      });
    }

    const claim = await Claim.findById(claimId);

    if (!claim) {
      return res.status(404).json({ 
        success: false,
        message: `Claim not found with ID: ${claimId}` 
      });
    }

    console.log(`Found Claim: ${claim.claimId}`);
    console.log(`Current signatures count: ${claim.signatures.length}`);

    // Add signature to claim
    const signature = {
      filename: req.file.filename,
      path: req.file.path,
      signedBy: signedBy,
      signerName: signerName,
      signedAt: new Date(),
      capturedBy: req.user ? req.user._id : null,
    };

    claim.signatures.push(signature);
    await claim.save();

    console.log(`Signature saved successfully!`);
    console.log(`Total signatures now: ${claim.signatures.length}`);
    console.log(`===========================\n`);

    res.status(200).json({
      success: true,
      message: `${signedBy === 'doctor' ? 'Doctor' : 'Patient'} signature saved successfully`,
      data: {
        claimId: claim.claimId,
        claimMongoId: claim._id,
        signature: claim.signatures[claim.signatures.length - 1],
        totalSignatures: claim.signatures.length,
      },
    });
  } catch (error) {
    console.error('Error uploading signature:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Helper function to reverse geocode coordinates to human-readable address
const reverseGeocode = async (latitude, longitude) => {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBjCExT250iDt5eihZ9k3S-MDY234jWeoI';
  
  // 1. Try Google Maps Geocoding API
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(googleUrl);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
  } catch (err) {
    console.warn('Google Maps reverse geocoding notice:', err.message);
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const response = await fetch(osmUrl, {
      headers: { 'User-Agent': 'WebRTC-Claims-Management/1.0' }
    });
    const data = await response.json();
    if (data && data.display_name) {
      return data.display_name;
    }
  } catch (err) {
    console.warn('OSM reverse geocoding notice:', err.message);
  }

  return `Coordinates: ${latitude}, ${longitude}`;
};

// @desc    Save location to claim
// @route   POST /api/claims/:id/location
// @access  Public (no auth required for patient location)
exports.saveLocation = async (req, res) => {
  try {
    const claimIdentifier = req.params.id;
    let { locationType, userName, latitude, longitude, accuracy, address } = req.body;

    console.log(`\n=== Location Save Request ===`);
    console.log(`Claim ID / MongoDB ID: ${claimIdentifier}`);
    console.log(`Location Type: ${locationType}`);
    console.log(`User Name: ${userName}`);
    console.log(`Latitude: ${latitude}`);
    console.log(`Longitude: ${longitude}`);
    console.log(`Accuracy: ${accuracy}m`);

    if (!locationType || !['doctor', 'patient'].includes(locationType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide valid location type (doctor or patient)' 
      });
    }

    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide latitude and longitude' 
      });
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude values'
      });
    }

    // Try finding claim by either MongoDB _id or claimId string
    let claim = null;
    if (claimIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
      claim = await Claim.findById(claimIdentifier);
    }
    if (!claim) {
      claim = await Claim.findOne({ claimId: claimIdentifier });
    }

    if (!claim) {
      return res.status(404).json({ 
        success: false, 
        message: `Claim not found with ID: ${claimIdentifier}` 
      });
    }

    console.log(`Found Claim: ${claim.claimId}`);
    console.log(`Current locations count: ${claim.locations.length}`);

    // If address is missing, reverse geocode coordinates
    let formattedAddress = address;
    if (!formattedAddress || formattedAddress.trim() === '' || formattedAddress === 'Not available') {
      try {
        formattedAddress = await reverseGeocode(latNum, lngNum);
        console.log(`Reverse-geocoded address: ${formattedAddress}`);
      } catch (geoErr) {
        console.warn('Geocoding error:', geoErr);
        formattedAddress = `Coordinates: ${latNum}, ${lngNum}`;
      }
    }

    // Create location object with exact coordinates
    const location = {
      locationType: locationType,
      userName: userName || (locationType === 'doctor' ? claim.doctorName || 'Doctor' : claim.patientName || 'Patient'),
      latitude: latNum,
      longitude: lngNum,
      accuracy: accuracy ? parseFloat(accuracy) : null,
      address: formattedAddress,
      capturedAt: new Date(),
      capturedBy: req.user ? req.user._id : null,
    };

    // Find if location for this type already exists
    const existingLocationIndex = claim.locations.findIndex(
      loc => loc.locationType === locationType
    );

    if (existingLocationIndex !== -1) {
      // Update existing location
      claim.locations[existingLocationIndex] = location;
      console.log(`Updated existing ${locationType} location with exact coords (${latNum}, ${lngNum})`);
    } else {
      // Add new location
      claim.locations.push(location);
      console.log(`Added new ${locationType} location with exact coords (${latNum}, ${lngNum})`);
    }

    // If this is patient location, also update formData geo_location if formData exists
    if (locationType === 'patient') {
      if (!claim.formData) {
        claim.formData = {};
      }
      claim.formData.geo_location = `${latNum}, ${lngNum}`;
    }

    await claim.save();

    console.log(`Location saved successfully in MongoDB Atlas!`);
    console.log(`Total locations now: ${claim.locations.length}`);
    console.log(`===========================\n`);

    res.status(200).json({
      success: true,
      message: `${locationType === 'doctor' ? 'Doctor' : 'Patient'} location saved successfully`,
      data: {
        claimId: claim.claimId,
        claimMongoId: claim._id,
        location: location,
        totalLocations: claim.locations.length,
      },
    });
  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Upload screen recording to claim
// @route   POST /api/claims/:id/recording
// @access  Private (Doctor only)
exports.uploadRecording = async (req, res) => {
  try {
    const claimId = req.params.id;
    const { duration } = req.body;

    console.log(`\n=== Recording Upload Request ===`);
    console.log(`Claim ID: ${claimId}`);
    console.log(`Doctor ID: ${req.user._id}`);
    console.log(`Duration: ${duration}s`);
    console.log(`File:`, req.file ? req.file.filename : 'No file');

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Please upload a recording file' 
      });
    }

    const claim = await Claim.findById(claimId);

    if (!claim) {
      return res.status(404).json({ 
        success: false,
        message: `Claim not found with ID: ${claimId}` 
      });
    }

    console.log(`Found Claim: ${claim.claimId}`);
    console.log(`Current recordings count: ${claim.recordings.length}`);

    // Add recording to claim
    const recording = {
      filename: req.file.filename,
      path: req.file.path,
      duration: duration ? parseFloat(duration) : null,
      fileSize: req.file.size,
      recordedBy: req.user._id,
      recordedAt: new Date(),
    };

    claim.recordings.push(recording);
    await claim.save();

    console.log(`Recording saved successfully!`);
    console.log(`File size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total recordings now: ${claim.recordings.length}`);
    console.log(`===========================\n`);

    res.status(200).json({
      success: true,
      message: 'Screen recording uploaded successfully',
      data: {
        claimId: claim.claimId,
        claimMongoId: claim._id,
        recording: claim.recordings[claim.recordings.length - 1],
        totalRecordings: claim.recordings.length,
      },
    });
  } catch (error) {
    console.error('Error uploading recording:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Submit detailed claim form
// @route   POST /api/claims/:id/form
// @access  Private (Doctor only)
exports.submitClaimForm = async (req, res) => {
  try {
    const claimId = req.params.id;
    const formFields = req.body;

    console.log(`\n=== Claim Form Submission ===`);
    console.log(`Claim ID: ${claimId}`);
    console.log(`Doctor ID: ${req.user._id}`);
    console.log(`Form Fields:`, Object.keys(formFields));
    console.log(`Files:`, req.files ? req.files.length : 0);

    const claim = await Claim.findById(claimId);

    if (!claim) {
      return res.status(404).json({ 
        success: false,
        message: `Claim not found with ID: ${claimId}` 
      });
    }

    console.log(`Found Claim: ${claim.claimId}`);

    // Prepare form documents
    const formDocuments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        formDocuments.push({
          filename: file.filename,
          path: file.path,
          uploadedAt: new Date(),
        });
      });
    }

    // Update claim with form data
    claim.formData = {
      ...formFields,
      form_documents: formDocuments,
      submitted_at: new Date(),
      submitted_by: req.user._id,
    };

    // Update claim status to closed (completed)
    claim.status = 'closed';
    
    // Set completedAt timestamp
    if (!claim.completedAt) {
      claim.completedAt = new Date();
    }

    await claim.save();

    // Update meeting status to completed if exists
    const Meeting = require('../models/Meeting');
    const meeting = await Meeting.findOne({ claimId: claim._id });
    if (meeting) {
      meeting.status = 'completed';
      meeting.claimFormSubmitted = true;
      await meeting.save();
      console.log(`Meeting status updated to completed`);
    }

    console.log(`Form submitted successfully!`);
    console.log(`Documents uploaded: ${formDocuments.length}`);
    console.log(`===========================\n`);

    res.status(200).json({
      success: true,
      message: 'Claim form submitted successfully',
      data: {
        claimId: claim.claimId,
        claimMongoId: claim._id,
        formData: claim.formData,
      },
    });
  } catch (error) {
    console.error('Error submitting claim form:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Generate and download claim PDF
// @route   GET /api/claims/:id/pdf
// @access  Private (Doctor)
exports.generateClaimPDF = async (req, res) => {
  try {
    console.log('\n=== PDF Generation Request ===');
    console.log('Claim ID:', req.params.id);

    // Find claim by claimId or MongoDB _id
    let claim = await Claim.findOne({ claimId: req.params.id });
    
    if (!claim) {
      claim = await Claim.findById(req.params.id);
    }

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    console.log('Found claim:', claim.claimId);

    // Create pdfs directory if it doesn't exist
    const pdfsDir = path.join(__dirname, '..', 'pdfs');
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    // Generate PDF filename
    const pdfFilename = `claim-${claim.claimId}-${Date.now()}.pdf`;
    const pdfPath = path.join(pdfsDir, pdfFilename);

    console.log('Generating PDF at:', pdfPath);

    // Generate PDF
    await generateClaimPDF(claim, pdfPath);

    console.log('PDF generated successfully!');

    // Set response headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);

    // Stream the PDF file
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    // Delete PDF after sending (optional)
    fileStream.on('end', () => {
      // Optionally delete the file after 5 seconds
      setTimeout(() => {
        fs.unlink(pdfPath, (err) => {
          if (err) console.error('Error deleting PDF:', err);
          else console.log('PDF deleted:', pdfPath);
        });
      }, 5000);
    });

    console.log('===========================\n');

  } catch (error) {
    console.error('Error generating claim PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
};

// @desc    Get claim PDF download link
// @route   GET /api/claims/:id/pdf-link
// @access  Private (Doctor)
exports.getClaimPDFLink = async (req, res) => {
  try {
    console.log('\n=== PDF Link Request ===');
    console.log('Claim ID:', req.params.id);

    // Find claim by claimId or MongoDB _id
    let claim = await Claim.findOne({ claimId: req.params.id });
    
    if (!claim) {
      claim = await Claim.findById(req.params.id);
    }

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Return download link
    const downloadLink = `${req.protocol}://${req.get('host')}/api/claims/${req.params.id}/pdf`;

    res.status(200).json({
      success: true,
      message: 'PDF download link generated',
      data: {
        claimId: claim.claimId,
        downloadLink: downloadLink,
        directDownload: true
      }
    });

    console.log('PDF link generated:', downloadLink);
    console.log('===========================\n');

  } catch (error) {
    console.error('Error generating PDF link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF link',
      error: error.message
    });
  }
};

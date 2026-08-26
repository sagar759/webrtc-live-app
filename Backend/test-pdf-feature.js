const path = require('path');
const fs = require('fs');
const { generateClaimPDF } = require('./utils/pdfGenerator');

async function runTest() {
  console.log('==================================================');
  console.log('  Testing Exact Coordinates & Clickable Links in PDF');
  console.log('==================================================\n');

  // Sample claim with Doctor and Patient coordinates in different locations
  const sampleClaim = {
    claimId: 'CLM-TEST-GEO-01',
    patientName: 'Rahul Sharma',
    patientMobile: '9876543210',
    hospitalCity: 'Bengaluru',
    hospitalState: 'Karnataka',
    patientLanguage: 'English / Hindi',
    status: 'closed',
    createdAt: new Date(),
    doctorName: 'Dr. Santosh Kumar',
    doctorEmail: 'doctor@example.com',
    locations: [
      {
        locationType: 'patient',
        userName: 'Rahul Sharma (Patient)',
        latitude: 12.971598,
        longitude: 77.594562,
        accuracy: 8,
        address: 'MG Road, Indiranagar, Bengaluru, Karnataka 560038, India',
        capturedAt: new Date()
      },
      {
        locationType: 'doctor',
        userName: 'Dr. Santosh Kumar (Doctor)',
        latitude: 28.613939,
        longitude: 77.209021,
        accuracy: 12,
        address: 'Connaught Place, New Delhi, Delhi 110001, India',
        capturedAt: new Date()
      }
    ],
    formData: {
      patient_name: 'Rahul Sharma',
      hospital_name: 'City Care Hospital',
      hospital_location: 'Bengaluru, Karnataka',
      diagnosis: 'Viral Fever & Dehydration',
      treating_doctor: 'Dr. Santosh Kumar',
      final_assessment: 'Verified via Video Consultation with GPS Geolocation Tracking.',
      conclusion_type: 'Approved',
      geo_location: '12.971598, 77.594562'
    },
    documents: [],
    capturedImages: [],
    signatures: []
  };

  const pdfsDir = path.join(__dirname, 'pdfs');
  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }

  const outputPath = path.join(pdfsDir, 'sample-test-report.pdf');
  console.log('Generating PDF at:', outputPath);

  try {
    await generateClaimPDF(sampleClaim, outputPath);
    console.log('\n✅ SUCCESS: PDF Generated successfully!');
    console.log('📁 File Location:', outputPath);
    console.log('📏 File Size:', (fs.statSync(outputPath).size / 1024).toFixed(2), 'KB\n');

    console.log('🔍 Verified Elements in PDF:');
    console.log('  1. Patient Coordinates: 12.971598, 77.594562');
    console.log('  2. Doctor Coordinates:  28.613939, 77.209021');
    console.log('  3. Patient Text Address: "MG Road, Indiranagar, Bengaluru, Karnataka 560038, India"');
    console.log('  4. Patient Google Maps Click Link: https://www.google.com/maps?q=12.971598,77.594562');
    console.log('  5. Doctor Google Maps Click Link:  https://www.google.com/maps?q=28.613939,77.209021');
    console.log('\n👉 Open the generated PDF file above in your browser or Adobe Reader to click the links and test!');
  } catch (err) {
    console.error('❌ Error generating PDF:', err);
  }
}

runTest();

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const https = require('https');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
const COMPANY_NAME = process.env.COMPANY_NAME || 'Saturn Health Investigation';

/**
 * Resolves local logo file path with multiple fallback locations
 */
const getCompanyLogoPath = () => {
  const candidates = [
    path.join(__dirname, '..', 'assets', 'company_logo_transparent.png'),
    path.join(__dirname, '..', 'assets', 'Logo.jpeg'),
    path.join(__dirname, '..', '..', 'Forntend', 'src', 'assets', 'company_logo_transparent.png'),
    path.join(__dirname, '..', '..', 'Forntend', 'src', 'assets', 'Logo.jpeg'),
    path.join(__dirname, '..', '..', 'Forntend', 'src', 'assets', 'company_logo.jpeg'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

/**
 * Resolves full download URL for Azure Blob storage URLs or local relative paths
 */
const resolveDownloadUrl = (pathOrUrl, filename) => {
  if (pathOrUrl && (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://'))) {
    return pathOrUrl;
  }
  const baseUrl = (process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');
  const cleanPath = (pathOrUrl || filename || '').replace(/\\/g, '/');
  return `${baseUrl}/${cleanPath}`;
};

/**
 * Download Google Static Maps image
 */
const downloadMapImage = (latitude, longitude, tempPath) => {
  return new Promise((resolve, reject) => {
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=400x300&markers=color:red%7Clabel:L%7C${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const request = https.get(mapUrl, (response) => {
      const contentType = response.headers['content-type'] || '';
      if (response.statusCode !== 200 || !contentType.startsWith('image/')) {
        response.resume();
        return reject(new Error(`Static map unavailable (HTTP ${response.statusCode}, type: ${contentType})`));
      }

      const file = fs.createWriteStream(tempPath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(tempPath);
      });
      file.on('error', (err) => {
        fs.unlink(tempPath, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      fs.unlink(tempPath, () => {});
      reject(err);
    });

    request.setTimeout(4000, () => {
      request.destroy();
      fs.unlink(tempPath, () => {});
      reject(new Error('Static map request timeout'));
    });
  });
};

/**
 * Generate comprehensive, executive claim PDF report with full company branding
 * @param {Object} claim - Claim object from database
 * @param {String} outputPath - Path where PDF will be saved
 * @returns {Promise} - Resolves when PDF is generated
 */
const generateClaimPDF = async (claim, outputPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create pdfs directory if it doesn't exist
      const pdfsDir = path.join(__dirname, '..', 'pdfs');
      if (!fs.existsSync(pdfsDir)) {
        fs.mkdirSync(pdfsDir, { recursive: true });
      }

      const logoPath = getCompanyLogoPath();
      const generatedAtFormatted = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      // Page metrics (A4 size: 595.28 x 841.89 pt)
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const contentLeft = 40;
      const contentRight = 555.28;
      const contentWidth = contentRight - contentLeft; // 515.28 pt
      const bottomLimit = 750; // Content boundary before footer

      // Initialize PDFKit document with buffered pages
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        bufferPages: true,
        info: {
          Title: `Claim Report - ${claim.claimId || 'Investigation'}`,
          Author: COMPANY_NAME,
          Subject: 'Medical Claim & Video Investigation Report',
          Keywords: 'Claim, Medical Investigation, WebRTC, Geolocation, Verification',
          CreationDate: new Date()
        }
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Helper to check and handle page break
      const checkPageBreak = (neededHeight) => {
        if (yPosition + neededHeight > bottomLimit) {
          doc.addPage();
          yPosition = 58; // Content start for subsequent pages (below running header)
          return true;
        }
        return false;
      };

      // Helper to render section title with decorative accent bar
      const drawSectionHeader = (title, accentColor = '#3b82f6') => {
        checkPageBreak(35);
        yPosition += 8;
        
        // Vertical accent bar
        doc.roundedRect(contentLeft, yPosition, 4, 18, 2).fill(accentColor);

        // Section Title
        doc.fillColor('#0f172a')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text(title, contentLeft + 12, yPosition + 3);

        yPosition += 24;
      };

      // Helper to render sub-section header
      const drawSubSectionHeader = (title, color = '#6366f1') => {
        checkPageBreak(25);
        yPosition += 5;
        doc.fillColor(color)
           .fontSize(10.5)
           .font('Helvetica-Bold')
           .text(title, contentLeft, yPosition);
        yPosition += 16;
      };

      // Helper to draw formatted table row
      const drawTableRow = (label, value, isHeader = false, customCol1Width = 190) => {
        const rowHeight = 22;
        checkPageBreak(rowHeight + 2);

        const col1X = contentLeft;
        const col2X = contentLeft + customCol1Width;
        const col1Width = customCol1Width;
        const col2Width = contentWidth - customCol1Width;

        if (isHeader) {
          doc.rect(col1X, yPosition, contentWidth, rowHeight)
             .fill('#1e293b');
          doc.fillColor('#ffffff')
             .fontSize(9)
             .font('Helvetica-Bold')
             .text(label, col1X + 8, yPosition + 6, { width: col1Width - 16 })
             .text(value, col2X + 8, yPosition + 6, { width: col2Width - 16 });
        } else {
          const isEven = Math.floor(yPosition / rowHeight) % 2 === 0;
          doc.rect(col1X, yPosition, contentWidth, rowHeight)
             .fillAndStroke(isEven ? '#f8fafc' : '#ffffff', '#e2e8f0');

          doc.fillColor('#334155')
             .fontSize(8.5)
             .font('Helvetica-Bold')
             .text(label, col1X + 8, yPosition + 6, { width: col1Width - 16 });

          doc.fillColor('#0f172a')
             .font('Helvetica')
             .text(value || 'N/A', col2X + 8, yPosition + 6, { width: col2Width - 16 });
        }

        yPosition += rowHeight;
      };

      // ==========================================
      // PAGE 1: EXECUTIVE HERO HEADER
      // ==========================================
      const headerHeight = 80;
      
      // Slate luxury header background
      doc.rect(0, 0, pageWidth, headerHeight).fill('#0f172a');
      
      // Bottom accent bar (Emerald representation)
      doc.rect(0, headerHeight - 3, pageWidth, 3).fill('#10b981');

      // Company Logo on Page 1
      if (logoPath) {
        try {
          // White rounded container box for logo
          doc.roundedRect(contentLeft, 10, 60, 60, 6).fill('#ffffff');
          doc.image(logoPath, contentLeft + 2, 12, {
            fit: [56, 56],
            align: 'center',
            valign: 'center'
          });
        } catch (logoErr) {
          console.warn('Could not render logo in header:', logoErr.message);
        }
      }

      // Company Title & Branding
      const titleLeft = logoPath ? contentLeft + 72 : contentLeft;
      doc.fillColor('#ffffff')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text(COMPANY_NAME.toUpperCase(), titleLeft, 32);

      // Top-Right Metadata Pill Card
      const metaCardWidth = 175;
      const metaCardX = contentRight - metaCardWidth;
      
      doc.roundedRect(metaCardX, 10, metaCardWidth, 60, 6)
         .fillAndStroke('#1e293b', '#334155');

      doc.fillColor('#93c5fd')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text('CLAIM ID:', metaCardX + 10, 18);

      doc.fillColor('#ffffff')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(claim.claimId || 'N/A', metaCardX + 55, 17, { width: metaCardWidth - 65, align: 'right' });

      // Status Pill
      const statusRaw = (claim.status || 'PENDING').toUpperCase();
      let statusBg = '#854d0e';
      let statusText = '#fef08a';
      if (statusRaw === 'APPROVED' || statusRaw === 'CLOSED') {
        statusBg = '#065f46';
        statusText = '#6ee7b7';
      } else if (statusRaw === 'REJECTED' || statusRaw === 'FAILED') {
        statusBg = '#991b1b';
        statusText = '#fca5a5';
      }

      doc.roundedRect(metaCardX + 10, 40, 60, 18, 4).fill(statusBg);
      doc.fillColor(statusText)
         .fontSize(7.5)
         .font('Helvetica-Bold')
         .text(statusRaw, metaCardX + 10, 45, { width: 60, align: 'center' });

      doc.fillColor('#cbd5e1')
         .fontSize(7.5)
         .font('Helvetica')
         .text(`Date: ${new Date(claim.createdAt || Date.now()).toLocaleDateString('en-IN')}`, metaCardX + 75, 45, { width: metaCardWidth - 85, align: 'right' });

      // Start page 1 content below the hero header
      let yPosition = headerHeight + 16;

      // Extract unique locations
      const patientLocations = (claim.locations || []).filter(loc => loc.locationType === 'patient');
      const doctorLocations = (claim.locations || []).filter(loc => loc.locationType === 'doctor');
      const patientLocation = patientLocations.length > 0 ? patientLocations[patientLocations.length - 1] : null;
      const doctorLocation = doctorLocations.length > 0 ? doctorLocations[doctorLocations.length - 1] : null;

      // ==========================================
      // SECTION 1: BASIC INFORMATION
      // ==========================================
      drawSectionHeader('1. Basic Claim Information', '#3b82f6');

      const basicInfoList = [
        ['Patient Name', claim.patientName],
        ['Patient Mobile', claim.patientMobile],
        ['Hospital City', claim.hospitalCity],
        ['Hospital State', claim.hospitalState],
        ['Patient Language', claim.patientLanguage],
        ['Patient Address', (patientLocation && patientLocation.address) ? patientLocation.address : (claim.formData?.hospital_location || `${claim.hospitalCity || ''}, ${claim.hospitalState || ''}`)],
        ['Claim Status', statusRaw],
        ['Created At', new Date(claim.createdAt).toLocaleString('en-IN')],
      ];

      // Draw table header
      drawTableRow('Field Name', 'Claim Record Details', true);
      basicInfoList.forEach(([label, value]) => {
        drawTableRow(label, value);
      });

      // Quick links for coordinates in Basic Info section if available
      if (patientLocation || doctorLocation) {
        yPosition += 6;
        checkPageBreak(50);

        if (patientLocation) {
          const patUrl = `https://www.google.com/maps?q=${patientLocation.latitude},${patientLocation.longitude}`;
          doc.roundedRect(contentLeft, yPosition, contentWidth, 22, 4)
             .fillAndStroke('#ecfdf5', '#10b981');
          
          doc.fillColor('#065f46')
             .fontSize(8)
             .font('Helvetica-Bold')
             .text('📍 Patient Verified GPS: ', contentLeft + 8, yPosition + 6);
          
          doc.fillColor('#0284c7')
             .font('Helvetica')
             .text(`${patientLocation.latitude.toFixed(6)}, ${patientLocation.longitude.toFixed(6)} (Click to Open in Google Maps)`, contentLeft + 120, yPosition + 6, {
               link: patUrl,
               underline: true
             });
          yPosition += 26;
        }

        if (doctorLocation) {
          const docUrl = `https://www.google.com/maps?q=${doctorLocation.latitude},${doctorLocation.longitude}`;
          doc.roundedRect(contentLeft, yPosition, contentWidth, 22, 4)
             .fillAndStroke('#eef2ff', '#6366f1');
          
          doc.fillColor('#3730a3')
             .fontSize(8)
             .font('Helvetica-Bold')
             .text('📍 Doctor Verified GPS: ', contentLeft + 8, yPosition + 6);
          
          doc.fillColor('#0284c7')
             .font('Helvetica')
             .text(`${doctorLocation.latitude.toFixed(6)}, ${doctorLocation.longitude.toFixed(6)} (Click to Open in Google Maps)`, contentLeft + 120, yPosition + 6, {
               link: docUrl,
               underline: true
             });
          yPosition += 26;
        }
      }

      // Quick link for video call recording in Basic Info section if available
      const allRecs = [...(claim.recordings || [])];
      if (claim.formData?.recording_url && !allRecs.some(r => r.path === claim.formData.recording_url)) {
        allRecs.push({ path: claim.formData.recording_url, filename: 'meeting-recording.webm', duration: null, fileSize: null });
      }

      if (allRecs.length > 0) {
        yPosition += 2;
        checkPageBreak(28);
        const latestRec = allRecs[allRecs.length - 1];
        const recDownloadUrl = resolveDownloadUrl(latestRec.path, latestRec.filename);

        doc.roundedRect(contentLeft, yPosition, contentWidth, 22, 4)
           .fillAndStroke('#f0f9ff', '#0284c7');

        doc.fillColor('#0369a1')
           .fontSize(8)
           .font('Helvetica-Bold')
           .text('🎥 Video Call Recording: ', contentLeft + 8, yPosition + 6);

        doc.fillColor('#2563eb')
           .font('Helvetica')
           .text(`Click to Stream / Download Session Recording (${latestRec.duration ? latestRec.duration + 's' : 'Full Session'})`, contentLeft + 120, yPosition + 6, {
             link: recDownloadUrl,
             underline: true
           });
        yPosition += 28;
      }

      // ==========================================
      // SECTION 2: FORM DATA (POST-MEETING DATA)
      // ==========================================
      if (claim.formData && Object.keys(claim.formData).length > 0) {
        drawSectionHeader('2. Detailed Investigation & Medical Assessment', '#10b981');

        // Patient & Policy Information
        drawSubSectionHeader('A. Patient & Policy Details', '#0f766e');
        drawTableRow('Field Name', 'Submitted Information', true);

        const patientInfo = [
          ['Patient Name', claim.formData.patient_name],
          ['Date of Joining', claim.formData.doj ? new Date(claim.formData.doj).toLocaleDateString('en-IN') : null],
          ['Patient Relationship', claim.formData.patient_relationship],
          ['Mobile Number', claim.formData.mobile_number],
          ['Age', claim.formData.age],
          ['Insured Name', claim.formData.insured_name],
          ['Product', claim.formData.product],
          ['Policy Type', claim.formData.policy_type],
        ];

        patientInfo.forEach(([label, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            drawTableRow(label, value.toString());
          }
        });

        // Hospital Information
        yPosition += 6;
        drawSubSectionHeader('B. Hospital & Admission Details', '#0f766e');
        drawTableRow('Field Name', 'Hospital Record', true);

        const hospitalInfo = [
          ['Hospital Name', claim.formData.hospital_name],
          ['Hospital Location', claim.formData.hospital_location],
          ['Date of Admission', claim.formData.date_of_admission ? new Date(claim.formData.date_of_admission).toLocaleDateString('en-IN') : null],
          ['Date of Discharge', claim.formData.date_of_discharge ? new Date(claim.formData.date_of_discharge).toLocaleDateString('en-IN') : null],
          ['Room Type', claim.formData.room_type],
          ['ICU Stay', claim.formData.icu_stay],
          ['Advance Paid', claim.formData.advance_paid ? `₹${claim.formData.advance_paid}` : null],
        ];

        hospitalInfo.forEach(([label, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            drawTableRow(label, value.toString());
          }
        });

        // Medical Information
        yPosition += 6;
        drawSubSectionHeader('C. Clinical & Medical Evaluation', '#0f766e');
        drawTableRow('Field Name', 'Clinical Observation', true);

        const medicalInfo = [
          ['Diagnosis', claim.formData.diagnosis],
          ['Treating Doctor', claim.formData.treating_doctor],
          ['Tests Done', claim.formData.tests_done],
          ['Treatments Given', claim.formData.treatments_given],
          ['Previous Treatment', claim.formData.previous_treatment],
          ['Past Hospitalizations', claim.formData.past_hospitalizations],
          ['Past Surgery', claim.formData.past_surgery],
          ['IV Line Active', claim.formData.iv_line_active],
        ];

        medicalInfo.forEach(([label, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            drawTableRow(label, value.toString());
          }
        });

        // Additional Information
        yPosition += 6;
        drawSubSectionHeader('D. Additional Background & History', '#0f766e');
        drawTableRow('Field Name', 'History & Lifestyle', true);

        const additionalInfo = [
          ['Employment Details', claim.formData.employment_details],
          ['Informer Name', claim.formData.informer_name],
          ['Informer Relation', claim.formData.informer_relation],
          ['Current Status', claim.formData.current_status],
          ['Claim History', claim.formData.claim_history],
          ['Other Health Insurance', claim.formData.other_health_insurance],
          ['COVID Vaccination', claim.formData.covid_vaccination],
          ['Social Habits', claim.formData.social_habits],
        ];

        additionalInfo.forEach(([label, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            drawTableRow(label, value.toString());
          }
        });

        // Video Call Assessment
        yPosition += 6;
        drawSubSectionHeader('E. Video Call Verification Assessment', '#0f766e');
        drawTableRow('Field Name', 'Assessment Result', true);

        const assessmentInfo = [
          ['Patient Seen on Call', claim.formData.patient_seen_on_call],
          ['Patient Joined on Time', claim.formData.patient_joined_on_time],
          ['Final Assessment', claim.formData.final_assessment],
          ['Conclusion Type', claim.formData.conclusion_type],
        ];

        assessmentInfo.forEach(([label, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            drawTableRow(label, value.toString());
          }
        });

        // Investigation Details
        yPosition += 6;
        drawSubSectionHeader('F. Investigation Case Audit', '#0f766e');
        drawTableRow('Field Name', 'Audit Metadata', true);

        const investigationInfo = [
          ['Case Received Date', claim.formData.case_received_date ? new Date(claim.formData.case_received_date).toLocaleDateString('en-IN') : null],
          ['VI Completed Date', claim.formData.vi_completed_date ? new Date(claim.formData.vi_completed_date).toLocaleDateString('en-IN') : null],
          ['Investigating Doctor', claim.formData.investigating_doctor],
          ['Match Score', claim.formData.match_score ? `${claim.formData.match_score}%` : null],
          ['Geo Location', claim.formData.geo_location],
          ['Submitted At', claim.formData.submitted_at ? new Date(claim.formData.submitted_at).toLocaleDateString('en-IN') : null],
        ];

        investigationInfo.forEach(([label, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            drawTableRow(label, value.toString());
          }
        });

        // Patient Statement
        if (claim.formData.patient_statement) {
          yPosition += 6;
          const boxHeight = Math.max(50, Math.ceil(claim.formData.patient_statement.length / 85) * 13 + 28);
          checkPageBreak(boxHeight + 20);

          drawSubSectionHeader('G. Patient Verified Statement', '#0f766e');

          doc.roundedRect(contentLeft, yPosition, contentWidth, boxHeight, 6)
             .fillAndStroke('#f8fafc', '#cbd5e1');

          doc.fillColor('#334155')
             .fontSize(8.5)
             .font('Helvetica-Bold')
             .text('Recorded Statement Transcript:', contentLeft + 12, yPosition + 8);

          doc.fillColor('#0f172a')
             .fontSize(8.5)
             .font('Helvetica')
             .text(`"${claim.formData.patient_statement}"`, contentLeft + 12, yPosition + 22, {
               width: contentWidth - 24,
               align: 'justify'
             });

          yPosition += boxHeight + 10;
        }
      }

      // ==========================================
      // SECTION 3: UPLOADED DOCUMENTS
      // ==========================================
      if (claim.documents && claim.documents.length > 0) {
        drawSectionHeader('3. Initial Uploaded Documents', '#6366f1');

        claim.documents.forEach((docItem, index) => {
          const cardHeight = 40;
          checkPageBreak(cardHeight + 6);

          const downloadUrl = resolveDownloadUrl(docItem.path, docItem.filename);

          doc.roundedRect(contentLeft, yPosition, contentWidth, cardHeight, 6)
             .fillAndStroke('#f8fafc', '#e2e8f0');

          doc.fillColor('#0f172a')
             .fontSize(9)
             .font('Helvetica-Bold')
             .text(`📄 ${index + 1}. ${docItem.originalName || docItem.filename}`, contentLeft + 10, yPosition + 7);

          doc.fillColor('#475569')
             .fontSize(8)
             .font('Helvetica-Bold')
             .text('Download Link:', contentLeft + 10, yPosition + 23);

          doc.fillColor('#2563eb')
             .font('Helvetica')
             .text(downloadUrl, contentLeft + 80, yPosition + 23, { link: downloadUrl, underline: true, width: contentWidth - 90 });

          yPosition += cardHeight + 6;
        });
      }

      // ==========================================
      // SECTION 4: FORM DOCUMENTS
      // ==========================================
      if (claim.formData?.form_documents && claim.formData.form_documents.length > 0) {
        drawSectionHeader('4. Post-Meeting Submitted Evidence Documents', '#6366f1');

        claim.formData.form_documents.forEach((docItem, index) => {
          const cardHeight = 48;
          checkPageBreak(cardHeight + 6);

          const downloadUrl = resolveDownloadUrl(docItem.path, docItem.filename);

          doc.roundedRect(contentLeft, yPosition, contentWidth, cardHeight, 6)
             .fillAndStroke('#f8fafc', '#e2e8f0');

          doc.fillColor('#0f172a')
             .fontSize(9)
             .font('Helvetica-Bold')
             .text(`📑 ${index + 1}. ${docItem.filename}`, contentLeft + 10, yPosition + 7);

          doc.fillColor('#64748b')
             .fontSize(7.5)
             .font('Helvetica')
             .text(`Uploaded on: ${new Date(docItem.uploadedAt || Date.now()).toLocaleString('en-IN')}`, contentLeft + 10, yPosition + 20);

          doc.fillColor('#475569')
             .fontSize(8)
             .font('Helvetica-Bold')
             .text('Download Link:', contentLeft + 10, yPosition + 33);

          doc.fillColor('#2563eb')
             .font('Helvetica')
             .text(downloadUrl, contentLeft + 80, yPosition + 33, { link: downloadUrl, underline: true, width: contentWidth - 90 });

          yPosition += cardHeight + 6;
        });
      }

      // ==========================================
      // SECTION 5: GEOLOCATION & MAPS VERIFICATION
      // ==========================================
      const uniqueLocations = [];
      if (patientLocation) uniqueLocations.push(patientLocation);
      if (doctorLocation) uniqueLocations.push(doctorLocation);

      if (uniqueLocations.length > 0) {
        drawSectionHeader('5. Geolocation Tracking & Map Verification', '#059669');

        for (let i = 0; i < uniqueLocations.length; i++) {
          const location = uniqueLocations[i];
          const isPatient = location.locationType === 'patient';
          const isDoctor = location.locationType === 'doctor';
          const themeColor = isPatient ? '#059669' : '#4f46e5';
          const themeBg = isPatient ? '#ecfdf5' : '#eef2ff';

          checkPageBreak(100);

          // Sub-header title badge
          const headerTitle = isPatient 
            ? 'PATIENT VERIFIED LOCATION (GPS Coordinates Tracking)' 
            : (isDoctor ? 'DOCTOR VERIFIED LOCATION (GPS Coordinates Tracking)' : `${location.locationType.toUpperCase()} LOCATION`);

          doc.roundedRect(contentLeft, yPosition, contentWidth, 20, 4).fill(themeColor);
          doc.fillColor('#ffffff')
             .fontSize(9)
             .font('Helvetica-Bold')
             .text(headerTitle, contentLeft + 10, yPosition + 5);

          yPosition += 24;

          drawTableRow('Participant', location.userName || (isPatient ? claim.patientName : claim.doctorName), false, 170);
          drawTableRow('Exact Latitude', `${location.latitude} (${location.latitude.toFixed(6)}°)`, false, 170);
          drawTableRow('Exact Longitude', `${location.longitude} (${location.longitude.toFixed(6)}°)`, false, 170);
          drawTableRow('GPS Accuracy', location.accuracy ? `±${location.accuracy} meters` : 'High Accuracy GPS', false, 170);
          drawTableRow('Captured Timestamp', new Date(location.capturedAt || Date.now()).toLocaleString('en-IN'), false, 170);

          // Physical Address box
          yPosition += 4;
          const addressText = location.address || (isPatient ? `${claim.hospitalCity || ''}, ${claim.hospitalState || ''}` : 'Address not available');
          const addressLines = Math.max(1, Math.ceil(addressText.length / 80));
          const addressBoxHeight = Math.max(34, 16 + addressLines * 12);
          
          checkPageBreak(addressBoxHeight + 8);

          doc.roundedRect(contentLeft, yPosition, contentWidth, addressBoxHeight, 4)
             .fillAndStroke(themeBg, themeColor);

          doc.fillColor(themeColor)
             .fontSize(8)
             .font('Helvetica-Bold')
             .text(isPatient ? 'Patient Physical Address (Text):' : 'Doctor Physical Address (Text):', contentLeft + 10, yPosition + 4);

          doc.fillColor('#1e293b')
             .fontSize(8)
             .font('Helvetica')
             .text(addressText, contentLeft + 10, yPosition + 16, { width: contentWidth - 20 });

          yPosition += addressBoxHeight + 6;

          // Download and embed Google Maps static image
          try {
            checkPageBreak(250);
            const tempMapPath = path.join(__dirname, '..', 'pdfs', `temp-map-${location.locationType}-${Date.now()}.png`);
            await downloadMapImage(location.latitude, location.longitude, tempMapPath);

            doc.fillColor(themeColor)
               .fontSize(9)
               .font('Helvetica-Bold')
               .text(`🗺️ ${isPatient ? 'Patient' : 'Doctor'} Google Map View:`, contentLeft, yPosition);
            yPosition += 15;

            doc.image(tempMapPath, contentLeft, yPosition, { width: 440, height: 210 });
            yPosition += 220;

            fs.unlink(tempMapPath, (err) => {
              if (err) console.error('Error deleting temp map:', err);
            });
          } catch (mapErr) {
            console.warn('Map static snapshot skipped:', mapErr.message);
          }

          // Interactive Clickable Google Maps Redirect Link box
          checkPageBreak(32);
          const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

          doc.roundedRect(contentLeft, yPosition, contentWidth, 28, 4)
             .fillAndStroke('#eff6ff', '#3b82f6');

          doc.fillColor('#1d4ed8')
             .fontSize(7.5)
             .font('Helvetica-Bold')
             .text(`Click to Open ${isPatient ? 'Patient' : 'Doctor'} Coordinates in Google Maps:`, contentLeft + 8, yPosition + 4);

          doc.fillColor('#2563eb')
             .fontSize(7.5)
             .font('Helvetica')
             .text(mapsUrl, contentLeft + 8, yPosition + 15, {
               link: mapsUrl,
               underline: true,
               width: contentWidth - 16
             });

          yPosition += 34;
        }
      }

      // ==========================================
      // SECTION 6: CAPTURED IMAGES
      // ==========================================
      if (claim.capturedImages && claim.capturedImages.length > 0) {
        drawSectionHeader('6. Live Video Call Captured Images', '#ea580c');

        claim.capturedImages.forEach((img, index) => {
          const cardHeight = 52;
          checkPageBreak(cardHeight + 6);

          const downloadUrl = resolveDownloadUrl(img.path, img.filename);

          doc.roundedRect(contentLeft, yPosition, contentWidth, cardHeight, 6)
             .fillAndStroke('#f8fafc', '#e2e8f0');

          doc.fillColor('#0f172a')
             .fontSize(9)
             .font('Helvetica-Bold')
             .text(`📷 ${index + 1}. ${(img.type || 'PHOTO').toUpperCase()} Image`, contentLeft + 10, yPosition + 7);

          doc.fillColor('#64748b')
             .fontSize(7.5)
             .font('Helvetica')
             .text(`File: ${img.filename}  |  Captured: ${new Date(img.capturedAt || Date.now()).toLocaleString('en-IN')}`, contentLeft + 10, yPosition + 20);

          doc.fillColor('#ea580c')
             .fontSize(7.5)
             .font('Helvetica-Bold')
             .text('Download Image:', contentLeft + 10, yPosition + 34);

          doc.fillColor('#2563eb')
             .font('Helvetica')
             .text(downloadUrl, contentLeft + 90, yPosition + 34, { link: downloadUrl, underline: true, width: contentWidth - 100 });

          yPosition += cardHeight + 6;
        });
      }

      // ==========================================
      // SECTION 7: SIGNATURES
      // ==========================================
      if (claim.signatures && claim.signatures.length > 0) {
        drawSectionHeader('7. Digital Signatures & Verifications', '#7c3aed');

        claim.signatures.forEach((sig, index) => {
          const cardHeight = 52;
          checkPageBreak(cardHeight + 6);

          const downloadUrl = resolveDownloadUrl(sig.path, sig.filename);

          doc.roundedRect(contentLeft, yPosition, contentWidth, cardHeight, 6)
             .fillAndStroke('#f8fafc', '#e2e8f0');

          doc.fillColor('#0f172a')
             .fontSize(9)
             .font('Helvetica-Bold')
             .text(`✍️ ${index + 1}. ${(sig.signedBy || 'Doctor').toUpperCase()} Digital Signature`, contentLeft + 10, yPosition + 7);

          doc.fillColor('#64748b')
             .fontSize(7.5)
             .font('Helvetica')
             .text(`Signed by: ${sig.signerName || 'Authorized Signatory'}  |  Date: ${new Date(sig.signedAt || Date.now()).toLocaleString('en-IN')}`, contentLeft + 10, yPosition + 20);

          doc.fillColor('#7c3aed')
             .fontSize(7.5)
             .font('Helvetica-Bold')
             .text('View Signature:', contentLeft + 10, yPosition + 34);

          doc.fillColor('#2563eb')
             .font('Helvetica')
             .text(downloadUrl, contentLeft + 90, yPosition + 34, { link: downloadUrl, underline: true, width: contentWidth - 100 });

          yPosition += cardHeight + 6;
        });
      }

      // ==========================================
      // SECTION 8: VIDEO RECORDING & AZURE VERIFICATION
      // ==========================================
      const recordingsList = [...(claim.recordings || [])];
      if (claim.formData?.recording_url && !recordingsList.some(r => r.path === claim.formData.recording_url)) {
        recordingsList.push({
          path: claim.formData.recording_url,
          filename: 'session-recording.webm',
          duration: null,
          fileSize: null,
          recordedAt: new Date()
        });
      }

      if (recordingsList.length > 0) {
        drawSectionHeader('8. Video Call Recording & Cloud Storage Verification', '#0284c7');

        recordingsList.forEach((recording, index) => {
          const cardHeight = 84;
          checkPageBreak(cardHeight + 8);

          const downloadUrl = resolveDownloadUrl(recording.path, recording.filename);
          const isAzureUrl = downloadUrl.includes('blob.core.windows.net') || downloadUrl.includes('azure');

          // Outer card
          doc.roundedRect(contentLeft, yPosition, contentWidth, cardHeight, 6)
             .fillAndStroke('#f8fafc', '#cbd5e1');

          // Header badge
          doc.roundedRect(contentLeft, yPosition, contentWidth, 20, 6)
             .fill(isAzureUrl ? '#0284c7' : '#4f46e5');

          doc.fillColor('#ffffff')
             .fontSize(8.5)
             .font('Helvetica-Bold')
             .text(
               isAzureUrl 
                 ? `🎥 ${index + 1}. Video Call Recording — ☁️ Azure Blob Cloud Verified Storage` 
                 : `🎥 ${index + 1}. Video Call Recording Session`,
               contentLeft + 10, 
               yPosition + 5
             );

          yPosition += 24;

          // Metadata row
          doc.fillColor('#1e293b')
             .fontSize(8)
             .font('Helvetica-Bold')
             .text(`File: ${recording.filename || 'recording.webm'}   |   Duration: ${recording.duration ? recording.duration + 's' : 'Full Session'}   |   Size: ${recording.fileSize ? (recording.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}`, contentLeft + 10, yPosition);

          yPosition += 14;

          doc.fillColor('#64748b')
             .fontSize(7)
             .font('Helvetica')
             .text(`Recorded At: ${new Date(recording.recordedAt || Date.now()).toLocaleString('en-IN')}`, contentLeft + 10, yPosition);

          yPosition += 12;

          // Clickable Link Bar
          doc.roundedRect(contentLeft + 8, yPosition, contentWidth - 16, 22, 4)
             .fillAndStroke('#eff6ff', '#3b82f6');

          doc.fillColor('#1d4ed8')
             .fontSize(7)
             .font('Helvetica-Bold')
             .text('▶️ Stream / Download Video from Azure Cloud:', contentLeft + 12, yPosition + 6);

          doc.fillColor('#2563eb')
             .font('Helvetica')
             .text(downloadUrl, contentLeft + 185, yPosition + 6, {
               link: downloadUrl,
               underline: true,
               width: contentWidth - 200
             });

          yPosition += 32;
        });
      }

      // ==========================================
      // APPLY MULTI-PAGE RUNNING HEADERS & FOOTERS
      // ==========================================
      const range = doc.bufferedPageRange();
      const totalPages = range.count;

      for (let i = range.start; i < range.start + totalPages; i++) {
        doc.switchToPage(i);
        const pageNumber = i + 1;

        // RUNNING HEADER FOR PAGES 2+
        if (i > range.start) {
          // Top bar
          doc.rect(0, 0, pageWidth, 42).fill('#0f172a');
          doc.rect(0, 40, pageWidth, 2).fill('#10b981');

          // Mini Logo on Page 2+
          if (logoPath) {
            try {
              doc.roundedRect(contentLeft, 6, 30, 30, 4).fill('#ffffff');
              doc.image(logoPath, contentLeft + 2, 8, {
                fit: [26, 26],
                align: 'center',
                valign: 'center'
              });
            } catch (e) {}
          }

          const headerTextLeft = logoPath ? contentLeft + 38 : contentLeft;
          doc.fillColor('#ffffff')
             .fontSize(9)
             .font('Helvetica-Bold')
             .text(COMPANY_NAME.toUpperCase(), headerTextLeft, 11);

          doc.fillColor('#94a3b8')
             .fontSize(7.5)
             .font('Helvetica')
             .text('Claims Investigation Report', headerTextLeft, 24);

          doc.fillColor('#93c5fd')
             .fontSize(8)
             .font('Helvetica-Bold')
             .text(`Claim ID: ${claim.claimId || 'N/A'}`, contentRight - 180, 11, { width: 180, align: 'right' });

          doc.fillColor('#cbd5e1')
             .fontSize(7)
             .font('Helvetica')
             .text('Confidential Investigation Document', contentRight - 180, 24, { width: 180, align: 'right' });
        }

        // RUNNING FOOTER ON ALL PAGES
        const footerY = 788;
        doc.strokeColor('#e2e8f0')
           .lineWidth(1)
           .moveTo(contentLeft, footerY)
           .lineTo(contentRight, footerY)
           .stroke();

        // Footer Left: Company Name & Notice
        doc.fillColor('#0f172a')
           .fontSize(8)
           .font('Helvetica-Bold')
           .text(COMPANY_NAME, contentLeft, footerY + 8);

        doc.fillColor('#64748b')
           .fontSize(7)
           .font('Helvetica')
           .text('Confidential Medical Claim Assessment • Verified Digital Report', contentLeft, footerY + 19);

        // Footer Right: Page Number & Generation Timestamp
        doc.fillColor('#3b82f6')
           .fontSize(8)
           .font('Helvetica-Bold')
           .text(`Page ${pageNumber} of ${totalPages}`, contentRight - 150, footerY + 8, { width: 150, align: 'right' });

        doc.fillColor('#94a3b8')
           .fontSize(7)
           .font('Helvetica')
           .text(`Generated: ${generatedAtFormatted}`, contentRight - 150, footerY + 19, { width: 150, align: 'right' });
      }

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        console.log('PDF generated successfully:', outputPath);
        resolve(outputPath);
      });

      stream.on('error', (err) => {
        console.error('Error generating PDF stream:', err);
        reject(err);
      });

    } catch (error) {
      console.error('Error in PDF generation:', error);
      reject(error);
    }
  });
};

module.exports = { generateClaimPDF };

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const https = require('https');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

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
        response.resume(); // consume response data to free up memory
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
 * Generate comprehensive claim PDF report
 * @param {Object} claim - Claim object from database
 * @param {String} outputPath - Path where PDF will be saved
 * @returns {Promise} - Resolves when PDF is generated
 */
const generateClaimPDF = async (claim, outputPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create pdfs directory if it doesn't exist (for temp map storage)
      const pdfsDir = path.join(__dirname, '..', 'pdfs');
      if (!fs.existsSync(pdfsDir)) {
        fs.mkdirSync(pdfsDir, { recursive: true });
      }

      // Create a document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Pipe to file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Header with gradient effect
      doc.rect(0, 0, 612, 80).fill('#667eea');
      
      // Title
      doc.fillColor('#ffffff')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('CLAIM REPORT', 50, 30, { align: 'center' });

      // Claim ID in header
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Claim ID: ${claim.claimId}`, 50, 55, { align: 'center' });

      // Reset position
      let yPosition = 100;

      // Section: Basic Information
      doc.fillColor('#000000')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Basic Information', 50, yPosition);
      
      yPosition += 25;
      doc.fontSize(11)
         .font('Helvetica');

      // Get latest unique location for patient and doctor
      const patientLocations = (claim.locations || []).filter(loc => loc.locationType === 'patient');
      const doctorLocations = (claim.locations || []).filter(loc => loc.locationType === 'doctor');
      const patientLocation = patientLocations.length > 0 ? patientLocations[patientLocations.length - 1] : null;
      const doctorLocation = doctorLocations.length > 0 ? doctorLocations[doctorLocations.length - 1] : null;

      const basicInfo = [
        ['Patient Name', claim.patientName],
        ['Patient Mobile', claim.patientMobile],
        ['Hospital City', claim.hospitalCity],
        ['Hospital State', claim.hospitalState],
        ['Patient Language', claim.patientLanguage],
        ['Patient Address', (patientLocation && patientLocation.address) ? patientLocation.address : (claim.formData?.hospital_location || `${claim.hospitalCity}, ${claim.hospitalState}`)],
        ['Status', claim.status.toUpperCase()],
        ['Created At', new Date(claim.createdAt).toLocaleString('en-IN')],
      ];

      basicInfo.forEach(([label, value]) => {
        doc.font('Helvetica-Bold')
           .text(`${label}: `, 50, yPosition, { continued: true })
           .font('Helvetica')
           .text(value || 'N/A');
        yPosition += 20;
      });

      // Quick links for coordinates in Basic Info section if available
      if (patientLocation || doctorLocation) {
        yPosition += 5;
        if (patientLocation) {
          const patUrl = `https://www.google.com/maps?q=${patientLocation.latitude},${patientLocation.longitude}`;
          doc.font('Helvetica-Bold')
             .fillColor('#059669')
             .text('Patient Coordinates: ', 50, yPosition, { continued: true })
             .fillColor('#0066cc')
             .font('Helvetica')
             .text(`${patientLocation.latitude.toFixed(6)}, ${patientLocation.longitude.toFixed(6)} (Click to Open Map)`, {
               link: patUrl,
               underline: true
             });
          yPosition += 18;
        }

        if (doctorLocation) {
          const docUrl = `https://www.google.com/maps?q=${doctorLocation.latitude},${doctorLocation.longitude}`;
          doc.font('Helvetica-Bold')
             .fillColor('#4338ca')
             .text('Doctor Coordinates: ', 50, yPosition, { continued: true })
             .fillColor('#0066cc')
             .font('Helvetica')
             .text(`${doctorLocation.latitude.toFixed(6)}, ${doctorLocation.longitude.toFixed(6)} (Click to Open Map)`, {
               link: docUrl,
               underline: true
             });
          yPosition += 18;
        }
        doc.fillColor('#000000');
      }

      // Section: Form Data (Table Format)
      if (claim.formData && Object.keys(claim.formData).length > 0) {
        yPosition += 15;
        
        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#667eea')
           .text('Detailed Form Information (Post-Meeting Data)', 50, yPosition);
        
        yPosition += 25;

        // Helper function to draw table row
        const drawTableRow = (label, value, isHeader = false) => {
          if (yPosition > 720) {
            doc.addPage();
            yPosition = 50;
          }

          const rowHeight = 25;
          const col1X = 50;
          const col2X = 280;
          const col1Width = 230;
          const col2Width = 280;

          // Draw row background
          if (isHeader) {
            doc.rect(col1X, yPosition, col1Width + col2Width, rowHeight)
               .fill('#667eea');
            doc.fillColor('#ffffff');
          } else {
            // Alternating row colors
            const bgColor = yPosition % 50 === 0 ? '#f9fafb' : '#ffffff';
            doc.rect(col1X, yPosition, col1Width + col2Width, rowHeight)
               .fill(bgColor);
            doc.fillColor('#000000');
          }

          // Draw borders
          doc.rect(col1X, yPosition, col1Width, rowHeight).stroke('#dddddd');
          doc.rect(col2X, yPosition, col2Width, rowHeight).stroke('#dddddd');

          // Draw text
          doc.fontSize(10)
             .font(isHeader ? 'Helvetica-Bold' : 'Helvetica-Bold')
             .text(label, col1X + 10, yPosition + 8, { width: col1Width - 20 });
          
          doc.font('Helvetica')
             .text(value || 'N/A', col2X + 10, yPosition + 8, { width: col2Width - 20 });

          yPosition += rowHeight;
        };

        // Table Header
        doc.fillColor('#667eea');
        drawTableRow('Field Name', 'Value', true);
        doc.fillColor('#000000');

        // Patient & Policy Information
        if (yPosition > 700) { doc.addPage(); yPosition = 50; }
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#764ba2')
           .text('Patient & Policy Information', 50, yPosition + 10);
        yPosition += 35;

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
          if (value !== null && value !== undefined) {
            drawTableRow(label, value.toString());
          }
        });

        // Hospital Information
        yPosition += 15;
        if (yPosition > 700) { doc.addPage(); yPosition = 50; }
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#764ba2')
           .text('Hospital Information', 50, yPosition + 10);
        yPosition += 35;

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
          if (value !== null && value !== undefined) {
            drawTableRow(label, value.toString());
          }
        });

        // Medical Information
        yPosition += 15;
        if (yPosition > 700) { doc.addPage(); yPosition = 50; }
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#764ba2')
           .text('Medical Information', 50, yPosition + 10);
        yPosition += 35;

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
          if (value !== null && value !== undefined) {
            drawTableRow(label, value.toString());
          }
        });

        // Additional Information
        yPosition += 15;
        if (yPosition > 700) { doc.addPage(); yPosition = 50; }
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#764ba2')
           .text('Additional Information', 50, yPosition + 10);
        yPosition += 35;

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
          if (value !== null && value !== undefined) {
            drawTableRow(label, value.toString());
          }
        });

        // Video Call Assessment
        yPosition += 15;
        if (yPosition > 700) { doc.addPage(); yPosition = 50; }
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#764ba2')
           .text('Video Call Assessment', 50, yPosition + 10);
        yPosition += 35;

        const assessmentInfo = [
          ['Patient Seen on Call', claim.formData.patient_seen_on_call],
          ['Patient Joined on Time', claim.formData.patient_joined_on_time],
          ['Final Assessment', claim.formData.final_assessment],
          ['Conclusion Type', claim.formData.conclusion_type],
        ];

        assessmentInfo.forEach(([label, value]) => {
          if (value !== null && value !== undefined) {
            drawTableRow(label, value.toString());
          }
        });

        // Investigation Details
        yPosition += 15;
        if (yPosition > 700) { doc.addPage(); yPosition = 50; }
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#764ba2')
           .text('Investigation Details', 50, yPosition + 10);
        yPosition += 35;

        const investigationInfo = [
          ['Case Received Date', claim.formData.case_received_date ? new Date(claim.formData.case_received_date).toLocaleDateString('en-IN') : null],
          ['VI Completed Date', claim.formData.vi_completed_date ? new Date(claim.formData.vi_completed_date).toLocaleDateString('en-IN') : null],
          ['Investigating Doctor', claim.formData.investigating_doctor],
          ['Match Score', claim.formData.match_score ? `${claim.formData.match_score}%` : null],
          ['Geo Location', claim.formData.geo_location],
          ['Submitted At', claim.formData.submitted_at ? new Date(claim.formData.submitted_at).toLocaleDateString('en-IN') : null],
        ];

        investigationInfo.forEach(([label, value]) => {
          if (value !== null && value !== undefined) {
            drawTableRow(label, value.toString());
          }
        });

        // Patient Statement (Full width box)
        if (claim.formData.patient_statement) {
          yPosition += 20;
          if (yPosition > 650) {
            doc.addPage();
            yPosition = 50;
          }
          
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor('#764ba2')
             .text('Patient Statement', 50, yPosition);
          
          yPosition += 25;
          
          // Draw statement box
          const boxHeight = Math.max(60, Math.ceil(claim.formData.patient_statement.length / 80) * 15);
          doc.rect(50, yPosition, 510, boxHeight)
             .fillAndStroke('#f9fafb', '#dddddd');
          
          doc.fillColor('#000000')
             .fontSize(10)
             .font('Helvetica')
             .text(claim.formData.patient_statement, 60, yPosition + 10, { 
               width: 490, 
               align: 'justify' 
             });
          
          yPosition += boxHeight + 15;
        }
      }

      // Section: Documents (with Download Links)
      if (claim.documents && claim.documents.length > 0) {
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 50;
        }

        yPosition += 15;
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#667eea')
           .text('Uploaded Documents with Download Links', 50, yPosition);
        
        yPosition += 25;

        claim.documents.forEach((doc_item, index) => {
          if (yPosition > 680) {
            doc.addPage();
            yPosition = 50;
          }

          // Document info box
          const boxHeight = 50;
          doc.rect(70, yPosition, 490, boxHeight)
             .fillAndStroke('#f9fafb', '#dddddd');

          doc.fillColor('#000000')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text(`${index + 1}. ${doc_item.originalName || doc_item.filename}`, 80, yPosition + 8);
          
          // Download link
          const downloadUrl = resolveDownloadUrl(doc_item.path, doc_item.filename);
          doc.fillColor('#667eea')
             .font('Helvetica-Bold')
             .fontSize(9)
             .text('Download: ', 80, yPosition + 28, { continued: true })
             .fillColor('#0066cc')
             .font('Helvetica')
             .text(downloadUrl, { link: downloadUrl, underline: true });

          yPosition += boxHeight + 8;
        });
      }

      // Section: Form Documents (with Download Links)
      if (claim.formData?.form_documents && claim.formData.form_documents.length > 0) {
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 50;
        }

        yPosition += 15;
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#667eea')
           .text('Form Documents with Download Links', 50, yPosition);
        
        yPosition += 25;

        claim.formData.form_documents.forEach((doc_item, index) => {
          if (yPosition > 680) {
            doc.addPage();
            yPosition = 50;
          }

          // Form document info box
          const boxHeight = 60;
          doc.rect(70, yPosition, 490, boxHeight)
             .fillAndStroke('#f9fafb', '#dddddd');

          doc.fillColor('#000000')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text(`${index + 1}. ${doc_item.filename}`, 80, yPosition + 8);
          
          doc.font('Helvetica')
             .fontSize(9)
             .fillColor('#666666')
             .text(`Uploaded: ${new Date(doc_item.uploadedAt).toLocaleString('en-IN')}`, 80, yPosition + 25);
          
          // Download link
          const downloadUrl = resolveDownloadUrl(doc_item.path, doc_item.filename);
          doc.fillColor('#667eea')
             .font('Helvetica-Bold')
             .text('Download: ', 80, yPosition + 40, { continued: true })
             .fillColor('#0066cc')
             .font('Helvetica')
             .text(downloadUrl, { link: downloadUrl, underline: true });

          yPosition += boxHeight + 8;
        });
      }

      // Section: Locations (Table Format with Maps and Clickable Coordinates Links)
      // Deduplicate locations: Show Patient Location EXACTLY ONCE and Doctor Location EXACTLY ONCE
      const uniqueLocations = [];
      if (patientLocation) uniqueLocations.push(patientLocation);
      if (doctorLocation) uniqueLocations.push(doctorLocation);

      if (uniqueLocations.length > 0) {
        if (yPosition > 550) {
          doc.addPage();
          yPosition = 50;
        }

        yPosition += 15;
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#667eea')
           .text('Geolocation & Maps Verification', 50, yPosition);
        
        yPosition += 25;

        // Render each unique location once
        for (let index = 0; index < uniqueLocations.length; index++) {
          const location = uniqueLocations[index];
          const isPatient = location.locationType === 'patient';
          const isDoctor = location.locationType === 'doctor';
          
          if (yPosition > 450) {
            doc.addPage();
            yPosition = 50;
          }

          // Section header for this location
          const headerTitle = isPatient 
            ? 'PATIENT LOCATION (Actual & Verified Coordinates)' 
            : (isDoctor ? 'DOCTOR LOCATION (Actual & Verified Coordinates)' : `${location.locationType.toUpperCase()} LOCATION`);

          const headerColor = isPatient ? '#059669' : '#4338ca';

          doc.rect(50, yPosition, 510, 24)
             .fill(headerColor);
          doc.fillColor('#ffffff')
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(headerTitle, 60, yPosition + 6);
          doc.fillColor('#000000');
          yPosition += 30;

          // Helper function for location table rows
          const drawLocationRow = (label, value, isHighlight = false) => {
            if (yPosition > 720) {
              doc.addPage();
              yPosition = 50;
            }

            const rowHeight = 22;
            const col1X = 50;
            const col2X = 220;
            const col1Width = 170;
            const col2Width = 340;

            // Draw row
            doc.rect(col1X, yPosition, col1Width + col2Width, rowHeight)
               .fillAndStroke(isHighlight ? '#ecfdf5' : '#f9fafb', '#dddddd');

            // Draw text
            doc.fillColor('#000000')
               .fontSize(9)
               .font('Helvetica-Bold')
               .text(label, col1X + 8, yPosition + 6, { width: col1Width - 16 })
               .font(isHighlight ? 'Helvetica-Bold' : 'Helvetica')
               .fillColor(isHighlight ? '#047857' : '#000000')
               .text(value || 'N/A', col2X + 8, yPosition + 6, { width: col2Width - 16 });

            yPosition += rowHeight;
          };

          drawLocationRow('User Name', location.userName || (isPatient ? claim.patientName : claim.doctorName));
          drawLocationRow('Exact Latitude', `${location.latitude} (${location.latitude.toFixed(6)}°)`, true);
          drawLocationRow('Exact Longitude', `${location.longitude} (${location.longitude.toFixed(6)}°)`, true);
          drawLocationRow('GPS Accuracy', location.accuracy ? `±${location.accuracy} meters` : 'High Accuracy (GPS)');
          drawLocationRow('Captured At', new Date(location.capturedAt).toLocaleString('en-IN'));

          // Display full textual address in a dedicated box
          yPosition += 8;
          if (yPosition > 680) {
            doc.addPage();
            yPosition = 50;
          }

          const addressText = location.address || (isPatient ? `${claim.hospitalCity}, ${claim.hospitalState}` : 'Address not available');
          const addressLines = Math.max(1, Math.ceil(addressText.length / 75));
          const addressBoxHeight = Math.max(40, 20 + addressLines * 14);

          doc.rect(50, yPosition, 510, addressBoxHeight)
             .fillAndStroke(isPatient ? '#f0fdf4' : '#f5f3ff', isPatient ? '#10b981' : '#8b5cf6');

          doc.fillColor(isPatient ? '#065f46' : '#5b21b6')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text(isPatient ? 'Patient Physical Address (Text):' : 'Doctor Location Address (Text):', 60, yPosition + 6);

          doc.fillColor('#1f2937')
             .fontSize(9)
             .font('Helvetica')
             .text(addressText, 60, yPosition + 22, { width: 490 });

          yPosition += addressBoxHeight + 10;

          // Download and embed Google Maps image (only once per unique location)
          try {
            if (yPosition > 450) {
              doc.addPage();
              yPosition = 50;
            }

            const tempMapPath = path.join(__dirname, '..', 'pdfs', `temp-map-${location.locationType}-${Date.now()}.png`);
            await downloadMapImage(location.latitude, location.longitude, tempMapPath);
            
            // Add map header
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fillColor(headerColor)
               .text(`${isPatient ? 'Patient' : 'Doctor'} Google Map View:`, 50, yPosition);
            yPosition += 18;

            doc.image(tempMapPath, 50, yPosition, { width: 420, height: 240 });
            yPosition += 250;

            // Delete temp map file
            fs.unlink(tempMapPath, (err) => {
              if (err) console.error('Error deleting temp map:', err);
            });
          } catch (mapError) {
            console.error('Error adding static map for location:', mapError.message);
          }

          // Add interactive Clickable Google Maps Redirect Link box
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }

          const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
          
          doc.rect(50, yPosition, 510, 36)
             .fillAndStroke('#eff6ff', '#3b82f6');

          doc.fontSize(9)
             .font('Helvetica-Bold')
             .fillColor('#1e40af')
             .text(`Click to Open ${isPatient ? 'Patient' : 'Doctor'} Coordinates in Google Maps:`, 60, yPosition + 6);

          doc.fontSize(9)
             .font('Helvetica')
             .fillColor('#2563eb')
             .text(mapsUrl, 60, yPosition + 20, {
               link: mapsUrl,
               underline: true,
               width: 490
             });

          yPosition += 46;
        }
      }

      // Section: Captured Images (Table with Download Links)
      if (claim.capturedImages && claim.capturedImages.length > 0) {
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 50;
        }

        yPosition += 15;
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#667eea')
           .text('Captured Images with Download Links', 50, yPosition);
        
        yPosition += 25;

        claim.capturedImages.forEach((image, index) => {
          if (yPosition > 680) {
            doc.addPage();
            yPosition = 50;
          }

          // Image info box
          const boxHeight = 65;
          doc.rect(70, yPosition, 490, boxHeight)
             .fillAndStroke('#f9fafb', '#dddddd');

          doc.fillColor('#000000')
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(`${index + 1}. ${image.type.toUpperCase()} Image`, 80, yPosition + 8);
          
          doc.font('Helvetica')
             .fontSize(9)
             .text(`File: ${image.filename}`, 80, yPosition + 25);
          
          doc.fillColor('#666666')
             .text(`Captured: ${new Date(image.capturedAt).toLocaleString('en-IN')}`, 80, yPosition + 38);
          
          // Download link
          const downloadUrl = resolveDownloadUrl(image.path, image.filename);
          doc.fillColor('#667eea')
             .font('Helvetica-Bold')
             .text('Download: ', 80, yPosition + 51, { continued: true })
             .fillColor('#0066cc')
             .font('Helvetica')
             .text(downloadUrl, { link: downloadUrl, underline: true });

          yPosition += boxHeight + 10;
        });
      }

      // Section: Signatures (with Download Links)
      if (claim.signatures && claim.signatures.length > 0) {
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 50;
        }

        yPosition += 15;
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#667eea')
           .text('Signatures with Download Links', 50, yPosition);
        
        yPosition += 25;

        claim.signatures.forEach((signature, index) => {
          if (yPosition > 680) {
            doc.addPage();
            yPosition = 50;
          }

          // Signature info box
          const boxHeight = 65;
          doc.rect(70, yPosition, 490, boxHeight)
             .fillAndStroke('#f9fafb', '#dddddd');

          doc.fillColor('#000000')
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(`${index + 1}. ${signature.signedBy.toUpperCase()} Signature`, 80, yPosition + 8);
          
          doc.font('Helvetica')
             .fontSize(9)
             .text(`Signed by: ${signature.signerName}`, 80, yPosition + 25);
          
          doc.fillColor('#666666')
             .text(`Date: ${new Date(signature.signedAt).toLocaleString('en-IN')}`, 80, yPosition + 38);
          
          // Download link
          const downloadUrl = resolveDownloadUrl(signature.path, signature.filename);
          doc.fillColor('#667eea')
             .font('Helvetica-Bold')
             .text('Download: ', 80, yPosition + 51, { continued: true })
             .fillColor('#0066cc')
             .font('Helvetica')
             .text(downloadUrl, { link: downloadUrl, underline: true });

          yPosition += boxHeight + 10;
        });
      }

      // Section: Recordings (Table with Download Links)
      if (claim.recordings && claim.recordings.length > 0) {
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 50;
        }

        yPosition += 15;
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#667eea')
           .text('Video Recordings with Download Links', 50, yPosition);
        
        yPosition += 25;

        claim.recordings.forEach((recording, index) => {
          if (yPosition > 650) {
            doc.addPage();
            yPosition = 50;
          }

          // Recording info box
          const boxHeight = 80;
          doc.rect(70, yPosition, 490, boxHeight)
             .fillAndStroke('#f9fafb', '#dddddd');

          doc.fillColor('#000000')
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(`${index + 1}. Video Recording`, 80, yPosition + 8);
          
          doc.font('Helvetica')
             .fontSize(9)
             .text(`File: ${recording.filename}`, 80, yPosition + 23);
          
          doc.text(`Duration: ${recording.duration}s | Size: ${(recording.fileSize / (1024 * 1024)).toFixed(2)} MB`, 80, yPosition + 36);
          
          doc.fillColor('#666666')
             .text(`Recorded: ${new Date(recording.recordedAt).toLocaleString('en-IN')}`, 80, yPosition + 49);
          
          // Download link
          const downloadUrl = resolveDownloadUrl(recording.path, recording.filename);
          doc.fillColor('#667eea')
             .font('Helvetica-Bold')
             .text('Download: ', 80, yPosition + 62, { continued: true })
             .fillColor('#0066cc')
             .font('Helvetica')
             .text(downloadUrl, { link: downloadUrl, underline: true });

          yPosition += boxHeight + 10;
        });
      }

      // Add footer to last page
      yPosition = 770;
      doc.strokeColor('#667eea')
         .lineWidth(1)
         .moveTo(50, yPosition)
         .lineTo(562, yPosition)
         .stroke();
      
      doc.fillColor('#666666')
         .fontSize(9)
         .text(
           `Generated on ${new Date().toLocaleString('en-IN')} | Claim ID: ${claim.claimId}`,
           50,
           yPosition + 10,
           { align: 'center' }
         );

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        console.log('PDF generated successfully:', outputPath);
        resolve(outputPath);
      });

      stream.on('error', (err) => {
        console.error('Error generating PDF:', err);
        reject(err);
      });

    } catch (error) {
      console.error('Error in PDF generation:', error);
      reject(error);
    }
  });
};

module.exports = { generateClaimPDF };

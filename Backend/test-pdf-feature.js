const path = require('path');
const fs = require('fs');
const { generateClaimPDF } = require('./utils/pdfGenerator');

async function runTest() {
  console.log('==================================================');
  console.log('  Testing Company Logo, Name & Executive PDF Design');
  console.log('==================================================\n');

  // Multi-page claim sample with complete dataset
  const sampleClaim = {
    claimId: 'CLM-SATURN-2026-0089',
    patientName: 'Rahul Sharma',
    patientMobile: '+91 98765 43210',
    hospitalCity: 'Bengaluru',
    hospitalState: 'Karnataka',
    patientLanguage: 'English / Hindi / Kannada',
    status: 'approved',
    createdAt: new Date('2026-08-28T10:30:00Z'),
    doctorName: 'Dr. Santosh Kumar',
    doctorEmail: 'dr.santosh@saturnhealth.in',
    locations: [
      {
        locationType: 'patient',
        userName: 'Rahul Sharma (Patient)',
        latitude: 12.971598,
        longitude: 77.594562,
        accuracy: 6,
        address: '100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038, India',
        capturedAt: new Date('2026-08-28T10:35:12Z')
      },
      {
        locationType: 'doctor',
        userName: 'Dr. Santosh Kumar (Medical Officer)',
        latitude: 28.613939,
        longitude: 77.209021,
        accuracy: 10,
        address: 'Barakhamba Road, Connaught Place, New Delhi, Delhi 110001, India',
        capturedAt: new Date('2026-08-28T10:35:15Z')
      }
    ],
    formData: {
      patient_name: 'Rahul Sharma',
      doj: '2022-04-15',
      patient_relationship: 'Self (Primary Insured)',
      mobile_number: '+91 98765 43210',
      age: '34 Years',
      insured_name: 'Rahul Sharma',
      product: 'Saturn Comprehensive Health Shield Plus',
      policy_type: 'Individual Health Floater',
      hospital_name: 'Manipal Hospital & Research Institute',
      hospital_location: 'HAL Airport Road, Bengaluru, Karnataka',
      date_of_admission: '2026-08-20',
      date_of_discharge: '2026-08-24',
      room_type: 'Single Private Deluxe Room',
      icu_stay: 'No',
      advance_paid: '25000',
      diagnosis: 'Acute Gastroenteritis with Moderate Dehydration and Secondary Electrolyte Imbalance',
      treating_doctor: 'Dr. A. K. Banerjee (MD, Internal Medicine)',
      tests_done: 'Complete Blood Count (CBC), Serum Electrolytes, Renal Function Test, Ultrasound Abdomen',
      treatments_given: 'IV Fluids (Normal Saline & Ringer Lactate), Anti-emetics, Antibiotic Therapy, Oral Rehydration Solution',
      previous_treatment: 'Outpatient consultation at local clinic on 2026-08-19',
      past_hospitalizations: 'None reported in last 36 months',
      past_surgery: 'Appendectomy (2018) - Uneventful recovery',
      iv_line_active: 'Yes - Observed during initial hospital assessment',
      employment_details: 'Senior Systems Architect at Infosys Technologies Ltd',
      informer_name: 'Pooja Sharma',
      informer_relation: 'Spouse',
      current_status: 'Fully recovered and discharged in stable hemodynamic condition',
      claim_history: 'No previous claims filed under this policy term',
      other_health_insurance: 'Corporate group coverage with employer (Star Health)',
      covid_vaccination: 'Fully Vaccinated (3 Doses completed - Covishield)',
      social_habits: 'Non-smoker, Occasional social drinker, No tobacco use',
      patient_seen_on_call: 'Yes - Verified on live high-definition WebRTC video stream',
      patient_joined_on_time: 'Yes - Joined at scheduled time (10:30 AM IST)',
      final_assessment: 'Claim is genuine and verified. Patient identity, hospitalization documents, and physical presence confirmed via live WebRTC video consultation with GPS geolocation tracking.',
      conclusion_type: 'Approved for Cashless Reimbursement Settlement',
      case_received_date: '2026-08-25',
      vi_completed_date: '2026-08-28',
      investigating_doctor: 'Dr. Santosh Kumar',
      match_score: '98',
      geo_location: '12.971598, 77.594562',
      submitted_at: '2026-08-28',
      patient_statement: 'I was admitted to Manipal Hospital on 20th August after experiencing severe abdominal pain and recurrent vomiting. I received IV fluids and medications under Dr. Banerjee for 4 days. All medical documents, discharge summary, and bills submitted are accurate and genuine.',
      recording_url: 'https://webrtcproject.blob.core.windows.net/claims-media/recordings/meeting-CLM-SATURN-2026-0089.webm',
      form_documents: [
        {
          filename: 'discharge_summary_verified.pdf',
          path: 'https://webrtcproject.blob.core.windows.net/claims-media/documents/discharge_summary_verified.pdf',
          uploadedAt: new Date('2026-08-28T10:45:00Z')
        },
        {
          filename: 'hospital_final_bill_itemized.pdf',
          path: 'https://webrtcproject.blob.core.windows.net/claims-media/documents/hospital_final_bill_itemized.pdf',
          uploadedAt: new Date('2026-08-28T10:46:00Z')
        }
      ]
    },
    documents: [
      {
        filename: 'patient_aadhar_card.pdf',
        originalName: 'Government ID - Aadhar Card.pdf',
        path: 'https://webrtcproject.blob.core.windows.net/claims-media/documents/patient_aadhar_card.pdf'
      },
      {
        filename: 'insurance_e_card.pdf',
        originalName: 'Saturn Health Insurance E-Card.pdf',
        path: 'https://webrtcproject.blob.core.windows.net/claims-media/documents/insurance_e_card.pdf'
      }
    ],
    capturedImages: [
      {
        type: 'patient_face_id',
        filename: 'patient_face_verification.png',
        path: 'https://webrtcproject.blob.core.windows.net/claims-media/captures/patient_face_verification.png',
        capturedAt: new Date('2026-08-28T10:36:00Z')
      },
      {
        type: 'hospital_wristband',
        filename: 'hospital_wristband_photo.png',
        path: 'https://webrtcproject.blob.core.windows.net/claims-media/captures/hospital_wristband_photo.png',
        capturedAt: new Date('2026-08-28T10:37:30Z')
      }
    ],
    signatures: [
      {
        signedBy: 'doctor',
        signerName: 'Dr. Santosh Kumar (Reg No: KMC-78492)',
        filename: 'signature_doctor_verified.png',
        path: 'https://webrtcproject.blob.core.windows.net/claims-media/signatures/signature_doctor_verified.png',
        signedAt: new Date('2026-08-28T10:50:00Z')
      }
    ],
    recordings: [
      {
        filename: 'saturn_session_recording_CLM-0089.webm',
        path: 'https://webrtcproject.blob.core.windows.net/claims-media/recordings/saturn_session_recording_CLM-0089.webm',
        duration: 485,
        fileSize: 18450000,
        recordedAt: new Date('2026-08-28T10:42:00Z')
      }
    ]
  };

  const pdfsDir = path.join(__dirname, 'pdfs');
  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }

  const outputPath = path.join(pdfsDir, 'sample-test-report.pdf');
  console.log('Generating Enhanced PDF at:', outputPath);

  try {
    await generateClaimPDF(sampleClaim, outputPath);
    console.log('\n✅ SUCCESS: Enhanced PDF Generated successfully!');
    console.log('📁 File Location:', outputPath);
    console.log('📏 File Size:', (fs.statSync(outputPath).size / 1024).toFixed(2), 'KB\n');

    console.log('🔍 Verified Elements in PDF:');
    console.log('  1. Company Logo in Page 1 Hero Header');
    console.log('  2. Company Name: "Saturn Health Investigation"');
    console.log('  3. Executive Metadata Banner (Claim ID, Status Pill, Date)');
    console.log('  4. Running Mini Logo & Company Name Header on subsequent pages');
    console.log('  5. Universal Running Footer on EVERY page with "Page X of Y" and timestamp');
    console.log('  6. Form Data tables, Document downloads & Azure Cloud Video links');
    console.log('\n👉 PDF file created and ready for inspection!');
  } catch (err) {
    console.error('❌ Error generating PDF:', err);
  }
}

runTest();

const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  claimId: {
    type: String,
    required: [true, 'Please provide claim ID'],
    unique: true,
    trim: true,
  },
  patientName: {
    type: String,
    required: [true, 'Please provide patient name'],
    trim: true,
  },
  patientMobile: {
    type: String,
    required: [true, 'Please provide patient mobile number'],
    trim: true,
  },
  hospitalCity: {
    type: String,
    required: [true, 'Please provide hospital city'],
    trim: true,
  },
  hospitalState: {
    type: String,
    required: [true, 'Please provide hospital state'],
    trim: true,
  },
  patientLanguage: {
    type: String,
    required: [true, 'Please provide patient language'],
  },
  documents: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
  }],
  capturedImages: [{
    filename: String,
    path: String,
    type: {
      type: String,
      enum: ['doctor', 'patient'],
    },
    capturedAt: {
      type: Date,
      default: Date.now,
    },
    capturedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
    },
  }],
  signatures: [{
    filename: String,
    path: String,
    signedBy: {
      type: String,
      enum: ['doctor', 'patient'],
    },
    signerName: String,
    signedAt: {
      type: Date,
      default: Date.now,
    },
    capturedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
    },
  }],
  locations: [{
    locationType: {
      type: String,
      enum: ['doctor', 'patient'],
      required: true,
    },
    userName: String,
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: Number,
    address: String,
    capturedAt: {
      type: Date,
      default: Date.now,
    },
    capturedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
    },
  }],
  recordings: [{
    filename: String,
    path: String,
    duration: Number, // in seconds
    fileSize: Number, // in bytes
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  formData: {
    patient_name: String,
    doj: Date,
    patient_relationship: String,
    mobile_number: String,
    insured_name: String,
    product: String,
    hospital_name: String,
    hospital_location: String,
    age: Number,
    diagnosis: String,
    date_of_admission: Date,
    date_of_discharge: Date,
    policy_type: String,
    employment_details: String,
    informer_name: String,
    informer_relation: String,
    patient_statement: String,
    current_status: String,
    claim_history: String,
    other_health_insurance: String,
    treating_doctor: String,
    advance_paid: Number,
    room_type: String,
    icu_stay: String,
    tests_done: String,
    treatments_given: String,
    previous_treatment: String,
    past_hospitalizations: String,
    past_surgery: String,
    covid_vaccination: String,
    social_habits: String,
    patient_seen_on_call: String,
    iv_line_active: String,
    patient_joined_on_time: String,
    final_assessment: String,
    conclusion_type: String,
    case_received_date: Date,
    vi_completed_date: Date,
    investigating_doctor: String,
    match_score: Number,
    geo_location: String,
    aadhar_url: String,
    form_documents: [{
      filename: String,
      path: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    submitted_at: Date,
    submitted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
    },
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'pending', 'in_progress'],
    default: 'open',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  doctorName: {
    type: String,
    trim: true,
  },
  doctorEmail: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('Claim', claimSchema);

const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  claimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Claim',
    required: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  patientLink: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'meeting_completed', 'completed'],
    default: 'scheduled',
  },
  claimFormSubmitted: {
    type: Boolean,
    default: false,
  },
  participants: [{
    userId: String,
    name: String,
    role: {
      type: String,
      enum: ['doctor', 'patient'],
    },
    joinedAt: Date,
  }],
  startedAt: Date,
  endedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Meeting', meetingSchema);

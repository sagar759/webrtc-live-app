const express = require('express');
const router = express.Router();
const { createMeeting, getMeetingByRoomId, updateMeetingStatus, completeMeetingByRoomId, getMeetingByClaimId, startMeetingByRoomId } = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');

// Create meeting for claim (doctor only)
router.post('/create/:claimId', protect, createMeeting);

// Get meeting by room ID (public for patient)
router.get('/room/:roomId', getMeetingByRoomId);

// Get meeting by claim ID
router.get('/claim/:claimId', protect, getMeetingByClaimId);

// Start meeting by room ID (public)
router.put('/room/:roomId/start', startMeetingByRoomId);

// Complete meeting by room ID (public)
router.put('/room/:roomId/complete', completeMeetingByRoomId);

// Update meeting status
router.put('/:meetingId/status', protect, updateMeetingStatus);

module.exports = router;

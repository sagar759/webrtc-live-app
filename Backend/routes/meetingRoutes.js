const express = require('express');
const router = express.Router();
const { createMeeting, getMeetingByRoomId, updateMeetingStatus } = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');

// Create meeting for claim (doctor only)
router.post('/create/:claimId', protect, createMeeting);

// Get meeting by room ID (public for patient)
router.get('/room/:roomId', getMeetingByRoomId);

// Update meeting status
router.put('/:meetingId/status', protect, updateMeetingStatus);

module.exports = router;

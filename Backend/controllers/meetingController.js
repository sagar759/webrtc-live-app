const Meeting = require('../models/Meeting');
const Claim = require('../models/Claim');
const { v4: uuidv4 } = require('uuid');

// Helper to get frontend origin dynamically from request headers or environment
const getFrontendOrigin = (req) => {
  let frontendOrigin = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  if (!frontendOrigin) {
    const originHeader = req.headers.origin;
    const refererHeader = req.headers.referer;
    if (originHeader) {
      frontendOrigin = originHeader.replace(/\/+$/, '');
    } else if (refererHeader) {
      try {
        frontendOrigin = new URL(refererHeader).origin;
      } catch (e) {}
    }
  }
  return frontendOrigin || 'http://localhost:5173';
};

// @desc    Create meeting for claim
// @route   POST /api/meetings/create/:claimId
// @access  Private (Doctor)
exports.createMeeting = async (req, res) => {
  try {
    const { claimId } = req.params;

    // Check if claim exists
    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    const frontendOrigin = getFrontendOrigin(req);

    // Check if meeting already exists for this claim
    let meeting = await Meeting.findOne({ claimId });
    
    if (meeting) {
      // If patient link contains localhost or is outdated, update dynamically with active origin
      const activePatientLink = `${frontendOrigin}/meeting/${meeting.roomId}?role=patient`;
      if (!meeting.patientLink || meeting.patientLink.includes('localhost')) {
        meeting.patientLink = activePatientLink;
        await meeting.save();
      }

      // Return existing meeting
      return res.status(200).json({
        success: true,
        message: 'Meeting already exists',
        data: meeting,
      });
    }

    // Generate unique room ID
    const roomId = uuidv4();
    
    // Generate patient link
    const patientLink = `${frontendOrigin}/meeting/${roomId}?role=patient`;

    // Create new meeting
    meeting = await Meeting.create({
      roomId,
      claimId,
      doctorId: req.user._id,
      patientLink,
    });

    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: meeting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get meeting by room ID
// @route   GET /api/meetings/room/:roomId
// @access  Public
exports.getMeetingByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params;

    const meeting = await Meeting.findOne({ roomId })
      .populate('claimId', 'claimId patientName')
      .populate('doctorId', 'name email');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const frontendOrigin = getFrontendOrigin(req);
    if (frontendOrigin && (!meeting.patientLink || meeting.patientLink.includes('localhost'))) {
      meeting.patientLink = `${frontendOrigin}/meeting/${meeting.roomId}?role=patient`;
      await meeting.save();
    }

    res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update meeting status
// @route   PUT /api/meetings/:meetingId/status
// @access  Private
exports.updateMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    meeting.status = status;
    
    if (status === 'ongoing' && !meeting.startedAt) {
      meeting.startedAt = new Date();
    } else if ((status === 'completed' || status === 'meeting_completed') && !meeting.endedAt) {
      meeting.endedAt = new Date();
    }

    await meeting.save();

    res.status(200).json({
      success: true,
      message: 'Meeting status updated',
      data: meeting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Complete meeting by room ID
// @route   PUT /api/meetings/room/:roomId/complete
// @access  Public (no auth required)
exports.completeMeetingByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params;

    console.log(`\n=== Complete Meeting Request ===`);
    console.log(`Room ID: ${roomId}`);

    // Find meeting and populate claimId
    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      console.log('❌ Meeting not found!');
      return res.status(404).json({ 
        success: false,
        message: 'Meeting not found' 
      });
    }

    console.log(`✅ Found Meeting ID: ${meeting._id}`);
    console.log(`📊 Previous Meeting Status: ${meeting.status}`);
    console.log(`📋 Claim ID: ${meeting.claimId}`);

    // Set meeting status to meeting_completed (waiting for claim form)
    meeting.status = 'meeting_completed';
    
    if (!meeting.endedAt) {
      meeting.endedAt = new Date();
    }

    await meeting.save();
    console.log(`✅ Meeting status updated to: ${meeting.status}`);

    // Update claim status to in_progress
    const Claim = require('../models/Claim');
    const claim = await Claim.findById(meeting.claimId);
    
    if (!claim) {
      console.log('❌ Claim not found!');
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    console.log(`📊 Previous Claim Status: ${claim.status}`);
    
    if (claim.status === 'open') {
      claim.status = 'in_progress';
      await claim.save();
      console.log(`✅ Claim status updated to: ${claim.status}`);
    } else {
      console.log(`⚠️ Claim status not changed (current: ${claim.status})`);
    }

    console.log(`✅ Meeting marked as completed successfully!`);
    console.log(`===========================\n`);

    res.status(200).json({
      success: true,
      message: 'Meeting marked as completed and claim status updated',
      data: {
        meeting: {
          _id: meeting._id,
          roomId: meeting.roomId,
          status: meeting.status,
        },
        claim: {
          _id: claim._id,
          claimId: claim.claimId,
          status: claim.status,
        }
      },
    });
  } catch (error) {
    console.error('❌ Error completing meeting:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get meeting by claim ID
// @route   GET /api/meetings/claim/:claimId
// @access  Private
exports.getMeetingByClaimId = async (req, res) => {
  try {
    const { claimId } = req.params;

    console.log(`\n=== Get Meeting by Claim ID ===`);
    console.log(`Claim ID: ${claimId}`);

    const meeting = await Meeting.findOne({ claimId })
      .populate('claimId', 'claimId patientName')
      .populate('doctorId', 'name email');

    if (!meeting) {
      console.log('Meeting not found for this claim');
      return res.status(404).json({ 
        success: false,
        message: 'Meeting not found' 
      });
    }

    const frontendOrigin = getFrontendOrigin(req);
    if (frontendOrigin && (!meeting.patientLink || meeting.patientLink.includes('localhost'))) {
      meeting.patientLink = `${frontendOrigin}/meeting/${meeting.roomId}?role=patient`;
      await meeting.save();
    }

    console.log(`Found Meeting - Status: ${meeting.status}, Room ID: ${meeting.roomId}`);
    console.log(`===========================\n`);

    res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    console.error('Error getting meeting by claim ID:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Start meeting by room ID (set startedAt timestamp)
// @route   PUT /api/meetings/room/:roomId/start
// @access  Public
exports.startMeetingByRoomId = async (req, res) => {
  try {
    const { roomId } = req.params;

    console.log(`\n=== Start Meeting Request ===`);
    console.log(`Room ID: ${roomId}`);

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      console.log('❌ Meeting not found!');
      return res.status(404).json({ 
        success: false,
        message: 'Meeting not found' 
      });
    }

    // Only set startedAt if meeting hasn't started yet
    if (!meeting.startedAt && meeting.status === 'scheduled') {
      meeting.startedAt = new Date();
      meeting.status = 'ongoing';
      await meeting.save();
      
      console.log(`✅ Meeting started at: ${meeting.startedAt}`);
      console.log(`✅ Meeting status updated to: ${meeting.status}`);
    } else {
      console.log(`⚠️ Meeting already started at: ${meeting.startedAt || 'N/A'}`);
    }

    console.log(`===========================\n`);

    res.status(200).json({
      success: true,
      message: 'Meeting started successfully',
      data: meeting,
    });
  } catch (error) {
    console.error('❌ Error starting meeting:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

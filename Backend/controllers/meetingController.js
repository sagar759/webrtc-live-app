const Meeting = require('../models/Meeting');
const Claim = require('../models/Claim');
const { v4: uuidv4 } = require('uuid');

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

    // Check if meeting already exists for this claim
    let meeting = await Meeting.findOne({ claimId });
    
    if (meeting) {
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
    const patientLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/meeting/${roomId}?role=patient`;

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
    } else if (status === 'completed' && !meeting.endedAt) {
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

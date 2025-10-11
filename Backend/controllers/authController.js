const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');
const generateToken = require('../utils/generateToken');

// @desc    Admin login
// @route   POST /api/auth/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check if admin exists
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordMatch = await admin.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(admin._id, admin.role);

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      data: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        token,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Register doctor (Admin only)
// @route   POST /api/auth/doctor/register
// @access  Private/Admin
exports.registerDoctor = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if doctor already exists
    const doctorExists = await Doctor.findOne({ email });

    if (doctorExists) {
      return res.status(400).json({ message: 'Doctor already exists with this email' });
    }

    // Create doctor
    const doctor = await Doctor.create({
      name,
      email,
      password,
      createdBy: req.user._id, // Admin who is creating the doctor
    });

    if (doctor) {
      res.status(201).json({
        success: true,
        message: 'Doctor registered successfully',
        data: {
          id: doctor._id,
          name: doctor.name,
          email: doctor.email,
          role: doctor.role,
          isActive: doctor.isActive,
          createdAt: doctor.createdAt,
        },
      });
    } else {
      res.status(400).json({ message: 'Invalid doctor data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Doctor login
// @route   POST /api/auth/doctor/login
// @access  Public
exports.doctorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check if doctor exists
    const doctor = await Doctor.findOne({ email });

    if (!doctor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if doctor is active
    if (!doctor.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact admin.' });
    }

    // Check password
    const isPasswordMatch = await doctor.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(doctor._id, doctor.role);

    res.status(200).json({
      success: true,
      message: 'Doctor login successful',
      data: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
        token,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

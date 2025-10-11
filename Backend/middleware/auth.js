const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Doctor = require('../models/Doctor');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  console.log('[AUTH] Checking authentication for:', req.method, req.originalUrl);
  console.log('[AUTH] Headers:', req.headers.authorization ? 'Token present' : 'No token');

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[AUTH] Token decoded:', { id: decoded.id, role: decoded.role });

      // Get user from token
      if (decoded.role === 'admin') {
        req.user = await Admin.findById(decoded.id).select('-password');
      } else if (decoded.role === 'doctor') {
        req.user = await Doctor.findById(decoded.id).select('-password');
      }

      if (!req.user) {
        console.log('[AUTH] User not found in database');
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      console.log('[AUTH] User authenticated:', req.user.email);
      next();
    } catch (error) {
      console.error('[AUTH] Token verification failed:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.log('[AUTH] No token provided');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin only middleware
exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

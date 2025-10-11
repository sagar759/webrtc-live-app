const express = require('express');
const router = express.Router();
const { adminLogin, registerDoctor, doctorLogin } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

// Admin routes
router.post('/admin/login', adminLogin);

// Doctor routes
router.post('/doctor/register', protect, adminOnly, registerDoctor);
router.post('/doctor/login', doctorLogin);

module.exports = router;

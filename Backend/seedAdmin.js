const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');

// Load env vars
dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('MongoDB Connected');

    // Check if admin already exists
    const adminExists = await Admin.findOne({ email: 'santosh@gmail.com' });

    if (adminExists) {
      console.log('Admin already exists');
      process.exit();
    }

    // Create admin
    const admin = await Admin.create({
      email: 'santosh@gmail.com',
      password: 'San@12345',
      role: 'admin',
    });

    console.log('Admin created successfully:');
    console.log('Email:', admin.email);
    console.log('Password: San@12345');
    console.log('Role:', admin.role);

    process.exit();
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();

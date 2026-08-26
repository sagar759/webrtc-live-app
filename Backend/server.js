const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const startKeepAlive = require('./utils/keepAlive');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n[SERVER] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/claims', require('./routes/claimRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));

// Serve static files (for uploaded documents)
app.use('/uploads', express.static('uploads'));

// Serve static files (for PDFs)
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

// Serve static files (for images)
app.use('/images', express.static(path.join(__dirname, 'images')));

// Serve static files (for videos)
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// Serve static files (for recordings)
app.use('/recordings', express.static(path.join(__dirname, 'recordings')));

// Serve static files (for signatures)
app.use('/signatures', express.static(path.join(__dirname, 'signatures')));


// upload static files (for uploaded documents)
app.use('/', express.static('uploads'));

// Health check route
app.get(['/', '/health'], (req, res) => {
  res.json({ status: 'ok', message: 'WebRTC Claims Management API is running', timestamp: new Date().toISOString() });
});

// Socket.IO for WebRTC signaling
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join-room', ({ roomId, userId, userName, role }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    
    const existingUsers = [];
    rooms.get(roomId).forEach((user, socketId) => {
      existingUsers.push({ socketId, ...user });
    });

    rooms.get(roomId).set(socket.id, { userId, userName, role });
    
    // Send list of existing users to the newly joined participant
    socket.emit('existing-users', existingUsers);

    // Notify others in the room
    socket.to(roomId).emit('user-connected', { userId, userName, role, socketId: socket.id });
    
    console.log(`${userName} (${role}) joined room: ${roomId} (Existing users: ${existingUsers.length})`);
  });

  socket.on('signal', ({ to, signal, from }) => {
    io.to(to).emit('signal', { signal, from });
  });

  // Relay location request to peer in room (e.g. doctor requesting patient location)
  socket.on('request-patient-location', ({ roomId, claimId }) => {
    console.log(`Location request sent to room ${roomId} for claim ${claimId}`);
    socket.to(roomId).emit('request-patient-location', { claimId });
  });

  // Relay location updated notification
  socket.on('patient-location-updated', ({ roomId, location }) => {
    console.log(`Patient location updated in room ${roomId}:`, location);
    socket.to(roomId).emit('patient-location-updated', { location });
  });

  socket.on('disconnect', () => {
    // Find and remove user from all rooms
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        const user = users.get(socket.id);
        users.delete(socket.id);
        socket.to(roomId).emit('user-disconnected', { socketId: socket.id, userName: user.userName });
        console.log(`${user.userName} disconnected from room: ${roomId}`);
      }
    });
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  startKeepAlive();
});

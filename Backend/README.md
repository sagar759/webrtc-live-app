# WebRTC Claims Management Backend

Backend API for WebRTC Claims Management System with MongoDB.

## Features

- Admin Login
- Doctor Registration (Admin only)
- Doctor Login
- JWT Authentication
- Password Hashing with bcrypt

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create admin user:
```bash
npm run seed
```

3. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Admin Routes

#### Admin Login
```
POST /api/auth/admin/login
```
**Body:**
```json
{
  "email": "santosh@gmail.com",
  "password": "San@12345"
}
```

### Doctor Routes

#### Register Doctor (Admin Only)
```
POST /api/auth/doctor/register
```
**Headers:**
```
Authorization: Bearer <admin_token>
```
**Body:**
```json
{
  "name": "Dr. John Doe",
  "email": "doctor@example.com",
  "password": "password123"
}
```

#### Doctor Login
```
POST /api/auth/doctor/login
```
**Body:**
```json
{
  "email": "doctor@example.com",
  "password": "password123"
}
```

### Claim Routes (All require Authentication)

#### Create Claim
```
POST /api/claims
```
**Headers:**
```
Authorization: Bearer <doctor_token>
Content-Type: multipart/form-data
```
**Form Data:**
```
claimId: CLM-2024-001
patientName: John Doe
patientMobile: 9876543210
hospitalCity: Mumbai
hospitalState: Maharashtra
patientLanguage: Hindi
documents: [file1, file2, ...] (multiple files)
```

#### Get All Claims
```
GET /api/claims
```
**Headers:**
```
Authorization: Bearer <doctor_token>
```

#### Get Single Claim
```
GET /api/claims/:id
```
**Headers:**
```
Authorization: Bearer <doctor_token>
```

#### Update Claim Status
```
PUT /api/claims/:id/status
```
**Headers:**
```
Authorization: Bearer <doctor_token>
```
**Body:**
```json
{
  "status": "closed"
}
```
**Allowed statuses:** open, closed, pending, in_progress

## Default Admin Credentials

- **Email:** santosh@gmail.com
- **Password:** San@12345

## Environment Variables

Create a `.env` file with:

```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing

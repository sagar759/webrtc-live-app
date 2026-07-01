# Project Setup & Run Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [File Structure](#file-structure)
4. [API URL Configuration](#api-url-configuration)
5. [Installation & Setup](#installation--setup)
6. [Running the Project](#running-the-project)
7. [Building for Production](#building-for-production)

---

## 🎯 Project Overview

This is a React + Vite frontend application for a WebRTC-based Claims Management System. The project uses:
- **React 19** with **Vite** as the build tool
- **React Router** for routing
- **Ant Design** for UI components
- **Socket.IO Client** for WebRTC signaling

---

## 📦 Prerequisites

Before running the project, make sure you have installed:
- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)

To check if you have them installed:
```bash
node --version
npm --version
```

---

## 📁 File Structure

```
Forntend/
├── index.html              # Main HTML entry point
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── src/
│   ├── main.jsx           # React entry point
│   ├── App.jsx            # Main App component
│   ├── index.css          # Global styles
│   ├── components/        # Reusable components
│   │   └── ProtectedRoute.jsx
│   ├── pages/             # Page components
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── ClaimForm.jsx
│   │   ├── VideoCall.jsx
│   │   └── PDFPreview.jsx
│   ├── services/          # API services
│   │   └── api.js         # ⚠️ API URL is configured here
│   └── assets/            # Images, logos, etc.
├── public/                # Static files
└── dist/                  # Production build output
```

---

## 🔧 API URL Configuration

### Where to Change API URL

The API base URL is configured in:
**`src/services/api.js`** (Line 1)

```javascript
const API_BASE_URL = 'https://api.stechooze.com/api';
```

### How to Change API URL

1. **For Development (Local Backend):**
   ```javascript
   const API_BASE_URL = 'http://localhost:5000/api';
   ```

2. **For Production:**
   ```javascript
   const API_BASE_URL = 'https://api.stechooze.com/api';
   ```

3. **For Different Environment:**
   ```javascript
   const API_BASE_URL = 'https://your-api-domain.com/api';
   ```

### Using Environment Variables (Recommended)

You can also use environment variables for better configuration:

1. Create a `.env` file in the `Forntend/` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

2. Update `src/services/api.js`:
   ```javascript
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.stechooze.com/api';
   ```

**Note:** In Vite, environment variables must start with `VITE_` to be accessible in the frontend.

---

## 🚀 Installation & Setup

### Step 1: Navigate to Frontend Directory
```bash
cd Forntend
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all required packages listed in `package.json`:
- react, react-dom
- react-router-dom
- antd
- socket.io-client
- vite and related plugins

### Step 3: Configure API URL (if needed)
Edit `src/services/api.js` and update the `API_BASE_URL` constant.

---

## ▶️ Running the Project

### Development Mode

Run the development server:
```bash
npm run dev
```

The application will start on:
- **Local URL:** `http://localhost:5173`
- Vite will automatically open it in your browser

**Features:**
- Hot Module Replacement (HMR) - changes reflect instantly
- Fast refresh for React components
- Error overlay in the browser

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

---

## 🏗️ Building for Production

### Step 1: Build the Project
```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### Step 2: Preview Production Build
```bash
npm run preview
```

This serves the production build locally for testing.

### Step 3: Deploy

The `dist/` folder contains all the static files ready for deployment. You can:
- Deploy to **Netlify**, **Vercel**, **GitHub Pages**, etc.
- Upload to any static hosting service
- Serve with Nginx, Apache, or any web server

---

## 🔗 Backend Connection

### Backend Server Setup

Make sure your backend server is running:

1. Navigate to Backend directory:
   ```bash
   cd ../Backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file with required variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

4. Start backend server:
   ```bash
   npm run dev
   ```

The backend runs on `http://localhost:5000` by default.

### CORS Configuration

The backend is configured to accept requests from any origin. If you need to restrict it:
- Edit `Backend/server.js` and update the CORS configuration

---

## 🐛 Troubleshooting

### Port Already in Use
If port 5173 is already in use, Vite will automatically use the next available port (5174, 5175, etc.).

### API Connection Issues
1. Check if backend server is running
2. Verify API URL in `src/services/api.js`
3. Check browser console for CORS errors
4. Ensure backend CORS is configured correctly

### Module Not Found Errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Errors
```bash
# Clear cache and rebuild
rm -rf dist node_modules/.vite
npm run build
```

---

## 📝 Important Notes

1. **API URL:** Always check `src/services/api.js` for the correct API endpoint
2. **Environment Variables:** Use `.env` file for different environments (dev, staging, production)
3. **Hot Reload:** Changes in `src/` folder will automatically reload in development
4. **Build Output:** Production build is in `dist/` folder - don't edit files there directly

---

## 🆘 Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the terminal for build/run errors
3. Verify all dependencies are installed
4. Ensure Node.js version is compatible (16+)

---

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Ant Design Documentation](https://ant.design/)

---

**Last Updated:** 2024
**Project:** WebRTC Claims Management System - Frontend


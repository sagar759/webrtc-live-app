# Quick Start Guide (तेज़ी से शुरू करें)

## 🚀 Project Run Kaise Kare (कैसे चलाएं)

### Step 1: Dependencies Install Karein
```bash
cd Forntend
npm install
```

### Step 2: Development Server Start Karein
```bash
npm run dev
```

**Result:** Browser mein automatically `http://localhost:5173` open hoga

---

## 🔧 API URL Kahan Change Karein

### Location:
**File:** `src/services/api.js`  
**Line:** 1

### Current Setting:
```javascript
const API_BASE_URL = 'https://api.stechooze.com/api';
```

### Local Backend Ke Liye:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

---

## 📁 File Structure (महत्वपूर्ण Files)

```
Forntend/
├── index.html              # Main HTML file (entry point)
├── package.json            # Dependencies list
├── vite.config.js          # Vite configuration
├── src/
│   ├── main.jsx           # React entry point
│   ├── App.jsx            # Main component
│   ├── services/
│   │   └── api.js         # ⚠️ API URL YAHAN HAI
│   └── pages/             # All pages
└── dist/                  # Production build (auto-generated)
```

---

## 📝 Important Commands

| Command | Kaam |
|---------|------|
| `npm run dev` | Development server start |
| `npm run build` | Production build banaye |
| `npm run preview` | Production build test karein |

---

## ⚙️ Configuration Points

### 1. API URL Change:
- **File:** `src/services/api.js`
- **Variable:** `API_BASE_URL`

### 2. Port Change (agar chahiye):
- **File:** `vite.config.js`
- Add: `server: { port: 3000 }`

### 3. Environment Variables:
- Create `.env` file in `Forntend/` folder
- Add: `VITE_API_BASE_URL=http://localhost:5000/api`

---

## 🔗 Backend Connection

Backend server bhi chalana hoga:
```bash
cd ../Backend
npm install
npm run dev
```

Backend default port: `5000`

---

## ❓ Common Issues

### Port Already in Use?
- Vite automatically next port use karega (5174, 5175, etc.)

### API Connection Error?
1. Backend server check karein (chal raha hai ya nahi)
2. `src/services/api.js` mein URL verify karein
3. Browser console check karein

### Module Not Found?
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📖 Detailed Guide

Complete setup guide ke liye `PROJECT_SETUP_GUIDE.md` file dekhein.

---

**Note:** 
- Development: `npm run dev` use karein
- Production: `npm run build` se `dist/` folder banega
- API URL change karne ke baad server restart karein


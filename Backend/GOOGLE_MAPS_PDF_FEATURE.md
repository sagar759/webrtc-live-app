# Google Maps Integration in PDF Reports

## ✅ Feature Added: Location Maps in PDF

PDF में अब हर location के लिए **Google Static Maps** का image automatically embed होगा।

---

## 🗺️ **What's Included:**

### **For Each Location:**

1. **📊 Location Details Table**
   - User Name
   - Latitude & Longitude
   - Accuracy
   - Address
   - Captured Time

2. **🗺️ Google Maps Image**
   - 400x300 pixel map
   - Red marker at exact location
   - Zoom level 15 (street view)
   - High-quality static image

3. **🔗 Clickable Google Maps Link**
   - Direct link to open in Google Maps
   - Opens in browser/app
   - Full interactive map

---

## 📄 **PDF Structure (Location Section):**

```
┌─────────────────────────────────────────────────┐
│ 📍 Location Data with Google Maps              │
├─────────────────────────────────────────────────┤
│ Location 1: DOCTOR                              │
├─────────────────────────────────────────────────┤
│ ┌───────────────────┬─────────────────────────┐ │
│ │ User Name         │ Dr. Santosh Kumar       │ │
│ │ Latitude          │ 27.178331               │ │
│ │ Longitude         │ 75.719103               │ │
│ │ Accuracy          │ 54m                     │ │
│ │ Address           │ Jaipur, Rajasthan       │ │
│ │ Captured At       │ 12/01/2025, 12:30 PM    │ │
│ └───────────────────┴─────────────────────────┘ │
│                                                  │
│ 📍 Map View:                                    │
│ ┌──────────────────────────────────────────┐   │
│ │                                          │   │
│ │        [GOOGLE MAPS IMAGE]               │   │
│ │        400x300 pixels                    │   │
│ │        Red marker at location            │   │
│ │                                          │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ Open in Google Maps:                            │
│ https://maps.google.com/?q=27.178,75.719        │
│ (Clickable link)                                │
├─────────────────────────────────────────────────┤
│ Location 2: PATIENT                             │
│ [Same format repeats...]                        │
└─────────────────────────────────────────────────┘
```

---

## 🔑 **Google Maps API Configuration:**

**API Key Used:**
```
AIzaSyBjCExT250iDt5eihZ9k3S-MDY234jWeoI
```

**API Endpoint:**
```
https://maps.googleapis.com/maps/api/staticmap
```

**Parameters:**
- `center`: Latitude,Longitude
- `zoom`: 15 (street level)
- `size`: 400x300
- `markers`: Red marker at location
- `key`: Your API key

**Example URL:**
```
https://maps.googleapis.com/maps/api/staticmap?
  center=27.178331,75.719103
  &zoom=15
  &size=400x300
  &markers=color:red%7C27.178331,75.719103
  &key=AIzaSyBjCExT250iDt5eihZ9k3S-MDY234jWeoI
```

---

## 🚀 **How It Works:**

### **1. Map Download Process:**
```javascript
// For each location:
1. Generate Google Maps Static API URL
2. Download map image to temp file
3. Embed image in PDF
4. Add clickable link below map
5. Delete temp file after PDF generation
```

### **2. Error Handling:**
```javascript
try {
  // Download and embed map
  downloadMapImage() → embedInPDF()
} catch (error) {
  // If map fails, show link only
  addClickableLink()
}
```

### **3. Temp File Management:**
```javascript
// Temp files stored in:
/Backend/pdfs/temp-map-{index}-{timestamp}.png

// Auto-deleted after:
- PDF generation complete
- Or on error
```

---

## 📱 **Visual Preview:**

### **Map Image Appearance:**

```
┌────────────────────────────────────┐
│                                    │
│            🏢 Buildings            │
│        🛣️  Streets                 │
│             🔴 ← Red Marker        │
│          📍 Exact Location         │
│        🌳 Parks                     │
│            🏠 Landmarks            │
│                                    │
└────────────────────────────────────┘
  400 x 300 pixels
  Zoom Level: 15 (Street View)
  Centered on GPS coordinates
```

---

## ✨ **Benefits:**

### **For Claim Verification:**
- ✅ Visual proof of location
- ✅ Verify hospital/patient proximity
- ✅ Check if locations match
- ✅ Detect fraudulent claims

### **For Reports:**
- ✅ Professional presentation
- ✅ Easy to understand
- ✅ No need to manually check coordinates
- ✅ Click to open full map

### **For Documentation:**
- ✅ Permanent visual record
- ✅ Embedded in PDF (no external dependencies)
- ✅ Works offline once generated
- ✅ Shareable via email/print

---

## 🔧 **Technical Details:**

### **Dependencies:**
```javascript
const https = require('https');  // For downloading maps
const fs = require('fs');        // For file operations
const path = require('path');    // For file paths
```

### **Map Download Function:**
```javascript
const downloadMapImage = (latitude, longitude, tempPath) => {
  return new Promise((resolve, reject) => {
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?...`;
    const file = fs.createWriteStream(tempPath);
    
    https.get(mapUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => resolve(tempPath));
    }).on('error', reject);
  });
};
```

### **PDF Embedding:**
```javascript
// Download map
const tempMapPath = await downloadMapImage(lat, lng, path);

// Add to PDF
doc.image(tempMapPath, x, y, { 
  width: 400, 
  height: 300 
});

// Cleanup
fs.unlink(tempMapPath, callback);
```

---

## 📊 **Example Locations in PDF:**

### **Scenario: Doctor visits patient at hospital**

**Location 1: DOCTOR**
- GPS: 27.178331, 75.719103
- Map shows: Jaipur area
- Marker: Red pin at exact coordinates
- Link: Opens Google Maps for navigation

**Location 2: PATIENT**
- GPS: 27.178345, 75.719099
- Map shows: Same area (very close)
- Marker: Red pin nearby
- Distance visible on map

**Verification:**
- Both locations within 10-20 meters ✅
- Same street/building visible ✅
- Timestamps match visit time ✅
- Claim verified as genuine ✅

---

## 🎯 **Use Cases:**

### **1. Fraud Detection:**
```
❌ Doctor location: Mumbai
❌ Patient location: Delhi
❌ Maps show 1000+ km apart
❌ Claim flagged as suspicious
```

### **2. Claim Verification:**
```
✅ Doctor location: Hospital area
✅ Patient location: Same hospital
✅ Maps show same building
✅ Claim verified as genuine
```

### **3. Route Verification:**
```
✅ Track doctor's visit route
✅ Verify travel distance
✅ Check if locations logical
✅ Confirm site visit happened
```

---

## 🔒 **Security & Privacy:**

**API Key:**
- Stored in code (for simplicity)
- Consider moving to `.env` file for production
- Set API restrictions in Google Cloud Console

**Location Data:**
- GPS coordinates visible in PDF
- Maps show approximate area (zoom 15)
- Exact house numbers may not be visible
- Sufficient for verification purposes

**Recommendations:**
```javascript
// Production: Move to environment variable
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
```

---

## 📥 **Testing:**

### **1. Restart Server:**
```bash
cd Backend
# Stop server: Ctrl+C
npm start
```

### **2. Generate PDF:**
```bash
curl -X GET "https://api.stechooze.com/api/claims/12345/pdf" \
  --output claim-with-maps.pdf
```

### **3. Open PDF:**
```bash
# Mac
open claim-with-maps.pdf

# Linux
xdg-open claim-with-maps.pdf

# Windows
start claim-with-maps.pdf
```

### **4. Verify Maps:**
- ✅ Check if maps are embedded
- ✅ Click on Google Maps links
- ✅ Verify red markers visible
- ✅ Check location accuracy

---

## 📝 **API Quota & Limits:**

**Google Static Maps API:**
- Free tier: 25,000 requests/month
- Each PDF generation = 1 request per location
- Typical claim: 2 locations = 2 API calls
- Monthly capacity: ~12,500 PDFs

**If quota exceeded:**
- Maps won't load
- PDF will still generate
- Only clickable links will show
- No error, graceful fallback

---

## 🎨 **Customization Options:**

### **Map Size:**
```javascript
// Current: 400x300
doc.image(path, x, y, { width: 400, height: 300 });

// Larger map:
doc.image(path, x, y, { width: 500, height: 400 });
```

### **Zoom Level:**
```javascript
// Current: zoom=15 (street view)
&zoom=15

// Options:
&zoom=10  // City level
&zoom=13  // Neighborhood
&zoom=15  // Street level (current)
&zoom=18  // Building level
```

### **Marker Style:**
```javascript
// Current: Red marker
&markers=color:red%7C${lat},${lng}

// Options:
&markers=color:blue%7C${lat},${lng}
&markers=color:green%7C${lat},${lng}
&markers=size:small|color:red%7C${lat},${lng}
```

---

## 🌟 **Future Enhancements:**

**Possible additions:**
- 🗺️ Show both locations on single map
- 📏 Display distance between locations
- 🚗 Show route between doctor & patient
- 🏥 Highlight nearby hospitals
- 📍 Add custom markers/labels
- 🌍 Satellite view option

---

## ✅ **Summary:**

**What you get:**
- ✅ Automatic map images in PDF
- ✅ Visual location verification
- ✅ Clickable Google Maps links
- ✅ Professional reports
- ✅ Easy claim verification
- ✅ Fraud detection support

**No additional setup needed:**
- ✅ API key already configured
- ✅ Auto-downloads maps
- ✅ Auto-embeds in PDF
- ✅ Auto-cleanup temp files

---

**Server restart karne ke baad PDF mein har location ke saath Google Maps image dikhega! 🗺️📄✨**

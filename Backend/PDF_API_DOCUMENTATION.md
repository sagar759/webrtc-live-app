# Claim PDF Generation API Documentation

## Overview
API endpoints to generate and download comprehensive PDF reports for insurance claims.

---

## 🔗 Endpoints

### 1. Generate and Download PDF
**Endpoint:** `GET /api/claims/:id/pdf`

**Authentication:** Required (Doctor token)

**Description:** Generates a comprehensive PDF report for the claim and downloads it immediately.

#### Parameters
| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| id | string | URL path | Yes | Claim ID or MongoDB _id |

#### Request Example
```bash
# Using Claim ID
GET http://localhost:5000/api/claims/12345/pdf

# Using MongoDB _id
GET http://localhost:5000/api/claims/68ea7770d9667404bc2fd5d9/pdf
```

#### Headers
```
Authorization: Bearer <doctor_token>
```

#### Response
- **Success:** PDF file download (application/pdf)
- **File Name:** `claim-{claimId}-{timestamp}.pdf`
- **Status Code:** 200

#### Error Responses
```json
// Claim not found
{
  "success": false,
  "message": "Claim not found"
}
```

---

### 2. Get PDF Download Link
**Endpoint:** `GET /api/claims/:id/pdf-link`

**Authentication:** Required (Doctor token)

**Description:** Returns a download link for the claim PDF without generating it immediately.

#### Parameters
| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| id | string | URL path | Yes | Claim ID or MongoDB _id |

#### Request Example
```bash
GET http://localhost:5000/api/claims/12345/pdf-link
```

#### Headers
```
Authorization: Bearer <doctor_token>
```

#### Success Response
```json
{
  "success": true,
  "message": "PDF download link generated",
  "data": {
    "claimId": "12345",
    "downloadLink": "http://localhost:5000/api/claims/12345/pdf",
    "directDownload": true
  }
}
```

#### Error Responses
```json
// Claim not found
{
  "success": false,
  "message": "Claim not found"
}
```

---

## 📄 PDF Content Structure

The generated PDF includes the following sections:

### 1. **Header**
- Purple gradient header with logo
- Claim ID prominently displayed
- Professional branding

### 2. **Basic Information**
- Patient Name
- Patient Mobile
- Hospital City
- Hospital State
- Patient Language
- Status
- Created Date

### 3. **Detailed Form Information** (if available)
- Insured Name
- Date of Joining
- Patient Relationship
- Product Details
- Hospital Information
- Age and Diagnosis
- Admission/Discharge Dates
- Policy Type
- Employment Details
- Informer Details
- Patient Statement (full text)
- Current Status
- Claim History
- Insurance Details
- Treatment Information
- Medical History
- COVID Vaccination Status
- Social Habits
- Final Assessment
- Conclusion Type
- Match Score
- And 30+ more fields...

### 4. **Uploaded Documents**
- List of all uploaded documents
- File names and metadata

### 5. **Form Documents**
- Documents uploaded during form submission
- Upload timestamps

### 6. **Location Data**
- Doctor and Patient locations
- GPS coordinates (latitude, longitude)
- Accuracy information
- Address (if available)
- Capture timestamps

### 7. **Captured Images**
- Images captured during video call
- Doctor and Patient photos
- Capture timestamps

### 8. **Signatures**
- Doctor signature
- Patient signature
- Signer names and timestamps

### 9. **Video Recordings**
- Recording details
- Duration and file size
- Recording timestamps

### 10. **Footer**
- Page numbers
- Generation timestamp
- Professional footer design

---

## 🎨 PDF Features

### Design
- **Color Scheme:** Purple gradient theme (#667eea, #764ba2)
- **Layout:** Professional A4 format
- **Fonts:** Helvetica (Bold and Regular)
- **Margins:** 50px all sides

### Technical Features
- **Auto-pagination:** Automatically adds new pages as needed
- **Multi-page support:** Handles large amounts of data
- **Section headers:** Color-coded sections with emojis
- **Data formatting:** Dates in Indian format, currency symbols
- **Responsive layout:** Adjusts content to fit pages properly

### File Management
- **Auto-generation:** PDF created on-the-fly
- **Temporary storage:** Files stored in `/pdfs` directory
- **Auto-cleanup:** Files deleted 5 seconds after download
- **Unique naming:** Timestamp-based filenames

---

## 💻 Frontend Integration Examples

### Using Axios (React)
```javascript
import axios from 'axios';

// Method 1: Direct download
const downloadClaimPDF = async (claimId) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `http://localhost:5000/api/claims/${claimId}/pdf`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob' // Important for file download
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `claim-${claimId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    console.log('PDF downloaded successfully!');
  } catch (error) {
    console.error('Error downloading PDF:', error);
  }
};

// Method 2: Get link first
const getClaimPDFLink = async (claimId) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(
      `http://localhost:5000/api/claims/${claimId}/pdf-link`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const { downloadLink } = response.data.data;
    
    // Open in new tab or trigger download
    window.open(downloadLink, '_blank');
    
    return downloadLink;
  } catch (error) {
    console.error('Error getting PDF link:', error);
  }
};
```

### Using Fetch API
```javascript
const downloadPDF = async (claimId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    `http://localhost:5000/api/claims/${claimId}/pdf`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `claim-${claimId}.pdf`;
  a.click();
};
```

### React Component Example
```jsx
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const ClaimPDFButton = ({ claimId }) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `http://localhost:5000/api/claims/${claimId}/pdf`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `claim-${claimId}.pdf`;
      link.click();
      
      message.success('PDF downloaded successfully!');
    } catch (error) {
      message.error('Failed to download PDF');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      icon={<DownloadOutlined />}
      onClick={handleDownload}
      loading={loading}
    >
      Download PDF Report
    </Button>
  );
};
```

---

## 🚀 Testing the API

### Using cURL
```bash
# Download PDF directly
curl -X GET "http://localhost:5000/api/claims/12345/pdf" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --output claim-12345.pdf

# Get download link
curl -X GET "http://localhost:5000/api/claims/12345/pdf-link" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman
1. **Create new GET request**
2. **URL:** `http://localhost:5000/api/claims/12345/pdf`
3. **Headers:** 
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN`
4. **Send & Save Response** as PDF file

---

## 📊 Sample Data Format

### Claim Object Structure
```json
{
  "claimId": "12345",
  "patientName": "John Doe",
  "patientMobile": "+91 9876543210",
  "hospitalCity": "Jaipur",
  "hospitalState": "Rajasthan",
  "patientLanguage": "Hindi",
  "status": "open",
  "formData": {
    "patient_name": "John Doe",
    "diagnosis": "Fever",
    "hospital_name": "City Hospital",
    "patient_statement": "Patient's detailed statement...",
    // ... more fields
  },
  "locations": [
    {
      "locationType": "doctor",
      "userName": "Dr. Smith",
      "latitude": 26.9124,
      "longitude": 75.7873,
      "accuracy": 54
    }
  ],
  "recordings": [
    {
      "filename": "recording-123.webm",
      "duration": 120,
      "fileSize": 1572864
    }
  ]
}
```

---

## 🛠️ Dependencies

### Required Packages
```json
{
  "pdfkit": "^0.13.0",
  "fs": "built-in",
  "path": "built-in"
}
```

### Installation
```bash
cd Backend
npm install pdfkit
```

---

## 📁 File Structure
```
Backend/
├── controllers/
│   └── claimController.js      # PDF generation logic
├── routes/
│   └── claimRoutes.js          # PDF API routes
├── utils/
│   └── pdfGenerator.js         # PDF generation utility
├── pdfs/                       # Temporary PDF storage (auto-created)
└── package.json                # Dependencies
```

---

## ⚠️ Important Notes

1. **Authentication:** All PDF endpoints require valid doctor token
2. **File Cleanup:** PDFs are automatically deleted 5 seconds after download
3. **Directory:** `/pdfs` folder is auto-created on first use
4. **Performance:** Large claims with many documents may take 2-3 seconds to generate
5. **File Size:** Generated PDFs typically range from 50KB to 500KB depending on data
6. **Browser Support:** Works in all modern browsers with blob support
7. **Mobile Support:** Fully compatible with mobile browsers

---

## 🐛 Troubleshooting

### PDF Generation Fails
- Check if claim exists in database
- Verify authentication token is valid
- Ensure pdfkit is installed: `npm list pdfkit`
- Check server logs for detailed error messages

### PDF Download Issues
- Ensure `responseType: 'blob'` is set in frontend request
- Check browser console for CORS errors
- Verify file permissions on `/pdfs` directory

### Empty or Incomplete PDF
- Verify claim has data in all sections
- Check if formData exists and is properly populated
- Review server logs for generation warnings

---

## 📞 Support

For issues or questions:
- Check server logs: `npm start` output
- Review error messages in console
- Verify all required fields are populated in claim

---

**Last Updated:** December 2024
**API Version:** 1.0.0

const API_BASE_URL = 'https://api.stechooze.com/api';

// Admin Login
export const adminLogin = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Admin login failed');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Register Doctor (Admin only)
export const registerDoctor = async (doctorData, adminToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/doctor/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(doctorData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Doctor registration failed');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Doctor Login
export const doctorLogin = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/doctor/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Doctor login failed');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Create Claim with file upload
export const createClaim = async (claimData, files, token) => {
  try {
    const formData = new FormData();
    
    // Append claim data fields FIRST (important for multer)
    if (claimData) {
      Object.keys(claimData).forEach(key => {
        if (claimData[key] !== undefined && claimData[key] !== null) {
          formData.append(key, claimData[key]);
        }
      });
    }

    // Append files AFTER text fields
    if (files && files.length > 0) {
      files.forEach(file => {
        // Check if it's an Ant Design file object or a native File
        const fileToUpload = file.originFileObj || file;
        formData.append('documents', fileToUpload);
      });
    }

    console.log('FormData contents:');
    for (let pair of formData.entries()) {
      console.log(pair[0] + ':', pair[1]);
    }

    const response = await fetch(`${API_BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // DO NOT set Content-Type, let browser set it with boundary
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create claim');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Get all claims
export const getAllClaims = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/claims`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch claims');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Get single claim
export const getClaimById = async (claimId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/claims/${claimId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch claim');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Update claim status
export const updateClaimStatus = async (claimId, status, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/claims/${claimId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update claim status');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Create meeting for a claim
export const createMeeting = async (claimId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/create/${claimId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create meeting');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Get meeting by room ID
export const getMeetingByRoomId = async (roomId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/room/${roomId}`, {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch meeting');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Update meeting status
export const updateMeetingStatus = async (meetingId, status, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update meeting status');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Upload captured image from video call
export const uploadCapturedImage = async (claimId, imageBlob, imageType, token) => {
  try {
    const formData = new FormData();
    formData.append('image', imageBlob, `capture-${imageType}-${Date.now()}.png`);
    formData.append('imageType', imageType);

    const response = await fetch(`${API_BASE_URL}/claims/${claimId}/capture-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload captured image');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Upload signature to claim
export const uploadSignature = async (claimId, signatureBlob, signedBy, signerName, token) => {
  try {
    const formData = new FormData();
    formData.append('signature', signatureBlob, `signature-${signedBy}-${Date.now()}.png`);
    formData.append('signedBy', signedBy);
    formData.append('signerName', signerName);

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/claims/${claimId}/signature`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload signature');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Save location to claim
export const saveLocation = async (claimId, locationType, userName, latitude, longitude, accuracy, address, token) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/claims/${claimId}/location`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        locationType,
        userName,
        latitude,
        longitude,
        accuracy,
        address,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to save location');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Upload screen recording to claim
export const uploadRecording = async (claimId, recordingBlob, duration, token) => {
  try {
    const formData = new FormData();
    formData.append('recording', recordingBlob, `recording-${Date.now()}.webm`);
    formData.append('duration', duration.toString());

    const response = await fetch(`${API_BASE_URL}/claims/${claimId}/recording`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload recording');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Submit detailed claim form
export const submitClaimForm = async (formData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/claims/${formData.get('claim_id')}/form`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit claim form');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

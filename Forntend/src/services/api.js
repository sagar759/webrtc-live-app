const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim();
export const SOCKET_URL = rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '');
export const API_BASE_URL = `${SOCKET_URL}/api`;

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

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server error: Invalid response format');
    }

    const data = await response.json();

    if (!response.ok) {
      // Extract error message from response
      const errorMsg = data.message || data.error || 'Failed to create claim';

      // Check for specific error types
      if (response.status === 400) {
        if (data.missingFields && data.missingFields.length > 0) {
          throw new Error(`Missing required fields: ${data.missingFields.join(', ')}`);
        }
        throw new Error(errorMsg);
      } else if (response.status === 401) {
        throw new Error('Unauthorized: Please login again');
      } else if (response.status === 409) {
        throw new Error('Claim ID already exists');
      } else if (response.status >= 500) {
        throw new Error('Server error: Please try again later');
      }

      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
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

// Start meeting by room ID
export const startMeetingByRoomId = async (roomId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/room/${roomId}/start`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to start meeting');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Complete meeting by room ID
export const completeMeetingByRoomId = async (roomId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/room/${roomId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to complete meeting');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Get meeting by claim ID
export const getMeetingByClaimId = async (claimId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/claim/${claimId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
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

// Upload screen / call recording to claim
export const uploadRecording = async (claimId, recordingBlob, duration, token, ext = 'webm') => {
  try {
    const fileExt = ext || (recordingBlob.type && recordingBlob.type.includes('mp4') ? 'mp4' : 'webm');
    const formData = new FormData();
    formData.append('recording', recordingBlob, `recording-${Date.now()}.${fileExt}`);
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

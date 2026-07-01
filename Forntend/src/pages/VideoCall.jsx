import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Space, Input, message, Spin } from 'antd';
import { VideoCameraOutlined, AudioOutlined, AudioMutedOutlined, PhoneOutlined, CopyOutlined, ShareAltOutlined, CameraOutlined, EditOutlined, CheckOutlined, CloseOutlined, ClearOutlined, EnvironmentOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import io from 'socket.io-client';
import { getMeetingByRoomId, uploadCapturedImage, uploadSignature, saveLocation, uploadRecording, completeMeetingByRoomId, startMeetingByRoomId } from '../services/api';
import Logo from '../assets/Logo.jpeg';

// Add global styles for animations and responsive design
const globalStyles = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
    }
    50% {
      opacity: 0.8;
      box-shadow: 0 4px 24px rgba(239, 68, 68, 0.8);
    }
  }

  @media (max-width: 768px) {
    .video-controls-container button {
      height: 45px !important;
      font-size: 13px !important;
      padding: 0 14px !important;
    }
    
    .video-controls-container button[style*="width: 50px"] {
      width: 45px !important;
    }
  }

  @media (max-width: 480px) {
    .video-controls-container {
      padding: 12px 16px !important;
      gap: 8px !important;
    }
    
    .video-controls-container button {
      height: 40px !important;
      font-size: 12px !important;
      padding: 0 12px !important;
    }
    
    .video-controls-container button[style*="width: 50px"] {
      width: 40px !important;
    }

    .video-controls-container button[style*="width: 120px"] {
      width: 100px !important;
    }
  }
`;

// Inject styles into document
if (typeof document !== 'undefined') {
  const styleElement = document.getElementById('video-call-styles') || document.createElement('style');
  styleElement.id = 'video-call-styles';
  styleElement.textContent = globalStyles;
  if (!document.getElementById('video-call-styles')) {
    document.head.appendChild(styleElement);
  }
}

const { Title, Text } = Typography;

const VideoCall = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get('role') || 'doctor';

  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [userName, setUserName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claimId, setClaimId] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureType, setSignatureType] = useState(null); // 'doctor' or 'patient'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const signatureCanvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const remoteSocketId = useRef(null);

  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    // Get user from localStorage if doctor
    if (role === 'doctor') {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.name) {
        setUserName(user.name);
      }
    }

    // Fetch meeting details to get claim ID
    const fetchMeetingDetails = async () => {
      try {
        const response = await getMeetingByRoomId(roomId);
        if (response.success && response.data.claimId) {
          setClaimId(response.data.claimId._id);
        }
      } catch (error) {
        console.error('Error fetching meeting details:', error);
      }
    };

    fetchMeetingDetails();

    // Initialize socket
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
    setSocket(newSocket);

    return () => {
      if (newSocket) newSocket.disconnect();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId]);

  // Update local video when localStream changes
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Update remote video when remoteStream changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!socket) return;

    socket.on('user-connected', async ({ userId, userName: remoteUserName, socketId }) => {
      message.success(`${remoteUserName} joined the meeting`);
      remoteSocketId.current = socketId;

      // Create offer for new user
      if (role === 'doctor') {
        await createOffer(socketId);
      }
    });

    socket.on('signal', async ({ signal, from }) => {
      if (signal.type === 'offer') {
        await handleOffer(signal, from);
      } else if (signal.type === 'answer') {
        await handleAnswer(signal);
      } else if (signal.candidate) {
        await handleIceCandidate(signal);
      }
    });

    socket.on('user-disconnected', ({ userName: disconnectedUser }) => {
      message.info(`${disconnectedUser} left the meeting`);
      setRemoteStream(null);
    });

    return () => {
      socket.off('user-connected');
      socket.off('signal');
      socket.off('user-disconnected');
    };
  }, [socket, localStream, role]);

  const initializePeerConnection = () => {
    peerConnection.current = new RTCPeerConnection(servers);

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    peerConnection.current.ontrack = (event) => {
      console.log('Remote track received:', event.streams);
      const [stream] = event.streams;
      setRemoteStream(stream);
    };

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && remoteSocketId.current) {
        socket.emit('signal', {
          to: remoteSocketId.current,
          signal: { candidate: event.candidate },
          from: socket.id,
        });
      }
    };
  };

  const createOffer = async (targetSocketId) => {
    initializePeerConnection();

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.emit('signal', {
      to: targetSocketId,
      signal: offer,
      from: socket.id,
    });
  };

  const handleOffer = async (offer, from) => {
    remoteSocketId.current = from;
    initializePeerConnection();

    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    socket.emit('signal', {
      to: from,
      signal: answer,
      from: socket.id,
    });
  };

  const handleAnswer = async (answer) => {
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleIceCandidate = async (candidate) => {
    if (peerConnection.current && candidate.candidate) {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate.candidate));
    }
  };

  const joinMeeting = async () => {
    if (!userName.trim()) {
      message.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      console.log('Local stream obtained:', stream.getTracks());
      setLocalStream(stream);

      // Join room via socket
      const userId = role === 'doctor'
        ? JSON.parse(localStorage.getItem('user') || '{}').id
        : `patient-${Date.now()}`;

      socket.emit('join-room', {
        roomId,
        userId,
        userName,
        role,
      });

      setIsJoined(true);
      message.success('Joined meeting successfully!');

      // Mark meeting as started
      try {
        await startMeetingByRoomId(roomId);
        console.log('✅ Meeting marked as started');
      } catch (error) {
        console.error('Error marking meeting as started:', error);
        // Don't show error to user, meeting can still proceed
      }

      // Automatically capture location after joining
      if (claimId) {
        captureLocationSilently(role);
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      message.error('Could not access camera/microphone');
    }
    setLoading(false);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const copyPatientLink = async () => {
    try {
      const patientLink = `${window.location.origin}/meeting/${roomId}?role=patient`;
      await navigator.clipboard.writeText(patientLink);
      message.success('Patient meeting link copied to clipboard!');
    } catch (error) {
      console.error('Error copying link:', error);
      message.error('Failed to copy link');
    }
  };

  const captureImage = async (videoRef, imageType) => {
    // Validation checks
    if (!videoRef.current) {
      message.error('Video stream not available!');
      return;
    }

    if (!claimId) {
      message.error('Claim ID not found. Please refresh and try again.');
      return;
    }

    const video = videoRef.current;

    // Check if video has valid dimensions
    if (!video.videoWidth || !video.videoHeight) {
      message.error('Video not ready. Please wait a moment and try again.');
      return;
    }

    setCapturing(true);

    // Show capturing message
    const hideCapturingMsg = message.loading(
      `📸 Capturing ${imageType === 'doctor' ? 'your' : 'patient'} image...`,
      0
    );

    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');

      // For doctor video (mirrored), flip it back
      if (imageType === 'doctor') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        }, 'image/png', 1.0);
      });

      if (!blob) {
        throw new Error('Failed to capture image');
      }

      console.log(`Captured ${imageType} image:`, {
        size: blob.size,
        type: blob.type,
        dimensions: `${canvas.width}x${canvas.height}`,
        claimId: claimId
      });

      // Get user token
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = user.token;

      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Hide capturing message
      hideCapturingMsg();

      // Show uploading message
      const hideUploadingMsg = message.loading('📤 Saving image to claim database...', 0);

      // Upload to backend with claim ID
      console.log('Uploading image with Claim ID:', claimId);
      const response = await uploadCapturedImage(claimId, blob, imageType, token);

      // Hide uploading message
      hideUploadingMsg();

      if (response.success) {
        console.log('Image saved successfully:', {
          claimId: response.data.claimId,
          totalImages: response.data.totalCapturedImages,
          imageType: imageType
        });

        message.success({
          content: `✅ ${imageType === 'doctor' ? 'Your' : 'Patient\'s'} image saved to Claim ${response.data.claimId}! (Total: ${response.data.totalCapturedImages})`,
          duration: 4,
        });
      }
    } catch (error) {
      hideCapturingMsg();
      console.error('Error capturing image:', error);
      message.error({
        content: error.message || 'Failed to capture image. Please try again.',
        duration: 4,
      });
    } finally {
      setCapturing(false);
    }
  };

  const openSignaturePad = (type) => {
    setSignatureType(type);
    setShowSignaturePad(true);
  };

  const closeSignaturePad = () => {
    setShowSignaturePad(false);
    setSignatureType(null);
    clearSignature();
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const startDrawing = (e) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Silent location capture (no loading messages, runs in background)
  const captureLocationSilently = async (locationType) => {
    if (!claimId || !navigator.geolocation) {
      return;
    }

    try {
      // Get current position
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      console.log('Auto-captured location on join:', {
        locationType,
        latitude,
        longitude,
        accuracy
      });

      // Get user info
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const locationUserName = locationType === 'doctor' ? user.name : userName;
      const token = locationType === 'doctor' ? user.token : null;

      // Save location to backend silently
      const response = await saveLocation(
        claimId,
        locationType,
        locationUserName,
        latitude,
        longitude,
        accuracy,
        null, // address
        token
      );

      if (response.success) {
        console.log(`✅ ${locationType} location auto-saved:`, response.data);
      }
    } catch (error) {
      console.error('Silent location capture failed:', error);
      // Don't show error to user, just log it
    }
  };

  const captureLocation = async (locationType) => {
    if (!claimId) {
      message.error('Claim ID not found');
      return;
    }

    if (!navigator.geolocation) {
      message.error('Geolocation is not supported by your browser');
      return;
    }

    const hideMsg = message.loading(`📍 Getting ${locationType} location...`, 0);

    try {
      // Get current position
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      console.log('Location captured:', {
        locationType,
        latitude,
        longitude,
        accuracy
      });

      // Get user info
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const locationUserName = locationType === 'doctor' ? user.name : userName;
      const token = locationType === 'doctor' ? user.token : null;

      hideMsg();
      const hideSaveMsg = message.loading('💾 Saving location to database...', 0);

      // Save location to backend
      const response = await saveLocation(
        claimId,
        locationType,
        locationUserName,
        latitude,
        longitude,
        accuracy,
        null, // address
        token
      );

      hideSaveMsg();

      if (response.success) {
        message.success({
          content: `✅ ${locationType === 'doctor' ? 'Your' : 'Patient\'s'} location saved! (Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)})`,
          duration: 4,
        });
      }
    } catch (error) {
      hideMsg();
      console.error('Error capturing location:', error);

      if (error.code === 1) {
        message.error('Location permission denied. Please allow location access.');
      } else if (error.code === 2) {
        message.error('Location unavailable. Please check your GPS.');
      } else if (error.code === 3) {
        message.error('Location request timeout. Please try again.');
      } else {
        message.error(error.message || 'Failed to capture location');
      }
    }
  };

  const saveSignature = async () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || !claimId) {
      message.error('Unable to save signature');
      return;
    }

    // Check if canvas is empty
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isEmpty = !imageData.data.some(channel => channel !== 0);

    if (isEmpty) {
      message.error('Please draw your signature first!');
      return;
    }

    setLoading(true);
    const hideMsg = message.loading('💾 Saving signature...', 0);

    try {
      // Convert canvas to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png', 1.0);
      });

      // Get signer name
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const signerName = signatureType === 'doctor' ? user.name : userName;
      const token = signatureType === 'doctor' ? user.token : null;

      console.log('Saving signature:', {
        claimId,
        signatureType,
        signerName
      });

      // Upload signature
      const response = await uploadSignature(claimId, blob, signatureType, signerName, token);

      hideMsg();

      if (response.success) {
        message.success({
          content: `✅ ${signatureType === 'doctor' ? 'Your' : 'Patient\'s'} signature saved to Claim ${response.data.claimId}!`,
          duration: 3,
        });
        closeSignaturePad();
      }
    } catch (error) {
      hideMsg();
      console.error('Error saving signature:', error);
      message.error({
        content: error.message || 'Failed to save signature',
        duration: 4,
      });
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (!claimId) {
      message.error('Claim ID not found');
      return;
    }

    if (!localStream) {
      message.error('Local audio stream not available');
      return;
    }

    try {
      // Capture screen + system audio
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });

      // Create a combined stream with screen video and both audio sources
      const combinedStream = new MediaStream();

      // Add video track from screen
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        combinedStream.addTrack(videoTrack);
      }

      // Create audio context to mix audio tracks
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // Add screen audio if available
      const screenAudioTracks = screenStream.getAudioTracks();
      if (screenAudioTracks.length > 0) {
        const screenAudioSource = audioContext.createMediaStreamSource(
          new MediaStream([screenAudioTracks[0]])
        );
        screenAudioSource.connect(destination);
        console.log('✅ Added screen audio to recording');
      }

      // Add doctor's microphone audio (THIS IS THE FIX!)
      const localAudioTracks = localStream.getAudioTracks();
      if (localAudioTracks.length > 0) {
        const micAudioSource = audioContext.createMediaStreamSource(
          new MediaStream([localAudioTracks[0]])
        );
        micAudioSource.connect(destination);
        console.log('✅ Added doctor microphone audio to recording');
      } else {
        console.warn('⚠️ No microphone audio track found');
      }

      // Add the mixed audio track to combined stream
      if (destination.stream.getAudioTracks().length > 0) {
        combinedStream.addTrack(destination.stream.getAudioTracks()[0]);
      }

      console.log('Recording stream tracks:', {
        video: combinedStream.getVideoTracks().length,
        audio: combinedStream.getAudioTracks().length
      });

      // Create media recorder with combined stream
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm';

      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });

      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        await saveRecording(duration);
        screenStream.getTracks().forEach(track => track.stop());
        combinedStream.getTracks().forEach(track => track.stop());
        audioContext.close();
      };

      // Start recording
      mediaRecorderRef.current.start(1000); // Collect data every 1 second
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      // Update duration every second
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      message.success('🔴 Screen recording started with your microphone!');

      // Handle user stopping screen share
      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };
    } catch (error) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError') {
        message.error('Screen recording permission denied');
      } else {
        message.error('Failed to start recording: ' + error.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      message.info('⏹️ Recording stopped. Saving...');
    }
  };

  const saveRecording = async (duration) => {
    if (recordedChunksRef.current.length === 0) {
      message.error('No recording data to save');
      return;
    }

    const hideMsg = message.loading('💾 Uploading recording...', 0);

    try {
      // Create blob from recorded chunks
      const blob = new Blob(recordedChunksRef.current, {
        type: 'video/webm'
      });

      console.log('Recording details:', {
        size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        duration: `${duration}s`,
        claimId
      });

      // Get user token
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = user.token;

      // Upload recording
      const response = await uploadRecording(claimId, blob, duration, token);

      hideMsg();

      if (response.success) {
        message.success({
          content: `✅ Recording saved to Claim ${response.data.claimId}! (${(blob.size / 1024 / 1024).toFixed(2)} MB, ${duration}s)`,
          duration: 5,
        });
      }

      // Clear recorded chunks
      recordedChunksRef.current = [];
      setRecordingDuration(0);
    } catch (error) {
      hideMsg();
      console.error('Error saving recording:', error);
      message.error({
        content: error.message || 'Failed to save recording',
        duration: 4,
      });
    }
  };

  const leaveMeeting = async () => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (socket) {
      socket.disconnect();
    }

    // Mark meeting as completed if doctor
    if (role === 'doctor' && roomId) {
      try {
        console.log(`\n📞 === LEAVING MEETING ===`);
        console.log(`Room ID: ${roomId}`);
        console.log(`Claim ID: ${claimId}`);

        const response = await completeMeetingByRoomId(roomId);

        console.log('✅ API Response:', response);

        if (response.success && response.data) {
          console.log(`📊 Meeting Status: ${response.data.meeting?.status}`);
          console.log(`📋 Claim Status: ${response.data.claim?.status}`);
          message.success({
            content: `Meeting completed! Claim status: ${response.data.claim?.status}`,
            duration: 3,
          });
        } else {
          message.success('Meeting completed successfully!');
        }

        console.log(`=========================\n`);
      } catch (error) {
        console.error('❌ Error completing meeting:', error);
        message.error('Failed to mark meeting as completed');
      }
    }

    // Navigate to claim form if doctor, otherwise go to home
    if (role === 'doctor' && claimId) {
      navigate(`/claim-form?claimId=${claimId}`);
    } else {
      navigate('/home');
    }
  };

  if (!isJoined) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#ffffff',
      }}>
        <Card style={{
          width: 500,
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)',
          borderRadius: '16px',
          border: '2px solid #10b981',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img src={Logo} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '12px' }} />
          </div>
          <Title level={3} style={{ color: '#000000', textAlign: 'center', marginBottom: '24px' }}>
            <VideoCameraOutlined style={{ color: '#10b981', marginRight: '12px' }} />
            Join Video Meeting
          </Title>

          <Text style={{ display: 'block', marginBottom: '16px', color: '#6b7280' }}>
            Role: <strong>{role === 'doctor' ? 'Doctor' : 'Patient'}</strong>
          </Text>

          <Input
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            size="large"
            style={{
              marginBottom: '24px',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
            }}
          />

          <Button
            type="primary"
            block
            size="large"
            loading={loading}
            onClick={joinMeeting}
            icon={<VideoCameraOutlined />}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '8px',
              height: '50px',
              fontWeight: 600,
            }}
          >
            Join Meeting
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#000000',
      overflow: 'hidden',
    }}>
      {/* Full Screen Remote Video (Background) */}
      {remoteStream ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#1a1a1a',
          zIndex: 1,
        }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Remote Video Label */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}>
            🟢 Remote User
          </div>
          {/* Capture Patient Image Button */}
          {role === 'doctor' && (
            <Button
              icon={<CameraOutlined />}
              onClick={() => captureImage(remoteVideoRef, 'patient')}
              loading={capturing}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(16, 185, 129, 0.9)',
                backdropFilter: 'blur(10px)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                height: '42px',
                padding: '0 20px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
              }}
            >
              Capture Patient Image
            </Button>
          )}
        </div>
      ) : (
        /* Waiting for Remote User */
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1,
        }}>
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
            <Text style={{
              color: '#ffffff',
              fontSize: '18px',
              display: 'block',
              marginTop: '20px',
              fontWeight: 500,
            }}>
              Waiting for remote user to join...
            </Text>
          </div>
        </div>
      )}

      {/* Picture-in-Picture Local Video (Small Overlay) */}
      <div style={{
        position: 'fixed',
        bottom: '140px',
        right: '20px',
        width: 'clamp(180px, 25vw, 320px)',
        aspectRatio: '16/9',
        background: '#1f2937',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        border: '3px solid rgba(16, 185, 129, 0.5)',
        zIndex: 10,
        transition: 'all 0.3s ease',
      }}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
          }}
        />
        {/* Local Video Label */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 500,
        }}>
          You ({userName})
        </div>
        {/* Capture My Image Button */}
        {role === 'doctor' && (
          <Button
            icon={<CameraOutlined />}
            onClick={() => captureImage(localVideoRef, 'doctor')}
            loading={capturing}
            size="small"
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(16, 185, 129, 0.9)',
              backdropFilter: 'blur(8px)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '11px',
              padding: '2px 8px',
              height: 'auto',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
            }}
          >
            Capture
          </Button>
        )}
      </div>

      {/* Meeting Info Bar - Top Right for Doctor */}
      {role === 'doctor' && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          background: 'rgba(31, 41, 55, 0.9)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'flex-end',
          border: '2px solid rgba(16, 185, 129, 0.5)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          zIndex: 10,
          maxWidth: 'calc(100vw - 40px)',
        }}>
          <div style={{ textAlign: 'right' }}>
            <Text style={{ color: '#10b981', fontSize: '12px', fontWeight: 600, display: 'block' }}>
              Meeting Room
            </Text>
            <Text style={{ color: '#ffffff', fontSize: '11px' }}>
              Room ID: {roomId}
            </Text>
          </div>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={copyPatientLink}
            size="small"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '8px',
              height: '36px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              fontSize: '12px',
            }}
          >
            Copy Patient Link
          </Button>
        </div>
      )}

      {/* Controls - Bottom Fixed */}
      <div
        className="video-controls-container"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(31, 41, 55, 0.95)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          padding: '16px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '2px solid rgba(16, 185, 129, 0.3)',
          zIndex: 10,
          maxWidth: 'calc(100vw - 40px)',
        }}>
        <Button
          size="large"
          icon={isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
          onClick={toggleMute}
          style={{
            background: isMuted ? '#ef4444' : '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            height: '50px',
            width: '50px',
          }}
        />

        <Button
          size="large"
          icon={<VideoCameraOutlined />}
          onClick={toggleVideo}
          style={{
            background: isVideoOff ? '#ef4444' : '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            height: '50px',
            width: '50px',
          }}
        />

        {role === 'doctor' && (
          <>
            <Button
              size="large"
              icon={isRecording ? <StopOutlined /> : <PlayCircleOutlined />}
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                background: isRecording ? '#ef4444' : '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                height: '50px',
                padding: '0 20px',
                fontWeight: 600,
                animation: isRecording ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              {isRecording ? `Stop (${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')})` : 'Record'}
            </Button>
            <Button
              size="large"
              icon={<EditOutlined />}
              onClick={() => openSignaturePad('doctor')}
              style={{
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                height: '50px',
                padding: '0 20px',
                fontWeight: 600,
              }}
            >
              My Sign
            </Button>
            <Button
              size="large"
              icon={<EnvironmentOutlined />}
              onClick={() => captureLocation('doctor')}
              style={{
                background: '#f59e0b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                height: '50px',
                padding: '0 20px',
                fontWeight: 600,
              }}
            >
              My Location
            </Button>
          </>
        )}

        {remoteStream && (
          <>
            <Button
              size="large"
              icon={<EditOutlined />}
              onClick={() => openSignaturePad('patient')}
              style={{
                background: '#8b5cf6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                height: '50px',
                padding: '0 20px',
                fontWeight: 600,
              }}
            >
              Patient Sign
            </Button>
            <Button
              size="large"
              icon={<EnvironmentOutlined />}
              onClick={() => captureLocation('patient')}
              style={{
                background: '#ec4899',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                height: '50px',
                padding: '0 20px',
                fontWeight: 600,
              }}
            >
              Patient Location
            </Button>
          </>
        )}

        <Button
          size="large"
          danger
          icon={<PhoneOutlined style={{ transform: 'rotate(135deg)' }} />}
          onClick={leaveMeeting}
          style={{
            borderRadius: '8px',
            height: '50px',
            width: '120px',
            fontWeight: 600,
          }}
        >
          Leave
        </Button>
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <Card style={{
            width: '90%',
            maxWidth: '600px',
            borderRadius: '16px',
            border: '2px solid #10b981',
          }}>
            <Title level={4} style={{ marginBottom: '16px', color: '#000000' }}>
              ✍️ {signatureType === 'doctor' ? 'Doctor Signature' : 'Patient Signature'}
            </Title>

            <Text style={{ display: 'block', marginBottom: '16px', color: '#6b7280' }}>
              Draw your signature below using mouse or touch:
            </Text>

            <div style={{
              border: '2px dashed #10b981',
              borderRadius: '8px',
              background: '#ffffff',
              marginBottom: '16px',
              cursor: 'crosshair',
            }}>
              <canvas
                ref={signatureCanvasRef}
                width={560}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '200px',
                }}
              />
            </div>

            <Space size="middle" style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                icon={<ClearOutlined />}
                onClick={clearSignature}
                style={{
                  borderRadius: '8px',
                  height: '40px',
                }}
              >
                Clear
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={closeSignaturePad}
                style={{
                  borderRadius: '8px',
                  height: '40px',
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={saveSignature}
                loading={loading}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  height: '40px',
                  fontWeight: 600,
                }}
              >
                Save Signature
              </Button>
            </Space>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VideoCall;

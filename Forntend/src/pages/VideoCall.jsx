import { useState, useEffect, useRef } from 'react';
import { SOCKET_URL } from '../services/api';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Space, Input, message, Spin, Select, Modal } from 'antd';
import { 
  VideoCameraOutlined, 
  AudioOutlined, 
  AudioMutedOutlined, 
  PhoneOutlined, 
  CopyOutlined, 
  ShareAltOutlined, 
  CameraOutlined, 
  EnvironmentOutlined, 
  PlayCircleOutlined, 
  StopOutlined, 
  SettingOutlined,
  SyncOutlined,
  SwapOutlined
} from '@ant-design/icons';
import io from 'socket.io-client';
import { getMeetingByRoomId, uploadCapturedImage, saveLocation, uploadRecording, completeMeetingByRoomId, startMeetingByRoomId } from '../services/api';
import Logo from '../assets/Logo.jpeg';
import LocationPickerModal from '../components/LocationPickerModal';
import { getPinpointLocation } from '../utils/geolocation';

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

  /* WhatsApp-style single row video controls */
  .video-controls-container {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    justify-content: center !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .video-controls-container::-webkit-scrollbar {
    display: none;
  }

  .video-control-btn {
    border-radius: 50% !important;
    width: 48px !important;
    height: 48px !important;
    min-width: 48px !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 18px !important;
    transition: all 0.2s ease !important;
    flex-shrink: 0 !important;
  }

  .video-control-btn:hover {
    transform: scale(1.08) !important;
  }

  .video-control-btn:active {
    transform: scale(0.95) !important;
  }

  .video-control-btn.btn-leave {
    background: #dc2626 !important;
  }

  .video-control-btn-pill {
    border-radius: 24px !important;
    height: 48px !important;
    padding: 0 16px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
    transition: all 0.2s ease !important;
    border: none !important;
  }

  .video-control-btn-pill:hover {
    transform: scale(1.05) !important;
  }

  /* WhatsApp-style portrait floating PiP window */
  .local-pip-container {
    aspect-ratio: 9 / 16 !important;
    border-radius: 16px !important;
  }

  @media (max-width: 768px) {
    .video-controls-container {
      bottom: 16px !important;
      padding: 8px 12px !important;
      gap: 10px !important;
      border-radius: 40px !important;
      max-width: calc(100vw - 20px) !important;
    }
    
    .video-control-btn {
      width: 44px !important;
      height: 44px !important;
      min-width: 44px !important;
      font-size: 16px !important;
    }

    .video-control-btn-pill {
      height: 44px !important;
      padding: 0 12px !important;
      font-size: 12px !important;
    }

    .local-pip-container {
      width: clamp(110px, 28vw, 150px) !important;
      aspect-ratio: 9 / 16 !important;
      border-radius: 14px !important;
    }
  }

  @media (max-width: 480px) {
    .video-controls-container {
      bottom: 12px !important;
      padding: 6px 10px !important;
      gap: 8px !important;
      border-radius: 36px !important;
      max-width: calc(100vw - 12px) !important;
    }
    
    .video-control-btn {
      width: 42px !important;
      height: 42px !important;
      min-width: 42px !important;
      font-size: 15px !important;
    }

    .video-control-btn-pill {
      height: 42px !important;
      padding: 0 10px !important;
      font-size: 11px !important;
    }

    .local-pip-container {
      width: clamp(100px, 30vw, 130px) !important;
      aspect-ratio: 9 / 16 !important;
      border-radius: 12px !important;
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
  const [remoteUserName, setRemoteUserName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claimId, setClaimId] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationModalType, setLocationModalType] = useState('doctor');
  const [locationModalCoords, setLocationModalCoords] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [expiredReason, setExpiredReason] = useState('');
  const [hasLeft, setHasLeft] = useState(false);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const canvasRecordingCleanupRef = useRef(null);
  const recordingAudioContextRef = useRef(null);
  const recordingStopPromiseRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const remoteSocketId = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const audioContextRef = useRef(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [videoInputDevices, setVideoInputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState('');
  const [selectedVideoInput, setSelectedVideoInput] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [pipPosition, setPipPosition] = useState(null); // { x, y } or null (defaults to corner)
  const [isDragging, setIsDragging] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false); // false = main is remote, pip is local; true = main is local, pip is remote
  const pipRef = useRef(null);
  const dragData = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 0,
    hasMoved: false,
  });

  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  };

  // Direct WebAudio Speaker Pipeline (bypasses video element audio quirks)
  const setupWebAudioPlayback = (stream) => {
    if (!stream || stream.getAudioTracks().length === 0) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
      }

      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = true;
      const audioStream = new MediaStream([audioTrack]);
      const source = ctx.createMediaStreamSource(audioStream);

      const gainNode = ctx.createGain();
      gainNode.gain.value = 2.0; // Boost volume so it's clearly audible

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      console.log('✅ WebAudio direct speaker pipeline active & connected to sound card (Gain: 2.0x)!');
    } catch (err) {
      console.warn('WebAudio direct playback notice:', err);
    }
  };

  const loadMediaDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
      const videoInputs = devices.filter(d => d.kind === 'videoinput');

      setAudioInputDevices(audioInputs);
      setAudioOutputDevices(audioOutputs);
      setVideoInputDevices(videoInputs);

      if (audioInputs.length > 0 && !selectedAudioInput) {
        setSelectedAudioInput(audioInputs[0].deviceId);
      }
      if (audioOutputs.length > 0 && !selectedAudioOutput) {
        setSelectedAudioOutput(audioOutputs[0].deviceId);
      }
      if (videoInputs.length > 0 && !selectedVideoInput) {
        setSelectedVideoInput(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Error loading media devices:', err);
    }
  };

  const switchCamera = async () => {
    try {
      const nextFacingMode = facingMode === 'user' ? 'environment' : 'user';
      console.log(`📷 Switching camera from ${facingMode} to ${nextFacingMode}`);

      let stream = null;

      // 1. Try requesting ideal facingMode (standard for mobile browsers)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: nextFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn('Facing mode constraint switch failed, trying enumerated device fallback:', err1);
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoInputDevices(videoInputs);

        if (videoInputs.length > 1) {
          const currentIndex = videoInputs.findIndex(d => d.deviceId === selectedVideoInput);
          const nextIndex = (currentIndex + 1) % videoInputs.length;
          const nextDev = videoInputs[nextIndex];
          setSelectedVideoInput(nextDev.deviceId);

          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: nextDev.deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: nextFacingMode },
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error('No video stream obtained');
      }

      const newVideoTrack = stream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      newVideoTrack.enabled = !isVideoOff;

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      if (peerConnection.current) {
        const senders = peerConnection.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      setFacingMode(nextFacingMode);
      message.success(nextFacingMode === 'environment' ? '📷 Rear camera active' : '🤳 Front camera active');
    } catch (err) {
      console.error('Error switching camera:', err);
      message.error('Could not switch camera. Please verify camera permissions.');
    }
  };

  const switchVideoDevice = async (deviceId) => {
    try {
      setSelectedVideoInput(deviceId);
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;

      newTrack.enabled = !isVideoOff;

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current.addTrack(newTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      if (peerConnection.current) {
        const senders = peerConnection.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newTrack);
        }
      }
      message.success('Camera switched successfully');
    } catch (err) {
      console.error('Error switching camera device:', err);
      message.error('Failed to switch camera');
    }
  };

  const switchMicrophone = async (deviceId) => {
    try {
      setSelectedAudioInput(deviceId);
      const newAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      const newTrack = newAudioStream.getAudioTracks()[0];
      if (!newTrack) return;

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getAudioTracks()[0];
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current.addTrack(newTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      if (peerConnection.current) {
        const senders = peerConnection.current.getSenders();
        const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(newTrack);
        }
      }
      message.success('Microphone switched successfully');
    } catch (err) {
      console.error('Error switching microphone:', err);
      message.error('Failed to switch microphone');
    }
  };

  const switchSpeaker = async (deviceId) => {
    try {
      setSelectedAudioOutput(deviceId);
      if (remoteVideoRef.current && typeof remoteVideoRef.current.setSinkId === 'function') {
        await remoteVideoRef.current.setSinkId(deviceId);
        message.success('Speaker switched successfully');
      } else {
        message.info('Speaker selected');
      }
    } catch (err) {
      console.error('Error switching speaker:', err);
      message.error('Failed to switch speaker');
    }
  };

  const attachStreamToElement = (videoElement, stream) => {
    if (!videoElement || !stream) return;

    if (videoElement.srcObject !== stream) {
      videoElement.srcObject = stream;
    }

    videoElement.muted = false;
    videoElement.volume = 1.0;

    const audioTracks = stream.getAudioTracks();
    console.log(`🔊 Stream attached. Audio tracks: ${audioTracks.length}, Video tracks: ${stream.getVideoTracks().length}`);

    // Activate direct WebAudio playback
    if (audioTracks.length > 0) {
      setupWebAudioPlayback(stream);
    }

    const playPromise = videoElement.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Playback error (waiting for user gesture):', err.message);
        }
      });
    }
  };

  useEffect(() => {
    let activeSocket = null;

    // Get user from localStorage if doctor
    if (role === 'doctor') {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.name) {
        setUserName(user.name);
      }
    }

    // Fetch meeting details & verify validity
    const fetchMeetingDetails = async () => {
      try {
        setCheckingStatus(true);
        const response = await getMeetingByRoomId(roomId);
        
        if (response && response.success && response.data) {
          const meetingData = response.data;
          const claimObj = meetingData.claimId;
          if (claimObj) {
            const actualClaimId = claimObj.claimId || claimObj._id;
            setClaimId(actualClaimId);
          }

          // Check if meeting or claim is completed / expired
          const expired = response.isExpired || 
                          meetingData.status === 'completed' || 
                          meetingData.status === 'meeting_completed' || 
                          meetingData.claimFormSubmitted === true ||
                          (claimObj && claimObj.status === 'closed');

          if (expired) {
            console.log('🔒 Meeting is completed/expired. Inactivating room access.');
            setIsExpired(true);
            setExpiredReason(
              meetingData.status === 'completed' || meetingData.claimFormSubmitted
                ? 'This claim verification has been finalized and submitted. The video link has expired.'
                : 'This video call session has ended. The link is no longer valid.'
            );
            setCheckingStatus(false);
            return;
          }
        }

        // Only connect socket if meeting is valid and not expired
        activeSocket = io(SOCKET_URL);
        setSocket(activeSocket);
      } catch (error) {
        console.log('Meeting details check error:', error.message || error);
        if (error.message && error.message.toLowerCase().includes('not found')) {
          setIsExpired(true);
          setExpiredReason('Invalid or non-existent meeting link.');
        } else {
          // Fallback connect for testing rooms
          activeSocket = io(SOCKET_URL);
          setSocket(activeSocket);
        }
      } finally {
        setCheckingStatus(false);
      }
    };

    fetchMeetingDetails();

    return () => {
      if (activeSocket) activeSocket.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => { });
        audioContextRef.current = null;
      }
    };
  }, [roomId, role]);

  // Boundary clamping for PiP window (keeps window within screen margins)
  const clampPosition = (x, y) => {
    const pipEl = pipRef.current;
    const width = pipEl ? pipEl.offsetWidth : 160;
    const height = pipEl ? pipEl.offsetHeight : 284;
    const margin = 8;
    const minX = margin;
    const minY = margin;
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const maxY = Math.max(margin, window.innerHeight - height - margin);
    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(minY, Math.min(y, maxY)),
    };
  };

  const startDrag = (clientX, clientY) => {
    if (!pipRef.current) return;
    const rect = pipRef.current.getBoundingClientRect();
    dragData.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      initialLeft: rect.left,
      initialTop: rect.top,
      hasMoved: false,
    };
    setIsDragging(true);
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.ant-btn')) return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('.ant-btn')) return;
    if (e.touches && e.touches.length > 0) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handlePipClick = (e) => {
    if (e.target.closest('button') || e.target.closest('.ant-btn')) return;
    // Only swap if it was a quick tap/click without significant drag movement
    if (!dragData.current.hasMoved) {
      setIsSwapped(prev => !prev);
    }
  };

  // Global listeners for dragging and dropping PiP window anywhere
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragData.current.isDragging) return;
      const deltaX = e.clientX - dragData.current.startX;
      const deltaY = e.clientY - dragData.current.startY;
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragData.current.hasMoved = true;
      }
      const targetX = dragData.current.initialLeft + deltaX;
      const targetY = dragData.current.initialTop + deltaY;
      setPipPosition(clampPosition(targetX, targetY));
    };

    const handleTouchMove = (e) => {
      if (!dragData.current.isDragging || !e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragData.current.startX;
      const deltaY = touch.clientY - dragData.current.startY;
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragData.current.hasMoved = true;
      }
      const targetX = dragData.current.initialLeft + deltaX;
      const targetY = dragData.current.initialTop + deltaY;
      setPipPosition(clampPosition(targetX, targetY));
    };

    const handleDragEnd = () => {
      if (dragData.current.isDragging) {
        dragData.current.isDragging = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleDragEnd);
    window.addEventListener('touchcancel', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchcancel', handleDragEnd);
    };
  }, []);

  // Keep PiP window safely inside viewport on screen resize
  useEffect(() => {
    const handleResize = () => {
      if (pipPosition && pipRef.current) {
        setPipPosition(prev => prev ? clampPosition(prev.x, prev.y) : null);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pipPosition]);

  // Update local video when localStream or isSwapped changes
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isSwapped]);

  // Update remote video when remoteStream or isSwapped changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      attachStreamToElement(remoteVideoRef.current, remoteStream);
    }
  }, [remoteStream, isSwapped]);

  const processQueuedIceCandidates = async () => {
    while (iceCandidatesQueue.current.length > 0) {
      const cand = iceCandidatesQueue.current.shift();
      try {
        if (peerConnection.current && peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(cand));
          console.log('✅ Queued ICE Candidate added successfully');
        }
      } catch (e) {
        console.error('Error adding queued ICE candidate:', e);
      }
    }
  };

  const initializePeerConnection = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    const pc = new RTCPeerConnection(servers);
    peerConnection.current = pc;
    iceCandidatesQueue.current = [];

    // Add local stream tracks (both audio and video)
    const stream = localStreamRef.current || localStream;
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log(`Adding local track to peer connection: ${track.kind}, enabled=${track.enabled}`);
        pc.addTrack(track, stream);
      });
    }

    // Handle remote stream tracks
    pc.ontrack = (event) => {
      console.log(`Remote track received: kind=${event.track.kind}, id=${event.track.id}`);

      let incomingStream = remoteStreamRef.current;
      if (!incomingStream) {
        incomingStream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream();
        remoteStreamRef.current = incomingStream;
      }

      if (!incomingStream.getTracks().some(t => t.id === event.track.id)) {
        incomingStream.addTrack(event.track);
      }

      setRemoteStream(incomingStream);

      if (remoteVideoRef.current) {
        attachStreamToElement(remoteVideoRef.current, incomingStream);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && remoteSocketId.current && socket) {
        socket.emit('signal', {
          to: remoteSocketId.current,
          signal: { candidate: event.candidate },
          from: socket.id,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC Connection state:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('WebRTC ICE Connection state:', pc.iceConnectionState);
    };

    return pc;
  };

  const createOffer = async (targetSocketId) => {
    const pc = initializePeerConnection();

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      socket.emit('signal', {
        to: targetSocketId,
        signal: offer,
        from: socket.id,
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  const handleOffer = async (offer, from) => {
    remoteSocketId.current = from;
    const pc = initializePeerConnection();

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await processQueuedIceCandidates();

      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(answer);

      socket.emit('signal', {
        to: from,
        signal: answer,
        from: socket.id,
      });
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  const handleAnswer = async (answer) => {
    if (peerConnection.current) {
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        await processQueuedIceCandidates();
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    }
  };

  const handleIceCandidate = async (candidate) => {
    if (!candidate || !candidate.candidate) return;

    if (peerConnection.current && peerConnection.current.remoteDescription && peerConnection.current.remoteDescription.type) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate.candidate));
      } catch (err) {
        console.error('Error adding received ICE candidate:', err);
      }
    } else {
      console.log('Queuing ICE candidate until remote description is set');
      iceCandidatesQueue.current.push(candidate.candidate);
    }
  };

  useEffect(() => {
    if (!socket) return;

    // When this user joins and there are existing users, this user initiates the offer
    socket.on('existing-users', async (existingUsers) => {
      console.log('Existing users in room:', existingUsers);
      if (existingUsers && existingUsers.length > 0) {
        const otherUser = existingUsers[0];
        remoteSocketId.current = otherUser.socketId;
        if (otherUser.userName) {
          setRemoteUserName(otherUser.userName);
        }
        message.info(`${otherUser.userName || 'Participant'} is already in the room. Connecting...`);

        // The newcomer always creates the offer to connect to the existing user
        await createOffer(otherUser.socketId);
      }
    });

    // When an existing user receives a new participant notification, wait for their offer
    socket.on('user-connected', ({ userName: newRemoteUserName, socketId }) => {
      console.log('New user connected to room:', newRemoteUserName, socketId);
      if (newRemoteUserName) {
        setRemoteUserName(newRemoteUserName);
      }
      message.success(`${newRemoteUserName || 'Participant'} joined the meeting`);
      remoteSocketId.current = socketId;
    });

    socket.on('signal', async ({ signal, from }) => {
      console.log('Signal received from:', from, signal.type || (signal.candidate ? 'candidate' : 'unknown'));
      if (signal.type === 'offer') {
        await handleOffer(signal, from);
      } else if (signal.type === 'answer') {
        await handleAnswer(signal);
      } else if (signal.candidate) {
        await handleIceCandidate(signal);
      }
    });

    // Remote request to capture patient location on patient's device (High-precision GPS lock)
    socket.on('request-patient-location', async ({ claimId: reqClaimId }) => {
      console.log('Received remote request to capture patient location');
      const targetClaimId = reqClaimId || claimId;
      if (role === 'patient') {
        if (!navigator.geolocation) {
          console.warn('Geolocation not supported on patient device');
          return;
        }

        try {
          message.loading({
            content: '📡 Locking onto GPS satellites for Doctor verification...',
            key: 'patGps',
            duration: 0
          });

          const pinpoint = await getPinpointLocation({
            targetAccuracy: 25,
            maxWaitTimeMs: 15000,
            coarseThreshold: 100,
            onProgress: ({ currentAccuracy, secondsLeft }) => {
              if (currentAccuracy) {
                message.loading({
                  content: `📡 Refining GPS satellite signal: ±${currentAccuracy}m (${secondsLeft}s left)...`,
                  key: 'patGps',
                  duration: 0
                });
              }
            }
          });

          const { latitude, longitude, accuracy, isHighAccuracy, isCoarse } = pinpoint;
          const locationUserName = userName || 'Patient';

          // Save patient location directly from patient device to backend
          const res = await saveLocation(
            targetClaimId,
            'patient',
            locationUserName,
            latitude,
            longitude,
            accuracy,
            null,
            null
          );

          if (isHighAccuracy) {
            message.success({
              content: `🎯 Pinpoint GPS verified (±${accuracy}m) & shared with Doctor!`,
              key: 'patGps',
              duration: 4
            });
          } else if (isCoarse) {
            message.warning({
              content: `⚠️ Shared approximate location (±${accuracy >= 1000 ? Math.round(accuracy / 1000) + 'km' : accuracy + 'm'}). Please enable 'Precise Location' on your phone.`,
              key: 'patGps',
              duration: 5
            });
          } else {
            message.success({
              content: `✅ Location verified (±${accuracy}m) and shared with Doctor!`,
              key: 'patGps',
              duration: 3
            });
          }

          // Send coordinates back to Doctor via socket
          socket.emit('patient-location-updated', {
            roomId,
            location: {
              locationType: 'patient',
              userName: locationUserName,
              latitude,
              longitude,
              accuracy: Math.round(accuracy),
              address: res?.data?.location?.address || null
            }
          });
        } catch (err) {
          console.error('Patient GPS capture error:', err);
          message.warning({
            content: 'Could not acquire GPS satellite lock. Please check location permissions on your browser and enable GPS.',
            key: 'patGps',
            duration: 5
          });
        }
      }
    });

    // Notification for doctor when patient location is updated
    socket.on('patient-location-updated', ({ location: patLoc }) => {
      console.log('Received patient-location-updated notification:', patLoc);
      if (role === 'doctor' && patLoc && patLoc.latitude && patLoc.longitude) {
        const latNum = Number(patLoc.latitude);
        const lngNum = Number(patLoc.longitude);
        const accNum = patLoc.accuracy || 10;
        const addr = patLoc.address || '';

        const accBadge = accNum <= 25 ? `🎯 High Precision (±${accNum}m)` : `±${accNum}m`;
        message.success({
          content: `✅ Patient location verified! (Lat: ${latNum.toFixed(5)}, Long: ${lngNum.toFixed(5)} - ${accBadge})`,
          duration: 5,
        });

        // Open inspection map for Doctor to see patient location
        setLocationModalType('patient');
        setLocationModalCoords({
          latitude: latNum,
          longitude: lngNum,
          accuracy: accNum,
          address: addr
        });
        setLocationModalVisible(true);
      }
    });

    socket.on('user-disconnected', ({ userName: disconnectedUser }) => {
      message.info(`${disconnectedUser} left the meeting`);
      setRemoteStream(null);
      remoteStreamRef.current = null;
      setRemoteUserName('');
    });

    // Real-time notification when room is rejected/expired
    socket.on('meeting-expired', ({ message: expireMsg }) => {
      console.log('🔒 Socket meeting-expired event received:', expireMsg);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      setIsExpired(true);
      setExpiredReason(expireMsg || 'This video meeting link has expired and is no longer valid.');
    });

    // Real-time notification when doctor completes/ends meeting
    socket.on('meeting-ended', () => {
      console.log('📞 Socket meeting-ended event received');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (role !== 'doctor') {
        setIsExpired(true);
        setExpiredReason('The doctor has concluded this video verification session. Thank you for your time.');
      }
    });

    // Unblock browser autoplay on any page click if previously blocked
    const handleUserInteraction = () => {
      if (remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.volume = 1.0;
        if (remoteVideoRef.current.paused) {
          remoteVideoRef.current.play().catch(() => { });
        }
      }
    };
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    return () => {
      socket.off('existing-users');
      socket.off('user-connected');
      socket.off('signal');
      socket.off('request-patient-location');
      socket.off('patient-location-updated');
      socket.off('user-disconnected');
      socket.off('meeting-expired');
      socket.off('meeting-ended');
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [socket, claimId, role, roomId, userName]);

  const joinMeeting = async () => {
    if (!userName.trim()) {
      message.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      // Get user media with full audio settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Ensure all audio tracks are active
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        console.log(`Microphone ready: ${track.label}, enabled: ${track.enabled}`);
      });

      console.log('Local stream obtained:', stream.getTracks());
      localStreamRef.current = stream;
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
      loadMediaDevices();

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
    const stream = localStreamRef.current || localStream;
    if (stream) {
      const nextState = !isMuted;
      stream.getAudioTracks().forEach(track => {
        track.enabled = !nextState;
      });
      setIsMuted(nextState);
      message.info(nextState ? 'Microphone muted' : 'Microphone unmuted');
    }
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current || localStream;
    if (stream) {
      const nextState = !isVideoOff;
      stream.getVideoTracks().forEach(track => {
        track.enabled = !nextState;
      });
      setIsVideoOff(nextState);
      message.info(nextState ? 'Camera turned off' : 'Camera turned on');
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

  // Silent location capture (only auto-saves if high-precision GPS is detected, never coarse IP)
  const captureLocationSilently = async (locationType) => {
    if (!claimId || !navigator.geolocation) {
      return;
    }

    try {
      const pinpoint = await getPinpointLocation({
        targetAccuracy: 30,
        maxWaitTimeMs: 8000,
        coarseThreshold: 100
      });

      const { latitude, longitude, accuracy, isHighAccuracy } = pinpoint;

      // STRICT CHECK: Never silently save coarse IP / cell coordinates (accuracy > 50m)
      if (accuracy > 50) {
        console.log(`ℹ️ [Auto-Location] Skipping silent save for ${locationType}: Accuracy is ±${accuracy}m (coarse/network IP). Waiting for precise GPS or manual confirmation.`);
        return;
      }

      console.log('Auto-captured high-precision location on join:', {
        locationType,
        latitude,
        longitude,
        accuracy
      });

      // Get user info
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const locationUserName = locationType === 'doctor' ? user.name : userName;
      const token = locationType === 'doctor' ? user.token : null;

      // Save high-precision location to backend silently
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

      if (response && response.success) {
        console.log(`✅ ${locationType} high-precision location auto-saved:`, response.data);
      }
    } catch (error) {
      console.log('Silent location auto-capture skipped or unavailable:', error.message);
    }
  };

  const handleConfirmLocation = async ({ locationType, latitude, longitude, accuracy, address }) => {
    if (!claimId) {
      message.error('Claim ID not found');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const locationUserName = locationType === 'doctor' ? (user.name || userName || 'Doctor') : (userName || 'Patient');
    const token = locationType === 'doctor' ? user.token : null;

    const hideSaveMsg = message.loading(`💾 Saving verified ${locationType} location...`, 0);

    try {
      const response = await saveLocation(
        claimId,
        locationType,
        locationUserName,
        latitude,
        longitude,
        accuracy,
        address,
        token
      );

      hideSaveMsg();

      if (response && response.success) {
        message.success({
          content: `✅ ${locationType === 'doctor' ? 'Doctor' : 'Patient'} exact location verified & saved! (Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)})`,
          duration: 5,
        });

        // Notify room if patient confirmed location
        if (socket) {
          socket.emit('patient-location-updated', {
            roomId,
            location: response.data?.location || { latitude, longitude, accuracy, address }
          });
        }
      } else {
        message.error(response?.message || 'Failed to save location');
      }
    } catch (error) {
      hideSaveMsg();
      console.error('Error saving location:', error);
      message.error(error.message || 'Failed to save location');
    }
  };

  const captureLocation = async (locationType) => {
    if (!claimId) {
      message.error('Claim ID not found');
      return;
    }

    // Only Doctor has power to trigger/view locations
    if (locationType === 'patient') {
      if (socket) {
        socket.emit('request-patient-location', { roomId, claimId });
        message.loading({
          content: '📡 Fetching live GPS coordinates from Patient\'s device...',
          key: 'patLocReq',
          duration: 3
        });
      }
      return;
    }

    // Doctor location: open interactive picker for doctor
    setLocationModalType('doctor');
    setLocationModalCoords(null);
    setLocationModalVisible(true);
  };


  // Mobile device detection helper
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getDisplayMedia !== 'function';
  };

  // Best supported MediaRecorder MIME type for cross-browser & mobile iOS/Android support
  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  // Mix doctor microphone and remote audio into a single stream track
  const mixAudioTracks = (localStreamObj, remoteStreamObj) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
      const destination = audioContext.createMediaStreamDestination();
      let hasAudio = false;

      // Doctor audio track
      const localAudio = localStreamObj?.getAudioTracks() || [];
      if (localAudio.length > 0 && localAudio[0].enabled) {
        try {
          const source1 = audioContext.createMediaStreamSource(new MediaStream([localAudio[0]]));
          source1.connect(destination);
          hasAudio = true;
        } catch (e) {
          console.warn('Could not connect local audio to recorder context:', e);
        }
      }

      // Remote participant audio track
      const remoteAudio = remoteStreamObj?.getAudioTracks() || [];
      if (remoteAudio.length > 0 && remoteAudio[0].enabled) {
        try {
          const source2 = audioContext.createMediaStreamSource(new MediaStream([remoteAudio[0]]));
          source2.connect(destination);
          hasAudio = true;
        } catch (e) {
          console.warn('Could not connect remote audio to recorder context:', e);
        }
      }

      const mixedAudioTrack = destination.stream.getAudioTracks()[0] || null;
      return { mixedAudioTrack, audioContext, hasAudio };
    } catch (err) {
      console.warn('Audio mixing notice:', err);
      return { mixedAudioTrack: null, audioContext: null, hasAudio: false };
    }
  };

  // Draw video onto canvas preserving true aspect ratio (object-fit: cover behavior)
  const drawVideoCover = (ctx, video, dx, dy, dWidth, dHeight, mirror = false) => {
    if (!video || video.readyState < 2 || video.paused) return false;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return false;

    const targetAspect = dWidth / dHeight;
    const videoAspect = vw / vh;

    let sx = 0;
    let sy = 0;
    let sWidth = vw;
    let sHeight = vh;

    if (videoAspect > targetAspect) {
      // Video is wider than target container -> crop left/right edges
      sWidth = vh * targetAspect;
      sx = (vw - sWidth) / 2;
    } else if (videoAspect < targetAspect) {
      // Video is taller than target container -> crop top/bottom edges
      sHeight = vw / targetAspect;
      sy = (vh - sHeight) / 2;
    }

    ctx.save();
    if (mirror) {
      ctx.translate(dx + dWidth, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);
    } else {
      ctx.drawImage(video, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }
    ctx.restore();
    return true;
  };

  // Create real-time HTML5 Canvas call compositor for mobile & desktop call recording
  const createCallCanvasStream = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    let animationId = null;

    const drawFrame = () => {
      try {
        // 1. Fill base dark background
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Check which stream is in main view and which is in PiP
        const mainVid = !isSwapped ? remoteVideoRef.current : localVideoRef.current;
        const smallVid = isSwapped ? remoteVideoRef.current : localVideoRef.current;

        // 2. Draw main participant video preserving true natural proportions (1:1 pixel aspect ratio)
        const isMainMirrored = isSwapped && facingMode === 'user';
        const mainDrawn = drawVideoCover(ctx, mainVid, 0, 0, canvas.width, canvas.height, isMainMirrored);

        if (!mainDrawn) {
          // Placeholder when video stream is not active/rendering
          ctx.fillStyle = '#1f2937';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#9ca3af';
          ctx.font = 'bold 28px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            remoteUserName ? `${remoteUserName} (Patient Video Call)` : 'Live Video Call Session',
            canvas.width / 2,
            canvas.height / 2
          );
        }

        // 3. Draw PiP floating window in corner (9:16 portrait ratio, aspect ratio preserved)
        if (smallVid && smallVid.readyState >= 2 && !smallVid.paused) {
          const pipW = 200;
          const pipH = 355; // 9:16 portrait ratio (200 * 16 / 9)
          const pipX = canvas.width - pipW - 24;
          const pipY = canvas.height - pipH - 24;

          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8, 14);
          } else {
            ctx.rect(pipX - 4, pipY - 4, pipW + 8, pipH + 8);
          }
          ctx.fill();

          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(pipX, pipY, pipW, pipH, 12);
          } else {
            ctx.rect(pipX, pipY, pipW, pipH);
          }
          ctx.clip();

          const isSmallMirrored = !isSwapped && facingMode === 'user';
          drawVideoCover(ctx, smallVid, pipX, pipY, pipW, pipH, isSmallMirrored);
          ctx.restore();

          // PiP Border
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(pipX, pipY, pipW, pipH, 12);
          } else {
            ctx.rect(pipX, pipY, pipW, pipH);
          }
          ctx.stroke();

          // PiP Name Tag
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(pipX + 6, pipY + pipH - 26, pipW - 12, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = '11px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(
            !isSwapped ? (userName ? `Dr. ${userName}` : 'Doctor') : (remoteUserName || 'Patient'),
            pipX + 12,
            pipY + pipH - 12
          );
        }

        // 4. REC Watermark & Cloud Status
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(36, 36, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('REC • Azure Cloud', 52, 42);
      } catch (err) {
        console.warn('Canvas frame render notice:', err);
      }

      animationId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    const canvasStream = canvas.captureStream(30);

    const stopCanvas = () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    };

    return { canvasStream, stopCanvas };
  };

  const startRecording = async () => {
    if (!claimId) {
      message.error('Claim ID not found. Please refresh and try again.');
      return;
    }

    try {
      if (typeof MediaRecorder === 'undefined') {
        message.error('Video recording is not supported on this browser.');
        return;
      }

      let videoStream = null;
      let isDisplayMedia = false;
      const isMobile = isMobileDevice();

      // Desktop: attempt display media first if available
      if (!isMobile && navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        try {
          videoStream = await navigator.mediaDevices.getDisplayMedia({
            video: { mediaSource: 'screen' },
            audio: true
          });
          isDisplayMedia = true;
        } catch (screenErr) {
          console.warn('Screen share cancelled/failed, falling back to call canvas stream:', screenErr);
        }
      }

      // Mobile or fallback: use real-time HTML5 call compositor
      if (!videoStream) {
        const { canvasStream, stopCanvas } = createCallCanvasStream();
        videoStream = canvasStream;
        canvasRecordingCleanupRef.current = stopCanvas;
      }

      // Create a combined stream with video track and mixed audio
      const combinedStream = new MediaStream();

      // Add video track
      const videoTrack = videoStream.getVideoTracks()[0];
      if (videoTrack) {
        combinedStream.addTrack(videoTrack);
      }

      // Safely mix audio
      try {
        const { mixedAudioTrack, audioContext } = mixAudioTracks(
          localStreamRef.current || localStream,
          remoteStreamRef.current || remoteStream
        );
        recordingAudioContextRef.current = audioContext;

        if (mixedAudioTrack) {
          combinedStream.addTrack(mixedAudioTrack);
        } else {
          const directAudio = (localStreamRef.current || localStream)?.getAudioTracks()[0];
          if (directAudio) {
            combinedStream.addTrack(directAudio);
          }
        }
      } catch (audioErr) {
        console.warn('Audio mixing fallback notice:', audioErr);
        const directAudio = (localStreamRef.current || localStream)?.getAudioTracks()[0];
        if (directAudio) {
          combinedStream.addTrack(directAudio);
        }
      }

      // If screen share had audio track, include it too
      if (isDisplayMedia && videoStream.getAudioTracks().length > 0) {
        try {
          combinedStream.addTrack(videoStream.getAudioTracks()[0]);
        } catch (e) {}
      }

      // Determine best supported MIME type
      const mimeType = getSupportedMimeType();
      const recorderOptions = mimeType ? { mimeType } : undefined;

      console.log('Starting MediaRecorder with mimeType:', mimeType || 'browser default');

      mediaRecorderRef.current = new MediaRecorder(combinedStream, recorderOptions);
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const duration = Math.max(1, Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
        
        // Clean up tracks
        if (videoStream) {
          videoStream.getTracks().forEach(track => track.stop());
        }
        if (combinedStream) {
          combinedStream.getTracks().forEach(track => track.stop());
        }
        if (canvasRecordingCleanupRef.current) {
          canvasRecordingCleanupRef.current();
          canvasRecordingCleanupRef.current = null;
        }
        if (recordingAudioContextRef.current) {
          try {
            recordingAudioContextRef.current.close();
          } catch (e) {}
          recordingAudioContextRef.current = null;
        }

        try {
          await saveRecording(duration, mimeType);
        } finally {
          if (recordingStopPromiseRef.current) {
            recordingStopPromiseRef.current();
            recordingStopPromiseRef.current = null;
          }
        }
      };

      // Start recording with 1s timeslice
      mediaRecorderRef.current.start(1000);
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      message.success(isDisplayMedia ? '🔴 Screen recording started!' : '🔴 Call recording started (Auto-sync to Azure Blob Storage)');

      if (isDisplayMedia && videoTrack) {
        videoTrack.onended = () => {
          stopRecording();
        };
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      message.error('Failed to start recording: ' + (error.message || error.name || 'Unknown error'));
      if (canvasRecordingCleanupRef.current) {
        canvasRecordingCleanupRef.current();
        canvasRecordingCleanupRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      const stopPromise = new Promise((resolve) => {
        recordingStopPromiseRef.current = resolve;
      });

      try {
        if (mediaRecorderRef.current.state === 'recording') {
          try {
            mediaRecorderRef.current.requestData();
          } catch (e) {}
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }

      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      message.info('⏹️ Recording stopped. Uploading to Azure Blob Storage...');
      return stopPromise;
    }
    return Promise.resolve();
  };

  const saveRecording = async (duration, mimeType) => {
    if (recordedChunksRef.current.length === 0) {
      message.error('No recording data captured');
      return;
    }

    const hideMsg = message.loading('💾 Uploading recording to Microsoft Azure Blob Storage...', 0);

    try {
      const actualMime = mimeType || (recordedChunksRef.current[0] && recordedChunksRef.current[0].type) || 'video/webm';
      const fileExt = actualMime.includes('mp4') ? 'mp4' : 'webm';

      const blob = new Blob(recordedChunksRef.current, {
        type: actualMime
      });

      console.log('[Azure Blob] Preparing recording upload:', {
        size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        duration: `${duration}s`,
        mimeType: actualMime,
        claimId
      });

      // Get user token
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = user.token;

      // Upload recording with appropriate file extension
      const response = await uploadRecording(claimId, blob, duration, token, fileExt);

      hideMsg();

      if (response.success) {
        const azureLink = response.data?.azureUrl || response.data?.recording?.path;
        console.log('[Azure Blob] Upload successful! Link:', azureLink);
        message.success({
          content: `✅ Recording uploaded to Azure Blob Storage & attached to Claim ${response.data?.claimId || claimId}! (${(blob.size / 1024 / 1024).toFixed(2)} MB, ${duration}s)`,
          duration: 6,
        });
      }

      // Clear recorded chunks
      recordedChunksRef.current = [];
      setRecordingDuration(0);
    } catch (error) {
      hideMsg();
      console.error('[Azure Blob] Error saving recording:', error);
      message.error({
        content: 'Failed to upload recording to Azure: ' + (error.message || 'Unknown error'),
        duration: 5,
      });
    }
  };

  const leaveMeeting = async () => {
    // If recording is active, cleanly stop and await Azure upload before navigating!
    if (isRecording) {
      const hideUpload = message.loading('💾 Finalizing & uploading recording to Azure Blob before exiting...', 0);
      try {
        await stopRecording();
      } catch (e) {
        console.warn('Error during exit recording save:', e);
      } finally {
        hideUpload();
      }
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

    // If doctor, broadcast end-meeting, mark completed via backend, and navigate to claim form
    if (role === 'doctor' && roomId) {
      if (socket) {
        socket.emit('end-meeting', { roomId });
      }

      try {
        console.log(`\n📞 === LEAVING MEETING (Doctor) ===`);
        console.log(`Room ID: ${roomId}`);
        console.log(`Claim ID: ${claimId}`);

        const response = await completeMeetingByRoomId(roomId);
        console.log('✅ API Response:', response);

        if (response.success && response.data) {
          message.success('Meeting marked as completed!');
        }
      } catch (error) {
        console.error('❌ Error completing meeting:', error);
      }

      if (socket) {
        socket.disconnect();
      }

      if (claimId) {
        navigate(`/claim-form?claimId=${claimId}`);
      } else {
        navigate('/home');
      }
      return;
    }

    // If patient or non-doctor, cleanly exit and show completion screen (NEVER redirect to /home or /login)
    if (socket) {
      socket.disconnect();
    }
    setHasLeft(true);
  };

  // 1. If currently verifying meeting validity
  if (checkingStatus) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f8fafc',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: '16px', color: '#64748b', fontSize: '15px', fontWeight: 500 }}>
            Verifying video consultation session...
          </Text>
        </div>
      </div>
    );
  }

  // 2. If meeting link is expired or participant has left
  if (isExpired || hasLeft) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #f1f5f9 100%)',
        padding: '20px',
      }}>
        <Card style={{
          maxWidth: 500,
          width: '100%',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
          padding: '28px 16px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
            <img src={Logo} alt="Saturn Health Investigation Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }} />
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', letterSpacing: '0.4px', marginTop: '8px' }}>
              Saturn Health Investigation
            </span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: hasLeft ? '#eff6ff' : '#fef2f2',
            color: hasLeft ? '#2563eb' : '#dc2626',
            padding: '6px 18px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
            border: `1px solid ${hasLeft ? '#bfdbfe' : '#fecaca'}`,
          }}>
            {hasLeft ? 'ℹ️ Session Concluded' : '🔒 Session Completed / Link Expired'}
          </div>

          <Title level={3} style={{ color: '#0f172a', marginBottom: '12px', fontWeight: 700 }}>
            {hasLeft ? 'You Have Left the Call' : 'Meeting Link Expired'}
          </Title>

          <Text style={{ display: 'block', marginBottom: '24px', color: '#475569', fontSize: '15px', lineHeight: 1.6 }}>
            {expiredReason || (hasLeft
              ? 'Thank you for attending the video verification. Your session has ended successfully.'
              : 'This video meeting link has already been used and completed. For security and privacy, patient meeting links are strictly single-use and cannot be reopened.')}
          </Text>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '24px',
            textAlign: 'left',
          }}>
            <Text style={{ fontSize: '13px', color: '#64748b', display: 'block', lineHeight: 1.5 }}>
              🛡️ <strong>Security Verification:</strong> This session was securely recorded and linked to your verification claim. If you need any assistance, please reach out to your hospital representative or insurance team.
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            block
            onClick={() => {
              window.close();
              message.info('You may now safely close this browser tab.');
            }}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '10px',
              height: '48px',
              fontWeight: 600,
              fontSize: '15px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
            }}
          >
            Close This Tab
          </Button>
        </Card>
      </div>
    );
  }

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
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
            <img src={Logo} alt="Saturn Health Investigation Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '12px' }} />
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', letterSpacing: '0.4px', marginTop: '8px' }}>
              Saturn Health Investigation
            </span>
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
      {/* Full Screen Video (Background) */}
      {(!isSwapped ? remoteStream : localStream) ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#111827',
          zIndex: 1,
        }}>
          <video
            ref={!isSwapped ? remoteVideoRef : localVideoRef}
            autoPlay
            playsInline
            muted={isSwapped} // Always mute local stream when in fullscreen
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: (!isSwapped ? 'none' : (facingMode === 'user' ? 'scaleX(-1)' : 'none')),
            }}
          />
          {/* Main Video Participant Label */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 5,
          }}>
            <span>
              {!isSwapped
                ? `🟢 ${remoteUserName || (role === 'doctor' ? 'Patient' : 'Doctor')}`
                : `You (${userName})`}
            </span>
            {isSwapped && isMuted && (
              <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '12px' }}>🔇 Muted</span>
            )}
          </div>

          {/* Capture Patient Image Button (when doctor) */}
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
                zIndex: 5,
              }}
            >
              Capture Patient Image
            </Button>
          )}
        </div>
      ) : (
        /* Waiting for Other User */
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
              {role === 'doctor' ? 'Waiting for patient to join...' : 'Waiting for doctor to join...'}
            </Text>
          </div>
        </div>
      )}

      {/* Picture-in-Picture Floating Window (Draggable WhatsApp-style Dimensions) */}
      <div 
        ref={pipRef}
        className="local-pip-container"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handlePipClick}
        style={{
          position: 'fixed',
          ...(pipPosition
            ? { left: `${pipPosition.x}px`, top: `${pipPosition.y}px`, right: 'auto', bottom: 'auto' }
            : { bottom: '100px', right: '20px' }),
          width: 'clamp(120px, 16vw, 190px)',
          aspectRatio: '9 / 16',
          background: '#111827',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: isDragging
            ? '0 20px 48px rgba(0, 0, 0, 0.85), 0 0 0 2px rgba(16, 185, 129, 0.8)'
            : '0 12px 36px rgba(0, 0, 0, 0.65), 0 0 0 1.5px rgba(255, 255, 255, 0.25)',
          zIndex: 25,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
          transform: isDragging ? 'scale(1.03)' : 'scale(1)',
          transition: isDragging
            ? 'box-shadow 0.15s ease, transform 0.15s ease'
            : 'box-shadow 0.2s ease, transform 0.2s ease, left 0.05s ease, top 0.05s ease',
        }}
        title="Drag anywhere • Tap to swap view"
      >
        {/* Subtle WhatsApp-style Drag Handle Bar */}
        <div style={{
          position: 'absolute',
          top: '6px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '32px',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.55)',
          borderRadius: '2px',
          zIndex: 12,
          pointerEvents: 'none',
        }} />

        {/* Video Element inside Floating Window */}
        <video
          ref={isSwapped ? remoteVideoRef : localVideoRef}
          autoPlay
          playsInline
          muted={!isSwapped} // Local video is muted, remote video plays audio
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: (isSwapped ? 'none' : (facingMode === 'user' ? 'scaleX(-1)' : 'none')),
            pointerEvents: 'none',
          }}
        />

        {/* Floating Window Action Header (Swap, Switch Camera, Capture) */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '8px',
          right: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 11,
          pointerEvents: 'auto',
        }}>
          {/* Swap View Button */}
          <Button
            icon={<SwapOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setIsSwapped(prev => !prev);
            }}
            size="small"
            style={{
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              padding: 0,
            }}
            title="Swap small and fullscreen view"
          />

          <div style={{ display: 'flex', gap: '6px' }}>
            {/* Quick Flip Camera Button (when showing local stream in PiP) */}
            {!isSwapped && (
              <Button
                icon={<SyncOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  switchCamera();
                }}
                size="small"
                style={{
                  position: 'relative',
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  padding: 0,
                }}
                title="Switch camera"
              />
            )}

            {/* Doctor Capture Button directly on PiP */}
            {role === 'doctor' && (
              <Button
                icon={<CameraOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSwapped) {
                    captureImage(localVideoRef, 'doctor');
                  } else {
                    captureImage(remoteVideoRef, 'patient');
                  }
                }}
                loading={capturing}
                size="small"
                style={{
                  background: 'rgba(16, 185, 129, 0.9)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '11px',
                  padding: '2px 8px',
                  height: '28px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                }}
                title={!isSwapped ? 'Capture Doctor Image' : 'Capture Patient Image'}
              />
            )}
          </div>
        </div>

        {/* Floating Window Label */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          right: '8px',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}>
            {isSwapped
              ? (remoteUserName || (role === 'doctor' ? 'Patient' : 'Doctor'))
              : `You (${userName || 'Me'})`}
          </span>
          {!isSwapped && isMuted && (
            <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '10px', marginLeft: '4px' }}>
              🔇
            </span>
          )}
        </div>
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

      {/* Controls - Bottom Fixed Single Row (WhatsApp style) */}
      <div
        className="video-controls-container"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(24, 24, 27, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '50px',
          padding: '10px 18px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          zIndex: 20,
          maxWidth: 'calc(100vw - 24px)',
          overflowX: 'auto',
        }}>
        <Button
          className="video-control-btn"
          icon={isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
          onClick={toggleMute}
          style={{
            background: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            border: isMuted ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
          }}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        />

        <Button
          className="video-control-btn"
          icon={<VideoCameraOutlined />}
          onClick={toggleVideo}
          style={{
            background: isVideoOff ? '#ef4444' : 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            border: isVideoOff ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
          }}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        />

        <Button
          className="video-control-btn"
          icon={<SyncOutlined />}
          onClick={switchCamera}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
          title="Switch / Flip Camera"
        />

        {role === 'doctor' && (
          <>
            <Button
              className="video-control-btn-pill"
              icon={isRecording ? <StopOutlined /> : <PlayCircleOutlined />}
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                background: isRecording ? '#ef4444' : '#dc2626',
                color: '#ffffff',
                animation: isRecording ? 'pulse 1.5s infinite' : 'none',
              }}
              title="Record Meeting"
            >
              {isRecording ? `Stop (${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')})` : 'Record'}
            </Button>
            <Button
              className="video-control-btn-pill"
              icon={<EnvironmentOutlined />}
              onClick={() => captureLocation('doctor')}
              style={{
                background: '#f59e0b',
                color: '#ffffff',
              }}
              title="My Location"
            >
              My Location
            </Button>
            <Button
              className="video-control-btn-pill"
              icon={<EnvironmentOutlined />}
              onClick={() => captureLocation('patient')}
              style={{
                background: '#ec4899',
                color: '#ffffff',
              }}
              title="Patient Location"
            >
              Patient Location
            </Button>
          </>
        )}

        <Button
          className="video-control-btn"
          icon={<SettingOutlined />}
          onClick={() => {
            loadMediaDevices();
            setShowSettingsModal(true);
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
          title="Audio & Video Settings"
        />

        <Button
          className="video-control-btn btn-leave"
          danger
          icon={<PhoneOutlined style={{ transform: 'rotate(135deg)' }} />}
          onClick={leaveMeeting}
          style={{
            background: '#dc2626',
            color: '#ffffff',
            border: 'none',
          }}
          title="Leave Meeting"
        />
      </div>

      {/* Audio & Device Settings Modal */}
      <Modal
        title="⚙️ Audio & Video Settings"
        open={showSettingsModal}
        onOk={() => setShowSettingsModal(false)}
        onCancel={() => setShowSettingsModal(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setShowSettingsModal(false)}>
            Done
          </Button>
        ]}
      >
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: '6px' }}>
              📷 Select Camera:
            </Text>
            <Select
              style={{ width: '100%' }}
              value={selectedVideoInput}
              onChange={switchVideoDevice}
              placeholder="Select your camera"
            >
              {videoInputDevices.map((dev, idx) => (
                <Select.Option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label || `Camera ${idx + 1}`}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: '6px' }}>
              🎤 Select Microphone:
            </Text>
            <Select
              style={{ width: '100%' }}
              value={selectedAudioInput}
              onChange={switchMicrophone}
              placeholder="Select your microphone"
            >
              {audioInputDevices.map((dev, idx) => (
                <Select.Option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label || `Microphone ${idx + 1}`}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: '6px' }}>
              🔊 Select Speaker / Output:
            </Text>
            <Select
              style={{ width: '100%' }}
              value={selectedAudioOutput}
              onChange={switchSpeaker}
              placeholder="Select speaker output"
            >
              {audioOutputDevices.map((dev, idx) => (
                <Select.Option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label || `Speaker ${idx + 1}`}
                </Select.Option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
      {/* Location Picker & Verification Modal */}
      <LocationPickerModal
        visible={locationModalVisible}
        locationType={locationModalType}
        initialCoords={locationModalCoords}
        userName={userName}
        onClose={() => setLocationModalVisible(false)}
        onConfirm={handleConfirmLocation}
      />
    </div>
  );
};

export default VideoCall;

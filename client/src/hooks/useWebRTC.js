import { useState, useRef, useCallback } from 'react';
import { RTC_CONFIG } from '../utils/constants';

export const useWebRTC = (socket) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnection = useRef(null);
  const pendingCandidates = useRef([]);

  const initLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get local stream', err);
      return null;
    }
  }, []);

  const createPeerConnection = useCallback((isInitiator, currentLocalStream) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    
    currentLocalStream.getTracks().forEach(track => {
      pc.addTrack(track, currentLocalStream);
    });

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc_ice_candidate', event.candidate);
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc_offer', offer);
        } catch (err) {
          console.error('Error creating offer', err);
        }
      };
    }

    peerConnection.current = pc;
    return pc;
  }, [socket]);

  const handleOffer = useCallback(async (offer, currentLocalStream) => {
    if (!peerConnection.current) {
      createPeerConnection(false, currentLocalStream);
    }
    const pc = peerConnection.current;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc_answer', answer);
    
    pendingCandidates.current.forEach(async (candidate) => {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
    pendingCandidates.current = [];
  }, [createPeerConnection, socket]);

  const handleAnswer = useCallback(async (answer) => {
    if (!peerConnection.current) return;
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    
    pendingCandidates.current.forEach(async (candidate) => {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    });
    pendingCandidates.current = [];
  }, []);

  const handleIceCandidate = useCallback(async (candidate) => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) {
      pendingCandidates.current.push(candidate);
      return;
    }
    try {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error adding ICE candidate', err);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    pendingCandidates.current = [];
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    initLocalStream,
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    cleanup
  };
};
const fs = require('fs');
const path = require('path');

const files = {
  // 1. UTILS & CONSTANTS
  'client/src/utils/constants.js': `
export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const CHAT_STATES = {
  IDLE: 'IDLE',
  WAITING: 'WAITING',
  CHATTING: 'CHATTING',
  DISCONNECTED: 'DISCONNECTED'
};

export const SOCKET_EVENTS = {
  LOGIN: 'direct_login',
  LOGIN_SUCCESS: 'login_success',
  AUTH_ERROR: 'auth_error',
  FIND_PARTNER: 'find_partner',
  WAITING: 'waiting',
  MATCH_FOUND: 'match_found',
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  PARTNER_DISCONNECTED: 'partner_disconnected',
  WEBRTC_OFFER: 'webrtc_offer',
  WEBRTC_ANSWER: 'webrtc_answer',
  WEBRTC_ICE: 'webrtc_ice_candidate'
};
`,

  // 2. CUSTOM HOOKS
  'client/src/hooks/useWebRTC.js': `
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
`,

  // 3. UI COMPONENTS
  'client/src/components/ui/Button.jsx': `
import { motion } from 'framer-motion';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-white text-black hover:bg-accent shadow-lg",
    secondary: "bg-surface text-white border border-border hover:bg-border/50",
    danger: "bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/60",
    icon: "p-2 text-muted hover:text-white transition-colors"
  };

  return (
    <motion.button whileTap={{ scale: 0.98 }} className={\`\${baseStyle} \${variants[variant]} \${className}\`} {...props}>
      {children}
    </motion.button>
  );
};
`,

  'client/src/components/ui/Input.jsx': `
export const Input = ({ label, id, error, ...props }) => {
  return (
    <div className="relative group w-full">
      <input
        id={id}
        className="w-full bg-transparent border-b border-border py-3 text-white placeholder-transparent focus:outline-none focus:border-accent transition-colors peer"
        placeholder={label}
        {...props}
      />
      <label
        htmlFor={id}
        className="absolute left-0 top-3 text-muted text-sm pointer-events-none transition-all peer-focus:-top-4 peer-focus:text-xs peer-focus:text-accent peer-valid:-top-4 peer-valid:text-xs"
      >
        {label}
      </label>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
};
`,

  // 4. CHAT COMPONENTS
  'client/src/components/chat/MessageList.jsx': `
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

export const MessageList = ({ messages, isTyping }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar space-y-4">
      <AnimatePresence>
        {messages.map((m) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={m.id}
            className={\`flex flex-col \${m.sender === 'you' ? 'items-end' : m.sender === 'system' ? 'items-center' : 'items-start'}\`}
          >
            {m.sender === 'system' ? (
              <span className="text-[10px] tracking-widest uppercase text-muted border border-border/50 px-3 py-1 rounded-full bg-surface">
                {m.text}
              </span>
            ) : (
              <>
                <span className="text-[10px] text-muted mb-1 px-1">
                  {m.sender === 'you' ? 'You' : 'Stranger'}
                </span>
                <div
                  className={\`max-w-[85%] px-4 py-2 lg:py-3 text-sm leading-relaxed \${
                    m.sender === 'you'
                      ? 'bg-white text-black rounded-2xl rounded-tr-sm'
                      : 'bg-surface border border-border text-white rounded-2xl rounded-tl-sm'
                  }\`}
                >
                  {m.text}
                </div>
              </>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      {isTyping && (
        <div className="text-[10px] tracking-widest uppercase text-accent animate-pulse">
          Stranger is typing...
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};
`,

  'client/src/components/chat/ChatInput.jsx': `
import { useState } from 'react';
import { Send } from 'lucide-react';

export const ChatInput = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="p-3 lg:p-4 border-t border-border/50 bg-surface shrink-0">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? "Waiting for connection..." : "Type message..."}
          className="w-full bg-base border border-border rounded-full py-2 lg:py-3 pl-5 pr-12 text-xs lg:text-sm focus:outline-none focus:border-accent disabled:opacity-50 transition-colors placeholder:text-muted"
        />
        <button
          disabled={disabled}
          type="submit"
          className="absolute right-1.5 p-1.5 lg:right-2 lg:p-2 bg-accent text-black rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          <Send size={14} className="lg:w-4 lg:h-4" />
        </button>
      </form>
    </div>
  );
};
`,

  // 5. VIDEO COMPONENTS
  'client/src/components/video/VideoStage.jsx': `
import { useEffect, useRef } from 'react';
import { CHAT_STATES } from '../../utils/constants';
import { Loader2 } from 'lucide-react';

const VideoElement = ({ stream, muted = false, label }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-surface rounded-2xl border border-border overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={\`w-full h-full object-cover \${muted ? 'scale-x-[-1]' : ''}\`}
      />
      <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-md text-[10px] tracking-wider uppercase text-white">
        {label}
      </div>
    </div>
  );
};

export const VideoStage = ({ chatState, localStream, remoteStream, onStart, isMobile }) => {
  return (
    <div className="flex-1 relative flex flex-col min-h-0 bg-base">
      {/* Remote Stream (Takes up main space) */}
      <div className="flex-1 relative rounded-2xl overflow-hidden">
        <VideoElement stream={remoteStream} label="Remote" />
        
        {/* Overlay for IDLE / WAITING states */}
        {chatState !== CHAT_STATES.CHATTING && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 rounded-2xl">
            {chatState === CHAT_STATES.WAITING ? (
              <div className="flex flex-col items-center gap-4 text-accent">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-xs tracking-widest uppercase">Scanning network</p>
              </div>
            ) : (
              <button 
                onClick={onStart} 
                className="bg-white text-black px-8 py-3.5 rounded-xl font-semibold hover:bg-accent transition-colors shadow-2xl z-30"
              >
                Initialize Match
              </button>
            )}
          </div>
        )}

        {/* Local Video (PiP mode only when stream exists) */}
        {localStream && (
          <div className="absolute top-4 right-4 w-24 h-32 lg:w-48 lg:h-64 bg-black rounded-xl border border-border overflow-hidden shadow-2xl z-20">
            <VideoElement stream={localStream} muted={true} label="You" />
          </div>
        )}
      </div>
    </div>
  );
};
`,

  // 6. LAYOUTS & PAGES
  'client/src/pages/ChatRoom.jsx': `
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../App';
import { CHAT_STATES } from '../utils/constants';
import { useWebRTC } from '../hooks/useWebRTC';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { VideoStage } from '../components/video/VideoStage';
import { Button } from '../components/ui/Button';
import { AlertTriangle, LogOut } from 'lucide-react';

export default function ChatRoom({ user }) {
  const socket = useSocket();
  const [chatState, setChatState] = useState(CHAT_STATES.IDLE);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const {
    localStream,
    remoteStream,
    initLocalStream,
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    cleanup
  } = useWebRTC(socket);

  const appendMessage = useCallback((text, sender) => {
    setMessages(prev => [...prev, { text, sender, id: Date.now() }]);
  }, []);

  const startSearch = async () => {
    const stream = localStream || await initLocalStream();
    if (!stream) return alert('Camera access is required for video calls.');

    setMessages([]);
    setChatState(CHAT_STATES.WAITING);
    socket.emit('find_partner', 'video');
  };

  useEffect(() => {
    socket.on('waiting', () => appendMessage('Searching for a verified student...', 'system'));
    
    socket.on('match_found', async (data) => {
      setChatState(CHAT_STATES.CHATTING);
      appendMessage(\`Connected with \${data.batch} \${data.branch}.\`, 'system');
      if (data.initiator && localStream) {
        createPeerConnection(true, localStream);
      }
    });

    socket.on('partner_disconnected', () => {
      cleanup();
      appendMessage('Peer disconnected.', 'system');
      setChatState(CHAT_STATES.IDLE);
    });

    socket.on('receive_message', (text) => {
      setIsTyping(false);
      appendMessage(text, 'stranger');
    });

    socket.on('partner_typing', (typing) => setIsTyping(typing));

    socket.on('webrtc_offer', (offer) => handleOffer(offer, localStream));
    socket.on('webrtc_answer', (answer) => handleAnswer(answer));
    socket.on('webrtc_ice_candidate', (candidate) => handleIceCandidate(candidate));

    return () => {
      socket.off();
      cleanup();
    };
  }, [localStream, appendMessage, handleOffer, handleAnswer, handleIceCandidate, cleanup, createPeerConnection, socket]);

  const handleSend = (text) => {
    appendMessage(text, 'you');
    socket.emit('send_message', text);
    socket.emit('typing', false);
  };

  const handleTyping = (e) => {
    if (chatState === CHAT_STATES.CHATTING) {
      socket.emit('typing', e.target.value.length > 0);
    }
  };

  const handleReport = () => {
    if (chatState !== CHAT_STATES.CHATTING) return;
    socket.emit('report_partner', 'Reported by user');
    cleanup();
    appendMessage('Student flagged and disconnected.', 'system');
    setChatState(CHAT_STATES.IDLE);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col lg:flex-row bg-base text-white overflow-hidden">
      
      {/* Header & Video Area (Left / Top) */}
      <div className="flex-1 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-border/50">
        
        {/* Topbar */}
        <div className="flex justify-between items-center p-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-serif italic text-xl lg:text-2xl">CampusLink.</span>
            <span className="hidden sm:inline-block text-[10px] font-medium tracking-widest uppercase text-muted border border-border px-3 py-1 rounded-full">
              {user?.batch} / {user?.branch}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="icon" onClick={handleReport} className="hover:text-red-400">
              <AlertTriangle size={18} />
            </Button>
            <Button variant="icon" onClick={() => { localStorage.removeItem('campuslink_token'); window.location.reload(); }}>
              <LogOut size={18} />
            </Button>
          </div>
        </div>

        {/* Video Streams */}
        <div className="flex-1 px-4 pb-4 min-h-0">
          <VideoStage 
            chatState={chatState} 
            localStream={localStream} 
            remoteStream={remoteStream} 
            onStart={startSearch} 
          />
        </div>
      </div>

      {/* Chat Area (Right / Bottom) */}
      <div className="w-full lg:w-96 h-[45vh] lg:h-auto flex flex-col bg-base shrink-0 z-30">
        <div className="p-3 lg:p-6 border-b border-border/50 shrink-0">
          <h2 className="text-sm lg:text-lg font-serif">Transmission log</h2>
        </div>
        
        <MessageList messages={messages} isTyping={isTyping} />
        
        <ChatInput 
          onSend={handleSend} 
          disabled={chatState !== CHAT_STATES.CHATTING} 
          onTyping={handleTyping}
        />
      </div>
    </div>
  );
}
`
};

for (const [file, content] of Object.entries(files)) {
  const fullPath = path.join(__dirname, file);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content.trim());
  console.log('✅ Generated:', file);
}
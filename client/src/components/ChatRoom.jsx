import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, AlertTriangle, LogOut } from 'lucide-react';

const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function ChatRoom({ user }) {
  const socket = useSocket();
  const [chatState, setChatState] = useState('IDLE');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const chatBoxRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    socket.on('waiting', () => appendSystemMessage('Searching for a verified student...'));
    socket.on('match_found', async (data) => {
      setChatState('CHATTING');
      appendSystemMessage(`Connected with ${data.batch} ${data.branch}.`);
      if (data.mode === 'video' && localStream.current) await setupPeerConnection(data.initiator);
    });
    socket.on('partner_disconnected', () => { closeWebRTC(); appendSystemMessage('Peer disconnected.'); setChatState('IDLE'); });
    socket.on('receive_message', (text) => { setIsTyping(false); appendMessage(text, 'stranger'); });
    socket.on('partner_typing', (typing) => setIsTyping(typing));

    socket.on('webrtc_offer', async (offer) => {
      if (!peerConnection.current) return;
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit('webrtc_answer', answer);
    });
    socket.on('webrtc_answer', async (answer) => { if (peerConnection.current) await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer)); });
    socket.on('webrtc_ice_candidate', async (candidate) => { if (peerConnection.current) await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate)); });

    return () => { socket.off(); closeWebRTC(); if (localStream.current) localStream.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const appendMessage = (text, sender) => {
    setMessages(prev => [...prev, { text, sender, id: Date.now() }]);
    setTimeout(() => { if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight; }, 50);
  };

  const appendSystemMessage = (text) => {
    setMessages(prev => [...prev, { text, sender: 'system', id: Date.now() }]);
    setTimeout(() => { if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight; }, 50);
  };

  const startSearch = async () => {
    if (!localStream.current) {
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;
      } catch (err) { appendSystemMessage('Camera denied. Text-only mode active.'); }
    }
    setMessages([]); setChatState('WAITING'); socket.emit('find_partner', 'video');
  };

  const setupPeerConnection = async (isInitiator) => {
    peerConnection.current = new RTCPeerConnection(rtcConfig);
    localStream.current.getTracks().forEach(track => peerConnection.current.addTrack(track, localStream.current));
    peerConnection.current.ontrack = (event) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };
    peerConnection.current.onicecandidate = (event) => { if (event.candidate) socket.emit('webrtc_ice_candidate', event.candidate); };
    if (isInitiator) {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit('webrtc_offer', offer);
    }
  };

  const closeWebRTC = () => { if (peerConnection.current) { peerConnection.current.close(); peerConnection.current = null; } if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null; };

  const sendMessage = (e) => {
    e.preventDefault(); if (!input.trim() || chatState !== 'CHATTING') return;
    appendMessage(input, 'you'); socket.emit('send_message', input); setInput(''); socket.emit('typing', false);
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (chatState === 'CHATTING') {
      socket.emit('typing', true); clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => socket.emit('typing', false), 1200);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-screen w-full flex bg-base text-white">
      <div className="flex-1 relative flex flex-col p-6 border-r border-border/50">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <span className="font-serif italic text-2xl">CampusLink.</span>
            <span className="text-xs font-medium tracking-widest uppercase text-muted border border-border px-3 py-1 rounded-full">{user?.batch} / {user?.branch}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { socket.emit('report_partner', 'Reported'); closeWebRTC(); setChatState('IDLE'); }} className="p-2 text-muted hover:text-red-400 transition-colors"><AlertTriangle size={18} /></button>
            <button onClick={() => { localStorage.removeItem('campuslink_token'); window.location.reload(); }} className="p-2 text-muted hover:text-white transition-colors"><LogOut size={18} /></button>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-[2] bg-surface rounded-2xl border border-border overflow-hidden relative">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {chatState !== 'CHATTING' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                {chatState === 'WAITING' ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm tracking-widest uppercase text-accent">Scanning network</p>
                  </div>
                ) : (
                  <button onClick={startSearch} className="bg-white text-black px-8 py-3 rounded-full font-medium hover:bg-accent transition-colors">Initialize Match</button>
                )}
              </div>
            )}
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-md text-xs tracking-wider uppercase">Remote</div>
          </div>
          <div className="flex-1 bg-surface rounded-2xl border border-border overflow-hidden relative">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-md text-xs tracking-wider uppercase">You</div>
          </div>
        </div>
      </div>

      <div className="w-96 flex flex-col bg-base">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-lg font-serif">Transmission log</h2>
        </div>
        <div ref={chatBoxRef} className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={m.id} className={`flex flex-col ${m.sender === 'you' ? 'items-end' : m.sender === 'system' ? 'items-center' : 'items-start'}`}>
                {m.sender === 'system' ? (
                  <span className="text-[10px] tracking-widest uppercase text-muted border border-border/50 px-3 py-1 rounded-full">{m.text}</span>
                ) : (
                  <>
                    <span className="text-[10px] text-muted mb-1 px-1">{m.sender === 'you' ? 'You' : 'Stranger'}</span>
                    <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${m.sender === 'you' ? 'bg-white text-black rounded-2xl rounded-tr-sm' : 'bg-surface border border-border text-white rounded-2xl rounded-tl-sm'}`}>{m.text}</div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && <div className="text-[10px] tracking-widest uppercase text-accent animate-pulse">Stranger is typing</div>}
        </div>
        <div className="p-4 border-t border-border/50 bg-surface">
          <form onSubmit={sendMessage} className="relative flex items-center">
            <input type="text" value={input} onChange={handleTyping} disabled={chatState !== 'CHATTING'} placeholder={chatState === 'CHATTING' ? "Type message..." : "Waiting for connection..."} className="w-full bg-base border border-border rounded-full py-3 pl-5 pr-12 text-sm focus:outline-none focus:border-accent disabled:opacity-50 transition-colors placeholder:text-muted" />
            <button disabled={chatState !== 'CHATTING'} type="submit" className="absolute right-2 p-2 bg-accent text-black rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"><Send size={16} /></button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
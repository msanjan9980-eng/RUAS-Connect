const fs = require('fs');
const p = require('path');

const files = {
  'src/App.jsx': `import { useState, useEffect, createContext, useContext } from 'react';
import { io } from 'socket.io-client';
import { AnimatePresence } from 'framer-motion';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';
import AdminDashboard from './components/AdminDashboard';

export const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);
const socket = io('http://localhost:3000');

export default function App() {
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);

  useEffect(() => {
    socket.on('login_success', (data) => { setUser(data.studentInfo); setScreen('chat'); });
    socket.on('admin_authenticated', () => setScreen('admin'));
    socket.on('force_logout', (reason) => { alert(reason); setScreen('login'); setUser(null); });
    const savedToken = localStorage.getItem('campuslink_token');
    if (savedToken) socket.emit('resume_session', savedToken);
    return () => socket.off();
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      <div className="noise-bg"></div>
      <AnimatePresence mode="wait">
        {screen === 'login' && <Login key="login" />}
        {screen === 'chat' && <ChatRoom key="chat" user={user} />}
        {screen === 'admin' && <AdminDashboard key="admin" />}
      </AnimatePresence>
    </SocketContext.Provider>
  );
}`,
  'src/components/Login.jsx': `import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../App';
import { ArrowRight } from 'lucide-react';

export default function Login() {
  const socket = useSocket();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    socket.emit('direct_login', { email, password });
    socket.once('auth_error', (msg) => { setError(msg); setLoading(false); });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-screen w-full flex bg-base relative overflow-hidden">
      <div className="hidden lg:flex w-1/2 relative border-r border-border/50 flex-col justify-between p-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="relative z-10">
          <div className="w-10 h-10 border border-white/20 flex items-center justify-center rounded-md">
            <span className="font-serif italic text-xl">CL</span>
          </div>
        </div>
        <div className="relative z-10 pb-12">
          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }} className="text-[5.5rem] leading-[0.9] font-serif text-white tracking-tight">
            The campus <br/> <span className="italic text-muted">lounge,</span> <br/> curated.
          </motion.h1>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="text-muted mt-8 max-w-sm text-sm leading-relaxed">
            A private, real-time video and text network exclusively for the 25-batch. Verified access only.
          </motion.p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }} className="w-full max-w-sm">
          <div className="mb-12 lg:hidden">
            <div className="w-10 h-10 border border-white/20 flex items-center justify-center rounded-md">
              <span className="font-serif italic text-xl">CL</span>
            </div>
          </div>
          <h2 className="text-3xl font-serif mb-2 text-white">Authentication.</h2>
          <p className="text-muted text-sm mb-10">Enter your credentials to access the network.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <input type="email" required className="w-full bg-transparent border-b border-border py-3 text-white placeholder-transparent focus:outline-none focus:border-accent transition-colors peer" placeholder="Email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <label htmlFor="email" className="absolute left-0 top-3 text-muted text-sm pointer-events-none transition-all peer-focus:-top-4 peer-focus:text-xs peer-focus:text-accent peer-valid:-top-4 peer-valid:text-xs">Student Email</label>
            </div>
            <div className="relative group">
              <input type="password" required minLength={6} className="w-full bg-transparent border-b border-border py-3 text-white placeholder-transparent focus:outline-none focus:border-accent transition-colors peer" placeholder="Password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <label htmlFor="password" className="absolute left-0 top-3 text-muted text-sm pointer-events-none transition-all peer-focus:-top-4 peer-focus:text-xs peer-focus:text-accent peer-valid:-top-4 peer-valid:text-xs">Password</label>
            </div>
            {error && <p className="text-red-400 text-xs font-medium tracking-wide">{error}</p>}
            <button disabled={loading} type="submit" className="mt-8 w-full bg-white text-black hover:bg-accent transition-all duration-300 font-medium text-sm py-4 rounded-full flex items-center justify-center gap-2 group">
              {loading ? 'Verifying...' : (<><span>Enter Lounge</span><ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>)}
            </button>
          </form>
          <div className="mt-12 flex items-center justify-between text-[11px] text-muted tracking-wider uppercase">
            <span>Secured by MSRUAS</span>
            <span>2026 &copy; CampusLink</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}`,
  'src/components/ChatRoom.jsx': `import { useState, useEffect, useRef } from 'react';
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
      appendSystemMessage(\`Connected with \${data.batch} \${data.branch}.\`);
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
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={m.id} className={\`flex flex-col \${m.sender === 'you' ? 'items-end' : m.sender === 'system' ? 'items-center' : 'items-start'}\`}>
                {m.sender === 'system' ? (
                  <span className="text-[10px] tracking-widest uppercase text-muted border border-border/50 px-3 py-1 rounded-full">{m.text}</span>
                ) : (
                  <>
                    <span className="text-[10px] text-muted mb-1 px-1">{m.sender === 'you' ? 'You' : 'Stranger'}</span>
                    <div className={\`max-w-[85%] px-4 py-3 text-sm leading-relaxed \${m.sender === 'you' ? 'bg-white text-black rounded-2xl rounded-tr-sm' : 'bg-surface border border-border text-white rounded-2xl rounded-tl-sm'}\`}>{m.text}</div>
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
}`,
  'src/components/AdminDashboard.jsx': `import { useState, useEffect } from 'react';
import { useSocket } from '../App';
import { motion } from 'framer-motion';
import { LogOut, Users, Activity, AlertOctagon } from 'lucide-react';

export default function AdminDashboard() {
  const socket = useSocket();
  const [stats, setStats] = useState({
    onlineStudents: 0, totalRegistered: 0, activeCallsOrChats: 0, totalMatchesMade: 0, 
    totalFlagged: 0, totalBanned: 0, usersList: [], reports: [], bannedList: []
  });

  useEffect(() => {
    socket.on('admin_stats_update', (newStats) => setStats(newStats));
    return () => socket.off('admin_stats_update');
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-base text-white p-8 lg:p-12 relative z-10">
      <header className="flex justify-between items-end mb-16 border-b border-border/50 pb-8">
        <div>
          <h1 className="text-4xl font-serif tracking-tight">Command Center.</h1>
          <p className="text-muted text-sm mt-2 uppercase tracking-widest">Network telemetry &amp; moderation</p>
        </div>
        <button onClick={() => window.location.reload()} className="text-muted hover:text-white transition-colors flex items-center gap-2 text-sm uppercase tracking-wider">
          <LogOut size={16} /> Disconnect
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Online Nodes', value: stats.onlineStudents, icon: <Users size={16} /> },
          { label: 'Active Streams', value: stats.activeCallsOrChats, icon: <Activity size={16} /> },
          { label: 'Total Matches', value: stats.totalMatchesMade, icon: <Activity size={16} /> },
          { label: 'Flagged Nodes', value: stats.totalFlagged, icon: <AlertOctagon size={16} />, danger: true }
        ].map((stat, i) => (
          <div key={i} className={\`p-6 border \${stat.danger ? 'border-red-900/50 bg-red-950/10' : 'border-border/50 bg-surface'} rounded-2xl\`}>
            <div className={\`flex items-center gap-2 mb-4 \${stat.danger ? 'text-red-400' : 'text-muted'}\`}>
              {stat.icon}
              <span className="text-[10px] uppercase tracking-widest">{stat.label}</span>
            </div>
            <p className={\`text-4xl font-serif \${stat.danger ? 'text-red-400' : 'text-white'}\`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface border border-border/50 rounded-2xl p-6">
          <h2 className="text-xl font-serif mb-6 border-b border-border/50 pb-4">Active Nodes</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {stats.usersList.length === 0 && <p className="text-muted text-sm italic">No active nodes.</p>}
            {stats.usersList.map((u, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-base border border-border/50 rounded-xl hover:border-border transition-colors">
                <div>
                  <p className="text-sm text-white">{u.email}</p>
                  <p className="text-[10px] text-muted uppercase tracking-wider mt-1">{u.batch} &bull; {u.branch}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => socket.emit('admin_reset_user', u.email)} className="text-[10px] uppercase tracking-widest px-3 py-1.5 border border-border/50 hover:bg-white hover:text-black transition-colors rounded-md">Kick</button>
                  <button onClick={() => socket.emit('admin_ban_user', u.email)} className="text-[10px] uppercase tracking-widest px-3 py-1.5 border border-red-900/50 text-red-400 hover:bg-red-500 hover:text-white transition-colors rounded-md">Ban</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border/50 rounded-2xl p-6">
          <h2 className="text-xl font-serif mb-6 border-b border-border/50 pb-4">Incident Logs</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {stats.reports.length === 0 && <p className="text-muted text-sm italic">No flagged incidents.</p>}
            {stats.reports.map((r, i) => (
              <div key={i} className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-red-400 font-medium">{r.reason}</p>
                  <span className="text-[10px] text-muted">{r.timestamp}</span>
                </div>
                <p className="text-xs text-muted mb-2">Target: {r.offenderEmail} | Reporter: {r.reporterEmail}</p>
                <p className="text-xs text-white/70 italic border-l-2 border-red-500/50 pl-3 mb-3">&quot;{r.content}&quot;</p>
                <button onClick={() => socket.emit('admin_ban_user', r.offenderEmail)} className="text-[10px] uppercase tracking-widest px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Ban Target</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}`
};

for (const [file, content] of Object.entries(files)) {
  const fullPath = p.join(__dirname, file);
  const dir = p.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content.trim());
  console.log('Successfully wrote', file);
}
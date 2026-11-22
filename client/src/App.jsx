import { useState, useEffect, createContext, useContext } from 'react';
import { io } from 'socket.io-client';
import { AnimatePresence } from 'framer-motion';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';
import AdminDashboard from './components/AdminDashboard';

export const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);
const socket = io(import.meta.env.VITE_BACKEND_URL || window.location.origin);

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
}
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
      appendMessage(`Connected with ${data.batch} ${data.branch}.`, 'system');
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
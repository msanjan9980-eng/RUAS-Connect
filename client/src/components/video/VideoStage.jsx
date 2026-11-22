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
        className={`w-full h-full object-cover ${muted ? 'scale-x-[-1]' : ''}`}
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
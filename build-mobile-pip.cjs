const fs = require('fs');
const path = require('path');

const chatPath = path.join(__dirname, 'client', 'src', 'components', 'ChatRoom.jsx');
let chatCode = fs.readFileSync(chatPath, 'utf8');

// 1. Change the Video Area structure for PiP on mobile
// We make the remote video flex-1, and the local video a floating absolute element on mobile, but stacked on desktop.
const oldVideoBlock = `<div className="flex-1 flex flex-col gap-2 lg:gap-4 min-h-0">
          <div className="flex-[2] bg-surface rounded-2xl border border-border overflow-hidden relative">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />`;

const newVideoBlock = `<div className="flex-1 relative flex flex-col min-h-0">
          {/* Remote Video (Takes up full space) */}
          <div className="flex-1 bg-surface rounded-2xl border border-border overflow-hidden relative shadow-inner">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />`;

chatCode = chatCode.replace(oldVideoBlock, newVideoBlock);

// 2. Change the Local Video container to PiP on mobile, standard block on desktop
const oldLocalVideo = `<div className="flex-1 bg-surface rounded-2xl border border-border overflow-hidden relative">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-md text-xs tracking-wider uppercase">You</div>
          </div>`;

const newLocalVideo = `{/* Local Video: Floating PiP on mobile, Stacked on desktop */}
          <div className="absolute bottom-4 right-4 w-28 h-40 lg:relative lg:w-full lg:h-1/3 lg:mt-4 lg:bottom-auto lg:right-auto bg-surface rounded-xl lg:rounded-2xl border border-border overflow-hidden shadow-2xl z-20 transition-all duration-300">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute top-2 left-2 lg:top-4 lg:left-4 bg-black/40 backdrop-blur-md border border-white/10 px-2 py-1 lg:px-3 lg:py-1 rounded-md text-[10px] lg:text-xs tracking-wider uppercase text-white">You</div>
          </div>`;

chatCode = chatCode.replace(oldLocalVideo, newLocalVideo);

// 3. Adjust the Chat Sidebar height to be more compact on mobile
chatCode = chatCode.replace(
  'className="w-full lg:w-96 h-[35vh] lg:h-auto flex flex-col bg-base shrink-0 border-t lg:border-t-0 border-border/50"',
  'className="w-full lg:w-96 h-[40vh] lg:h-auto flex flex-col bg-base shrink-0 border-t lg:border-t-0 border-border/50 z-30"'
);

// 4. Adjust chat padding for mobile to feel native
chatCode = chatCode.replace(
  '<div ref={chatBoxRef} className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar space-y-4 lg:space-y-6">',
  '<div ref={chatBoxRef} className="flex-1 p-3 lg:p-6 overflow-y-auto custom-scrollbar space-y-3 lg:space-y-6">'
);

fs.writeFileSync(chatPath, chatCode, 'utf8');
console.log('✅ ChatRoom.jsx updated with Picture-in-Picture mobile layout.');
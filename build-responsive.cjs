const fs = require('fs');
const path = require('path');

// 1. Update ChatRoom.jsx for Mobile Responsiveness
const chatPath = path.join(__dirname, 'client', 'src', 'components', 'ChatRoom.jsx');
let chatCode = fs.readFileSync(chatPath, 'utf8');

// Change the main wrapper from row to col on mobile
chatCode = chatCode.replace(
  'className="h-screen w-full flex bg-base text-white"',
  'className="h-[100dvh] w-full flex flex-col lg:flex-row bg-base text-white overflow-hidden"'
);

// Make video area take flex-1, and hide border on mobile
chatCode = chatCode.replace(
  'className="flex-1 relative flex flex-col p-6 border-r border-border/50"',
  'className="flex-1 relative flex flex-col p-4 lg:p-6 border-b lg:border-b-0 lg:border-r border-border/50 min-h-0"'
);

// Make header wrap nicely
chatCode = chatCode.replace(
  '<div className="flex justify-between items-center mb-6">',
  '<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 lg:mb-6 shrink-0">'
);

// Adjust the video heights for mobile (stack them)
chatCode = chatCode.replace(
  '<div className="flex-1 flex flex-col gap-4">',
  '<div className="flex-1 flex flex-col gap-2 lg:gap-4 min-h-0">'
);

// Make the Chat Sidebar fixed height on mobile, fixed width on desktop
chatCode = chatCode.replace(
  'className="w-96 flex flex-col bg-base"',
  'className="w-full lg:w-96 h-[40vh] lg:h-auto flex flex-col bg-base shrink-0 border-t lg:border-t-0 border-border/50"'
);

// Fix chat padding for mobile
chatCode = chatCode.replace(
  '<div className="p-6 border-b border-border/50">',
  '<div className="p-4 lg:p-6 border-b border-border/50 shrink-0">'
);
chatCode = chatCode.replace(
  '<div ref={chatBoxRef} className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">',
  '<div ref={chatBoxRef} className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar space-y-4 lg:space-y-6">'
);

fs.writeFileSync(chatPath, chatCode, 'utf8');
console.log('✅ ChatRoom.jsx updated for mobile.');

// 2. Update AdminDashboard.jsx for Mobile
const adminPath = path.join(__dirname, 'client', 'src', 'components', 'AdminDashboard.jsx');
let adminCode = fs.readFileSync(adminPath, 'utf8');

// Fix the grid to be 1 col on mobile, 2 on tablet, 4 on desktop
adminCode = adminCode.replace(
  'className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"',
  'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-12"'
);

// Make the header stack on mobile
adminCode = adminCode.replace(
  'className="flex justify-between items-end mb-16 border-b border-border/50 pb-8"',
  'className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 lg:mb-16 border-b border-border/50 pb-6 lg:pb-8"'
);

// Make the sessions/logs stack on mobile
adminCode = adminCode.replace(
  'className="grid grid-cols-1 lg:grid-cols-2 gap-8"',
  'className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8"'
);

// Make active nodes wrap buttons better on tiny screens
adminCode = adminCode.replace(
  '<div className="flex justify-between items-center p-4 bg-base border border-border/50 rounded-xl hover:border-border transition-colors">',
  '<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-base border border-border/50 rounded-xl hover:border-border transition-colors">'
);

fs.writeFileSync(adminPath, adminCode, 'utf8');
console.log('✅ AdminDashboard.jsx updated for mobile.');
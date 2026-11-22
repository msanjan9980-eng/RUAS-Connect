const fs = require('fs');
const path = require('path');

const chatPath = path.join(__dirname, 'client', 'src', 'components', 'ChatRoom.jsx');
let chatCode = fs.readFileSync(chatPath, 'utf8');

// 1. Fix the Header (Keep on one line, hide the badge on tiny screens)
chatCode = chatCode.replace(
  '<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 lg:mb-6 shrink-0">',
  '<div className="flex flex-row justify-between items-center mb-3 lg:mb-6 shrink-0 gap-2">'
);
chatCode = chatCode.replace(
  '<span className="text-xs font-medium tracking-widest uppercase text-muted border border-border px-3 py-1 rounded-full">',
  '<span className="hidden sm:inline-block text-xs font-medium tracking-widest uppercase text-muted border border-border px-3 py-1 rounded-full">'
);

// 2. Make the video area take up more space, reduce gap on mobile
chatCode = chatCode.replace(
  '<div className="flex-1 flex flex-col gap-2 lg:gap-4 min-h-0">',
  '<div className="flex-[1.6] flex flex-col gap-2 lg:gap-4 min-h-0">'
);

// 3. Give the chat sidebar a slightly smaller height on mobile
chatCode = chatCode.replace(
  'className="w-full lg:w-96 h-[40vh] lg:h-auto flex flex-col bg-base shrink-0 border-t lg:border-t-0 border-border/50"',
  'className="w-full lg:w-96 h-[35vh] lg:h-auto flex flex-col bg-base shrink-0 border-t lg:border-t-0 border-border/50"'
);

// 4. Reduce padding on the chat input on mobile
chatCode = chatCode.replace(
  '<div className="p-4 border-t border-border/50 bg-surface">',
  '<div className="p-3 lg:p-4 border-t border-border/50 bg-surface">'
);

fs.writeFileSync(chatPath, chatCode, 'utf8');
console.log('✅ ChatRoom.jsx mobile UI fixed.');
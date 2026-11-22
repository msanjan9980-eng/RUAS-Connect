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
            className={`flex flex-col ${m.sender === 'you' ? 'items-end' : m.sender === 'system' ? 'items-center' : 'items-start'}`}
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
                  className={`max-w-[85%] px-4 py-2 lg:py-3 text-sm leading-relaxed ${
                    m.sender === 'you'
                      ? 'bg-white text-black rounded-2xl rounded-tr-sm'
                      : 'bg-surface border border-border text-white rounded-2xl rounded-tl-sm'
                  }`}
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
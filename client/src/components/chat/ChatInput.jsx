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
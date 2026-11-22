import { useState } from 'react';
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
}
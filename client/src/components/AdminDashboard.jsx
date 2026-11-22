import { useState, useEffect } from 'react';
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
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 lg:mb-16 border-b border-border/50 pb-6 lg:pb-8">
        <div>
          <h1 className="text-4xl font-serif tracking-tight">Command Center.</h1>
          <p className="text-muted text-sm mt-2 uppercase tracking-widest">Network telemetry &amp; moderation</p>
        </div>
        <button onClick={() => window.location.reload()} className="text-muted hover:text-white transition-colors flex items-center gap-2 text-sm uppercase tracking-wider">
          <LogOut size={16} /> Disconnect
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-12">
        {[
          { label: 'Online Nodes', value: stats.onlineStudents, icon: <Users size={16} /> },
          { label: 'Active Streams', value: stats.activeCallsOrChats, icon: <Activity size={16} /> },
          { label: 'Total Matches', value: stats.totalMatchesMade, icon: <Activity size={16} /> },
          { label: 'Flagged Nodes', value: stats.totalFlagged, icon: <AlertOctagon size={16} />, danger: true }
        ].map((stat, i) => (
          <div key={i} className={`p-6 border ${stat.danger ? 'border-red-900/50 bg-red-950/10' : 'border-border/50 bg-surface'} rounded-2xl`}>
            <div className={`flex items-center gap-2 mb-4 ${stat.danger ? 'text-red-400' : 'text-muted'}`}>
              {stat.icon}
              <span className="text-[10px] uppercase tracking-widest">{stat.label}</span>
            </div>
            <p className={`text-4xl font-serif ${stat.danger ? 'text-red-400' : 'text-white'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
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
}
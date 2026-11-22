const fs = require('fs');
const path = require('path');

const serverCode = `const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const EMAIL_DOMAIN = '@msruas.ac.in';
const ADMIN_EMAIL = 'admin@msruas.ac.in';
const ADMIN_PASSWORD = 'admin123';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());

// -------------------- state --------------------
// We are bringing back the users Map for persistent registration
const users = new Map();
const sessions = new Map();            
const bannedIds = new Set();           
const emailToSocket = new Map();       
const socketToEmail = new Map();       
const queues = { video: [], text: [] }; 
const pairs = new Map();               
const pairHistory = new Map();         
const reports = [];
let totalMatches = 0;
let totalFlagged = 0;

// -------------------- helpers --------------------
const hashPassword = (pw, salt = crypto.randomBytes(16).toString('hex')) => ({
  salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex')
});

const checkPassword = (pw, salt, hash) => {
  const candidate = crypto.scryptSync(pw, salt, 64).toString('hex');
  const a = Buffer.from(candidate, 'hex'), b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const newToken = () => crypto.randomBytes(32).toString('hex');
const pairKey = (a, b) => [a, b].sort().join('|');
const getSocket = id => io.sockets.sockets.get(id);
const isMsruasEmail = e => typeof e === 'string' && e.toLowerCase().endsWith(EMAIL_DOMAIN);

const parseStudentId = email => {
  const local = email.slice(0, -EMAIL_DOMAIN.length);
  const m = /^(25)([a-z]{2,4})(\\d{4,})$/i.exec(local);
  if (!m) return { batch: '25', branch: 'Unknown' };
  return { batch: m[1], branch: m[2].toUpperCase() };
};

const buildAdminStats = () => {
  const online = new Set(emailToSocket.keys());
  const branches = {};
  online.forEach(e => {
    const u = users.get(e);
    if (u) branches[u.branch] = (branches[u.branch] || 0) + 1;
  });
  return {
    onlineStudents: online.size,
    totalRegistered: users.size,
    activeCallsOrChats: Math.floor(pairs.size / 2),
    totalMatchesMade: totalMatches,
    totalFlagged,
    totalBanned: [...users.values()].filter(u => u.banned).length,
    branchBreakdown: branches,
    usersList: [...users.values()].map(u => ({ email: u.email, batch: u.batch, branch: u.branch })),
    reports: reports.slice().reverse(),
    bannedList: [...users.values()].filter(u => u.banned).map(u => u.email)
  };
};

let adminTimer = null;
const broadcastAdmin = () => {
  if (adminTimer) return;
  adminTimer = setTimeout(() => {
    adminTimer = null;
    io.to('admins').emit('admin_stats_update', buildAdminStats());
  }, 100);
};

// -------------------- pairing --------------------
const dequeue = socket => {
  ['video', 'text'].forEach(m => {
    const i = queues[m].indexOf(socket.id);
    if (i !== -1) queues[m].splice(i, 1);
  });
};

const unpair = (socket, notify = true) => {
  const pid = pairs.get(socket.id);
  pairs.delete(socket.id);
  if (!pid) return;
  pairs.delete(pid);
  pairHistory.delete(pairKey(socket.id, pid));
  if (notify) {
    const p = getSocket(pid);
    if (p) p.emit('partner_disconnected');
  }
};

const tryMatch = mode => {
  const q = queues[mode];
  while (q.length >= 2) {
    const aId = q.shift(), bId = q.shift();
    const a = getSocket(aId), b = getSocket(bId);
    if (!a || !b || !socketToEmail.has(aId) || !socketToEmail.has(bId) || pairs.has(aId) || pairs.has(bId)) continue;
    pairs.set(aId, bId);
    pairs.set(bId, aId);
    totalMatches++;
    const aU = users.get(socketToEmail.get(aId)) || {batch:'?',branch:'?'};
    const bU = users.get(socketToEmail.get(bId)) || {batch:'?',branch:'?'};
    a.emit('match_found', { batch: bU.batch, branch: bU.branch, initiator: true, mode });
    b.emit('match_found', { batch: aU.batch, branch: aU.branch, initiator: false, mode });
  }
  broadcastAdmin();
};

const relay = (socket, event, payload) => {
  const pid = pairs.get(socket.id);
  if (!pid) return;
  const p = getSocket(pid);
  if (p) p.emit(event, payload);
};

function attach(socket, user, token) {
  socketToEmail.set(socket.id, user.email);
  emailToSocket.set(user.email, socket.id);
  socket.data.token = token;
}

function detach(socket) {
  const email = socketToEmail.get(socket.id);
  if (email && emailToSocket.get(email) === socket.id) emailToSocket.delete(email);
  socketToEmail.delete(socket.id);
  dequeue(socket);
  unpair(socket, true);
  broadcastAdmin();
}

function killUserSessions(email, reason) {
  const sid = emailToSocket.get(email);
  if (!sid) return;
  const s = getSocket(sid);
  if (s) { s.emit('force_logout', reason); s.disconnect(true); }
  emailToSocket.delete(email);
}

io.on('connection', socket => {
  socket.on('resume_session', token => {
    const email = sessions.get(token);
    if (!email) return socket.emit('session_invalid');
    const u = users.get(email);
    if (!u || u.banned) { sessions.delete(token); return socket.emit('session_invalid'); }
    attach(socket, u, token);
    socket.emit('login_success', { token, studentInfo: { batch: u.batch, branch: u.branch } });
    broadcastAdmin();
  });

  socket.on('direct_login', data => {
    const email = String(data?.email || '').toLowerCase().trim();
    const password = String(data?.password || '');

    if (email === ADMIN_EMAIL) {
      if (password !== ADMIN_PASSWORD) return socket.emit('auth_error', 'Invalid admin credentials.');
      socket.isAdmin = true;
      socket.join('admins');
      return socket.emit('admin_authenticated', buildAdminStats());
    }

    if (!isMsruasEmail(email)) return socket.emit('auth_error', 'Only @msruas.ac.in email addresses are allowed.');
    if (!email.startsWith('25')) return socket.emit('auth_error', 'Student ID must start with 25.');
    if (password.length < 6) return socket.emit('auth_error', 'Password must be at least 6 characters.');

    const ids = parseStudentId(email);
    let u = users.get(email);
    
    if (u) {
      if (u.banned) return socket.emit('auth_error', 'This ID has been suspended.');
      if (!checkPassword(password, u.salt, u.hash))
        return socket.emit('auth_error', 'Incorrect password for this ID.');
    } else {
      const { salt, hash } = hashPassword(password);
      u = { email, salt, hash, batch: ids.batch, branch: ids.branch, banned: false };
      users.set(email, u);
    }

    for (const [tok, em] of [...sessions]) if (em === email) sessions.delete(tok);
    const prevId = emailToSocket.get(email);
    if (prevId && prevId !== socket.id) {
      const prev = getSocket(prevId);
      if (prev) { prev.emit('force_logout', 'Logged in from another device.'); prev.disconnect(true); }
    }

    const token = newToken();
    sessions.set(token, email);
    attach(socket, u, token);
    socket.emit('login_success', { token, studentInfo: { batch: u.batch, branch: u.branch } });
    broadcastAdmin();
  });

  socket.on('logout', () => {
    if (socket.data.token) sessions.delete(socket.data.token);
    detach(socket);
  });

  socket.on('disconnect', () => detach(socket));

  socket.on('find_partner', mode => {
    if (!socketToEmail.has(socket.id)) return socket.emit('force_logout', 'Session expired.');
    if (mode !== 'video' && mode !== 'text') return;
    unpair(socket, true);
    dequeue(socket);
    queues[mode].push(socket.id);
    socket.emit('waiting');
    tryMatch(mode);
  });

  socket.on('skip_partner', () => {
    dequeue(socket);
    unpair(socket, true);
    broadcastAdmin();
  });

  socket.on('send_message', text => {
    if (typeof text !== 'string') return;
    const pid = pairs.get(socket.id);
    if (!pid) return;
    const body = text.slice(0, 500);
    const from = socketToEmail.get(socket.id) || 'unknown';
    const key = pairKey(socket.id, pid);
    const hist = pairHistory.get(key) || [];
    hist.push({ from, text: body, ts: Date.now() });
    if (hist.length > 20) hist.shift();
    pairHistory.set(key, hist);
    const p = getSocket(pid);
    if (p) p.emit('receive_message', body);
  });

  socket.on('typing', v => relay(socket, 'partner_typing', !!v));

  socket.on('report_partner', reason => {
    const pid = pairs.get(socket.id);
    const reporter = socketToEmail.get(socket.id);
    if (!pid || !reporter) return;
    const offenderEmail = socketToEmail.get(pid);
    if (!offenderEmail) return;
    const offender = users.get(offenderEmail);
    const hist = pairHistory.get(pairKey(socket.id, pid)) || [];
    const evidence = hist.slice(-3)
      .map(m => \`\${m.from === reporter ? 'Reporter' : 'Offender'}: \${m.text}\`)
      .join(' | ') || '(no messages)';
    totalFlagged++;
    reports.push({
      id: crypto.randomUUID(),
      offenderEmail,
      offenderBranch: offender?.branch || 'Unknown',
      reporterEmail: reporter,
      reason: String(reason || 'Inappropriate Behavior').slice(0, 200),
      content: evidence,
      timestamp: new Date().toLocaleString()
    });
    unpair(socket, true);
    broadcastAdmin();
  });

  socket.on('webrtc_offer', o => relay(socket, 'webrtc_offer', o));
  socket.on('webrtc_answer', a => relay(socket, 'webrtc_answer', a));
  socket.on('webrtc_ice_candidate', c => relay(socket, 'webrtc_ice_candidate', c));

  const adminOnly = fn => { if (socket.isAdmin) fn(); };

  socket.on('admin_reset_user', email => adminOnly(() => {
    const e = String(email || '').toLowerCase();
    killUserSessions(e, 'Your registration was reset by an admin.');
    for (const [t, em] of [...sessions]) if (em === e) sessions.delete(t);
    users.delete(e);
    broadcastAdmin();
  }));

  socket.on('admin_reset_all_users', () => adminOnly(() => {
    for (const e of [...users.keys()]) killUserSessions(e, 'All registrations were reset by an admin.');
    users.clear();
    sessions.clear();
    broadcastAdmin();
  }));

  socket.on('admin_ban_user', email => adminOnly(() => {
    const e = String(email || '').toLowerCase();
    const u = users.get(e);
    if (!u) return;
    u.banned = true;
    killUserSessions(e, 'Your ID has been suspended by an admin.');
    broadcastAdmin();
  }));

  socket.on('admin_unban_user', email => adminOnly(() => {
    const u = users.get(String(email || '').toLowerCase());
    if (!u) return;
    u.banned = false;
    broadcastAdmin();
  }));

  socket.on('admin_clear_report', id => adminOnly(() => {
    const i = reports.findIndex(r => r.id === id);
    if (i !== -1) reports.splice(i, 1);
    broadcastAdmin();
  }));
});

server.listen(PORT, () => {
  console.log(\`Backend (Persistent DB) running on http://localhost:\${PORT}\`);
});`;

fs.writeFileSync(path.join(__dirname, 'server.js'), serverCode, 'utf8');
console.log('server.js successfully restored with persistent user DB.');
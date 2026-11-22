const socket = io();

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const adminScreen = document.getElementById('admin-screen');

const directLoginForm = document.getElementById('direct-login-form');
const emailInput = document.getElementById('email-input');
const passInput = document.getElementById('pass-input');
const authStatus = document.getElementById('auth-status');
const modeBtns = document.querySelectorAll('.mode-btn');
const submitBtn = directLoginForm.querySelector('.primary-btn');

const videoSection = document.getElementById('video-section');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const videoOverlay = document.getElementById('video-overlay');
const modeTag = document.getElementById('mode-tag');
const userBadge = document.getElementById('user-badge');
const reportBtn = document.getElementById('report-btn');
const logoutBtn = document.getElementById('logout-btn');

const chatBox = document.getElementById('chat-box');
const actionBtn = document.getElementById('action-btn');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

let selectedMode = 'video';
let chatState = 'IDLE';
let localStream = null;
let peerConnection = null;
let pendingCandidates = [];
let pendingOffer = null;
let typingTimeout = null;
let confirmRevert = null;

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

const savedMode = localStorage.getItem('campuslink_mode');
if (savedMode === 'video' || savedMode === 'text') {
    selectedMode = savedMode;
    modeBtns.forEach(b => {
        const on = b.dataset.mode === savedMode;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}

const savedToken = localStorage.getItem('campuslink_token');
if (savedToken) {
    socket.emit('resume_session', savedToken);
}

socket.on('connect_error', () => {
    authStatus.textContent = 'Cannot reach server. Is it running?';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enter Lounge';
});

socket.on('session_invalid', () => {
    localStorage.removeItem('campuslink_token');
});

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        selectedMode = btn.dataset.mode;
        localStorage.setItem('campuslink_mode', selectedMode);
    });
});

directLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    authStatus.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Connecting\u2026';
    socket.emit('direct_login', {
        email: emailInput.value.trim(),
        password: passInput.value
    });
});

socket.on('auth_error', (msg) => {
    authStatus.textContent = msg;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enter Lounge';
});

socket.on('login_success', async ({ token, studentInfo }) => {
    localStorage.setItem('campuslink_token', token);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enter Lounge';
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    userBadge.textContent = `${studentInfo.batch} \u2022 ${studentInfo.branch}`;

    if (selectedMode === 'video') {
        modeTag.textContent = '\uD83D\uDCF9 Video';
    } else {
        modeTag.textContent = '\uD83D\uDCAC Text';
        videoSection.classList.add('hidden');
    }
});

function stopCamera() {
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
}

logoutBtn.addEventListener('click', () => {
    stopCamera();
    localStorage.removeItem('campuslink_token');
    socket.emit('logout');
    location.reload();
});

socket.on('force_logout', (reason) => {
    stopCamera();
    localStorage.removeItem('campuslink_token');
    alert(reason);
    location.reload();
});

async function initCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        return true;
    } catch (err) {
        appendSystemMessage('\u26A0\uFE0F Camera blocked. Switched to Text-Only.');
        selectedMode = 'text';
        videoSection.classList.add('hidden');
        modeTag.textContent = '\uD83D\uDCAC Text';
        modeBtns.forEach(b => {
            const on = b.dataset.mode === 'text';
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        localStorage.setItem('campuslink_mode', 'text');
        return false;
    }
}

function handleActionButton() {
    if (chatState === 'IDLE') {
        startSearch();
    } else if (chatState === 'CHATTING') {
        chatState = 'CONFIRM_STOP';
        actionBtn.textContent = 'Really?';
        actionBtn.className = 'ctrl-btn confirm';
        clearTimeout(confirmRevert);
        confirmRevert = setTimeout(() => {
            if (chatState === 'CONFIRM_STOP') {
                chatState = 'CHATTING';
                actionBtn.textContent = 'Stop';
                actionBtn.className = 'ctrl-btn stop';
            }
        }, 3000);
    } else if (chatState === 'CONFIRM_STOP' || chatState === 'WAITING') {
        clearTimeout(confirmRevert);
        socket.emit('skip_partner');
        closeWebRTC();
        appendSystemMessage('Disconnected.');
        resetToIdle();
    }
}

actionBtn.addEventListener('click', handleActionButton);

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (chatScreen.classList.contains('hidden')) return;
    if (chatState === 'IDLE') return;
    handleActionButton();
});

async function startSearch() {
    if (selectedMode === 'video' && !localStream) {
        await initCamera();
    }
    chatBox.innerHTML = '';
    closeWebRTC();
    chatState = 'WAITING';
    actionBtn.textContent = 'Stop';
    actionBtn.className = 'ctrl-btn stop';
    msgInput.disabled = true;
    sendBtn.disabled = true;
    videoOverlay.classList.remove('hidden');
    videoOverlay.innerHTML = '<div class="spinner"></div><span>Searching network...</span>';
    socket.emit('find_partner', selectedMode);
}

function resetToIdle() {
    clearTimeout(confirmRevert);
    chatState = 'IDLE';
    actionBtn.textContent = 'Next';
    actionBtn.className = 'ctrl-btn start';
    msgInput.disabled = true;
    sendBtn.disabled = true;
    typingIndicator.classList.add('hidden');
    videoOverlay.classList.remove('hidden');
    videoOverlay.innerHTML = '<div class="spinner"></div><span>Click Next to find a peer</span>';
}

socket.on('waiting', () => appendSystemMessage('Looking for another student...'));

socket.on('match_found', async (data) => {
    chatBox.innerHTML = '';
    chatState = 'CHATTING';
    actionBtn.textContent = 'Stop';
    actionBtn.className = 'ctrl-btn stop';
    msgInput.disabled = false;
    sendBtn.disabled = false;
    msgInput.focus();

    appendSystemMessage(`Connected with a ${data.batch} student (${data.branch})!`);

    if (selectedMode === 'video' && localStream) {
        videoOverlay.classList.remove('hidden');
        videoOverlay.innerHTML = '<div class="spinner"></div><span>Connecting video\u2026</span>';
        await setupPeerConnection(data.initiator);
    }
});

async function setupPeerConnection(isInitiator) {
    peerConnection = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    pendingCandidates = [];

    peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            videoOverlay.classList.add('hidden');
        }
    };
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) socket.emit('webrtc_ice_candidate', event.candidate);
    };

    if (pendingOffer) {
        const offer = pendingOffer;
        pendingOffer = null;
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        while (pendingCandidates.length) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(pendingCandidates.shift()));
        }
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('webrtc_answer', answer);
        return;
    }

    if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('webrtc_offer', offer);
    }
}

socket.on('webrtc_offer', async (offer) => {
    if (!peerConnection) { pendingOffer = offer; return; }
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    while (pendingCandidates.length) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(pendingCandidates.shift()));
    }
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('webrtc_answer', answer);
});

socket.on('webrtc_answer', async (answer) => {
    if (!peerConnection) return;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    while (pendingCandidates.length) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(pendingCandidates.shift()));
    }
});

socket.on('webrtc_ice_candidate', async (candidate) => {
    if (!peerConnection || !peerConnection.remoteDescription) {
        pendingCandidates.push(candidate);
        return;
    }
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
        console.error('ICE error:', e);
    }
});

function closeWebRTC() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    pendingCandidates = [];
    pendingOffer = null;
    remoteVideo.srcObject = null;
}

socket.on('partner_disconnected', () => {
    closeWebRTC();
    appendSystemMessage('Stranger has disconnected.');
    resetToIdle();
});

function sendMessage() {
    const text = msgInput.value.trim();
    if (!text || chatState !== 'CHATTING') return;
    appendMessage(text, 'you');
    socket.emit('send_message', text);
    socket.emit('typing', false);
    msgInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

socket.on('receive_message', (text) => {
    typingIndicator.classList.add('hidden');
    appendMessage(text, 'stranger');
});

msgInput.addEventListener('input', () => {
    if (chatState === 'CHATTING') {
        socket.emit('typing', true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => socket.emit('typing', false), 1200);
    }
});

socket.on('partner_typing', (isTyping) => typingIndicator.classList.toggle('hidden', !isTyping));

reportBtn.addEventListener('click', () => {
    if (chatState !== 'CHATTING') {
        alert('You can only report someone during an active chat.');
        return;
    }
    const reason = prompt('Reason for flagging this student:');
    if (reason !== null) {
        socket.emit('report_partner', reason || 'Inappropriate Behavior');
        closeWebRTC();
        appendSystemMessage('\uD83D\uDEA8 Student flagged and disconnected.');
        resetToIdle();
    }
});

function appendMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('msg', sender);
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.classList.add('sys-msg');
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

socket.on('admin_authenticated', (stats) => {
    loginScreen.classList.add('hidden');
    adminScreen.classList.remove('hidden');
    renderAdminStats(stats);
});

socket.on('admin_stats_update', (stats) => {
    renderAdminStats(stats);
});

function renderAdminStats(stats) {
    document.getElementById('stat-online').textContent = stats.onlineStudents;
    document.getElementById('stat-registered').textContent = stats.totalRegistered;
    document.getElementById('stat-active-chats').textContent = stats.activeCallsOrChats;
    document.getElementById('stat-matches').textContent = stats.totalMatchesMade;
    document.getElementById('stat-flagged').textContent = stats.totalFlagged;
    document.getElementById('stat-banned').textContent = stats.totalBanned;

    const branchBox = document.getElementById('branch-pills');
    const branches = Object.entries(stats.branchBreakdown);
    if (branches.length === 0) {
        branchBox.innerHTML = '<span class="tag">No one online</span>';
    } else {
        branchBox.innerHTML = branches
            .map(([branch, count]) => `<span class="tag">\uD83C\uDF93 ${branch}: <b>${count}</b></span>`)
            .join('');
    }

    const regList = document.getElementById('registered-list');
    if (!stats.usersList || stats.usersList.length === 0) {
        regList.innerHTML = '<p class="empty-state">No active sessions.</p>';
    } else {
        regList.innerHTML = '';
        stats.usersList.forEach(u => {
            const row = document.createElement('div');
            row.className = 'report-card';
            row.innerHTML = `
                <div class="report-info">
                    <p><b>Email:</b> ${u.email}</p>
                    <p><b>Branch:</b> ${u.batch} \u2022 ${u.branch}</p>
                </div>
                <div class="report-actions">
                    <button class="outline-btn" onclick="resetUser('${u.email}')">Kick</button>
                    <button class="danger-btn" onclick="banUser('${u.email}')">Ban</button>
                </div>
            `;
            regList.appendChild(row);
        });
    }

    const reportsList = document.getElementById('reports-list');
    if (stats.reports.length === 0) {
        reportsList.innerHTML = '<p class="empty-state">No flagged incidents.</p>';
    } else {
        reportsList.innerHTML = '';
        stats.reports.forEach(rep => {
            const card = document.createElement('div');
            card.className = 'report-card';
            card.innerHTML = `
                <div class="report-info">
                    <p><b>Flagged:</b> <span style="color:var(--danger)">${rep.offenderEmail}</span> (${rep.offenderBranch}) \u2022 ${rep.timestamp}</p>
                    <p><b>Reason:</b> ${rep.reason} | <b>By:</b> ${rep.reporterEmail}</p>
                    <p><b>Evidence:</b> "${rep.content}"</p>
                </div>
                <div class="report-actions">
                    <button class="danger-btn" onclick="banUser('${rep.offenderEmail}')">Ban</button>
                    <button class="outline-btn" onclick="clearReport('${rep.id}')">Dismiss</button>
                </div>
            `;
            reportsList.appendChild(card);
        });
    }

    const bannedBox = document.getElementById('banned-list');
    if (stats.bannedList.length === 0) {
        bannedBox.innerHTML = '<span class="tag">No banned IDs</span>';
    } else {
        bannedBox.innerHTML = stats.bannedList
            .map(email => `<button class="outline-btn" style="margin:4px;" onclick="unbanUser('${email}')">\u26D4 ${email} (Unban)</button>`)
            .join('');
    }
}

window.resetUser = (email) => {
    if (confirm(`Kick session for ${email}?`)) socket.emit('admin_reset_user', email);
};
window.resetAllUsers = () => {
    if (confirm('Kick ALL active sessions?')) socket.emit('admin_reset_all_users');
};
window.banUser = (email) => {
    if (confirm(`Ban ${email}?`)) socket.emit('admin_ban_user', email);
};
window.unbanUser = (email) => socket.emit('admin_unban_user', email);
window.clearReport = (id) => socket.emit('admin_clear_report', id);
export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const CHAT_STATES = {
  IDLE: 'IDLE',
  WAITING: 'WAITING',
  CHATTING: 'CHATTING',
  DISCONNECTED: 'DISCONNECTED'
};

export const SOCKET_EVENTS = {
  LOGIN: 'direct_login',
  LOGIN_SUCCESS: 'login_success',
  AUTH_ERROR: 'auth_error',
  FIND_PARTNER: 'find_partner',
  WAITING: 'waiting',
  MATCH_FOUND: 'match_found',
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  PARTNER_DISCONNECTED: 'partner_disconnected',
  WEBRTC_OFFER: 'webrtc_offer',
  WEBRTC_ANSWER: 'webrtc_answer',
  WEBRTC_ICE: 'webrtc_ice_candidate'
};
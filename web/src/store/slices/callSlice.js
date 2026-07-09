import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  state: null, // 'incoming' | 'outgoing' | 'active' | 'ended' | 'failed'
  island: false, // incoming shown as Dynamic Island (phone was already open)
  callId: null,
  number: '',
  name: '',
  img: '',
  muted: false,
  speaker: false, // call put on speaker (nearby players can hear)
  answeredAt: null, // ms epoch when the call connected (for the timer)
  reason: null, // end/fail reason
  wantsVideo: false, // this call was placed/received as a video (FaceTime) call
  video: false, // the video layer (WebRTC) is currently active
  videoRole: null, // 'offer' | 'answer' — who initiates the WebRTC handshake
  videoIce: null, // ICE servers (from Config.VideoCall) for this session
  videoReq: null, // callId of a pending "upgrade to video" request from the other side
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    applyCall(state, action) {
      const d = action.payload || {};
      switch (d.type) {
        case 'incoming':
          return {
            ...initialState,
            state: 'incoming',
            island: !!d.island,
            callId: d.callId,
            number: d.number || '',
            name: d.name || '',
            img: d.img || '',
            wantsVideo: !!d.video,
          };
        case 'outgoing':
          return {
            ...initialState,
            state: 'outgoing',
            callId: d.callId,
            number: d.number || '',
            name: d.name || '',
            img: d.img || '',
            wantsVideo: !!d.video,
          };
        case 'active':
          state.state = 'active';
          state.answeredAt = Date.now();
          break;
        case 'ended':
          state.state = 'ended';
          state.reason = d.reason || null;
          break;
        case 'failed':
          state.state = 'failed';
          state.reason = d.reason || null;
          break;
        default:
          break;
      }
    },
    setMuted(state, action) {
      state.muted = action.payload;
    },
    setSpeaker(state, action) {
      state.speaker = action.payload;
    },
    setVideo(state, action) {
      const d = action.payload || {};
      if (d.active) {
        state.video = true;
        state.videoRole = d.role || 'answer';
        if (d.callId != null) state.callId = d.callId;
        state.videoIce = d.ice || [];
        state.videoReq = null;
      } else {
        state.video = false;
        state.videoRole = null;
        state.videoIce = null;
      }
    },
    setVideoReq(state, action) {
      state.videoReq = action.payload;
    },
    clearCall() {
      return initialState;
    },
  },
});

export const { applyCall, setMuted, setSpeaker, setVideo, setVideoReq, clearCall } = callSlice.actions;
export default callSlice.reducer;

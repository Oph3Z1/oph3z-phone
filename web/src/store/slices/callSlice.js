import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  state: null, // 'incoming' | 'outgoing' | 'active' | 'ended' | 'failed'
  island: false, // incoming shown as Dynamic Island (phone was already open)
  callId: null,
  number: '',
  name: '',
  img: '',
  muted: false,
  answeredAt: null, // ms epoch when the call connected (for the timer)
  reason: null, // end/fail reason
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
          };
        case 'outgoing':
          return {
            ...initialState,
            state: 'outgoing',
            callId: d.callId,
            number: d.number || '',
            name: d.name || '',
            img: d.img || '',
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
    clearCall() {
      return initialState;
    },
  },
});

export const { applyCall, setMuted, clearCall } = callSlice.actions;
export default callSlice.reducer;

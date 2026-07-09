import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    state: null,
    island: false,
    callId: null,
    number: '',
    name: '',
    img: '',
    muted: false,
    speaker: false,
    answeredAt: null,
    reason: null,
    wantsVideo: false,
    video: false,
    videoRole: null,
    videoIce: null,
    videoReq: null,
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

export const { applyCall, setMuted, setSpeaker, setVideo, setVideoReq, clearCall } =
    callSlice.actions;
export default callSlice.reducer;
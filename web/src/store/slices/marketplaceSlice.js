import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    draft: null,
    capture: null,
    reopenCompose: false,
};

const emptyDraft = () => ({
    mode: 'new',
    id: null,
    category: 'ads',
    title: '',
    desc: '',
    price: '',
    media: [],
    allowCalls: true,
    allowMsg: true,
});

const marketplaceSlice = createSlice({
    name: 'marketplace',
    initialState,
    reducers: {
        startDraft(state, action) {
            state.draft = { ...emptyDraft(), ...(action.payload || {}) };
        },
        patchDraft(state, action) {
            if (state.draft) Object.assign(state.draft, action.payload || {});
        },
        addMedia(state, action) {
            if (!state.draft) return;
            const item = action.payload;
            if (item && state.draft.media.length < 10) state.draft.media.push(item);
        },
        removeMedia(state, action) {
            if (state.draft) state.draft.media.splice(action.payload, 1);
        },
        clearDraft(state) {
            state.draft = null;
            state.capture = null;
            state.reopenCompose = false;
        },
        setCapture(state, action) {
            state.capture = action.payload || null;
        },
        clearCapture(state) {
            state.capture = null;
        },
        setReopenCompose(state, action) {
            state.reopenCompose = !!action.payload;
        },
    },
});

export const {
    startDraft,
    patchDraft,
    addMedia,
    removeMedia,
    clearDraft,
    setCapture,
    clearCapture,
    setReopenCompose,
} = marketplaceSlice.actions;

export { emptyDraft };
export default marketplaceSlice.reducer;
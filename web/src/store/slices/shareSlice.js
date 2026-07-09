import { createSlice } from '@reduxjs/toolkit';
import { openApp } from './phoneSlice';
import { sendMessage, setResumeThread } from './messagesSlice';

const initialState = {
    request: null,
};

const shareSlice = createSlice({
    name: 'share',
    initialState,
    reducers: {
        setShareRequest(state, action) {
            state.request = action.payload;
        },
        clearShareRequest(state) {
            state.request = null;
        },
    },
});

export const { setShareRequest, clearShareRequest } = shareSlice.actions;

export const startAppShare = (appId, to) => (dispatch) => {
    dispatch(setShareRequest({ appId, to }));
    dispatch(openApp(appId));
};

export const finishAppShare = (item) => (dispatch, getState) => {
    const req = getState().share.request;
    dispatch(clearShareRequest());
    if (!req || !item) {
        if (req) dispatch(setResumeThread(req.to));
        dispatch(openApp('message'));
        return;
    }
    dispatch(
        sendMessage(req.to, {
            type: 'appshare',
            body: item.title || '',
            meta: {
                appId: req.appId,
                title: item.title,
                subtitle: item.subtitle,
                image: item.image,
                data: item.data,
            },
        }),
    );
    dispatch(setResumeThread(req.to));
    dispatch(openApp('message'));
};

export const cancelAppShare = () => (dispatch, getState) => {
    const req = getState().share.request;
    dispatch(clearShareRequest());
    if (req) dispatch(setResumeThread(req.to));
    dispatch(openApp('message'));
};

export default shareSlice.reducer;
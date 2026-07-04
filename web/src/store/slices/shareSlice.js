import { createSlice } from '@reduxjs/toolkit';
import { openApp } from './phoneSlice';
import { sendMessage, setResumeThread } from './messagesSlice';

// "Share into a conversation" from a third-party app. When the user picks such an
// app in the Messages Share sheet, we open the app in share mode; the app returns
// a shareable item that we post into the conversation as an `appshare` message.

const initialState = {
  request: null, // { appId, to } while an app is being asked to provide a shareable item
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

// Begin a share from a third-party app: remember the target conversation and open
// the app (ExternalApp posts oph3z:shareRequest once it loads).
export const startAppShare = (appId, to) => (dispatch) => {
  dispatch(setShareRequest({ appId, to }));
  dispatch(openApp(appId));
};

// The app returned an item -> send it into the conversation and go back there.
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
    })
  );
  dispatch(setResumeThread(req.to));
  dispatch(openApp('message'));
};

// The app cancelled -> just return to the conversation.
export const cancelAppShare = () => (dispatch, getState) => {
  const req = getState().share.request;
  dispatch(clearShareRequest());
  if (req) dispatch(setResumeThread(req.to));
  dispatch(openApp('message'));
};

export default shareSlice.reducer;

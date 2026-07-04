import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';
import { openApp } from './phoneSlice';
import { loadPhoneState } from './contactsSlice';
import { loadPhotos } from './photosSlice';
import { pushToast } from './toastSlice';
import { translateFrom } from '../../i18n/useT';
import { AIRDROP_TOAST_ICON } from '../../components/Airdrop/airdropShared';

// AirDrop: nearby player-to-player sharing (contacts / your card / photos, plus
// third-party payloads). Sender side = the share picker; receiver side = the
// Dynamic Island prompt + the Notification Center pending list.

const initialState = {
  // Sender (share sheet)
  share: null, // the payload being shared: { kind:'contact'|'photos'|'app', contact?, photos?, app? } | null
  nearby: [], // [{ id, name, avatar }]
  scanning: false,
  sendTo: null, // { id, name } currently sending to
  sendState: null, // null | 'sending' | 'waiting' | 'accepted' | 'declined' | 'failed' | 'range' | 'off'

  // Receiver
  island: null, // transfer currently shown in the Dynamic Island
  pending: [], // [transfer] shown in the Notification Center / lock screen
  deliver: null, // { appId, payload } waiting to be handed to a third-party app on accept
};

const airdropSlice = createSlice({
  name: 'airdrop',
  initialState,
  reducers: {
    openShare(state, action) {
      state.share = action.payload || null;
      state.nearby = [];
      state.scanning = true;
      state.sendTo = null;
      state.sendState = null;
    },
    closeShare(state) {
      state.share = null;
      state.nearby = [];
      state.scanning = false;
      state.sendTo = null;
      state.sendState = null;
    },
    setNearby(state, action) {
      state.nearby = action.payload || [];
      state.scanning = false;
    },
    setSending(state, action) {
      state.sendTo = action.payload.to;
      state.sendState = action.payload.state;
    },
    setSendState(state, action) {
      state.sendState = action.payload;
    },
    setIsland(state, action) {
      state.island = action.payload;
    },
    setPending(state, action) {
      state.pending = action.payload || [];
    },
    addPending(state, action) {
      const t = action.payload;
      if (!t) return;
      if (!state.pending.some((p) => p.id === t.id)) state.pending.unshift(t);
    },
    removePending(state, action) {
      const id = action.payload;
      state.pending = state.pending.filter((p) => p.id !== id);
      if (state.island && state.island.id === id) state.island = null;
    },
    setDeliver(state, action) {
      state.deliver = action.payload;
    },
    clearDeliver(state) {
      state.deliver = null;
    },
  },
});

export const {
  openShare,
  closeShare,
  setNearby,
  setSending,
  setSendState,
  setIsland,
  setPending,
  addPending,
  removePending,
  setDeliver,
  clearDeliver,
} = airdropSlice.actions;

// ---- thunks ---------------------------------------------------------------

// Refresh the nearby-people list.
export const scanNearby = () => async (dispatch) => {
  const list = await fetchNui('phone:airdrop:nearby', {}, []);
  dispatch(setNearby(Array.isArray(list) ? list : []));
};

// Send the current share payload to a chosen nearby person.
export const sendShare = (target) => async (dispatch, getState) => {
  const share = getState().airdrop.share;
  if (!share || !target) return;
  dispatch(setSending({ to: target, state: 'sending' }));
  const res = await fetchNui(
    'phone:airdrop:send',
    { to: target.id, kind: share.kind, contact: share.contact, photos: share.photos, app: share.app },
    { ok: true }
  );
  if (res && res.ok) dispatch(setSendState('waiting'));
  else dispatch(setSendState(res && res.reason === 'off' ? 'off' : res && res.reason === 'range' ? 'range' : 'failed'));
};

// A transfer arrived. If the phone is OPEN, show the Dynamic Island (exactly like
// an incoming call — it shows over the home screen or the lock screen). Only when
// the phone is CLOSED does it wait in the Notification Center for later.
export const presentIncoming = (transfer) => (dispatch, getState) => {
  if (!transfer) return;
  if (getState().phone.visible) dispatch(setIsland(transfer));
  else dispatch(addPending(transfer));
};

// Closing the phone: an island that was never accepted/declined moves to the
// Notification Center so it isn't lost.
export const stashIsland = () => (dispatch, getState) => {
  const island = getState().airdrop.island;
  if (island) {
    dispatch(addPending(island));
    dispatch(setIsland(null));
  }
};

// Load still-pending transfers (on phone open).
export const loadPending = () => async (dispatch) => {
  const list = await fetchNui('phone:airdrop:pending', {}, []);
  dispatch(setPending(Array.isArray(list) ? list : []));
};

// Accept a transfer (from the island or the Notification Center).
export const acceptAirdrop = (transfer) => async (dispatch, getState) => {
  if (!transfer) return;
  const res = await fetchNui('phone:airdrop:accept', { id: transfer.id }, { ok: true, kind: transfer.kind });
  dispatch(removePending(transfer.id));
  if (!res || !res.ok) return;

  const tr = (key, vars) => translateFrom(getState(), key, vars);
  if (res.kind === 'contact') {
    dispatch(loadPhoneState()); // refresh contacts so the new one shows
    dispatch(pushToast({ icon: AIRDROP_TOAST_ICON, title: tr('airdrop.title'), body: tr('airdrop.savedContact') }));
  } else if (res.kind === 'photos') {
    dispatch(loadPhotos());
    dispatch(pushToast({ icon: AIRDROP_TOAST_ICON, title: tr('airdrop.title'), body: tr('airdrop.savedPhotos') }));
  } else if (res.kind === 'app' && res.app) {
    // Route the payload into the same app on this phone (if installed).
    const app = res.app;
    const installed = getState().apps.external.some((a) => a.id === app.id);
    if (installed) {
      dispatch(setDeliver({ appId: app.id, payload: app.payload }));
      dispatch(openApp(app.id));
    } else {
      dispatch(pushToast({ icon: AIRDROP_TOAST_ICON, title: tr('airdrop.title'), body: tr('airdrop.cantOpenApp', { app: app.title || app.id }) }));
    }
  }
};

export const declineAirdrop = (transfer) => async (dispatch) => {
  if (!transfer) return;
  dispatch(removePending(transfer.id));
  await fetchNui('phone:airdrop:decline', { id: transfer.id }, true);
};

// The person you sent to accepted/declined: reflect it in the share sheet and,
// in case it was already closed, toast the outcome.
export const applyStatus = (status) => (dispatch, getState) => {
  if (!status) return;
  const accepted = !!status.accepted;
  dispatch(setSendState(accepted ? 'accepted' : 'declined'));
  const st = getState().airdrop;
  const name = (st.sendTo && st.sendTo.name) || '';
  const tr = (key, vars) => translateFrom(getState(), key, vars);
  dispatch(pushToast({ icon: AIRDROP_TOAST_ICON, title: tr('airdrop.title'), body: tr(accepted ? 'airdrop.accepted' : 'airdrop.declined', { name }) }));
};

export default airdropSlice.reducer;

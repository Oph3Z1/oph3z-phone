import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';
import { openApp, unlock } from './phoneSlice';
import { setPeek } from './notificationsSlice';
import { loadPhoneState } from './contactsSlice';
import { loadPhotos } from './photosSlice';
import { pushToast } from './toastSlice';
import { translateFrom } from '../../i18n/useT';
import { AIRDROP_TOAST_ICON, describeAirdrop } from '../../components/Airdrop/airdropShared';
import { getApp } from '../../app/registry';

const initialState = {
    share: null,
    nearby: [],
    scanning: false,
    sendTo: null,
    sendState: null,

    island: null,
    pending: [],
    deliver: null,
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

export const scanNearby = () => async (dispatch) => {
    const list = await fetchNui('phone:airdrop:nearby', {}, []);
    dispatch(setNearby(Array.isArray(list) ? list : []));
};

export const sendShare = (target) => async (dispatch, getState) => {
    const share = getState().airdrop.share;
    if (!share || !target) return;
    dispatch(setSending({ to: target, state: 'sending' }));
    const res = await fetchNui(
        'phone:airdrop:send',
        {
            to: target.id,
            kind: share.kind,
            contact: share.contact,
            photos: share.photos,
            app: share.app,
            xprofile: share.xprofile,
        },
        { ok: true },
    );
    if (res && res.ok) dispatch(setSendState('waiting'));
    else
        dispatch(
            setSendState(
                res && res.reason === 'off'
                    ? 'off'
                    : res && res.reason === 'range'
                      ? 'range'
                      : 'failed',
            ),
        );
};

export const presentIncoming = (transfer) => (dispatch, getState) => {
    if (!transfer) return false;
    if (getState().phone.visible) {
        dispatch(setIsland(transfer));
        return false;
    }
    dispatch(addPending(transfer));
    const tr = (k, v) => translateFrom(getState(), k, v);
    dispatch(
        setPeek({
            id: `airdrop:${transfer.id}`,
            app: null,
            icon: AIRDROP_TOAST_ICON,
            title: tr('airdrop.title'),
            body: describeAirdrop(transfer, tr),
            ts: Math.floor(Date.now() / 1000),
        }),
    );
    return true;
};

export const stashIsland = () => (dispatch, getState) => {
    const island = getState().airdrop.island;
    if (island) {
        dispatch(addPending(island));
        dispatch(setIsland(null));
    }
};

export const loadPending = () => async (dispatch) => {
    const list = await fetchNui('phone:airdrop:pending', {}, []);
    dispatch(setPending(Array.isArray(list) ? list : []));
};

export const acceptAirdrop = (transfer) => async (dispatch, getState) => {
    if (!transfer) return;
    const res = await fetchNui(
        'phone:airdrop:accept',
        { id: transfer.id },
        { ok: true, kind: transfer.kind },
    );
    dispatch(removePending(transfer.id));
    if (!res || !res.ok) return;

    const tr = (key, vars) => translateFrom(getState(), key, vars);
    if (res.kind === 'contact') {
        dispatch(loadPhoneState());
        dispatch(
            pushToast({
                icon: AIRDROP_TOAST_ICON,
                title: tr('airdrop.title'),
                body: tr('airdrop.savedContact'),
            }),
        );
    } else if (res.kind === 'photos') {
        dispatch(loadPhotos());
        dispatch(
            pushToast({
                icon: AIRDROP_TOAST_ICON,
                title: tr('airdrop.title'),
                body: tr('airdrop.savedPhotos'),
            }),
        );
    } else if (res.kind === 'app' && res.app) {
        const app = res.app;
        const installed = getState().apps.external.some((a) => a.id === app.id) || !!getApp(app.id);
        if (installed) {
            dispatch(setDeliver({ appId: app.id, payload: app.payload }));
            dispatch(unlock());
            dispatch(openApp(app.id));
        } else {
            dispatch(
                pushToast({
                    icon: AIRDROP_TOAST_ICON,
                    title: tr('airdrop.title'),
                    body: tr('airdrop.cantOpenApp', { app: app.title || app.id }),
                }),
            );
        }
    } else if (res.kind === 'xprofile' && res.xprofile) {
        dispatch(setDeliver({ appId: 'twexa', payload: { handle: res.xprofile.handle } }));
        dispatch(unlock());
        dispatch(openApp('twexa'));
    }
};

export const declineAirdrop = (transfer) => async (dispatch) => {
    if (!transfer) return;
    dispatch(removePending(transfer.id));
    await fetchNui('phone:airdrop:decline', { id: transfer.id }, true);
};

export const applyStatus = (status) => (dispatch, getState) => {
    if (!status) return;
    const accepted = !!status.accepted;
    dispatch(setSendState(accepted ? 'accepted' : 'declined'));
    const st = getState().airdrop;
    const name = (st.sendTo && st.sendTo.name) || '';
    const tr = (key, vars) => translateFrom(getState(), key, vars);
    dispatch(
        pushToast({
            icon: AIRDROP_TOAST_ICON,
            title: tr('airdrop.title'),
            body: tr(accepted ? 'airdrop.accepted' : 'airdrop.declined', { name }),
        }),
    );
};

export default airdropSlice.reducer;
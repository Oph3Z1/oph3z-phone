import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';
import { isEnvBrowser } from '../../utils/misc';

const MOCK = {
    number: '555-0142',
    contacts: [
        { id: 1, name: 'Pappa', number: '555-0199', notes: '', img: '', favorite: true },
        { id: 2, name: 'Mamma', number: '555-0123', notes: '', img: '', favorite: true },
        { id: 3, name: 'Amirali', number: '555-0177', notes: 'Work', img: '', favorite: false },
        { id: 4, name: 'Parsa', number: '555-0162', notes: '', img: '', favorite: false },
    ],
    recents: [],
};

const initialState = {
    loaded: false,
    number: '',
    contacts: [],
    recents: [],
    blocked: {},
    focus: null,
};

const contactsSlice = createSlice({
    name: 'contacts',
    initialState,
    reducers: {
        hydrate(state, action) {
            const { number, contacts, recents, blocked } = action.payload || {};
            state.number = number || '';
            state.contacts = contacts || [];
            state.recents = recents || [];
            state.blocked = blocked || {};
            state.loaded = true;
        },
        setBlocked(state, action) {
            state.blocked = action.payload || {};
        },
        upsertContact(state, action) {
            const c = action.payload;
            const idx = state.contacts.findIndex((x) => x.id === c.id);
            if (idx >= 0) state.contacts[idx] = c;
            else state.contacts.push(c);
        },
        removeContact(state, action) {
            state.contacts = state.contacts.filter((c) => c.id !== action.payload);
        },
        setFavoriteLocal(state, action) {
            const { id, favorite } = action.payload;
            const c = state.contacts.find((x) => x.id === id);
            if (c) c.favorite = favorite;
        },
        setContactFocus(state, action) {
            state.focus = action.payload;
        },
    },
});

export const {
    hydrate,
    upsertContact,
    removeContact,
    setFavoriteLocal,
    setBlocked,
    setContactFocus,
} = contactsSlice.actions;

export const loadPhoneState = () => async (dispatch) => {
    const data = await fetchNui('phone:phone:getState', {}, MOCK);
    dispatch(hydrate(data));
};

export const addContact = (form) => async (dispatch) => {
    const created = await fetchNui('phone:phone:addContact', form, {
        id: Date.now(),
        ...form,
        favorite: false,
    });
    if (created) dispatch(upsertContact(created));
    return created;
};

export const editContact = (form) => async (dispatch, getState) => {
    const ok = await fetchNui('phone:phone:updateContact', form, true);
    if (ok) {
        const existing = getState().contacts.contacts.find((c) => c.id === form.id);
        dispatch(upsertContact({ ...existing, ...form }));
    }
    return ok;
};

export const deleteContact = (id) => async (dispatch) => {
    const ok = await fetchNui('phone:phone:deleteContact', { id }, true);
    if (ok) dispatch(removeContact(id));
    return ok;
};

export const toggleFavorite = (id, favorite) => async (dispatch) => {
    dispatch(setFavoriteLocal({ id, favorite }));
    const ok = await fetchNui('phone:phone:setFavorite', { id, favorite }, true);
    if (!ok && !isEnvBrowser()) dispatch(setFavoriteLocal({ id, favorite: !favorite }));
    return ok;
};

export const digitsOf = (s) => String(s || '').replace(/\D/g, '');

export const blockNumber = (number) => async (dispatch, getState) => {
    const optimistic = { ...getState().contacts.blocked, [digitsOf(number)]: { number } };
    const blocked = await fetchNui('phone:phone:block', { number }, optimistic);
    dispatch(setBlocked(blocked));
};

export const unblockNumber = (number) => async (dispatch, getState) => {
    const next = { ...getState().contacts.blocked };
    delete next[digitsOf(number)];
    const blocked = await fetchNui('phone:phone:unblock', { number }, next);
    dispatch(setBlocked(blocked));
};

export default contactsSlice.reducer;
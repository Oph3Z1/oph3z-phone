import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

const MOCK = [
    { id: 3, expr: '1999 ÷ 2', value: 999.5 },
    { id: 2, expr: '12600 × 5', value: 63000 },
    { id: 1, expr: '48 + 12', value: 60 },
];

const initialState = {
    loaded: false,
    history: [],
};

const calcSlice = createSlice({
    name: 'calc',
    initialState,
    reducers: {
        hydrateCalc(state, action) {
            state.history = action.payload || [];
            state.loaded = true;
        },
        addHistoryLocal(state, action) {
            if (action.payload) state.history.unshift(action.payload);
        },
        replaceHistoryLocal(state, action) {
            const { tmpId, item } = action.payload;
            state.history = state.history.map((h) => (h.id === tmpId ? item : h));
        },
        removeHistoryLocal(state, action) {
            state.history = state.history.filter((h) => h.id !== action.payload);
        },
        clearHistoryLocal(state) {
            state.history = [];
        },
    },
});

export const {
    hydrateCalc,
    addHistoryLocal,
    replaceHistoryLocal,
    removeHistoryLocal,
    clearHistoryLocal,
} = calcSlice.actions;

export const loadCalc = () => async (dispatch) => {
    const res = await fetchNui('phone:calc:get', {}, MOCK);
    dispatch(hydrateCalc(res || []));
};

export const addHistory = (expr, value) => async (dispatch) => {
    const tmpId = 'tmp' + Date.now();
    dispatch(addHistoryLocal({ id: tmpId, expr, value }));
    const item = await fetchNui('phone:calc:add', { expr, value }, { id: tmpId, expr, value });
    if (item && item.id !== tmpId) dispatch(replaceHistoryLocal({ tmpId, item }));
};

export const deleteHistory = (id) => async (dispatch) => {
    dispatch(removeHistoryLocal(id));
    await fetchNui('phone:calc:delete', { id }, true);
};

export const clearHistory = () => async (dispatch) => {
    dispatch(clearHistoryLocal());
    await fetchNui('phone:calc:clear', {}, true);
};

export default calcSlice.reducer;
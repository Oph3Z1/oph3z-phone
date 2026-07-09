import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

const MOCK = [{ id: 1, label: 'Home', x: 120.0, y: -1280.0, ts: 1719500000 }];

const initialState = {
    loaded: false,
    blips: [],
    focus: null,
};

const mapsSlice = createSlice({
    name: 'maps',
    initialState,
    reducers: {
        hydrateBlips(state, action) {
            state.blips = action.payload || [];
            state.loaded = true;
        },
        addBlipLocal(state, action) {
            state.blips.push(action.payload);
        },
        updateBlipLocal(state, action) {
            const { id, x, y } = action.payload;
            const b = state.blips.find((b) => b.id === id);
            if (b) {
                b.x = x;
                b.y = y;
            }
        },
        removeBlipLocal(state, action) {
            state.blips = state.blips.filter((b) => b.id !== action.payload);
        },
        setFocus(state, action) {
            state.focus = action.payload;
        },
    },
});

export const { hydrateBlips, addBlipLocal, updateBlipLocal, removeBlipLocal, setFocus } =
    mapsSlice.actions;

export const loadBlips = () => async (dispatch) => {
    const blips = await fetchNui('phone:maps:get', {}, MOCK);
    dispatch(hydrateBlips(blips));
};

export const addBlip = (blip) => async (dispatch) => {
    const created = await fetchNui('phone:maps:add', blip, {
        id: Date.now(),
        ...blip,
        ts: Math.floor(Date.now() / 1000),
    });
    if (created) dispatch(addBlipLocal(created));
    return created;
};

export const moveBlip = (id, x, y) => async (dispatch) => {
    dispatch(updateBlipLocal({ id, x, y }));
    await fetchNui('phone:maps:move', { id, x, y }, true);
};

export const deleteBlip = (id) => async (dispatch) => {
    dispatch(removeBlipLocal(id));
    await fetchNui('phone:maps:delete', { id }, true);
};

export default mapsSlice.reducer;
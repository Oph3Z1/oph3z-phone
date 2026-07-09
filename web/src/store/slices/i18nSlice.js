import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    languages: [],
    translations: {},
};

const i18nSlice = createSlice({
    name: 'i18n',
    initialState,
    reducers: {
        setI18n(state, action) {
            const p = action.payload || {};
            state.languages = p.languages || [];
            state.translations = p.translations || {};
        },
    },
});

export const { setI18n } = i18nSlice.actions;
export default i18nSlice.reducer;
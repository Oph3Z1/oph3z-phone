import { createSlice } from '@reduxjs/toolkit';

// Localization data pushed from Lua on phone open:
//   languages    — [{ code, name }] for the Settings > Language picker
//   translations — { [code]: <frontend string table> } (the `frontend` sub-table
//                  of each locales/<code>.lua). The current language itself lives
//                  in settings.language (so it persists with the other settings).
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

import { configureStore } from '@reduxjs/toolkit';
import phoneReducer from './slices/phoneSlice';
import settingsReducer from './slices/settingsSlice';
import contactsReducer from './slices/contactsSlice';
import callReducer from './slices/callSlice';
import photosReducer from './slices/photosSlice';
import mapsReducer from './slices/mapsSlice';
import messagesReducer from './slices/messagesSlice';
import groupsReducer from './slices/groupsSlice';
import notificationsReducer from './slices/notificationsSlice';
import appsReducer from './slices/appsSlice';
import homeReducer from './slices/homeSlice';
import dialogReducer from './slices/dialogSlice';
import promptReducer from './slices/promptSlice';
import ringtonesReducer from './slices/ringtonesSlice';
import i18nReducer from './slices/i18nSlice';
import musicReducer from './slices/musicSlice';
import toastReducer from './slices/toastSlice';
import airdropReducer from './slices/airdropSlice';
import shareReducer from './slices/shareSlice';
import clockReducer from './slices/clockSlice';
import calcReducer from './slices/calcSlice';
import mailReducer from './slices/mailSlice';
import walletReducer from './slices/walletSlice';

export const store = configureStore({
  reducer: {
    phone: phoneReducer,
    settings: settingsReducer,
    contacts: contactsReducer,
    call: callReducer,
    photos: photosReducer,
    maps: mapsReducer,
    messages: messagesReducer,
    groups: groupsReducer,
    notifications: notificationsReducer,
    apps: appsReducer,
    home: homeReducer,
    dialog: dialogReducer,
    prompt: promptReducer,
    ringtones: ringtonesReducer,
    i18n: i18nReducer,
    music: musicReducer,
    toast: toastReducer,
    airdrop: airdropReducer,
    share: shareReducer,
    clock: clockReducer,
    calc: calcReducer,
    mail: mailReducer,
    wallet: walletReducer,
  },
});

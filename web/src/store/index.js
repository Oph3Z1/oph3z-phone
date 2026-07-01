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
  },
});

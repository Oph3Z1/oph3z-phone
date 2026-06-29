// Central registry of every app on the phone.
//
// Phase 1: every app opens the generic placeholder screen (component: null).
// Phase 2: give an app its own `component` and it renders instead of the stub.

import callIcon from '../assets/icons/apps/call.png';
import messageIcon from '../assets/icons/apps/message.png';
import cameraIcon from '../assets/icons/apps/camera.png';
import photosIcon from '../assets/icons/apps/photos.png';
import mapsIcon from '../assets/icons/apps/maps.png';
import clockIcon from '../assets/icons/apps/clock.png';
import settingsIcon from '../assets/icons/apps/settings.png';
import calculatorIcon from '../assets/icons/apps/calculator.png';
import appstoreIcon from '../assets/icons/apps/appstore.png';

import PhoneApp from './phone/PhoneApp';
import PhotosApp from './photos/PhotosApp';
import CameraApp from './camera/CameraApp';
import MapsApp from './maps/MapsApp';
import MessagesApp from './messages/MessagesApp';

/** @typedef {{ id:string, name:string, icon:string, component:(React.ComponentType|null) }} AppDef */

/** @type {Record<string, AppDef>} */
export const APPS = {
  call:       { id: 'call',       name: 'Phone',      icon: callIcon,       component: PhoneApp },
  message:    { id: 'message',    name: 'Messages',   icon: messageIcon,    component: MessagesApp },
  camera:     { id: 'camera',     name: 'Camera',     icon: cameraIcon,     component: CameraApp },
  photos:     { id: 'photos',     name: 'Photos',     icon: photosIcon,     component: PhotosApp },
  maps:       { id: 'maps',       name: 'Maps',       icon: mapsIcon,       component: MapsApp },
  clock:      { id: 'clock',      name: 'Clock',      icon: clockIcon,      component: null },
  settings:   { id: 'settings',   name: 'Settings',   icon: settingsIcon,   component: null },
  calculator: { id: 'calculator', name: 'Calculator', icon: calculatorIcon, component: null },
  appstore:   { id: 'appstore',   name: 'App Store',  icon: appstoreIcon,   component: null },
};

// Apps shown in the home-screen grid, in order.
export const HOME_GRID = ['maps', 'clock', 'settings', 'calculator', 'appstore'];

// Apps pinned to the bottom dock, in order (max 4).
export const DOCK = ['call', 'message', 'camera', 'photos'];

export const getApp = (id) => APPS[id] || null;

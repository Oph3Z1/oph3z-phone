// Registry of BUILT-IN apps: maps an app id to its bundled icon + screen.
//
// The LAYOUT (which apps show, their labels, order and dock/grid placement) is
// NOT here anymore — it comes from Config.Apps in config.lua and is delivered to
// the UI at runtime (see appsSlice). This file only knows how to *render* a
// built-in app id. Third-party apps render via an iframe instead (see AppScreen).

import callIcon from '../assets/icons/apps/call.png';
import messageIcon from '../assets/icons/apps/message.png';
import cameraIcon from '../assets/icons/apps/camera.png';
import photosIcon from '../assets/icons/apps/photos.png';
import mapsIcon from '../assets/icons/apps/maps.png';
import clockIcon from '../assets/icons/apps/clock.png';
import mailIcon from '../assets/icons/apps/mail.png';
import walletIcon from '../assets/icons/apps/wallet.png';
import settingsIcon from '../assets/icons/apps/settings.png';
import calculatorIcon from '../assets/icons/apps/calculator.png';
import appstoreIcon from '../assets/icons/apps/appstore.png';
import xIcon from '../assets/icons/apps/x.png';
import marketplaceIcon from '../assets/icons/apps/marketplace.png';

import PhoneApp from './phone/PhoneApp';
import PhotosApp from './photos/PhotosApp';
import CameraApp from './camera/CameraApp';
import MapsApp from './maps/MapsApp';
import MessagesApp from './messages/MessagesApp';
import AppStoreApp from './appstore/AppStoreApp';
import SettingsApp from './settings/SettingsApp';
import ClockApp from './clock/ClockApp';
import CalculatorApp from './calculator/CalculatorApp';
import MailApp from './mail/MailApp';
import WalletApp from './wallet/WalletApp';
import XApp from './x/XApp';
import MarketApp from './marketplace/MarketApp';

/** @typedef {{ id:string, name:string, icon:string, component:(React.ComponentType|null) }} AppDef */

/** @type {Record<string, AppDef>} Built-in id -> bundled icon + default name + screen. */
export const APPS = {
  call:       { id: 'call',       name: 'Phone',      icon: callIcon,       component: PhoneApp },
  message:    { id: 'message',    name: 'Messages',   icon: messageIcon,    component: MessagesApp },
  camera:     { id: 'camera',     name: 'Camera',     icon: cameraIcon,     component: CameraApp },
  photos:     { id: 'photos',     name: 'Photos',     icon: photosIcon,     component: PhotosApp },
  maps:       { id: 'maps',       name: 'Maps',       icon: mapsIcon,       component: MapsApp },
  clock:      { id: 'clock',      name: 'Clock',      icon: clockIcon,      component: ClockApp },
  mail:       { id: 'mail',       name: 'Mail',       icon: mailIcon,       component: MailApp },
  wallet:     { id: 'wallet',     name: 'Wallet',     icon: walletIcon,     component: WalletApp },
  settings:   { id: 'settings',   name: 'Settings',   icon: settingsIcon,   component: SettingsApp },
  calculator: { id: 'calculator', name: 'Calculator', icon: calculatorIcon, component: CalculatorApp },
  appstore:   { id: 'appstore',   name: 'App Store',  icon: appstoreIcon,   component: AppStoreApp },
  x:          { id: 'x',          name: 'X',          icon: xIcon,          component: XApp },
  marketplace:{ id: 'marketplace', name: 'Marketplace', icon: marketplaceIcon, component: MarketApp },
};

export const getApp = (id) => APPS[id] || null;

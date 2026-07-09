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
import twexaIcon from '../assets/icons/apps/twexa.png';
import marketplaceIcon from '../assets/icons/apps/marketplace.png';
import musicIcon from '../assets/icons/apps/music.png';

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
import TwexaApp from './twexa/TwexaApp';
import MarketApp from './marketplace/MarketApp';
import MusicApp from './music/MusicApp';

export const APPS = {
    call: { id: 'call', name: 'Phone', icon: callIcon, component: PhoneApp },
    message: { id: 'message', name: 'Messages', icon: messageIcon, component: MessagesApp },
    camera: { id: 'camera', name: 'Camera', icon: cameraIcon, component: CameraApp },
    photos: { id: 'photos', name: 'Photos', icon: photosIcon, component: PhotosApp },
    maps: { id: 'maps', name: 'Maps', icon: mapsIcon, component: MapsApp },
    clock: { id: 'clock', name: 'Clock', icon: clockIcon, component: ClockApp },
    mail: { id: 'mail', name: 'Mail', icon: mailIcon, component: MailApp },
    wallet: { id: 'wallet', name: 'Wallet', icon: walletIcon, component: WalletApp },
    settings: { id: 'settings', name: 'Settings', icon: settingsIcon, component: SettingsApp },
    calculator: {
        id: 'calculator',
        name: 'Calculator',
        icon: calculatorIcon,
        component: CalculatorApp,
    },
    appstore: { id: 'appstore', name: 'App Store', icon: appstoreIcon, component: AppStoreApp },
    twexa: { id: 'twexa', name: 'Twexa', icon: twexaIcon, component: TwexaApp },
    marketplace: {
        id: 'marketplace',
        name: 'Marketplace',
        icon: marketplaceIcon,
        component: MarketApp,
    },
    music: { id: 'music', name: 'Music', icon: musicIcon, component: MusicApp },
};

export const getApp = (id) => APPS[id] || null;
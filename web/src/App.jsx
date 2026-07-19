import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Phone from './components/Phone/Phone';
import Lightbox from './components/Lightbox/Lightbox';
import PhonePeek from './components/Notifications/PhonePeek';
import { useNuiEvent } from './hooks/useNuiEvent';
import { fetchNui } from './utils/fetchNui';
import { isEnvBrowser } from './utils/misc';
import { startVoiceCapture, setVoiceGate, stopVoiceCapture } from './utils/voiceCapture';
import { uploadToProvider } from './utils/upload';
import {
    setVisible,
    setTime,
    closeApp,
    openApp,
    unlock,
    setIdentity,
} from './store/slices/phoneSlice';
import { setLayout, setExternalApps } from './store/slices/appsSlice';
import { bumpLive } from './store/slices/xSlice';
import { setSaved, setDownloadMs } from './store/slices/homeSlice';
import { hydrate } from './store/slices/settingsSlice';
import { setI18n } from './store/slices/i18nSlice';
import { setDateNames } from './i18n/dateNames';
import { applyCall, clearCall, setVideo, setVideoReq } from './store/slices/callSlice';
import { onVideoSignal, stopVideoCall } from './utils/videoCall';
import { loadPhoneState } from './store/slices/contactsSlice';
import { upsertPhoto, setLightbox } from './store/slices/photosSlice';
import { presentNotification, loadNotifications, setPeek } from './store/slices/notificationsSlice';
import { pushToast, clearToast } from './store/slices/toastSlice';
import {
    presentIncoming,
    loadPending,
    stashIsland,
    applyStatus,
} from './store/slices/airdropSlice';
import {
    loadClock,
    onTimerDone,
    onRing,
    setRinging,
    setAlarmEnabled,
} from './store/slices/clockSlice';
import { loadMail, receiveMail } from './store/slices/mailSlice';
import {
    loadWallet,
    receiveIncoming as walletIncoming,
    receiveBill,
} from './store/slices/walletSlice';
import { setPlaying as setMusicPlaying, clearTrack } from './store/slices/musicSlice';
import { applyTrack, applyTick, clearNow, loadSpotifyState } from './store/slices/spotifySlice';

export default function App() {
    const dispatch = useDispatch();
    const visible = useSelector((s) => s.phone.visible);
    const activeApp = useSelector((s) => s.phone.activeApp);
    const lightbox = useSelector((s) => s.photos.lightbox);
    const peek = useSelector((s) => s.notifications.peek);
    const notifSound = useSelector((s) => s.settings.notifSound);
    const notifSoundRef = useRef(notifSound);
    notifSoundRef.current = notifSound;

    const language = useSelector((s) => s.settings.language) || 'en';
    const translations = useSelector((s) => s.i18n.translations);
    useEffect(() => {
        const dt = translations?.[language]?.datetime || translations?.en?.datetime || null;
        setDateNames(dt);
    }, [translations, language]);

    useEffect(() => {
        const FADE_ANIMS = [
            'screen-in',
            'screen-in-side',
            'phone-app-in',
            'home-in',
            'x-post-in',
            'alertdlg-pop',
            'inputdlg-pop',
        ];
        const onEnd = (e) => {
            if (FADE_ANIMS.includes(e.animationName)) e.target.style.animation = 'none';
        };
        document.addEventListener('animationend', onEnd);
        return () => document.removeEventListener('animationend', onEnd);
    }, []);
    const callState = useSelector((s) => s.call.state);
    const callStateRef = useRef(callState);
    callStateRef.current = callState;

    useNuiEvent('phone:notifRefresh', () => dispatch(loadNotifications()));

    const notifAudio = useRef(null);
    const playNotify = () => {
        try {
            if (!notifAudio.current) notifAudio.current = new Audio('./audio/notify.wav');
            notifAudio.current.currentTime = 0;
            const p = notifAudio.current.play();
            if (p && p.catch) p.catch(() => {});
        } catch (e) {}
    };

    const [captureHidden, setCaptureHidden] = useState(false);
    useNuiEvent('phone:camera:capturing', (on) => setCaptureHidden(!!on));

    useNuiEvent('phone:setVisible', (data) => {
        if (data?.visible) {
            if (data.settings) dispatch(hydrate(data.settings));
            if (data.i18n) dispatch(setI18n(data.i18n));
            if (data.time) dispatch(setTime(data.time));
            if (data.apps) dispatch(setLayout(data.apps));
            if (data.walkKey) walkKeyRef.current = data.walkKey;
            if (data.identity) dispatch(setIdentity(data.identity));
            dispatch(setSaved(data.home || null));
            if (data.appstore && data.appstore.downloadSeconds)
                dispatch(setDownloadMs(data.appstore.downloadSeconds * 1000));
            dispatch(setVisible(true));
            dispatch(loadNotifications());
            dispatch(loadPending());
            dispatch(loadClock());
            dispatch(loadMail());
            dispatch(loadWallet());
            dispatch(loadSpotifyState());
        } else {
            dispatch(setVisible(false));
            dispatch(setLightbox(null));
            dispatch(clearToast());
            dispatch(stashIsland());
            if (callStateRef.current === 'ended' || callStateRef.current === 'failed')
                dispatch(clearCall());
        }
    });

    const vrecCfgRef = useRef(null);
    const vrecSessionRef = useRef(null);
    useNuiEvent('phone:vrec:capture', (d) => {
        vrecCfgRef.current = (d && d.cfg) || null;
        vrecSessionRef.current = (d && d.sessionId) || null;
        startVoiceCapture(!!(d && d.gate));
    });
    useNuiEvent('phone:vrec:gate', (d) => setVoiceGate(!!(d && d.open)));
    useNuiEvent('phone:vrec:stop', async () => {
        const cfg = vrecCfgRef.current;
        const sessionId = vrecSessionRef.current;
        vrecCfgRef.current = null;
        vrecSessionRef.current = null;
        const blob = await stopVoiceCapture();
        let url = null;
        if (blob && cfg) {
            try {
                url = await uploadToProvider(blob, 'voice.webm', cfg);
            } catch (e) {
                url = null;
            }
        }
        fetchNui('phone:camera:clipReady', { sessionId, url }, null);
    });

    useNuiEvent('phone:apps:external', (list) => dispatch(setExternalApps(list || [])));

    useNuiEvent('phone:x:live', () => dispatch(bumpLive()));

    useNuiEvent('phone:openApp', (d) => {
        if (!d || !d.id) return;
        dispatch(unlock());
        dispatch(openApp(d.id));
    });

    useNuiEvent('phone:notify', (item) => {
        if (!item) return;
        const shown = dispatch(presentNotification(item));
        if (shown && notifSoundRef.current !== false) playNotify();
    });

    useNuiEvent('phone:toast', (d) => dispatch(pushToast(d)));

    useNuiEvent('phone:spotify:track', (d) => d && dispatch(applyTrack(d)));
    useNuiEvent('phone:spotify:tick', (d) => d && dispatch(applyTick(d)));
    useNuiEvent('phone:spotify:playing', (d) => d && dispatch(setMusicPlaying(!!d.playing)));
    useNuiEvent('phone:spotify:stopped', () => {
        dispatch(clearTrack());
        dispatch(clearNow());
    });

    const mediaVolume = useSelector((s) => s.settings.volume);
    const volInit = useRef(true);
    useEffect(() => {
        if (volInit.current) {
            volInit.current = false;
            return;
        }
        fetchNui('phone:spotify:setVolume', { volume: mediaVolume }, {});
    }, [mediaVolume]);

    useNuiEvent('phone:airdrop:incoming', (transfer) => {
        const shown = dispatch(presentIncoming(transfer));
        if (shown && notifSoundRef.current !== false) playNotify();
    });

    useNuiEvent('phone:airdrop:status', (status) => dispatch(applyStatus(status)));

    useNuiEvent('phone:clock:timerDone', (d) => dispatch(onTimerDone(d)));
    useNuiEvent('phone:clock:ring', (d) => dispatch(onRing(d)));
    useNuiEvent('phone:clock:ringStop', () => dispatch(setRinging(null)));
    useNuiEvent('phone:clock:alarmFire', (d) => {
        if (d && d.id != null) dispatch(setAlarmEnabled({ id: d.id, enabled: false }));
    });

    useNuiEvent('phone:mail:incoming', (item) => dispatch(receiveMail(item)));

    useNuiEvent('phone:wallet:incoming', (d) => dispatch(walletIncoming(d)));
    useNuiEvent('phone:wallet:bill', (b) => dispatch(receiveBill(b)));

    useEffect(() => {
        if (visible) dispatch(setPeek(null));
    }, [visible, dispatch]);

    useNuiEvent('phone:time', (data) => {
        if (data) dispatch(setTime(data));
    });

    useNuiEvent('phone:settings', (data) => {
        if (data) dispatch(hydrate(data));
    });

    useNuiEvent('phone:photos:added', (data) => {
        if (data) dispatch(upsertPhoto(data));
    });

    const callPhaseRef = useRef(null);
    useNuiEvent('phone:call', (data) => {
        if (!data) return;
        const prev = callPhaseRef.current;

        if (data.type === 'incoming' || data.type === 'outgoing' || data.type === 'active') {
            if (prev === null) fetchNui('phone:spotify:pauseFor', {}, {});
            callPhaseRef.current = data.type;
            dispatch(applyCall(data));
            return;
        }

        if (data.type === 'ended' || data.type === 'failed') {
            const unansweredIncoming = prev === 'incoming';
            callPhaseRef.current = null;
            dispatch(loadPhoneState());
            fetchNui('phone:spotify:resumeAuto', {}, {});
            if (unansweredIncoming || !visible) dispatch(clearCall());
            else dispatch(applyCall(data));
            return;
        }

        dispatch(applyCall(data));
    });

    useNuiEvent('phone:video:start', (d) => {
        if (!d) return;
        dispatch(setVideo({ active: true, role: d.role, callId: d.callId, ice: d.ice }));
    });

    useNuiEvent('phone:video:stop', () => {
        stopVideoCall();
        dispatch(setVideo({ active: false }));
        dispatch(setVideoReq(null));
    });

    useNuiEvent('phone:video:signal', (d) => {
        if (d) onVideoSignal(d.blob);
    });
    useNuiEvent('phone:video:request', (d) => dispatch(setVideoReq((d && d.callId) ?? null)));
    useNuiEvent('phone:video:declined', () => {
        dispatch(setVideoReq(null));
        dispatch(pushToast({ kind: 'info', text: 'Video call declined' }));
    });

    const walkKeyRef = useRef('LMENU');
    const walkKeyCodes = (name) => {
        const named = {
            LMENU: ['AltLeft'],
            RMENU: ['AltRight'],
            MENU: ['AltLeft', 'AltRight'],
            LSHIFT: ['ShiftLeft'],
            RSHIFT: ['ShiftRight'],
            SHIFT: ['ShiftLeft', 'ShiftRight'],
            LCONTROL: ['ControlLeft'],
            RCONTROL: ['ControlRight'],
            CONTROL: ['ControlLeft', 'ControlRight'],
            CAPITAL: ['CapsLock'],
            TAB: ['Tab'],
            SPACE: ['Space'],
            BACK: ['Backspace'],
            RETURN: ['Enter'],
        };
        const n = String(name || 'LMENU').toUpperCase();
        if (named[n]) return named[n];
        if (n.length === 1 && n >= 'A' && n <= 'Z') return ['Key' + n];
        if (n.length === 1 && n >= '0' && n <= '9') return ['Digit' + n];
        if (/^F([1-9]|1[0-2])$/.test(n)) return [n];
        return ['AltLeft'];
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.repeat || !visible) return;
            if (walkKeyCodes(walkKeyRef.current).includes(e.code)) {
                e.preventDefault();
                fetchNui('phone:walk:toggle', {}, {});
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [visible]);

    const closePhone = () => {
        dispatch(setLightbox(null));
        dispatch(setVisible(false));
        fetchNui('phone:close', {}, {});
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            if (lightbox) dispatch(setLightbox(null));
            else if (activeApp === 'camera') dispatch(closeApp());
            else if (visible) closePhone();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [visible, lightbox, activeApp]);

    useEffect(() => {
        fetchNui('phone:ready', {}, {});
    }, []);

    useEffect(() => {
        if (isEnvBrowser()) {
            document.body.classList.add('dev-backdrop');
            dispatch(hydrate({ wallpaper: 'default', brightness: 100 }));
            dispatch(setVisible(true));
        }
    }, [dispatch]);

    if (!visible && !peek) return null;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                visibility: captureHidden ? 'hidden' : 'visible',
            }}
        >
            {visible && <Phone />}
            {visible && <Lightbox />}
            {!visible && peek && (
                <PhonePeek key={peek.id} notif={peek} onDone={() => dispatch(setPeek(null))} />
            )}
        </div>
    );
}
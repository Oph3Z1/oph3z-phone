import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Phone from './components/Phone/Phone';
import Lightbox from './components/Lightbox/Lightbox';
import PhonePeek from './components/Notifications/PhonePeek';
import { useNuiEvent } from './hooks/useNuiEvent';
import { fetchNui } from './utils/fetchNui';
import { isEnvBrowser } from './utils/misc';
import { setVisible, setTime, closeApp, openApp, unlock, setIdentity } from './store/slices/phoneSlice';
import { setLayout, setExternalApps } from './store/slices/appsSlice';
import { bumpLive } from './store/slices/xSlice';
import { setSaved, setDownloadMs } from './store/slices/homeSlice';
import { hydrate } from './store/slices/settingsSlice';
import { setI18n } from './store/slices/i18nSlice';
import { applyCall, clearCall } from './store/slices/callSlice';
import { loadPhoneState } from './store/slices/contactsSlice';
import { upsertPhoto, setLightbox } from './store/slices/photosSlice';
import { presentNotification, loadNotifications, setPeek } from './store/slices/notificationsSlice';
import { pushToast, clearToast } from './store/slices/toastSlice';
import { presentIncoming, loadPending, stashIsland, applyStatus } from './store/slices/airdropSlice';
import { loadClock, onTimerDone, onRing, setRinging, setAlarmEnabled } from './store/slices/clockSlice';
import { loadMail, receiveMail } from './store/slices/mailSlice';
import { loadWallet, receiveIncoming as walletIncoming, receiveBill } from './store/slices/walletSlice';
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
  // Latest call state, read inside NUI-event handlers (which close over renders).
  const callState = useSelector((s) => s.call.state);
  const callStateRef = useRef(callState);
  callStateRef.current = callState;

  // Notification sound (notify.wav in web/public/audio/).
  const notifAudio = useRef(null);
  const playNotify = () => {
    try {
      if (!notifAudio.current) notifAudio.current = new Audio('./audio/notify.wav');
      notifAudio.current.currentTime = 0;
      const p = notifAudio.current.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {
      /* no audio available */
    }
  };

  // While the Camera takes a photo, the whole phone is hidden for one frame so
  // the screenshot is clean (kept mounted via visibility, not unmounted).
  const [captureHidden, setCaptureHidden] = useState(false);
  useNuiEvent('phone:camera:capturing', (on) => setCaptureHidden(!!on));

  // Lua -> show/hide the phone (and hydrate data on open).
  useNuiEvent('phone:setVisible', (data) => {
    if (data?.visible) {
      if (data.settings) dispatch(hydrate(data.settings));
      if (data.i18n) dispatch(setI18n(data.i18n));
      if (data.time) dispatch(setTime(data.time));
      if (data.apps) dispatch(setLayout(data.apps)); // built-in app layout (Config.Apps)
      if (data.identity) dispatch(setIdentity(data.identity)); // shared with app iframes
      dispatch(setSaved(data.home || null)); // saved home-screen layout (applied on reconcile)
      if (data.appstore && data.appstore.downloadSeconds)
        dispatch(setDownloadMs(data.appstore.downloadSeconds * 1000));
      dispatch(setVisible(true));
      dispatch(loadNotifications()); // refresh the lock screen / center on open
      dispatch(loadPending()); // pending AirDrops waiting to be accepted
      dispatch(loadClock()); // alarms / running timer / recents (also arms alarms)
      dispatch(loadMail()); // refresh the mailbox on open
      dispatch(loadWallet()); // balance / transactions / bills
      dispatch(loadSpotifyState()); // restore the music player (may be playing while closed)
    } else {
      dispatch(setVisible(false));
      dispatch(setLightbox(null));
      dispatch(clearToast()); // kill any on-screen toast so it can't resurface on reopen
      dispatch(stashIsland()); // an unacted AirDrop island moves to the Notification Center
      // A finished call must not survive a phone close (the phone auto-opens for an
      // incoming call, then auto-closes ~1.6s after it ends — which unmounts the
      // CallOverlay and cancels its own clear timer). Purge it here so it can't
      // reappear as a stale "call ended" screen on the next open. An ongoing
      // (active/incoming/outgoing) call is left alone so reopening still shows it.
      if (callStateRef.current === 'ended' || callStateRef.current === 'failed') dispatch(clearCall());
    }
  });

  // Lua -> the set of registered third-party apps changed (resource start/stop).
  useNuiEvent('phone:apps:external', (list) => dispatch(setExternalApps(list || [])));

  // Lua -> a live X event (new bell notification): bump the tick so open X screens refresh.
  useNuiEvent('phone:x:live', () => dispatch(bumpLive()));

  // Lua -> open a specific app (exports.OpenApp from another resource).
  useNuiEvent('phone:openApp', (d) => {
    if (!d || !d.id) return;
    dispatch(unlock());
    dispatch(openApp(d.id));
  });

  // Live notification arrived: store it, play the sound, and present it (peek if
  // the phone is closed, banner if open & unlocked, else it's on the lock screen).
  useNuiEvent('phone:notify', (item) => {
    if (!item) return;
    const shown = dispatch(presentNotification(item));
    // Master-off notifications never reach the client (dropped server-side); here
    // we honour the "Notification Sound" toggle for the ones that do.
    if (shown && notifSoundRef.current !== false) playNotify();
  });

  // Lua -> transient status toast (success / error / info). Not saved anywhere.
  useNuiEvent('phone:toast', (d) => dispatch(pushToast(d)));

  // Lua (Spotify engine) -> now-playing sync. These fire even while the phone is
  // closed (music keeps playing via xsound), keeping redux ready for reopen.
  useNuiEvent('phone:spotify:track', (d) => d && dispatch(applyTrack(d)));
  useNuiEvent('phone:spotify:tick', (d) => d && dispatch(applyTick(d)));
  useNuiEvent('phone:spotify:playing', (d) => d && dispatch(setMusicPlaying(!!d.playing)));
  useNuiEvent('phone:spotify:stopped', () => { dispatch(clearTrack()); dispatch(clearNow()); });

  // Media volume (Control Center / Now Playing slider) drives the music engine.
  const mediaVolume = useSelector((s) => s.settings.volume);
  const volInit = useRef(true);
  useEffect(() => {
    if (volInit.current) { volInit.current = false; return; }
    fetchNui('phone:spotify:setVolume', { volume: mediaVolume }, {});
  }, [mediaVolume]);

  // Lua -> an AirDrop transfer arrived (island if open+unlocked, else it waits in
  // the Notification Center).
  useNuiEvent('phone:airdrop:incoming', (transfer) => {
    // When the phone is closed this peeks it up; play the notify sound like any
    // other notification (honouring the sound toggle).
    const shown = dispatch(presentIncoming(transfer));
    if (shown && notifSoundRef.current !== false) playNotify();
  });

  // Lua -> the person you AirDropped to accepted/declined. Reflect it + toast.
  useNuiEvent('phone:airdrop:status', (status) => dispatch(applyStatus(status)));

  // Lua -> Clock: a timer finished (banked recents come back), an alarm/timer is
  // ringing (show overlay), or the ring stopped.
  useNuiEvent('phone:clock:timerDone', (d) => dispatch(onTimerDone(d)));
  useNuiEvent('phone:clock:ring', (d) => dispatch(onRing(d)));
  useNuiEvent('phone:clock:ringStop', () => dispatch(setRinging(null)));
  // One-shot alarms switch themselves off after ringing — reflect that in the UI.
  useNuiEvent('phone:clock:alarmFire', (d) => {
    if (d && d.id != null) dispatch(setAlarmEnabled({ id: d.id, enabled: false }));
  });

  // Lua -> a new mail arrived: add it to the inbox (the notification system shows
  // the banner/peek separately).
  useNuiEvent('phone:mail:incoming', (item) => dispatch(receiveMail(item)));

  // Lua -> Wallet: money received (balance + transaction) or a new bill.
  useNuiEvent('phone:wallet:incoming', (d) => dispatch(walletIncoming(d)));
  useNuiEvent('phone:wallet:bill', (b) => dispatch(receiveBill(b)));

  // Opening the phone ends any active peek (it becomes the lock-screen list).
  useEffect(() => {
    if (visible) dispatch(setPeek(null));
  }, [visible, dispatch]);

  // Lua -> live clock / weather stream.
  useNuiEvent('phone:time', (data) => {
    if (data) dispatch(setTime(data));
  });

  // Lua -> a settings value changed externally (e.g. /airplane command).
  useNuiEvent('phone:settings', (data) => {
    if (data) dispatch(hydrate(data));
  });

  // Lua -> a photo was added (e.g. /addphoto, later the Camera app).
  useNuiEvent('phone:photos:added', (data) => {
    if (data) dispatch(upsertPhoto(data));
  });

  // Lua -> call events (incoming / outgoing / active / ended / failed).
  // callPhaseRef tracks the phase SYNCHRONOUSLY (events can arrive back-to-back
  // faster than React re-renders), so we can tell an unanswered incoming call from
  // an answered one.
  const callPhaseRef = useRef(null);
  useNuiEvent('phone:call', (data) => {
    if (!data) return;
    const prev = callPhaseRef.current;

    if (data.type === 'incoming' || data.type === 'outgoing' || data.type === 'active') {
      // Pause any playing music once, when the call first starts.
      if (prev === null) fetchNui('phone:spotify:pauseFor', {}, {});
      callPhaseRef.current = data.type;
      dispatch(applyCall(data));
      return;
    }

    if (data.type === 'ended' || data.type === 'failed') {
      const unansweredIncoming = prev === 'incoming'; // rang, never answered
      callPhaseRef.current = null;
      dispatch(loadPhoneState()); // refresh Recents (missed call is logged server-side)
      fetchNui('phone:spotify:resumeAuto', {}, {}); // resume music we paused for the call
      // Don't show a "call ended" screen for a call you never answered (or if the
      // phone is closed) — just clear it. Answered calls still get the brief screen.
      if (unansweredIncoming || !visible) dispatch(clearCall());
      else dispatch(applyCall(data));
      return;
    }

    dispatch(applyCall(data));
  });

  // Tell Lua to close the phone (and release NUI focus).
  const closePhone = () => {
    dispatch(setLightbox(null));
    dispatch(setVisible(false));
    fetchNui('phone:close', {}, {});
  };

  // Escape priority: lightbox -> camera (back to home) -> close the phone.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (lightbox) dispatch(setLightbox(null));
      else if (activeApp === 'camera') dispatch(closeApp());
      else if (visible) closePhone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, lightbox, activeApp]);

  // Announce readiness once mounted.
  useEffect(() => {
    fetchNui('phone:ready', {}, {});
  }, []);

  // Browser dev mode: dark backdrop + auto-open so we can build the UI.
  useEffect(() => {
    if (isEnvBrowser()) {
      document.body.classList.add('dev-backdrop');
      dispatch(hydrate({ wallpaper: 'default', brightness: 100 }));
      dispatch(setVisible(true));
    }
  }, [dispatch]);

  // Render while open OR while a closed-phone peek is showing.
  if (!visible && !peek) return null;

  // Hidden (not unmounted) during a photo capture so the shot is clean.
  return (
    <div style={{ width: '100%', height: '100%', visibility: captureHidden ? 'hidden' : 'visible' }}>
      {visible && <Phone />}
      {visible && <Lightbox />}
      {!visible && peek && <PhonePeek key={peek.id} notif={peek} onDone={() => dispatch(setPeek(null))} />}
    </div>
  );
}

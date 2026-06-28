import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Phone from './components/Phone/Phone';
import Lightbox from './components/Lightbox/Lightbox';
import { useNuiEvent } from './hooks/useNuiEvent';
import { fetchNui } from './utils/fetchNui';
import { isEnvBrowser } from './utils/misc';
import { setVisible, setTime, closeApp } from './store/slices/phoneSlice';
import { hydrate } from './store/slices/settingsSlice';
import { applyCall } from './store/slices/callSlice';
import { loadPhoneState } from './store/slices/contactsSlice';
import { upsertPhoto, setLightbox } from './store/slices/photosSlice';

export default function App() {
  const dispatch = useDispatch();
  const visible = useSelector((s) => s.phone.visible);
  const activeApp = useSelector((s) => s.phone.activeApp);
  const lightbox = useSelector((s) => s.photos.lightbox);

  // While the Camera takes a photo, the whole phone is hidden for one frame so
  // the screenshot is clean (kept mounted via visibility, not unmounted).
  const [captureHidden, setCaptureHidden] = useState(false);
  useNuiEvent('phone:camera:capturing', (on) => setCaptureHidden(!!on));

  // Lua -> show/hide the phone (and hydrate data on open).
  useNuiEvent('phone:setVisible', (data) => {
    if (data?.visible) {
      if (data.settings) dispatch(hydrate(data.settings));
      if (data.time) dispatch(setTime(data.time));
      dispatch(setVisible(true));
    } else {
      dispatch(setVisible(false));
      dispatch(setLightbox(null));
    }
  });

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
  useNuiEvent('phone:call', (data) => {
    if (!data) return;
    dispatch(applyCall(data));
    // Refresh contacts/recents after a call so new history shows up.
    if (data.type === 'ended') dispatch(loadPhoneState());
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

  if (!visible) return null;

  // Hidden (not unmounted) during a photo capture so the shot is clean.
  return (
    <div style={{ width: '100%', height: '100%', visibility: captureHidden ? 'hidden' : 'visible' }}>
      <Phone />
      <Lightbox />
    </div>
  );
}

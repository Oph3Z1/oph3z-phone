import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeApp } from '../../store/slices/phoneSlice';
import './ExternalApp.css';

// Renders a third-party app inside the phone as an iframe (the dev's own resource
// serves the page, in any framework). A tiny postMessage bridge hands the app the
// player's identity on load and lets it ask the phone to go home.
//
// Bridge messages:
//   phone  -> app : { type:'oph3z:init', identity:{ number, numberRaw, citizenid }, app:{ id, label } }
//   app    -> phone: { type:'oph3z:ready' }   request a (re)send of the init payload
//   app    -> phone: { type:'oph3z:close' }   go back to the home screen
// Iframes load most reliably from the https cfx-nui scheme; accept nui:// too and
// normalize it (devs may write either).
function toFrameSrc(url) {
  if (typeof url === 'string' && url.startsWith('nui://')) {
    return 'https://cfx-nui-' + url.slice('nui://'.length);
  }
  return url;
}

export default function ExternalApp({ app }) {
  const dispatch = useDispatch();
  const identity = useSelector((s) => s.phone.identity);
  const frameRef = useRef(null);

  const sendInit = () => {
    const win = frameRef.current && frameRef.current.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'oph3z:init', app: { id: app.id, label: app.label }, identity }, '*');
  };

  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (d.type === 'oph3z:ready') sendInit();
      else if (d.type === 'oph3z:close') dispatch(closeApp());
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.id, identity]);

  return (
    <div className="extapp">
      <iframe
        ref={frameRef}
        className="extapp__frame"
        src={toFrameSrc(app.url)}
        title={app.label}
        onLoad={sendInit}
        allow="autoplay; microphone; camera; clipboard-read; clipboard-write"
      />
    </div>
  );
}

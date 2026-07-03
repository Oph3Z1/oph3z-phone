import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeApp } from '../../store/slices/phoneSlice';
import { openDialog } from '../../store/slices/dialogSlice';
import { openPrompt } from '../../store/slices/promptSlice';
import './ExternalApp.css';

// Renders a third-party app inside the phone as an iframe (the dev's own resource
// serves the page, in any framework). A tiny postMessage bridge hands the app the
// player's identity on load and lets it ask the phone to go home.
//
// Bridge messages:
//   phone  -> app : { type:'oph3z:init', identity:{ number, numberRaw, citizenid, name, email, avatar }, app:{ id, label } }
//   app    -> phone: { type:'oph3z:ready' }   request a (re)send of the init payload
//   app    -> phone: { type:'oph3z:close' }   go back to the home screen
//   app    -> phone: { type:'oph3z:prompt', id, title, message?, placeholder?, value?, confirmText?, cancelText? }
//                     -> phone replies { type:'oph3z:prompt:result', id, value }  (value is string or null)
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

  const postToApp = (msg) => {
    const win = frameRef.current && frameRef.current.contentWindow;
    if (win) win.postMessage(msg, '*');
  };

  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (d.type === 'oph3z:ready') sendInit();
      else if (d.type === 'oph3z:close') dispatch(closeApp());
      else if (d.type === 'oph3z:confirm') {
        // A yes/no confirmation using the phone-native dialog.
        dispatch(
          openDialog({
            title: d.title,
            message: d.message,
            buttons: [
              { text: d.cancelText || 'Cancel', style: 'cancel', value: false },
              { text: d.confirmText || 'OK', style: d.destructive ? 'destructive' : 'default', value: true },
            ],
          })
        ).then((confirmed) => postToApp({ type: 'oph3z:confirm:result', id: d.id, confirmed }));
      } else if (d.type === 'oph3z:alert') {
        // A custom dialog: buttons = [{ text, style?, value? }].
        const buttons = (d.buttons && d.buttons.length ? d.buttons : [{ text: 'OK' }]).map((b, i) => ({
          text: b.text,
          style: b.style,
          value: b.value !== undefined ? b.value : i,
        }));
        dispatch(openDialog({ title: d.title, message: d.message, buttons })).then((value) =>
          postToApp({ type: 'oph3z:alert:result', id: d.id, value })
        );
      } else if (d.type === 'oph3z:prompt') {
        // A text-input popup using the phone-native input dialog.
        dispatch(
          openPrompt({
            title: d.title,
            message: d.message,
            placeholder: d.placeholder,
            value: d.value,
            confirmText: d.confirmText,
            cancelText: d.cancelText,
            maxLength: d.maxLength,
            fields: d.fields, // array of { key, placeholder?, value? } -> reply value is an object
          })
        ).then((value) => postToApp({ type: 'oph3z:prompt:result', id: d.id, value }));
      }
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

import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeApp } from '../../store/slices/phoneSlice';
import { openDialog } from '../../store/slices/dialogSlice';
import { openPrompt } from '../../store/slices/promptSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { clearNotifsFor } from '../../store/slices/notificationsSlice';
import { openShare, clearDeliver } from '../../store/slices/airdropSlice';
import { finishAppShare, cancelAppShare } from '../../store/slices/shareSlice';
import ExternalShareSheet from './ExternalShareSheet';
import './ExternalApp.css';

// Renders a third-party app inside the phone as an iframe (the dev's own resource
// serves the page, in any framework). A tiny postMessage bridge hands the app the
// player's identity on load and lets it ask the phone to go home.
//
// Bridge messages:
//   phone  -> app : { type:'oph3z:init', identity:{ number, numberRaw, citizenid, name, email, avatar }, app:{ id, label }, language }
//   app    -> phone: { type:'oph3z:ready' }   request a (re)send of the init payload
//   phone  -> app : { type:'oph3z:language', language }   the player switched the phone
//                     language — sync your app's UI (also included in oph3z:init).
//   app    -> phone: { type:'oph3z:close' }   go back to the home screen
//   app    -> phone: { type:'oph3z:prompt', id, title, message?, placeholder?, value?, confirmText?, cancelText? }
//                     -> phone replies { type:'oph3z:prompt:result', id, value }  (value is string or null)
//   app    -> phone: { type:'oph3z:toast', toastType?('success'|'error'|'info'), title?, body? }
//                     transient status toast; icon defaults to this app's icon. No reply.
//   app    -> phone: { type:'oph3z:airdrop', title?, payload }   AirDrop something to a
//                     nearby player; on accept the SAME app opens on their phone and
//                     receives { type:'oph3z:airdrop:received', payload }.
//   app    -> phone: { type:'oph3z:share', item:{ title, subtitle?, image?, payload } }
//                     Opens the native Share sheet (AirDrop to Nearby OR Send in
//                     Messages). Either way `payload` round-trips: the receiver opens
//                     THIS app and gets { type:'oph3z:airdrop:received', payload }.
//   phone  -> app : { type:'oph3z:shareRequest' }   the app was opened from the Messages
//                     Share sheet (register with share:true) to provide a shareable item.
//   app    -> phone: { type:'oph3z:shareResult', item:{ title, subtitle?, image?, data? } }
//                     -> sent into the conversation as an `appshare` card.
//   app    -> phone: { type:'oph3z:shareCancel' }   abort the share, back to the chat.
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
  const language = useSelector((s) => s.settings.language); // phone language, for i18n sync
  const deliver = useSelector((s) => s.airdrop.deliver);
  const deliverRef = useRef(deliver);
  deliverRef.current = deliver;
  const shareReq = useSelector((s) => s.share.request);
  const shareReqRef = useRef(shareReq);
  shareReqRef.current = shareReq;
  const sharePosted = useRef(false);
  const frameRef = useRef(null);
  const [shareItem, setShareItem] = useState(null); // app-initiated Share sheet

  const postToApp = (msg) => {
    const win = frameRef.current && frameRef.current.contentWindow;
    if (win) win.postMessage(msg, '*');
  };

  // If an accepted AirDrop is waiting for THIS app, hand it the payload.
  const deliverAirdrop = () => {
    const d = deliverRef.current;
    if (d && d.appId === app.id) {
      postToApp({ type: 'oph3z:airdrop:received', payload: d.payload });
      dispatch(clearDeliver());
    }
  };

  // If this app was opened from the Messages Share sheet, ask it for an item (once).
  const postShareRequest = () => {
    const r = shareReqRef.current;
    if (r && r.appId === app.id && !sharePosted.current) {
      sharePosted.current = true;
      postToApp({ type: 'oph3z:shareRequest' });
    }
  };

  const sendInit = () => {
    const win = frameRef.current && frameRef.current.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'oph3z:init', app: { id: app.id, label: app.label }, identity, language }, '*');
    deliverAirdrop();
    postShareRequest();
  };

  // Push the phone language to the app whenever the player switches it, so a
  // third-party app can keep its own UI in sync (also sent in oph3z:init).
  useEffect(() => {
    postToApp({ type: 'oph3z:language', language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Opening the app clears its notifications — badge AND the entries in the
  // Notification Center — exactly like opening a chat in Messages. Also covers
  // tapping a notification (which opens the app, then this removes it).
  useEffect(() => {
    dispatch(clearNotifsFor({ app: app.id }));
  }, [app.id, dispatch]);

  // Deliver an accepted AirDrop payload if this app is already open when it lands.
  useEffect(() => {
    if (deliver && deliver.appId === app.id) deliverAirdrop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliver, app.id]);

  // Ask for a shareable item if opened from the Messages Share sheet.
  useEffect(() => {
    if (shareReq && shareReq.appId === app.id) postShareRequest();
    else sharePosted.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareReq, app.id]);

  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (d.type === 'oph3z:ready') { sendInit(); deliverAirdrop(); postShareRequest(); }
      else if (d.type === 'oph3z:close') dispatch(closeApp());
      else if (d.type === 'oph3z:toast') {
        // A transient status toast; icon defaults to this app's own icon.
        dispatch(pushToast({ type: d.toastType, title: d.title, body: d.body, app: app.id }));
      } else if (d.type === 'oph3z:airdrop') {
        // AirDrop a payload to a nearby player; the same app receives it on accept.
        dispatch(openShare({ kind: 'app', app: { id: app.id, title: d.title || app.label, icon: app.icon, payload: d.payload } }));
      } else if (d.type === 'oph3z:share') {
        // App-initiated Share: open the native sheet (AirDrop / Send in Messages).
        setShareItem(d.item || {});
      } else if (d.type === 'oph3z:shareResult') {
        // The app returned a shareable item -> post it into the conversation.
        dispatch(finishAppShare(d.item));
      } else if (d.type === 'oph3z:shareCancel') {
        dispatch(cancelAppShare());
      }
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
      {shareItem && (
        <ExternalShareSheet app={app} item={shareItem} onClose={() => setShareItem(null)} />
      )}
    </div>
  );
}

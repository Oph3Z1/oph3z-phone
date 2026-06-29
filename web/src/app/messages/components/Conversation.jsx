import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from './Avatar';
import Bubble from './Bubble';
import MessageInput from './MessageInput';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { digitsOf } from '../../../store/slices/contactsSlice';
import {
  openThread,
  sendMessage,
  sendMoney,
  sendRequest,
  settleNegotiation,
  declineNegotiation,
  setActive,
  setShareTo,
  setDraftAttach,
  sendLocation,
  stopLive,
} from '../../../store/slices/messagesSlice';
import { openApp } from '../../../store/slices/phoneSlice';
import { loadPhotos } from '../../../store/slices/photosSlice';
import { setFocus } from '../../../store/slices/mapsSlice';
import MediaViewer from './MediaViewer';

const MONEY_ERR = {
  funds: 'Not enough bank balance.',
  offline: "They're offline right now.",
  recipient: "Can't send to this number.",
  amount: 'Enter an amount.',
  gone: 'That request is no longer available.',
};
const MAX_AMOUNT = 9999999;

function Keypad({ onDigit, onBack }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
  return (
    <div className="msg-keypad">
      {keys.map((k, i) =>
        k === '' ? (
          <span key={i} />
        ) : (
          <button key={i} className="msg-keypad__key" onClick={() => (k === 'back' ? onBack() : onDigit(k))}>
            {k === 'back' ? '⌫' : k}
          </button>
        )
      )}
    </div>
  );
}

export default function Conversation({ number, onBack }) {
  const dispatch = useDispatch();
  const conv = useSelector((s) => s.messages.byNumber[number]);
  const selfNumber = digitsOf(useSelector((s) => s.contacts.number));
  const gallery = useSelector((s) => s.photos.items);
  const draft = useSelector((s) => s.messages.draftAttach[number]);
  const scrollRef = useRef(null);

  const [attach, setAttach] = useState(null); // null | 'menu' | 'money' | 'gallery'
  const [viewer, setViewer] = useState(null); // media message being viewed fullscreen
  const [moneyMode, setMoneyMode] = useState('send'); // 'send' | 'request'
  const [amount, setAmount] = useState(0);
  const [showKeypad, setShowKeypad] = useState(false);
  const [moneyErr, setMoneyErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    dispatch(openThread(number));
    dispatch(setActive(number));
    return () => dispatch(setActive(null));
  }, [number, dispatch]);

  const items = conv?.items || [];
  // Pin to the newest message. Re-pin as images/videos finish loading, since
  // they grow the content after the first paint (otherwise we land a bit short).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const toBottom = () => {
      el.scrollTop = el.scrollHeight;
    };
    toBottom();
    const media = el.querySelectorAll('img, video');
    media.forEach((m) => {
      m.addEventListener('load', toBottom);
      m.addEventListener('loadeddata', toBottom);
    });
    return () => {
      media.forEach((m) => {
        m.removeEventListener('load', toBottom);
        m.removeEventListener('loadeddata', toBottom);
      });
    };
  }, [items.length]);

  useEffect(() => {
    if (attach !== 'money') return;
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        setMoneyErr('');
        setAmount((a) => Math.min(MAX_AMOUNT, a * 10 + Number(e.key)));
      } else if (e.key === 'Backspace') setAmount((a) => Math.floor(a / 10));
      else if (e.key === 'Escape') closeAttach();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attach]);

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 2800);
  };

  // Send the pending attachment (if any) then the typed text — each its own bubble.
  const send = (text) => {
    if (draft) {
      dispatch(sendMessage(number, { type: draft.type, body: draft.url }));
      dispatch(setDraftAttach({ number, attach: null }));
    }
    const body = text.trim();
    if (body) dispatch(sendMessage(number, { type: 'text', body }));
  };
  const removeDraft = () => dispatch(setDraftAttach({ number, attach: null }));

  // Camera button: open the Camera app to capture, then attach it here as a draft.
  const openCamera = () => {
    dispatch(setShareTo(number));
    dispatch(openApp('camera'));
  };

  // "Photos" in the + menu: pick an existing photo/video to attach as a draft.
  const openGallery = () => {
    dispatch(loadPhotos());
    setAttach('gallery');
  };
  const attachFromGallery = (item) => {
    dispatch(setDraftAttach({ number, attach: { type: item.type || 'image', url: item.url } }));
    closeAttach();
  };

  // Location: send current, or share live for a duration (seconds; 0 = until stopped).
  const shareLocation = (opts) => {
    dispatch(sendLocation(number, opts));
    closeAttach();
  };
  const openLocation = (meta) => {
    dispatch(setFocus({ x: meta.x, y: meta.y, label: meta.label, number }));
    dispatch(openApp('maps'));
  };
  const stopLiveShare = (msg) => {
    dispatch(stopLive(number, msg.meta && msg.meta.sid, msg.id));
  };

  const openMoney = (mode = 'send') => {
    setMoneyMode(mode);
    setAmount(0);
    setShowKeypad(false);
    setMoneyErr('');
    setAttach('money');
  };
  const closeAttach = () => {
    setAttach(null);
    setMoneyErr('');
  };

  const doSend = async () => {
    if (amount <= 0) return setMoneyErr(MONEY_ERR.amount);
    setBusy(true);
    const res = await dispatch(sendMoney(number, amount));
    setBusy(false);
    if (res && res.ok) closeAttach();
    else setMoneyErr(MONEY_ERR[res?.reason] || 'Could not send.');
  };
  const doRequest = () => {
    if (amount <= 0) return setMoneyErr(MONEY_ERR.amount);
    dispatch(sendRequest(number, amount));
    closeAttach();
  };

  const settle = async (id) => {
    const res = await dispatch(settleNegotiation(number, id));
    if (res && !res.ok) showNotice(MONEY_ERR[res.reason] || 'Could not complete.');
  };
  const decline = async (id) => {
    const res = await dispatch(declineNegotiation(number, id));
    if (res && !res.ok) showNotice(MONEY_ERR[res.reason] || 'Could not decline.');
  };

  const name = conv?.name || number;

  return (
    <div className="msg msg--conv">
      <div className="msg-conv__bar">
        <button className="msg-conv__back" onClick={onBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <div className="msg-conv__who">
          <Avatar name={name} src={conv?.avatar} className="msg-avatar--md" />
          <div className="msg-conv__name">
            {name}
            <ChevronRightIcon className="msg-conv__namechev" />
          </div>
        </div>
        <div className="msg-conv__spacer" />
      </div>

      {notice && <div className="msg-notice">{notice}</div>}

      <div className="msg-conv__scroll" ref={scrollRef}>
        {items.map((m) => (
          <Bubble
            key={m.id}
            msg={m}
            selfNumber={selfNumber}
            onSettle={settle}
            onDecline={decline}
            onOpenMedia={setViewer}
            onOpenLocation={openLocation}
            onStopLive={stopLiveShare}
          />
        ))}
      </div>

      <MessageInput
        onSend={send}
        onCamera={openCamera}
        onPlus={() => setAttach('menu')}
        attachment={draft}
        onRemoveAttachment={removeDraft}
      />

      {attach === 'menu' && (
        <div className="msg-attach" onClick={closeAttach}>
          <div className="msg-attach__sheet" onClick={(e) => e.stopPropagation()}>
            <div className="msg-attach__group">
              <button className="msg-attach__item" onClick={openGallery}>
                <span className="msg-attach__ico msg-attach__ico--photos">
                  <PhotosIcon />
                </span>
                <span className="msg-attach__label">Photos</span>
              </button>
              <button className="msg-attach__item" onClick={() => setAttach('location')}>
                <span className="msg-attach__ico msg-attach__ico--loc">
                  <PinIcon />
                </span>
                <span className="msg-attach__label">Location</span>
              </button>
              <button className="msg-attach__item" onClick={() => openMoney('send')}>
                <span className="msg-attach__ico msg-attach__ico--cash">$</span>
                <span className="msg-attach__label">Send Money</span>
              </button>
              <button className="msg-attach__item" onClick={() => openMoney('request')}>
                <span className="msg-attach__ico msg-attach__ico--req">
                  <ReqIcon />
                </span>
                <span className="msg-attach__label">Request</span>
              </button>
            </div>
            <button className="msg-attach__cancel" onClick={closeAttach}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {attach === 'money' && (
        <>
          <div className="msg-cash-backdrop" onClick={closeAttach} />
          <div className="msg-cash">
            <button className="msg-cash__grab" onClick={closeAttach} aria-label="Close" />

            <div className="msg-cash__amountrow">
              <button className="msg-cash__step" onClick={() => setAmount((a) => Math.max(0, a - 1))}>
                −
              </button>
              <div className="msg-cash__amount">${amount.toLocaleString()}</div>
              <button className="msg-cash__step" onClick={() => setAmount((a) => Math.min(MAX_AMOUNT, a + 1))}>
                +
              </button>
            </div>

            <button className="msg-cash__kbtoggle" onClick={() => setShowKeypad((v) => !v)}>
              {showKeypad ? 'Hide Keypad' : 'Show Keypad'}
            </button>

            {moneyErr && <div className="msg-cash__err">{moneyErr}</div>}

            {showKeypad && (
              <Keypad
                onDigit={(d) => {
                  setMoneyErr('');
                  setAmount((a) => Math.min(MAX_AMOUNT, a * 10 + Number(d)));
                }}
                onBack={() => setAmount((a) => Math.floor(a / 10))}
              />
            )}

            <div className="msg-cash__buttons">
              <button className="msg-cash__btn msg-cash__btn--cancel" onClick={closeAttach}>
                Cancel
              </button>
              {moneyMode === 'request' ? (
                <button className="msg-cash__btn msg-cash__btn--req" onClick={doRequest}>
                  Request
                </button>
              ) : (
                <button className="msg-cash__btn msg-cash__btn--send" onClick={doSend} disabled={busy}>
                  {busy ? 'Sending…' : 'Send'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {attach === 'gallery' && (
        <>
          <div className="msg-cash-backdrop" onClick={closeAttach} />
          <div className="msg-gallery">
            <button className="msg-cash__grab" onClick={closeAttach} aria-label="Close" />
            <div className="msg-gallery__title">Choose a Photo or Video</div>
            <div className="msg-gallery__grid">
              {gallery.length === 0 && <div className="msg-gallery__empty">No photos yet.</div>}
              {[...gallery]
                .sort((a, b) => (b.ts || 0) - (a.ts || 0))
                .map((item) => (
                  <button key={item.id} className="msg-gallery__cell" onClick={() => attachFromGallery(item)}>
                    {item.type === 'video' ? (
                      <>
                        <video src={item.url} muted />
                        <span className="msg-gallery__vid">▶</span>
                      </>
                    ) : (
                      <img src={item.url} alt="" />
                    )}
                  </button>
                ))}
            </div>
          </div>
        </>
      )}

      {attach === 'location' && (
        <div className="msg-attach" onClick={closeAttach}>
          <div className="msg-attach__sheet" onClick={(e) => e.stopPropagation()}>
            <div className="msg-attach__group">
              <button className="msg-attach__item" onClick={() => shareLocation({ live: false })}>
                <span className="msg-attach__ico msg-attach__ico--loc">
                  <PinIcon />
                </span>
                <span className="msg-attach__label">Send Current Location</span>
              </button>
              <button className="msg-attach__item" onClick={() => shareLocation({ live: true, duration: 900 })}>
                <span className="msg-attach__ico msg-attach__ico--live">
                  <LiveIcon />
                </span>
                <span className="msg-attach__label">Share Live · 15 min</span>
              </button>
              <button className="msg-attach__item" onClick={() => shareLocation({ live: true, duration: 3600 })}>
                <span className="msg-attach__ico msg-attach__ico--live">
                  <LiveIcon />
                </span>
                <span className="msg-attach__label">Share Live · 1 hour</span>
              </button>
              <button className="msg-attach__item" onClick={() => shareLocation({ live: true, duration: 0 })}>
                <span className="msg-attach__ico msg-attach__ico--live">
                  <LiveIcon />
                </span>
                <span className="msg-attach__label">Share Live · Until I stop</span>
              </button>
            </div>
            <button className="msg-attach__cancel" onClick={closeAttach}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {viewer && <MediaViewer item={{ type: viewer.type, url: viewer.body }} onClose={() => setViewer(null)} />}
    </div>
  );
}

const PinIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a7 7 0 00-7 7c0 4.8 7 13 7 13s7-8.2 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
  </svg>
);

const LiveIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    <path d="M5.5 5.5a9 9 0 000 13M18.5 5.5a9 9 0 010 13" />
  </svg>
);

const PhotosIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <circle cx="8.5" cy="8.5" r="1.6" />
    <path d="M21 16l-5-5L5 21" />
  </svg>
);

const ReqIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9h13l-3-3M20 15H7l3 3" />
  </svg>
);

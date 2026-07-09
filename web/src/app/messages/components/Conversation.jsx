import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from './Avatar';
import Bubble from './Bubble';
import MessageInput from './MessageInput';
import { ChevronLeftIcon, ChevronRightIcon, CameraIcon, GifIcon } from './icons';
import { digitsOf, setContactFocus, addContact } from '../../../store/slices/contactsSlice';
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
    setReturnProfile,
    setResumeThread,
    sendLocation,
    stopLive,
} from '../../../store/slices/messagesSlice';
import { openApp } from '../../../store/slices/phoneSlice';
import { loadPhotos } from '../../../store/slices/photosSlice';
import { setFocus } from '../../../store/slices/mapsSlice';
import { clearNotifsFor } from '../../../store/slices/notificationsSlice';
import { startAppShare } from '../../../store/slices/shareSlice';
import { pushToast } from '../../../store/slices/toastSlice';
import { fetchNui } from '../../../utils/fetchNui';
import ContactPicker from './ContactPicker';
import MediaViewer from './MediaViewer';
import VoiceComposer from './VoiceComposer';
import GifPicker from './GifPicker';
import { useT } from '../../../i18n/useT';

const MONEY_ERR_KEY = {
    funds: 'messages.errFunds',
    offline: 'messages.errOffline',
    recipient: 'messages.errRecipient',
    amount: 'messages.errAmount',
    gone: 'messages.errGone',
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
                    <button
                        key={i}
                        className="msg-keypad__key"
                        onClick={() => (k === 'back' ? onBack() : onDigit(k))}
                    >
                        {k === 'back' ? '⌫' : k}
                    </button>
                ),
            )}
        </div>
    );
}

export default function Conversation({ number, onBack, onOpenThread }) {
    const dispatch = useDispatch();
    const t = useT();
    const conv = useSelector((s) => s.messages.byNumber[number]);
    const selfNumber = digitsOf(useSelector((s) => s.contacts.number));
    const contacts = useSelector((s) => s.contacts.contacts);
    const shareApps = useSelector((s) => s.apps.external.filter((a) => a.share));
    const gallery = useSelector((s) => s.photos.items);
    const draft = useSelector((s) => s.messages.draftAttach[number]);
    const returnProfile = useSelector((s) => s.messages.returnProfile);
    const scrollRef = useRef(null);

    const [backToProfile] = useState(() => returnProfile === number);

    const [attach, setAttach] = useState(null);
    const [cardMenu, setCardMenu] = useState(null);
    const [viewer, setViewer] = useState(null);
    const [showGif, setShowGif] = useState(false);
    const [recording, setRecording] = useState(false);
    const [moneyMode, setMoneyMode] = useState('send');
    const [amount, setAmount] = useState(0);
    const [showKeypad, setShowKeypad] = useState(false);
    const [moneyErr, setMoneyErr] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        dispatch(openThread(number));
        dispatch(setActive(number));
        dispatch(clearNotifsFor({ number }));
        return () => dispatch(setActive(null));
    }, [number, dispatch]);

    useEffect(() => {
        if (returnProfile === number) dispatch(setReturnProfile(null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleBack = () => {
        if (backToProfile) {
            dispatch(setContactFocus({ number }));
            dispatch(openApp('call'));
        } else {
            onBack();
        }
    };

    const items = conv?.items || [];
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

    const send = (text) => {
        if (draft) {
            dispatch(sendMessage(number, { type: draft.type, body: draft.url }));
            dispatch(setDraftAttach({ number, attach: null }));
        }
        const body = text.trim();
        if (body) dispatch(sendMessage(number, { type: 'text', body }));
    };
    const removeDraft = () => dispatch(setDraftAttach({ number, attach: null }));

    const openCamera = () => {
        dispatch(setShareTo(number));
        dispatch(openApp('camera'));
    };

    const openGallery = () => {
        dispatch(loadPhotos());
        setAttach('gallery');
    };
    const attachFromGallery = (item) => {
        dispatch(setDraftAttach({ number, attach: { type: item.type || 'image', url: item.url } }));
        closeAttach();
    };

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

    const sendGif = (url) => {
        dispatch(sendMessage(number, { type: 'gif', body: url }));
        setShowGif(false);
    };

    const sendVoice = (url, duration) => {
        dispatch(sendMessage(number, { type: 'voice', body: url, meta: { duration } }));
        setRecording(false);
    };

    const contactMsg = (c) => ({
        type: 'contact',
        body: c.name || c.number,
        meta: { name: c.name, number: c.number, img: c.img },
    });
    const sendContactTo = (to, c) => dispatch(sendMessage(to, contactMsg(c)));
    const pickContactToSend = (c) => {
        sendContactTo(number, c);
        closeAttach();
    };
    const startShareApp = (a) => {
        dispatch(startAppShare(a.id, number));
        closeAttach();
    };

    const cardIsSaved = (meta) =>
        contacts.some((c) => digitsOf(c.number) === digitsOf(meta.number));
    const cardCall = (meta) => {
        fetchNui('phone:call:start', { number: meta.number }, {});
        setCardMenu(null);
    };
    const cardMessage = (meta) => {
        setCardMenu(null);
        const digits = digitsOf(meta.number);
        if (!digits) return;
        if (onOpenThread) onOpenThread(digits);
        else {
            dispatch(setResumeThread(digits));
            dispatch(openApp('message'));
        }
    };
    const cardAdd = async (meta) => {
        setCardMenu(null);
        if (cardIsSaved(meta)) {
            dispatch(
                pushToast({
                    app: 'message',
                    title: t('messages.contactCard'),
                    body: t('messages.cardExists'),
                }),
            );
            return;
        }
        await dispatch(addContact({ name: meta.name, number: meta.number, img: meta.img }));
        dispatch(
            pushToast({
                app: 'message',
                title: t('messages.contactCard'),
                body: t('messages.cardAdded'),
            }),
        );
    };

    const openProfile = () => {
        dispatch(setContactFocus({ number, returnTo: number }));
        dispatch(openApp('call'));
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
        if (amount <= 0) return setMoneyErr(t('messages.errAmount'));
        setBusy(true);
        const res = await dispatch(sendMoney(number, amount));
        setBusy(false);
        if (res && res.ok) closeAttach();
        else setMoneyErr(t(MONEY_ERR_KEY[res?.reason] || 'messages.errGeneric'));
    };
    const doRequest = () => {
        if (amount <= 0) return setMoneyErr(t('messages.errAmount'));
        dispatch(sendRequest(number, amount));
        closeAttach();
    };

    const settle = async (id) => {
        const res = await dispatch(settleNegotiation(number, id));
        if (res && !res.ok) showNotice(t(MONEY_ERR_KEY[res.reason] || 'messages.errComplete'));
    };
    const decline = async (id) => {
        const res = await dispatch(declineNegotiation(number, id));
        if (res && !res.ok) showNotice(t(MONEY_ERR_KEY[res.reason] || 'messages.errDecline'));
    };

    const name = conv?.name || number;

    return (
        <div className="msg msg--conv">
            <div className="msg-conv__bar">
                <button className="msg-conv__back" onClick={handleBack} aria-label="Back">
                    <ChevronLeftIcon />
                </button>
                <button className="msg-conv__who" onClick={openProfile}>
                    <Avatar name={name} src={conv?.avatar} className="msg-avatar--md" />
                    <div className="msg-conv__name">
                        {name}
                        <ChevronRightIcon className="msg-conv__namechev" />
                    </div>
                </button>
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
                        onOpenContact={setCardMenu}
                    />
                ))}
            </div>

            {recording ? (
                <VoiceComposer
                    onComplete={sendVoice}
                    onCancel={() => setRecording(false)}
                    onError={() => showNotice(t('messages.micUnavailable'))}
                />
            ) : (
                <MessageInput
                    onSend={send}
                    onPlus={() => setAttach('menu')}
                    onMic={() => setRecording(true)}
                    attachment={draft}
                    onRemoveAttachment={removeDraft}
                />
            )}

            {showGif && <GifPicker onClose={() => setShowGif(false)} onSelect={sendGif} />}

            {attach === 'menu' && (
                <div className="msg-plus" onClick={closeAttach}>
                    <div className="msg-plus__list" onClick={(e) => e.stopPropagation()}>
                        <button className="msg-plus__item" onClick={openCamera}>
                            <span className="msg-plus__ico msg-plus__ico--cam">
                                <CameraIcon />
                            </span>
                            <span className="msg-plus__label">{t('messages.camera')}</span>
                        </button>
                        <button className="msg-plus__item" onClick={openGallery}>
                            <span className="msg-plus__ico msg-plus__ico--photos">
                                <PhotosIcon />
                            </span>
                            <span className="msg-plus__label">{t('messages.gallery')}</span>
                        </button>
                        <button
                            className="msg-plus__item"
                            onClick={() => {
                                closeAttach();
                                setShowGif(true);
                            }}
                        >
                            <span className="msg-plus__ico msg-plus__ico--gif">
                                <GifIcon />
                            </span>
                            <span className="msg-plus__label">{t('messages.gif')}</span>
                        </button>
                        <button className="msg-plus__item" onClick={() => openMoney('send')}>
                            <span className="msg-plus__ico msg-plus__ico--cash">$</span>
                            <span className="msg-plus__label">{t('messages.money')}</span>
                        </button>
                        <button className="msg-plus__item" onClick={() => setAttach('location')}>
                            <span className="msg-plus__ico msg-plus__ico--loc">
                                <PinIcon />
                            </span>
                            <span className="msg-plus__label">{t('messages.locationMenu')}</span>
                        </button>
                        <button className="msg-plus__item" onClick={() => setAttach('share')}>
                            <span className="msg-plus__ico msg-plus__ico--share">
                                <ShareGlyph />
                            </span>
                            <span className="msg-plus__label">{t('messages.shareMenu')}</span>
                        </button>
                    </div>
                    <button className="msg-plus__close" onClick={closeAttach} aria-label="Close">
                        <XIcon />
                    </button>
                </div>
            )}

            {attach === 'money' && (
                <>
                    <div className="msg-cash-backdrop" onClick={closeAttach} />
                    <div className="msg-cash">
                        <button
                            className="msg-cash__grab"
                            onClick={closeAttach}
                            aria-label="Close"
                        />

                        <div className="msg-cash__toggle">
                            <button
                                className={`msg-cash__seg${moneyMode === 'send' ? ' is-on' : ''}`}
                                onClick={() => {
                                    setMoneyMode('send');
                                    setMoneyErr('');
                                }}
                            >
                                {t('messages.send')}
                            </button>
                            <button
                                className={`msg-cash__seg${moneyMode === 'request' ? ' is-on' : ''}`}
                                onClick={() => {
                                    setMoneyMode('request');
                                    setMoneyErr('');
                                }}
                            >
                                {t('messages.request')}
                            </button>
                        </div>

                        <div className="msg-cash__amountrow">
                            <button
                                className="msg-cash__step"
                                onClick={() => setAmount((a) => Math.max(0, a - 1))}
                            >
                                −
                            </button>
                            <div className="msg-cash__amount">${amount.toLocaleString()}</div>
                            <button
                                className="msg-cash__step"
                                onClick={() => setAmount((a) => Math.min(MAX_AMOUNT, a + 1))}
                            >
                                +
                            </button>
                        </div>

                        <button
                            className="msg-cash__kbtoggle"
                            onClick={() => setShowKeypad((v) => !v)}
                        >
                            {showKeypad ? t('messages.hideKeypad') : t('messages.showKeypad')}
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
                            <button
                                className="msg-cash__btn msg-cash__btn--cancel"
                                onClick={closeAttach}
                            >
                                {t('messages.cancel')}
                            </button>
                            {moneyMode === 'request' ? (
                                <button
                                    className="msg-cash__btn msg-cash__btn--req"
                                    onClick={doRequest}
                                >
                                    {t('messages.request')}
                                </button>
                            ) : (
                                <button
                                    className="msg-cash__btn msg-cash__btn--send"
                                    onClick={doSend}
                                    disabled={busy}
                                >
                                    {busy ? t('messages.sending') : t('messages.send')}
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
                        <button
                            className="msg-cash__grab"
                            onClick={closeAttach}
                            aria-label="Close"
                        />
                        <div className="msg-gallery__title">{t('messages.choosePhotoVideo')}</div>
                        <div className="msg-gallery__grid">
                            {gallery.length === 0 && (
                                <div className="msg-gallery__empty">{t('messages.noPhotos')}</div>
                            )}
                            {[...gallery]
                                .sort((a, b) => (b.ts || 0) - (a.ts || 0))
                                .map((item) => (
                                    <button
                                        key={item.id}
                                        className="msg-gallery__cell"
                                        onClick={() => attachFromGallery(item)}
                                    >
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
                            <button
                                className="msg-attach__item"
                                onClick={() => shareLocation({ live: false })}
                            >
                                <span className="msg-attach__ico msg-attach__ico--loc">
                                    <PinIcon />
                                </span>
                                <span className="msg-attach__label">
                                    {t('messages.sendCurrentLocation')}
                                </span>
                            </button>
                            <button
                                className="msg-attach__item"
                                onClick={() => shareLocation({ live: true, duration: 900 })}
                            >
                                <span className="msg-attach__ico msg-attach__ico--live">
                                    <LiveIcon />
                                </span>
                                <span className="msg-attach__label">
                                    {t('messages.shareLive15')}
                                </span>
                            </button>
                            <button
                                className="msg-attach__item"
                                onClick={() => shareLocation({ live: true, duration: 3600 })}
                            >
                                <span className="msg-attach__ico msg-attach__ico--live">
                                    <LiveIcon />
                                </span>
                                <span className="msg-attach__label">
                                    {t('messages.shareLive60')}
                                </span>
                            </button>
                            <button
                                className="msg-attach__item"
                                onClick={() => shareLocation({ live: true, duration: 0 })}
                            >
                                <span className="msg-attach__ico msg-attach__ico--live">
                                    <LiveIcon />
                                </span>
                                <span className="msg-attach__label">
                                    {t('messages.shareLiveStop')}
                                </span>
                            </button>
                        </div>
                        <button className="msg-attach__cancel" onClick={closeAttach}>
                            {t('messages.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {attach === 'share' && (
                <div className="msg-attach" onClick={closeAttach}>
                    <div className="msg-attach__sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="msg-attach__group">
                            <button
                                className="msg-attach__item"
                                onClick={() => setAttach('contact')}
                            >
                                <span className="msg-attach__ico msg-attach__ico--contact">
                                    <ContactGlyph />
                                </span>
                                <span className="msg-attach__label">
                                    {t('messages.contactMenu')}
                                </span>
                            </button>
                            {shareApps.map((a) => (
                                <button
                                    key={a.id}
                                    className="msg-attach__item"
                                    onClick={() => startShareApp(a)}
                                >
                                    <span className="msg-attach__appicon">
                                        {a.icon ? <img src={a.icon} alt="" /> : null}
                                    </span>
                                    <span className="msg-attach__label">{a.label}</span>
                                </button>
                            ))}
                        </div>
                        <button className="msg-attach__cancel" onClick={closeAttach}>
                            {t('messages.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {attach === 'contact' && (
                <ContactPicker
                    title={t('messages.contactMenu')}
                    onPick={pickContactToSend}
                    onClose={closeAttach}
                />
            )}

            {cardMenu && (
                <div className="msg-attach" onClick={() => setCardMenu(null)}>
                    <div className="msg-attach__sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="msg-attach__group">
                            <button className="msg-attach__item" onClick={() => cardCall(cardMenu)}>
                                <span className="msg-attach__label">{t('messages.cardCall')}</span>
                            </button>
                            <button
                                className="msg-attach__item"
                                onClick={() => cardMessage(cardMenu)}
                            >
                                <span className="msg-attach__label">
                                    {t('messages.cardMessage')}
                                </span>
                            </button>
                            <button className="msg-attach__item" onClick={() => cardAdd(cardMenu)}>
                                <span className="msg-attach__label">{t('messages.cardSave')}</span>
                            </button>
                        </div>
                        <button className="msg-attach__cancel" onClick={() => setCardMenu(null)}>
                            {t('messages.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {viewer && (
                <MediaViewer
                    item={{ type: viewer.type, url: viewer.body }}
                    onClose={() => setViewer(null)}
                />
            )}
        </div>
    );
}

const PinIcon = () => (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2a7 7 0 00-7 7c0 4.8 7 13 7 13s7-8.2 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
    </svg>
);

const LiveIcon = () => (
    <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
    >
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
        <path d="M5.5 5.5a9 9 0 000 13M18.5 5.5a9 9 0 010 13" />
    </svg>
);

const PhotosIcon = () => (
    <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="3" y="3" width="18" height="18" rx="2.5" />
        <circle cx="8.5" cy="8.5" r="1.6" />
        <path d="M21 16l-5-5L5 21" />
    </svg>
);

const XIcon = () => (
    <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
    >
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

const ContactGlyph = () => (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="12" cy="8.5" r="3.6" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0z" />
    </svg>
);

const ShareGlyph = () => (
    <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <path d="M12 3v13M12 3L8.5 6.5M12 3l3.5 3.5" />
        <path d="M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1" />
    </svg>
);
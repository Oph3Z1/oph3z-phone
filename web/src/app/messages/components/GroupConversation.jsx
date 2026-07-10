import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import GroupAvatar from './GroupAvatar';
import GroupBubble from './GroupBubble';
import MessageInput from './MessageInput';
import MediaViewer from './MediaViewer';
import VoiceComposer from './VoiceComposer';
import GifPicker from './GifPicker';
import { ChevronLeftIcon, ChevronRightIcon, CameraIcon, GifIcon } from './icons';
import {
    openGroup,
    sendGroupMessage,
    reactGroup,
    sendGroupLocation,
    stopGroupLive,
    setActiveGroup,
    setGroupDraft,
} from '../../../store/slices/groupsSlice';
import { setActive } from '../../../store/slices/messagesSlice';
import { digitsOf } from '../../../store/slices/contactsSlice';
import { clearNotifsFor } from '../../../store/slices/notificationsSlice';
import { openApp } from '../../../store/slices/phoneSlice';
import { loadPhotos } from '../../../store/slices/photosSlice';
import { setFocus } from '../../../store/slices/mapsSlice';
import { setShareTo } from '../../../store/slices/messagesSlice';
import { useT } from '../../../i18n/useT';

export default function GroupConversation({ gid, onBack, onInfo }) {
    const dispatch = useDispatch();
    const t = useT();
    const group = useSelector((s) => s.groups.byGid[gid]);
    const selfNumber = digitsOf(useSelector((s) => s.contacts.number));
    const draft = useSelector((s) => s.groups.draftAttach[gid]);
    const gallery = useSelector((s) => s.photos.items);
    const scrollRef = useRef(null);

    const [attach, setAttach] = useState(null);
    const [viewer, setViewer] = useState(null);
    const [showGif, setShowGif] = useState(false);
    const [recording, setRecording] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        dispatch(openGroup(gid));
        dispatch(setActiveGroup(gid));
        dispatch(setActive(`g:${gid}`));
        dispatch(clearNotifsFor({ gid }));
        return () => {
            dispatch(setActiveGroup(null));
            dispatch(setActive(null));
        };
    }, [gid, dispatch]);

    const items = group?.items || [];
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

    const showNotice = (text) => {
        setNotice(text);
        setTimeout(() => setNotice(''), 2800);
    };

    const closeAttach = () => setAttach(null);

    const send = (text) => {
        if (draft) {
            dispatch(sendGroupMessage(gid, { type: draft.type, body: draft.url }));
            dispatch(setGroupDraft({ gid, attach: null }));
        }
        const body = text.trim();
        if (body) dispatch(sendGroupMessage(gid, { type: 'text', body }));
    };
    const removeDraft = () => dispatch(setGroupDraft({ gid, attach: null }));

    const openCamera = () => {
        dispatch(setShareTo(`g:${gid}`));
        dispatch(openApp('camera'));
    };
    const openGallery = () => {
        dispatch(loadPhotos());
        setAttach('gallery');
    };
    const attachFromGallery = (item) => {
        dispatch(setGroupDraft({ gid, attach: { type: item.type || 'image', url: item.url } }));
        closeAttach();
    };

    const shareLocation = (opts) => {
        dispatch(sendGroupLocation(gid, opts));
        closeAttach();
    };
    const openLocation = (meta) => {
        dispatch(setFocus({ x: meta.x, y: meta.y, label: meta.label, number: `g:${gid}` }));
        dispatch(openApp('maps'));
    };
    const stopLiveShare = (msg) => dispatch(stopGroupLive(gid, msg.meta && msg.meta.sid, msg.id));

    const sendVoice = (url, duration) => {
        dispatch(sendGroupMessage(gid, { type: 'voice', body: url, meta: { duration } }));
        setRecording(false);
    };

    const sendGif = (url) => {
        dispatch(sendGroupMessage(gid, { type: 'gif', body: url }));
        setShowGif(false);
    };

    const onReact = (id, emoji) => dispatch(reactGroup(gid, id, emoji));

    const name = group?.name || t('messages.group');
    const memberCount = group?.members?.length || 0;

    return (
        <div className="msg msg--conv">
            <div className="msg-conv__bar">
                <button className="msg-conv__back" onClick={onBack} aria-label="Back">
                    <ChevronLeftIcon />
                </button>
                <button className="msg-conv__who" onClick={onInfo}>
                    <GroupAvatar group={group} className="msg-avatar--md" />
                    <div className="msg-conv__name">
                        <span className="gconv__title">{name}</span>
                        <ChevronRightIcon className="msg-conv__namechev" />
                    </div>
                    <span className="gconv__sub">
                        {t('messages.peopleCount', { n: memberCount })}
                    </span>
                </button>
                <div className="msg-conv__spacer" />
            </div>

            {notice && <div className="msg-notice">{notice}</div>}

            <div className="msg-conv__scroll" ref={scrollRef}>
                {items.map((m, i) => {
                    const prev = items[i - 1];
                    const out = m.from && selfNumber ? m.from === selfNumber : !!m.mine;
                    const showName =
                        !out && (!prev || prev.from !== m.from || prev.type === 'system');
                    return (
                        <GroupBubble
                            key={m.id}
                            msg={m}
                            showName={showName}
                            selfNumber={selfNumber}
                            onReact={onReact}
                            onOpenMedia={setViewer}
                            onOpenLocation={openLocation}
                            onStopLive={stopLiveShare}
                        />
                    );
                })}
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
                        <button className="msg-plus__item" onClick={() => setAttach('location')}>
                            <span className="msg-plus__ico msg-plus__ico--loc">
                                <PinIcon />
                            </span>
                            <span className="msg-plus__label">{t('messages.locationMenu')}</span>
                        </button>
                    </div>
                    <button className="msg-plus__close" onClick={closeAttach} aria-label="Close">
                        <XIcon />
                    </button>
                </div>
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
                        <div className="msg-gallery__scroll">
                            <div className="msg-gallery__grid">
                                {gallery.length === 0 && (
                                    <div className="msg-gallery__empty">
                                        {t('messages.noPhotos')}
                                    </div>
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
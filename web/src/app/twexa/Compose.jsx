import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { pushToast } from '../../store/slices/toastSlice';
import { openApp } from '../../store/slices/phoneSlice';
import { setShareTo } from '../../store/slices/messagesSlice';
import { setPendingCompose } from '../../store/slices/xSlice';
import { useT } from '../../i18n/useT';
import Avatar from './Avatar';
import PhotoPickerSheet from '../mail/PhotoPickerSheet';
import GifPicker from '../messages/components/GifPicker';
import EmojiPicker from '../messages/components/EmojiPicker';
import { CloseIcon, ImageIcon, CameraIcon, GifIcon, LinkIcon, EmojiIcon } from './icons';

const MAX = 800;
const MAX_MEDIA = 4;

function typeFromUrl(url) {
    const u = url.split('?')[0].toLowerCase();
    if (u.endsWith('.gif')) return 'gif';
    if (/\.(mp4|webm|mov|m4v)$/.test(u)) return 'video';
    return 'image';
}

export default function Compose({ me, replyTo, initialMedia, onClose, onPosted }) {
    const dispatch = useDispatch();
    const t = useT();
    const [text, setText] = useState('');
    const [media, setMedia] = useState(initialMedia || []);
    const [sheet, setSheet] = useState(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const taRef = useRef(null);

    const remaining = MAX - text.length;
    const canPost = (text.trim().length > 0 || media.length > 0) && remaining >= 0 && !busy;

    const addMedia = (items) => {
        setMedia((prev) => [...prev, ...items].slice(0, MAX_MEDIA));
    };
    const removeMedia = (i) => setMedia((prev) => prev.filter((_, idx) => idx !== i));

    const insertEmoji = (e) => {
        const el = taRef.current;
        if (!el) {
            setText((v) => (v + e).slice(0, MAX));
            return;
        }
        const s = el.selectionStart ?? text.length;
        const en = el.selectionEnd ?? text.length;
        const next = (text.slice(0, s) + e + text.slice(en)).slice(0, MAX);
        setText(next);
        requestAnimationFrame(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = s + e.length;
        });
    };

    const takePhoto = () => {
        dispatch(
            setPendingCompose({
                replyTo: replyTo ? { id: replyTo.id, author: replyTo.author } : null,
            }),
        );
        dispatch(setShareTo('x'));
        dispatch(openApp('camera'));
    };

    const addLink = () => {
        const url = linkUrl.trim();
        if (!/^https?:\/\//i.test(url)) return;
        addMedia([{ url, type: typeFromUrl(url) }]);
        setLinkUrl('');
        setSheet(null);
    };

    const submit = async () => {
        if (!canPost) return;
        setBusy(true);
        const payload = { text: text.trim(), media, parentId: replyTo ? replyTo.id : undefined };
        const res = await fetchNui('phone:x:post', payload, { ok: true, post: null });
        setBusy(false);
        if (res && res.ok) {
            dispatch(pushToast({ title: replyTo ? t('x.replied') : t('x.posted'), body: '' }));
            onPosted && onPosted(res.post);
        } else {
            dispatch(pushToast({ title: t('x.postFailed'), body: '' }));
        }
    };

    return (
        <div className="x-compose">
            <div className="x-compose__bar">
                <button className="x-compose__cancel" onClick={onClose}>
                    {t('common.cancel')}
                </button>
                <button className="x-compose__post" disabled={!canPost} onClick={submit}>
                    {replyTo ? t('x.reply') : t('x.post')}
                </button>
            </div>

            {replyTo && (
                <div className="x-compose__replyingto">
                    {t('x.replyingTo')} <span>@{replyTo.author && replyTo.author.handle}</span>
                </div>
            )}

            <div className="x-compose__row">
                <Avatar account={me} size="2.6em" />
                <div className="x-compose__editor">
                    <textarea
                        ref={taRef}
                        autoFocus
                        value={text}
                        maxLength={MAX}
                        placeholder={replyTo ? t('x.replyPh') : t('x.whatsHappening')}
                        onChange={(e) => setText(e.target.value)}
                    />
                    {media.length > 0 && (
                        <div className={`x-compose__media x-media--${media.length}`}>
                            {media.map((m, i) => (
                                <div key={i} className="x-compose__mediacell">
                                    {m.type === 'video' ? (
                                        <video src={m.url} muted playsInline preload="metadata" />
                                    ) : (
                                        <img src={m.thumb || m.url} alt="" />
                                    )}
                                    {m.type === 'gif' && (
                                        <span className="x-media__gifbadge">GIF</span>
                                    )}
                                    <button
                                        className="x-compose__mediadel"
                                        onClick={() => removeMedia(i)}
                                    >
                                        <CloseIcon size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="x-compose__toolbar">
                <div className="x-compose__tools">
                    <button
                        disabled={media.length >= MAX_MEDIA}
                        onClick={() => setSheet('photos')}
                        aria-label={t('x.addPhoto')}
                    >
                        <ImageIcon />
                    </button>
                    <button
                        disabled={media.length >= MAX_MEDIA}
                        onClick={takePhoto}
                        aria-label={t('x.takePhoto')}
                    >
                        <CameraIcon />
                    </button>
                    <button
                        disabled={media.length >= MAX_MEDIA}
                        onClick={() => setSheet('gif')}
                        aria-label="GIF"
                    >
                        <GifIcon />
                    </button>
                    <button
                        disabled={media.length >= MAX_MEDIA}
                        onClick={() => setSheet('link')}
                        aria-label={t('x.addLink')}
                    >
                        <LinkIcon />
                    </button>
                    <button
                        onClick={() => setSheet(sheet === 'emoji' ? null : 'emoji')}
                        aria-label={t('x.emoji')}
                    >
                        <EmojiIcon />
                    </button>
                </div>
                <span
                    className={`x-compose__count${remaining < 0 ? ' is-over' : ''}${remaining <= 20 ? ' is-low' : ''}`}
                >
                    {remaining}
                </span>
            </div>

            {sheet === 'photos' && (
                <PhotoPickerSheet
                    selected={[]}
                    onClose={() => setSheet(null)}
                    onDone={(items) => {
                        addMedia(items);
                        setSheet(null);
                    }}
                />
            )}
            {sheet === 'gif' && (
                <GifPicker
                    onClose={() => setSheet(null)}
                    onSelect={(url) => {
                        addMedia([{ url, type: 'gif' }]);
                        setSheet(null);
                    }}
                />
            )}
            {sheet === 'emoji' && (
                <div className="x-compose__emoji">
                    <EmojiPicker onSelect={insertEmoji} onClose={() => setSheet(null)} />
                </div>
            )}
            {sheet === 'link' && (
                <div className="x-sheet" onClick={() => setSheet(null)}>
                    <div className="x-sheet__panel" onClick={(e) => e.stopPropagation()}>
                        <div className="x-sheet__title">{t('x.addLinkTitle')}</div>
                        <input
                            className="x-sheet__input"
                            autoFocus
                            value={linkUrl}
                            placeholder="https://…"
                            onChange={(e) => setLinkUrl(e.target.value)}
                        />
                        <div className="x-sheet__hint">{t('x.addLinkHint')}</div>
                        <div className="x-sheet__actions">
                            <button className="x-sheet__btn" onClick={() => setSheet(null)}>
                                {t('common.cancel')}
                            </button>
                            <button
                                className="x-sheet__btn x-sheet__btn--primary"
                                disabled={!/^https?:\/\//i.test(linkUrl.trim())}
                                onClick={addLink}
                            >
                                {t('common.add')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
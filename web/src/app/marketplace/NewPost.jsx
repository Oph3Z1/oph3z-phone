import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import {
    patchDraft,
    addMedia,
    removeMedia,
    clearDraft,
    clearCapture,
    setReopenCompose,
} from '../../store/slices/marketplaceSlice';
import { setShareTo } from '../../store/slices/messagesSlice';
import { openApp } from '../../store/slices/phoneSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import { CATEGORIES, CATEGORY_ICON } from './util';
import PhotoPickerSheet from '../mail/PhotoPickerSheet';
import {
    BackArrow,
    PlusIcon,
    CloseIcon,
    CameraIcon,
    GalleryIcon,
    LinkIcon,
    PlayIcon,
} from './icons';

function Toggle({ on, onChange }) {
    return (
        <button
            type="button"
            className={`mkt-toggle${on ? ' is-on' : ''}`}
            role="switch"
            aria-checked={on}
            onClick={() => onChange(!on)}
        >
            <span className="mkt-toggle__knob" />
        </button>
    );
}

const isVideoUrl = (u) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);

export default function NewPost({ onBack, onPosted }) {
    const t = useT();
    const dispatch = useDispatch();
    const draft = useSelector((s) => s.marketplace.draft);
    const capture = useSelector((s) => s.marketplace.capture);
    const [sheet, setSheet] = useState(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [busy, setBusy] = useState(false);

    const toastErr = (msg) => dispatch(pushToast({ type: 'error', title: msg, body: '' }));

    useEffect(() => {
        if (capture) {
            dispatch(addMedia({ url: capture.url, type: capture.type }));
            dispatch(clearCapture());
        }
    }, [capture, dispatch]);

    if (!draft) return null;
    const set = (patch) => dispatch(patchDraft(patch));
    const editing = draft.mode === 'edit';

    const takePhoto = () => {
        setSheet(null);
        dispatch(setReopenCompose(true));
        dispatch(setShareTo('market'));
        dispatch(openApp('camera'));
    };

    const addLink = () => {
        const u = linkUrl.trim();
        if (!/^https?:\/\//i.test(u)) return;
        dispatch(addMedia({ url: u, type: isVideoUrl(u) ? 'video' : 'image' }));
        setLinkUrl('');
        setSheet(null);
    };

    const submit = async () => {
        if (!draft.title.trim()) return toastErr(t('market.errTitle'));
        if (!draft.media.length) return toastErr(t('market.errMedia'));
        if (!draft.allowCalls && !draft.allowMsg) return toastErr(t('market.errContact'));
        setBusy(true);
        const payload = {
            category: draft.category,
            title: draft.title.trim(),
            desc: draft.desc.trim(),
            price: Number(draft.price) || 0,
            media: draft.media,
            allowCalls: draft.allowCalls,
            allowMsg: draft.allowMsg,
        };
        const event = editing ? 'phone:market:update' : 'phone:market:create';
        if (editing) payload.id = draft.id;
        const res = await fetchNui(event, payload, { ok: true, listing: { id: draft.id || 1 } });
        setBusy(false);
        if (res && res.ok) {
            dispatch(
                pushToast({
                    type: 'success',
                    title: editing ? t('market.updated') : t('market.posted'),
                    body: '',
                }),
            );
            dispatch(clearDraft());
            onPosted && onPosted(res.listing);
        } else {
            toastErr(t(`market.err_${(res && res.reason) || 'bad'}`) || t('market.errGeneric'));
        }
    };

    return (
        <div className="mkt-screen">
            <div className="mkt-topbar">
                <button
                    className="mkt-iconbtn"
                    onClick={() => {
                        dispatch(clearDraft());
                        onBack();
                    }}
                >
                    <BackArrow />
                </button>
                <span className="mkt-topbar__title">
                    {editing ? t('market.editPost') : t('market.newPost')}
                </span>
                <button className="mkt-topbar__post" disabled={busy} onClick={submit}>
                    {editing ? t('market.save') : t('market.post')}
                </button>
            </div>

            <div className="mkt-scroll mkt-form">
                <label className="mkt-flabel">{t('market.category')}</label>
                <div className="mkt-catrow">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c}
                            type="button"
                            className={`mkt-catbtn${draft.category === c ? ' is-on' : ''}`}
                            onClick={() => set({ category: c })}
                        >
                            <span>{CATEGORY_ICON[c]}</span>
                            {t(`market.cat_${c}`)}
                        </button>
                    ))}
                </div>

                <label className="mkt-flabel">
                    {t('market.photos')}{' '}
                    <span className="mkt-flabel__hint">{draft.media.length}/10</span>
                </label>
                <div className="mkt-media">
                    {draft.media.map((m, idx) => (
                        <div className="mkt-media__cell" key={idx}>
                            {m.type === 'video' ? (
                                <>
                                    <video
                                        className="mkt-media__thumb"
                                        src={m.url}
                                        muted
                                        playsInline
                                        preload="metadata"
                                    />
                                    <span className="mkt-media__vico">
                                        <PlayIcon size={16} />
                                    </span>
                                </>
                            ) : (
                                <img className="mkt-media__thumb" src={m.thumb || m.url} alt="" />
                            )}
                            <button
                                type="button"
                                className="mkt-media__rm"
                                onClick={() => dispatch(removeMedia(idx))}
                            >
                                <CloseIcon size={13} />
                            </button>
                        </div>
                    ))}
                    {draft.media.length < 10 && (
                        <button
                            type="button"
                            className="mkt-media__add"
                            onClick={() => setSheet('choose')}
                        >
                            <PlusIcon size={22} />
                        </button>
                    )}
                </div>

                <label className="mkt-flabel">{t('market.adTitle')}</label>
                <input
                    className="mkt-input"
                    maxLength={80}
                    placeholder={t('market.titlePh')}
                    value={draft.title}
                    onChange={(e) => set({ title: e.target.value })}
                />

                <label className="mkt-flabel">{t('market.description')}</label>
                <textarea
                    className="mkt-input mkt-textarea"
                    maxLength={1200}
                    placeholder={t('market.descPh')}
                    value={draft.desc}
                    onChange={(e) => set({ desc: e.target.value })}
                />

                <label className="mkt-flabel">{t('market.price')}</label>
                <div className="mkt-price">
                    <span className="mkt-price__cur">$</span>
                    <input
                        className="mkt-input mkt-price__in"
                        inputMode="numeric"
                        placeholder="0"
                        value={draft.price}
                        onChange={(e) => set({ price: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                    <span className="mkt-price__hint">{t('market.priceHint')}</span>
                </div>

                <div className="mkt-row">
                    <div className="mkt-row__txt">
                        <span className="mkt-row__t">{t('market.allowCalls')}</span>
                        <span className="mkt-row__s">{t('market.allowCallsSub')}</span>
                    </div>
                    <Toggle on={draft.allowCalls} onChange={(v) => set({ allowCalls: v })} />
                </div>
                <div className="mkt-row">
                    <div className="mkt-row__txt">
                        <span className="mkt-row__t">{t('market.allowMsg')}</span>
                        <span className="mkt-row__s">{t('market.allowMsgSub')}</span>
                    </div>
                    <Toggle on={draft.allowMsg} onChange={(v) => set({ allowMsg: v })} />
                </div>
            </div>

            {sheet === 'choose' && (
                <div className="mkt-sheet" onClick={() => setSheet(null)}>
                    <div className="mkt-sheet__panel" onClick={(e) => e.stopPropagation()}>
                        <div className="mkt-sheet__title">{t('market.addPhoto')}</div>
                        <button className="mkt-sheet__btn" onClick={takePhoto}>
                            <CameraIcon size={19} /> {t('market.takePhoto')}
                        </button>
                        <button className="mkt-sheet__btn" onClick={() => setSheet('gallery')}>
                            <GalleryIcon size={19} /> {t('market.fromGallery')}
                        </button>
                        <button className="mkt-sheet__btn" onClick={() => setSheet('link')}>
                            <LinkIcon size={19} /> {t('market.fromLink')}
                        </button>
                        <button
                            className="mkt-sheet__btn mkt-sheet__btn--cancel"
                            onClick={() => setSheet(null)}
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            )}
            {sheet === 'gallery' && (
                <PhotoPickerSheet
                    selected={[]}
                    onClose={() => setSheet(null)}
                    onDone={(picks) => {
                        picks.forEach((p) =>
                            dispatch(addMedia({ url: p.url, type: p.type, thumb: p.thumb })),
                        );
                        setSheet(null);
                    }}
                />
            )}
            {sheet === 'link' && (
                <div className="mkt-sheet" onClick={() => setSheet(null)}>
                    <div className="mkt-sheet__panel" onClick={(e) => e.stopPropagation()}>
                        <div className="mkt-sheet__title">{t('market.fromLink')}</div>
                        <input
                            className="mkt-input"
                            autoFocus
                            placeholder="https://…"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                        />
                        <div className="mkt-sheet__row">
                            <button
                                className="mkt-sheet__btn mkt-sheet__btn--cancel"
                                onClick={() => setSheet(null)}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                className="mkt-sheet__btn mkt-sheet__btn--primary"
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
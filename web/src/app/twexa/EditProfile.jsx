import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { setMe, setPendingEdit, setPendingAuth } from '../../store/slices/xSlice';
import { setShareTo } from '../../store/slices/messagesSlice';
import { openApp } from '../../store/slices/phoneSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import Avatar from './Avatar';
import PhotoPickerSheet from '../mail/PhotoPickerSheet';
import ImageCropper from './ImageCropper';
import { BackArrow, CameraIcon } from './icons';

const BANNER_ASPECT = 3;

export default function EditProfile({ profile, initialCrop, onBack, onSaved }) {
    const dispatch = useDispatch();
    const t = useT();
    const [name, setName] = useState(profile.name || '');
    const [handle, setHandle] = useState(profile.handle || '');
    const [bio, setBio] = useState(profile.bio || '');
    const [avatar, setAvatar] = useState(profile.avatar || null);
    const [banner, setBanner] = useState(profile.banner || null);
    const [picker, setPicker] = useState(null);
    const [crop, setCrop] = useState(initialCrop || null);
    const [pw, setPw] = useState(null);
    const [emailSheet, setEmailSheet] = useState(null);
    const [del, setDel] = useState(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    const cleanHandle = (v) => v.replace(/[^A-Za-z0-9_]/g, '').slice(0, 15);
    const setField = (field, url) => (field === 'avatar' ? setAvatar(url) : setBanner(url));

    const save = async () => {
        setErr('');
        if (handle.length < 3) return setErr(t('x.errHandleLen'));
        if (!name.trim()) return setErr(t('x.errName'));
        setBusy(true);
        const payload = {
            name: name.trim(),
            handle,
            bio,
            avatar: avatar || false,
            banner: banner || false,
        };
        const res = await fetchNui('phone:x:editProfile', payload, {
            ok: true,
            profile: { ...profile, name, handle, bio, avatar, banner },
            me: { ...profile, name, handle, avatar },
        });
        setBusy(false);
        if (res && res.ok) {
            if (res.me) dispatch(setMe(res.me));
            dispatch(pushToast({ title: t('x.profileSaved'), body: '' }));
            onSaved && onSaved(res.profile);
        } else {
            setErr(t(`x.err_${(res && res.reason) || 'bad'}`) || t('x.errGeneric'));
        }
    };

    const takePhoto = (field) => {
        dispatch(setPendingEdit({ field }));
        dispatch(setShareTo('xedit'));
        dispatch(openApp('camera'));
    };

    const cropDone = (url) => {
        setField(crop.field, url);
        setCrop(null);
    };

    if (crop) {
        return (
            <ImageCropper
                src={crop.url}
                aspect={crop.field === 'banner' ? BANNER_ASPECT : 1}
                round={crop.field === 'avatar'}
                title={crop.field === 'avatar' ? t('x.changeAvatar') : t('x.changeBanner')}
                onCancel={() => setCrop(null)}
                onDone={cropDone}
            />
        );
    }

    return (
        <div className="x-screen x-edit">
            <div className="x-topbar">
                <button className="x-iconbtn" onClick={onBack}>
                    <BackArrow />
                </button>
                <span className="x-topbar__title">{t('x.editProfile')}</span>
                <button className="x-topbar__save" disabled={busy} onClick={save}>
                    {t('common.save')}
                </button>
            </div>

            <div className="x-scroll">
                <button
                    className="x-edit__banner"
                    style={banner ? { backgroundImage: `url(${banner})` } : undefined}
                    onClick={() => setPicker({ field: 'banner' })}
                >
                    <span className="x-edit__camera">
                        <CameraIcon size={20} />
                    </span>
                </button>

                <div className="x-edit__avatarrow">
                    <button
                        className="x-edit__avatar"
                        onClick={() => setPicker({ field: 'avatar' })}
                    >
                        <Avatar account={{ name, avatar }} size="5em" />
                        <span className="x-edit__camera x-edit__camera--av">
                            <CameraIcon size={18} />
                        </span>
                    </button>
                </div>

                <div className="x-edit__fields">
                    <label className="x-field">
                        <span>{t('x.displayName')}</span>
                        <input
                            value={name}
                            maxLength={40}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </label>
                    <label className="x-field">
                        <span>{t('x.handle')}</span>
                        <div className="x-field__at">
                            <span>@</span>
                            <input
                                value={handle}
                                autoCapitalize="none"
                                onChange={(e) => setHandle(cleanHandle(e.target.value))}
                            />
                        </div>
                    </label>
                    <label className="x-field">
                        <span>{t('x.bio')}</span>
                        <textarea
                            value={bio}
                            maxLength={160}
                            placeholder={t('x.bioPh')}
                            onChange={(e) => setBio(e.target.value)}
                        />
                        <span className="x-field__count">{160 - bio.length}</span>
                    </label>

                    <div className="x-field">
                        <span>{t('x.emailSection')}</span>
                        <div className="x-edit__email">{profile.email || t('x.notSet')}</div>
                    </div>

                    <button
                        className="x-edit__pwbtn"
                        onClick={() => setEmailSheet({ email: '', err: '', busy: false })}
                    >
                        {t('x.changeEmail')}
                    </button>
                    <button
                        className="x-edit__pwbtn"
                        onClick={() =>
                            setPw({ current: '', next: '', confirm: '', err: '', busy: false })
                        }
                    >
                        {t('x.changePassword')}
                    </button>
                    <button
                        className="x-edit__delbtn"
                        onClick={() => setDel({ password: '', err: '', busy: false })}
                    >
                        {t('x.deleteAccount')}
                    </button>

                    {err ? <div className="x-auth__err">{err}</div> : null}
                </div>
            </div>

            {picker && !picker.mode && (
                <div className="x-sheet" onClick={() => setPicker(null)}>
                    <div className="x-sheet__panel" onClick={(e) => e.stopPropagation()}>
                        <div className="x-sheet__title">
                            {picker.field === 'avatar' ? t('x.changeAvatar') : t('x.changeBanner')}
                        </div>
                        <div className="x-sheet__actions x-sheet__actions--col">
                            <button
                                className="x-sheet__btn"
                                onClick={() => {
                                    const f = picker.field;
                                    setPicker(null);
                                    takePhoto(f);
                                }}
                            >
                                {t('x.takePhotoBtn')}
                            </button>
                            <button
                                className="x-sheet__btn"
                                onClick={() => setPicker({ ...picker, mode: 'photos' })}
                            >
                                {t('x.fromPhotos')}
                            </button>
                            <button
                                className="x-sheet__btn"
                                onClick={() => setPicker({ ...picker, mode: 'link' })}
                            >
                                {t('x.fromLink')}
                            </button>
                            <button
                                className="x-sheet__btn x-sheet__btn--danger"
                                onClick={() => {
                                    setField(picker.field, null);
                                    setPicker(null);
                                }}
                            >
                                {t('x.removeImage')}
                            </button>
                            <button className="x-sheet__btn" onClick={() => setPicker(null)}>
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {picker && picker.mode === 'photos' && (
                <PhotoPickerSheet
                    selected={[]}
                    onClose={() => setPicker(null)}
                    onDone={(items) => {
                        const f = picker.field;
                        setPicker(null);
                        if (items[0]) setCrop({ field: f, url: items[0].url });
                    }}
                />
            )}
            {picker && picker.mode === 'link' && (
                <div className="x-sheet" onClick={() => setPicker(null)}>
                    <div className="x-sheet__panel" onClick={(e) => e.stopPropagation()}>
                        <div className="x-sheet__title">
                            {picker.field === 'avatar' ? t('x.changeAvatar') : t('x.changeBanner')}
                        </div>
                        <input
                            className="x-sheet__input"
                            autoFocus
                            value={linkUrl}
                            placeholder="https://…"
                            onChange={(e) => setLinkUrl(e.target.value)}
                        />
                        <div className="x-sheet__actions">
                            <button className="x-sheet__btn" onClick={() => setPicker(null)}>
                                {t('common.cancel')}
                            </button>
                            <button
                                className="x-sheet__btn x-sheet__btn--primary"
                                disabled={!/^https?:\/\//i.test(linkUrl.trim())}
                                onClick={() => {
                                    const f = picker.field;
                                    const u = linkUrl.trim();
                                    setLinkUrl('');
                                    setPicker(null);
                                    setCrop({ field: f, url: u });
                                }}
                            >
                                {t('common.next')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pw && <ChangePasswordSheet state={pw} setState={setPw} t={t} dispatch={dispatch} />}

            {emailSheet && (
                <ChangeEmailSheet
                    state={emailSheet}
                    setState={setEmailSheet}
                    t={t}
                    dispatch={dispatch}
                />
            )}

            {del && <DeleteAccountSheet state={del} setState={setDel} t={t} dispatch={dispatch} />}
        </div>
    );
}

function DeleteAccountSheet({ state, setState, t, dispatch }) {
    const patch = (p) => setState((s) => ({ ...s, ...p }));
    const submit = async () => {
        patch({ err: '' });
        if (!state.password) return patch({ err: t('x.err_password') });
        patch({ busy: true });
        const res = await fetchNui(
            'phone:x:deleteAccount',
            { password: state.password },
            { ok: true },
        );
        if (res && res.ok) {
            dispatch(pushToast({ title: t('x.accountDeleted'), body: '' }));
            dispatch(setMe(null));
        } else {
            patch({
                busy: false,
                err: t(`x.err_${(res && res.reason) || 'bad'}`) || t('x.errGeneric'),
            });
        }
    };
    return (
        <div className="x-sheet" onClick={() => setState(null)}>
            <div className="x-sheet__panel" onClick={(e) => e.stopPropagation()}>
                <div className="x-sheet__title">{t('x.deleteAccount')}</div>
                <div className="x-sheet__hint">{t('x.deleteWarn')}</div>
                <input
                    className="x-sheet__input"
                    type="password"
                    autoFocus
                    placeholder={t('x.currentPassword')}
                    value={state.password}
                    onChange={(e) => patch({ password: e.target.value })}
                    style={{ marginTop: '0.5em' }}
                />
                {state.err ? (
                    <div className="x-auth__err" style={{ marginTop: '0.5em' }}>
                        {state.err}
                    </div>
                ) : null}
                <div className="x-sheet__actions">
                    <button className="x-sheet__btn" onClick={() => setState(null)}>
                        {t('common.cancel')}
                    </button>
                    <button
                        className="x-sheet__btn x-sheet__btn--danger"
                        disabled={!state.password || state.busy}
                        onClick={submit}
                    >
                        {t('x.deleteConfirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChangeEmailSheet({ state, setState, t, dispatch }) {
    const patch = (p) => setState((s) => ({ ...s, ...p }));
    const submit = async () => {
        patch({ err: '' });
        if (!/^\S+@\S+$/.test(state.email.trim())) return patch({ err: t('x.err_email') });
        patch({ busy: true });
        const res = await fetchNui(
            'phone:x:emailStart',
            { email: state.email.trim().toLowerCase() },
            { ok: true, pending: true, email: state.email.trim() },
        );
        if (res && res.ok && res.pending) {
            setState(null);
            dispatch(setPendingAuth({ mode: 'email', email: res.email }));
        } else {
            patch({
                busy: false,
                err: t(`x.err_${(res && res.reason) || 'bad'}`) || t('x.errGeneric'),
            });
        }
    };
    return (
        <div className="x-sheet" onClick={() => setState(null)}>
            <div className="x-sheet__panel" onClick={(e) => e.stopPropagation()}>
                <div className="x-sheet__title">{t('x.changeEmail')}</div>
                <input
                    className="x-sheet__input"
                    autoFocus
                    placeholder={t('x.emailPh')}
                    value={state.email}
                    onChange={(e) => patch({ email: e.target.value })}
                />
                <div className="x-sheet__hint">{t('x.emailHint')}</div>
                {state.err ? (
                    <div className="x-auth__err" style={{ marginTop: '0.5em' }}>
                        {state.err}
                    </div>
                ) : null}
                <div className="x-sheet__actions">
                    <button className="x-sheet__btn" onClick={() => setState(null)}>
                        {t('common.cancel')}
                    </button>
                    <button
                        className="x-sheet__btn x-sheet__btn--primary"
                        disabled={!state.email || state.busy}
                        onClick={submit}
                    >
                        {t('x.sendCode')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChangePasswordSheet({ state, setState, t, dispatch }) {
    const patch = (p) => setState((s) => ({ ...s, ...p }));

    const submit = async () => {
        patch({ err: '' });
        if (state.next.length < 4) return patch({ err: t('x.errPassword') });
        if (state.next !== state.confirm) return patch({ err: t('x.errPwMismatch') });
        patch({ busy: true });
        const res = await fetchNui(
            'phone:x:changePassword',
            { current: state.current, new: state.next },
            { ok: true },
        );
        if (res && res.ok) {
            dispatch(pushToast({ title: t('x.passwordChanged'), body: '' }));
            setState(null);
        } else {
            patch({
                busy: false,
                err: t(`x.err_${(res && res.reason) || 'bad'}`) || t('x.errGeneric'),
            });
        }
    };

    return (
        <div className="x-sheet" onClick={() => setState(null)}>
            <div className="x-sheet__panel" onClick={(e) => e.stopPropagation()}>
                <div className="x-sheet__title">{t('x.changePassword')}</div>
                <input
                    className="x-sheet__input"
                    type="password"
                    autoFocus
                    placeholder={t('x.currentPassword')}
                    value={state.current}
                    onChange={(e) => patch({ current: e.target.value })}
                />
                <input
                    className="x-sheet__input"
                    type="password"
                    placeholder={t('x.newPassword')}
                    value={state.next}
                    onChange={(e) => patch({ next: e.target.value })}
                    style={{ marginTop: '0.5em' }}
                />
                <input
                    className="x-sheet__input"
                    type="password"
                    placeholder={t('x.confirmPassword')}
                    value={state.confirm}
                    onChange={(e) => patch({ confirm: e.target.value })}
                    style={{ marginTop: '0.5em' }}
                />
                {state.err ? (
                    <div className="x-auth__err" style={{ marginTop: '0.5em' }}>
                        {state.err}
                    </div>
                ) : null}
                <div className="x-sheet__actions">
                    <button className="x-sheet__btn" onClick={() => setState(null)}>
                        {t('common.cancel')}
                    </button>
                    <button
                        className="x-sheet__btn x-sheet__btn--primary"
                        disabled={!state.current || !state.next || state.busy}
                        onClick={submit}
                    >
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
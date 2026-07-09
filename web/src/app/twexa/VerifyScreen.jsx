import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { setMe, clearPendingAuth } from '../../store/slices/xSlice';
import { openApp } from '../../store/slices/phoneSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import { XLogo } from './icons';

export default function VerifyScreen() {
    const dispatch = useDispatch();
    const t = useT();
    const pending = useSelector((s) => s.x.pendingAuth) || {};
    const [code, setCode] = useState('');
    const [newPw, setNewPw] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    const isRecover = pending.mode === 'recover';
    const title = isRecover
        ? t('x.recoverTitle')
        : pending.mode === 'email'
          ? t('x.verifyEmailTitle')
          : t('x.verifyTitle');

    const submit = async () => {
        setErr('');
        if (code.trim().length < 6) return setErr(t('x.err_code'));
        if (isRecover && newPw.length < 4) return setErr(t('x.errPassword'));
        setBusy(true);
        let res;
        if (pending.mode === 'register') {
            res = await fetchNui(
                'phone:x:verifyRegister',
                { code: code.trim() },
                { ok: true, me: { id: 1, handle: 'you', name: 'You', verified: false } },
            );
        } else if (isRecover) {
            res = await fetchNui(
                'phone:x:recoverVerify',
                { code: code.trim(), newPassword: newPw },
                { ok: true, me: { id: 1, handle: 'you', name: 'You', verified: false } },
            );
        } else {
            res = await fetchNui('phone:x:emailVerify', { code: code.trim() }, { ok: true });
        }
        setBusy(false);
        if (res && res.ok) {
            if (pending.mode === 'email')
                dispatch(pushToast({ title: t('x.emailChanged'), body: '' }));
            if (res.me) dispatch(setMe(res.me));
            dispatch(clearPendingAuth());
            return;
        }
        setErr(t(`x.err_${(res && res.reason) || 'bad'}`) || t('x.errGeneric'));
    };

    const resend = async () => {
        setErr('');
        const res = await fetchNui('phone:x:resendCode', {}, { ok: true });
        if (res && res.ok) dispatch(pushToast({ title: t('x.codeResent'), body: '' }));
        else setErr(t('x.err_expired'));
    };

    const cancel = async () => {
        await fetchNui('phone:x:cancelPending', {}, { ok: true });
        dispatch(clearPendingAuth());
    };

    return (
        <div className="x-auth x-verify">
            <div className="x-auth__logo">
                <XLogo size={40} />
            </div>
            <h1 className="x-auth__title">{title}</h1>
            <p className="x-verify__sub">{t('x.verifySent', { email: pending.email || '' })}</p>

            <div className="x-auth__form">
                <label className="x-field">
                    <span>{t('x.code')}</span>
                    <input
                        className="x-verify__code"
                        inputMode="numeric"
                        value={code}
                        placeholder={t('x.codePh')}
                        maxLength={6}
                        autoFocus
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    />
                </label>
                {isRecover && (
                    <label className="x-field">
                        <span>{t('x.newPassword')}</span>
                        <input
                            type="password"
                            value={newPw}
                            placeholder={t('x.passwordPh')}
                            onChange={(e) => setNewPw(e.target.value)}
                        />
                    </label>
                )}
                {err ? <div className="x-auth__err">{err}</div> : null}
                <button className="x-auth__submit" disabled={busy} onClick={submit}>
                    {t('x.verify')}
                </button>
                <button className="x-verify__mail" onClick={() => dispatch(openApp('mail'))}>
                    {t('x.openMail')}
                </button>
            </div>

            <div className="x-verify__foot">
                <button className="x-auth__forgot" onClick={resend}>
                    {t('x.resend')}
                </button>
                <button className="x-auth__forgot" onClick={cancel}>
                    {t('common.cancel')}
                </button>
            </div>
        </div>
    );
}
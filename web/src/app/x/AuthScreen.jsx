import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { setMe, setPendingAuth } from '../../store/slices/xSlice';
import { useT } from '../../i18n/useT';
import { XLogo } from './icons';

// Login / Register gate shown when no account is logged in on this phone.
export default function AuthScreen() {
  const dispatch = useDispatch();
  const t = useT();
  const myMail = useSelector((s) => s.x.mailAddress);
  const [mode, setMode] = useState('login'); // login | register
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const cleanHandle = (v) => v.replace(/[^A-Za-z0-9_]/g, '').slice(0, 15);

  const submit = async () => {
    setErr('');
    const h = cleanHandle(handle);
    if (mode === 'register') {
      if (h.length < 3) return setErr(t('x.errHandleLen'));
      if (!name.trim()) return setErr(t('x.errName'));
      if (!/^\S+@\S+$/.test((email || myMail || '').trim())) return setErr(t('x.err_email'));
    }
    if (password.length < 4) return setErr(t('x.errPassword'));
    setBusy(true);

    if (mode === 'register') {
      const addr = (email || myMail || '').trim().toLowerCase();
      const res = await fetchNui('phone:x:register', { handle: h, name: name.trim(), password, email: addr }, { ok: true, pending: true, email: addr });
      setBusy(false);
      if (res && res.ok && res.pending) { dispatch(setPendingAuth({ mode: 'register', email: res.email })); return; }
      return setErr(t(`x.err_${(res && res.reason) || 'bad'}`) || t('x.errGeneric'));
    }

    const res = await fetchNui('phone:x:login', { handle: h, password }, { ok: true, me: { id: 1, handle: h || 'you', name: 'You', verified: false } });
    setBusy(false);
    if (res && res.ok) { dispatch(setMe(res.me)); return; }
    setErr(t(`x.err_${(res && res.reason) || 'bad'}`) || t('x.errGeneric'));
  };

  // Forgot password: needs the username typed in, sends a code to its linked email.
  const forgot = async () => {
    setErr('');
    const h = cleanHandle(handle);
    if (h.length < 3) return setErr(t('x.recoverNeedHandle'));
    setBusy(true);
    const res = await fetchNui('phone:x:recoverStart', { handle: h }, { ok: true, pending: true, email: 'y**@mail.com' });
    setBusy(false);
    if (res && res.ok && res.pending) { dispatch(setPendingAuth({ mode: 'recover', email: res.email })); return; }
    setErr(t(`x.err_${(res && res.reason) || 'bad'}`) || t('x.errGeneric'));
  };

  return (
    <div className="x-auth">
      <div className="x-auth__logo"><XLogo size={44} /></div>
      <h1 className="x-auth__title">{mode === 'register' ? t('x.createAccount') : t('x.signIn')}</h1>

      <div className="x-auth__form">
        {mode === 'register' && (
          <label className="x-field">
            <span>{t('x.displayName')}</span>
            <input value={name} maxLength={40} placeholder={t('x.displayNamePh')} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="x-field">
          <span>{t('x.handle')}</span>
          <div className="x-field__at">
            <span>@</span>
            <input value={handle} placeholder={t('x.handlePh')} autoCapitalize="none" onChange={(e) => setHandle(cleanHandle(e.target.value))} />
          </div>
        </label>
        {mode === 'register' && (
          <label className="x-field">
            <span>{t('x.email')}</span>
            <input value={email || myMail || ''} placeholder={t('x.emailPh')} autoCapitalize="none" onChange={(e) => setEmail(e.target.value)} />
            <span className="x-field__hint">{t('x.emailHint')}</span>
          </label>
        )}
        <label className="x-field">
          <span>{t('x.password')}</span>
          <input type="password" value={password} placeholder={t('x.passwordPh')} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {err ? <div className="x-auth__err">{err}</div> : null}

        <button className="x-auth__submit" disabled={busy} onClick={submit}>
          {mode === 'register' ? t('x.signUp') : t('x.logIn')}
        </button>

        {mode === 'login' && (
          <button className="x-auth__forgot" disabled={busy} onClick={forgot}>{t('x.forgotPassword')}</button>
        )}
      </div>

      <button className="x-auth__switch" onClick={() => { setErr(''); setMode(mode === 'register' ? 'login' : 'register'); }}>
        {mode === 'register' ? t('x.haveAccount') : t('x.noAccount')}
      </button>
    </div>
  );
}

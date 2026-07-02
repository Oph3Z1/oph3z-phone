import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './SettingsApp.css';
import { setAirplane, saveSetting } from '../../store/slices/settingsSlice';

const WIFI_NAME = 'iPhone'; // cosmetic network name

/* ---- glyphs -------------------------------------------------------------- */
const Chevron = () => (
  <svg className="set-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7" />
  </svg>
);
const ChevronL = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
const AirplaneG = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg>
);
const WifiG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4.5 9.5a11 11 0 0115 0" /><path d="M7 12.5a7 7 0 0110 0" /><path d="M9.5 15.5a3 3 0 015 0" />
    <circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
// AirDrop: concentric rings that wrap AROUND a centred dot (open at the bottom).
const AirdropG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
    <path d="M8.9 21A9 9 0 1 1 15.1 21" />
    <path d="M10.05 17.86A5.7 5.7 0 1 1 13.95 17.86" />
    <path d="M11.11 14.94A2.6 2.6 0 1 1 12.89 14.94" />
    <circle cx="12" cy="12.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
const CheckG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4.5 4.5L19 7" /></svg>
);
const BellG = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.2 2.2 0 002.2-2.2H9.8A2.2 2.2 0 0012 22zm7-6l-1.6-1.6V10a5.4 5.4 0 00-4-5.2V4a1.4 1.4 0 00-2.8 0v.8A5.4 5.4 0 006.6 10v4.4L5 16v1h14z" /></svg>
);
const RingtoneG = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 9v6h3l4 4V5L8 9H5z" /><path d="M16 8.5a4 4 0 010 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M18.5 6a7 7 0 010 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
);
const WallpaperG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" /><path d="M6 18l5-4.5 4 3 3-2.5" />
  </svg>
);
const DisplayG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" />
    {[...Array(8)].map((_, i) => {
      const a = (i * Math.PI) / 4;
      return <line key={i} x1={12 + Math.cos(a) * 6} y1={12 + Math.sin(a) * 6} x2={12 + Math.cos(a) * 8.4} y2={12 + Math.sin(a) * 8.4} />;
    })}
  </svg>
);
const LanguageG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5z" /></svg>
);
const AboutG = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 10h2v7h-2z" /><circle cx="12" cy="7" r="1.3" /></svg>
);
const CopyG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M5 16V5a2 2 0 012-2h9" /></svg>
);

/* ---- building blocks ----------------------------------------------------- */
function SqIcon({ bg, children }) {
  return <span className="set-ico" style={{ background: bg }}>{children}</span>;
}

function Toggle({ on, onChange }) {
  return (
    <button className={`set-toggle${on ? ' is-on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span className="set-toggle__knob" />
    </button>
  );
}

function NavRow({ icon, label, value, onClick }) {
  return (
    <button className="set-row" onClick={onClick}>
      {icon}
      <span className="set-row__label">{label}</span>
      {value != null && <span className="set-row__value">{value}</span>}
      <Chevron />
    </button>
  );
}

function ValueRow({ icon, label, value }) {
  return (
    <div className="set-row set-row--static">
      {icon}
      <span className="set-row__label">{label}</span>
      <span className="set-row__value">{value}</span>
    </div>
  );
}

function ToggleRow({ icon, label, on, onChange }) {
  return (
    <div className="set-row set-row--static">
      {icon}
      <span className="set-row__label">{label}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

const SUBTITLES = {
  profile: 'Profile',
  notifications: 'Notifications',
  ringtones: 'Ringtones',
  wallpaper: 'Wallpaper',
  display: 'Display & Brightness',
  language: 'Language',
  about: 'About',
};

function SubScreen({ id, onBack }) {
  return (
    <div className="set">
      <div className="set__navbar">
        <button className="set__back" onClick={onBack}>
          <ChevronL />
          <span>Settings</span>
        </button>
        <span className="set__navtitle">{SUBTITLES[id]}</span>
        <span className="set__navspacer" />
      </div>
      <div className="set__scroll set__scroll--center">
        <div className="set__soon">“{SUBTITLES[id]}” — coming soon.</div>
      </div>
    </div>
  );
}

export default function SettingsApp() {
  const dispatch = useDispatch();
  const [view, setView] = useState('list');
  const [copied, setCopied] = useState(false);
  const identity = useSelector((s) => s.phone.identity);
  const airplane = useSelector((s) => s.settings.airplane);
  const airdrop = useSelector((s) => s.settings.airdrop);

  const name = identity.name || 'My Profile';
  const number = identity.number || '';
  // Copy digits only ("5553873"), not the formatted "555-3873".
  const numberRaw = identity.numberRaw || number.replace(/\D/g, '');

  const copyNumber = () => {
    if (!numberRaw) return;
    // execCommand('copy') on a temp textarea works inside FiveM's NUI (CEF), where
    // the async Clipboard API is blocked by a permissions policy.
    let ok = false;
    try {
      const ta = document.createElement('textarea');
      ta.value = numberRaw;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (e) {
      ok = false;
    }
    // Best-effort fallback; swallow the promise so it can't throw "uncaught".
    if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(numberRaw).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (view !== 'list') return <SubScreen id={view} onBack={() => setView('list')} />;

  return (
    <div className="set">
      <div className="set__bar">
        <h1 className="set__title">Settings</h1>
      </div>

      <div className="set__scroll">
        {/* Profile card */}
        <div className="set-card">
          <button className="set-profile" onClick={() => setView('profile')}>
            <span className="set-profile__avatar">{name.charAt(0).toUpperCase()}</span>
            <span className="set-profile__text">
              <span className="set-profile__name">{name}</span>
              <span className="set-profile__sub">Phone ID, Profile Photo and more</span>
            </span>
            <Chevron />
          </button>
          <div className="set-sep set-sep--profile" />
          <div className="set-phonerow">
            <span className="set-phonerow__text">
              <span className="set-phonerow__label">Phone Number</span>
              <span className="set-phonerow__num">{number}</span>
            </span>
            <span className="set-phonerow__icons">
              <span className="set-phonerow__ico"><AirdropG /></span>
              <button className={`set-phonerow__ico set-phonerow__ico--btn${copied ? ' is-copied' : ''}`} onClick={copyNumber} aria-label="Copy number">
                {copied ? <CheckG /> : <CopyG />}
              </button>
            </span>
          </div>
        </div>

        {/* Connectivity */}
        <div className="set-card">
          <ToggleRow
            icon={<SqIcon bg="#ff9f0a"><AirplaneG /></SqIcon>}
            label="Airplane Mode"
            on={airplane}
            onChange={(v) => dispatch(setAirplane(v))}
          />
          <div className="set-sep" />
          <ValueRow icon={<SqIcon bg="#0a84ff"><WifiG /></SqIcon>} label="Wi-Fi" value={WIFI_NAME} />
          <div className="set-sep" />
          <ToggleRow
            icon={<SqIcon bg="#0a84ff"><AirdropG /></SqIcon>}
            label="AirDrop"
            on={airdrop}
            onChange={(v) => dispatch(saveSetting('airdrop', v))}
          />
        </div>

        {/* Notifications / sounds / display */}
        <div className="set-card">
          <NavRow icon={<SqIcon bg="#ff3b30"><BellG /></SqIcon>} label="Notifications" onClick={() => setView('notifications')} />
          <div className="set-sep" />
          <NavRow icon={<SqIcon bg="#ff2d55"><RingtoneG /></SqIcon>} label="Ringtones" onClick={() => setView('ringtones')} />
          <div className="set-sep" />
          <NavRow icon={<SqIcon bg="#30b0c7"><WallpaperG /></SqIcon>} label="Wallpaper" onClick={() => setView('wallpaper')} />
          <div className="set-sep" />
          <NavRow icon={<SqIcon bg="#0a84ff"><DisplayG /></SqIcon>} label="Display & Brightness" onClick={() => setView('display')} />
        </div>

        {/* General */}
        <div className="set-card">
          <NavRow icon={<SqIcon bg="#0a84ff"><LanguageG /></SqIcon>} label="Language" onClick={() => setView('language')} />
          <div className="set-sep" />
          <NavRow icon={<SqIcon bg="#8e8e93"><AboutG /></SqIcon>} label="About" onClick={() => setView('about')} />
        </div>
      </div>
    </div>
  );
}

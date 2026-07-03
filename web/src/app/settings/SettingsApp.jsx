import { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './SettingsApp.css';
import { setAirplane, saveSetting, saveSettingLive, flushSettings, setAppNotif } from '../../store/slices/settingsSlice';
import { saveProfileName, saveAvatar, setLaunchTab, openApp } from '../../store/slices/phoneSlice';
import { openPrompt } from '../../store/slices/promptSlice';
import { openDialog } from '../../store/slices/dialogSlice';
import { loadPhotos } from '../../store/slices/photosSlice';
import { loadRingtones, addRingtone, deleteRingtone } from '../../store/slices/ringtonesSlice';
import { setShareTo } from '../../store/slices/messagesSlice';
import { useAvailableApps } from '../useAvailableApps';
import { WALLPAPER_PRESETS, isWallpaperUrl } from '../../config/phone.config';

const WIFI_NAME = 'iPhone'; // cosmetic network name
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
const BellOffG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.2 6.1A5.4 5.4 0 0117.4 10v3.7l1.5 1.9H9" />
    <path d="M6.7 15.6L5 13.7V10c0-.5.06-1 .18-1.45" />
    <path d="M10 19a2 2 0 004 0" />
    <line x1="4" y1="3.8" x2="20" y2="20" />
  </svg>
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
// Profile-screen glyphs.
const CameraG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="12.5" rx="2.6" />
    <path d="M8 7l1.3-2.2a1 1 0 01.86-.5h3.68a1 1 0 01.86.5L16 7" />
    <circle cx="12" cy="13.3" r="3.3" />
    <circle cx="17.4" cy="10.1" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
const IdCardG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <circle cx="8.5" cy="11" r="2" fill="currentColor" stroke="none" />
    <path d="M5.6 16.2a3 3 0 015.8 0" strokeLinecap="round" />
    <path d="M14.5 10h4M14.5 13.5h4" strokeLinecap="round" />
  </svg>
);
const XG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
const LinkG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 14.5l5-5" /><path d="M11.5 7l1-1a3.6 3.6 0 015 5l-1 1" /><path d="M12.5 17l-1 1a3.6 3.6 0 01-5-5l1-1" />
  </svg>
);
const MusicNoteG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V7l9-2v9" />
    <circle cx="6.8" cy="18" r="2.2" fill="currentColor" stroke="none" />
    <circle cx="15.8" cy="16" r="2.2" fill="currentColor" stroke="none" />
  </svg>
);
const PlayG = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.2v13.6L19 12z" /></svg>
);
const PauseG = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" /></svg>
);
const SunG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    {[...Array(8)].map((_, i) => {
      const a = (i * Math.PI) / 4;
      return <line key={i} x1={12 + Math.cos(a) * 7} y1={12 + Math.sin(a) * 7} x2={12 + Math.cos(a) * 9.2} y2={12 + Math.sin(a) * 9.2} />;
    })}
  </svg>
);
const PhoneSizeG = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <rect x="7" y="3" width="10" height="18" rx="2.4" />
    <line x1="10.5" y1="18.2" x2="13.5" y2="18.2" strokeLinecap="round" />
  </svg>
);

// A thick Control-Center-style slider (fills from the left, glyph inside).
function ThickSlider({ value, min, max, onChange, icon }) {
  const ref = useRef(null);
  const setFromX = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    const pct = clamp((clientX - r.left) / r.width, 0, 1);
    onChange(Math.round(min + pct * (max - min)));
  };
  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  };
  const onMove = (e) => {
    if (e.buttons) setFromX(e.clientX);
  };
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="set-hslider" ref={ref} onPointerDown={onDown} onPointerMove={onMove}>
      <div className="set-hslider__fill" style={{ width: `${fill}%` }} />
      <span className="set-hslider__icon">{icon}</span>
    </div>
  );
}

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

/* ---- Display & Brightness screen ----------------------------------------- */
function DisplayScreen({ onBack }) {
  const dispatch = useDispatch();
  const brightness = useSelector((s) => s.settings.brightness);
  const scale = useSelector((s) => s.settings.scale) ?? 100;

  // Persist any pending slider change when leaving the screen (saveSettingLive
  // debounces; flush guarantees the last value is saved).
  useEffect(() => () => dispatch(flushSettings()), [dispatch]);

  const setBrightness = (v) => dispatch(saveSettingLive('brightness', clamp(v, 20, 100)));
  const setScale = (v) => dispatch(saveSettingLive('scale', clamp(v, 50, 100)));

  return (
    <div className="set">
      <div className="set__navbar set__navbar--center">
        <button className="set__backcircle" onClick={onBack} aria-label="Back">
          <ChevronL />
        </button>
        <span className="set__navtitle">Display &amp; Brightness</span>
        <span className="set__navspacer" />
      </div>

      <div className="set__scroll">
        <div className="set-grouptitle"><span>Brightness</span></div>
        <div className="set-card set-card--slider">
          <ThickSlider value={brightness} min={20} max={100} onChange={setBrightness} icon={<SunG />} />
        </div>

        <div className="set-grouptitle">
          <span>Phone Size</span>
          <span className="set-grouptitle__val">{Math.round(scale)}%</span>
        </div>
        <div className="set-card set-card--slider">
          <ThickSlider value={scale} min={50} max={100} onChange={setScale} icon={<PhoneSizeG />} />
        </div>
        <p className="set-hint">Shrink the phone to keep more of the game visible around it.</p>
      </div>
    </div>
  );
}

/* ---- Wallpaper screen ---------------------------------------------------- */
function WallpaperScreen({ onBack }) {
  const dispatch = useDispatch();
  const current = useSelector((s) => s.settings.wallpaper) || '';
  const [url, setUrl] = useState('');

  const customActive = isWallpaperUrl(current);
  const typed = url.trim();
  // Preview shows what you're about to set (typed), else the active custom wallpaper.
  const previewSrc = typed || (customActive ? current : '');

  const setCustom = () => {
    if (!typed) return;
    dispatch(saveSetting('wallpaper', typed));
    setUrl('');
  };
  const selectPreset = (key) => dispatch(saveSetting('wallpaper', key));

  return (
    <div className="set">
      <div className="set__navbar set__navbar--center">
        <button className="set__backcircle" onClick={onBack} aria-label="Back">
          <ChevronL />
        </button>
        <span className="set__navtitle">Wallpaper</span>
        <span className="set__navspacer" />
      </div>

      <div className="set__scroll">
        {/* Custom URL + live preview */}
        <div className="wp-custom">
          <div className="wp-custom__preview">
            {previewSrc ? (
              <img src={previewSrc} alt="" />
            ) : (
              <div className="wp-custom__ph">
                <WallpaperG />
                <span>Paste a URL to preview</span>
              </div>
            )}
            {customActive && !typed && (
              <span className="wp-check"><CheckG /></span>
            )}
          </div>
          <div className="wp-custom__row">
            <input
              className="wp-input"
              value={url}
              placeholder="Paste image URL…"
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setCustom()}
            />
            <button className="wp-set" onClick={setCustom} disabled={!typed}>
              Set
            </button>
          </div>
        </div>

        {/* Built-in presets */}
        <div className="wp-section-title">Wallpapers</div>
        <div className="wp-grid">
          {WALLPAPER_PRESETS.map((w) => (
            <button
              key={w.key}
              className={`wp-tile${current === w.key ? ' is-on' : ''}`}
              onClick={() => selectPreset(w.key)}
            >
              <img src={w.src} alt="" />
              {current === w.key && <span className="wp-check"><CheckG /></span>}
              <span className="wp-tile__name">{w.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Ringtones screen ---------------------------------------------------- */
function RingtonesScreen({ onBack }) {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.ringtones.items);
  const selected = useSelector((s) => s.settings.ringtone) || '';
  const volume = useSelector((s) => s.settings.volume);
  const [playing, setPlaying] = useState(null); // id currently previewing
  const audioRef = useRef(null);
  const previewTimer = useRef(null);
  const pressTimer = useRef(null);
  const longFired = useRef(false);

  const stopPreview = () => {
    clearTimeout(previewTimer.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(null);
  };

  useEffect(() => {
    dispatch(loadRingtones());
    return () => stopPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // No explicit pick yet -> the first built-in ("Default") is the active one.
  const firstBuiltinId = (items.find((r) => r.builtin) || {}).id;
  const isSelected = (rt) => (selected ? rt.url && rt.url === selected : rt.id === firstBuiltinId);

  const togglePreview = (rt, e) => {
    e.stopPropagation();
    if (playing === rt.id) return stopPreview();
    stopPreview();
    if (!rt.url) return; // dev/mock entries have no url
    try {
      const a = new Audio(rt.url);
      a.volume = Math.max(0, Math.min(1, (volume ?? 70) / 100));
      a.onended = () => setPlaying(null);
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      audioRef.current = a;
      setPlaying(rt.id);
      // Ringtone files loop / run long — cap the preview at ~5 seconds.
      previewTimer.current = setTimeout(stopPreview, 5000);
    } catch (err) {
      /* preview unavailable */
    }
  };

  const select = (rt) => dispatch(saveSetting('ringtone', rt.url));

  const addRingtoneFlow = async () => {
    const res = await dispatch(
      openPrompt({
        title: 'Add New Ringtone',
        message: 'Fill details to add new ringtone.',
        confirmText: 'Add',
        fields: [
          { key: 'name', placeholder: 'Name', maxLength: 40 },
          { key: 'url', placeholder: 'Paste URL', maxLength: 512 },
        ],
      })
    );
    if (res && res.name && res.url) dispatch(addRingtone(res.name, res.url));
  };

  const removeFlow = async (rt) => {
    const ok = await dispatch(
      openDialog({
        title: 'Delete Ringtone',
        message: `Remove “${rt.name}” from your ringtones?`,
        buttons: [
          { text: 'Cancel', style: 'cancel', value: false },
          { text: 'Delete', style: 'destructive', value: true },
        ],
      })
    );
    if (!ok) return;
    if (playing === rt.id) stopPreview();
    if (isSelected(rt)) dispatch(saveSetting('ringtone', '')); // fall back to Default
    dispatch(deleteRingtone(rt.id));
  };

  // Long-press a CUSTOM ringtone to delete it (built-ins can't be removed).
  const startPress = (rt) => {
    longFired.current = false;
    if (rt.builtin) return;
    pressTimer.current = setTimeout(() => {
      longFired.current = true;
      removeFlow(rt);
    }, 550);
  };
  const endPress = () => clearTimeout(pressTimer.current);
  const rowClick = (rt) => {
    if (longFired.current) {
      longFired.current = false;
      return;
    }
    select(rt);
  };

  return (
    <div className="set">
      <div className="set__navbar set__navbar--center">
        <button className="set__backcircle" onClick={onBack} aria-label="Back">
          <ChevronL />
        </button>
        <span className="set__navtitle">Ringtones</span>
        <span className="set__navspacer" />
      </div>

      <div className="set__scroll">
        <div className="set-card">
          <button className="set-row" onClick={addRingtoneFlow}>
            <SqIcon bg="#0a84ff"><MusicNoteG /></SqIcon>
            <span className="set-row__label">Add Your Ringtone</span>
            <Chevron />
          </button>
        </div>

        <div className="set-card set-card--rt">
          {items.map((rt, i) => (
            <Fragment key={rt.id}>
              {i > 0 && <div className="set-sep" />}
              <div
                className="set-row set-row--static rt-row"
                onPointerDown={() => startPress(rt)}
                onPointerUp={endPress}
                onPointerLeave={endPress}
              >
                <button className="rt-play" onClick={(e) => togglePreview(rt, e)} aria-label="Preview">
                  {playing === rt.id ? <PauseG /> : <PlayG />}
                </button>
                <button className="rt-body" onClick={() => rowClick(rt)}>
                  {rt.name}
                </button>
                <button
                  className={`rt-check${isSelected(rt) ? ' is-on' : ''}`}
                  onClick={() => rowClick(rt)}
                  aria-label="Select"
                >
                  {isSelected(rt) && <CheckG />}
                </button>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Notifications screen ------------------------------------------------ */
function NotificationsScreen({ onBack }) {
  const dispatch = useDispatch();
  const { list } = useAvailableApps();
  const notifSound = useSelector((s) => s.settings.notifSound);
  const notifMaster = useSelector((s) => s.settings.notifMaster);
  const notifApps = useSelector((s) => s.settings.notifApps) || {};
  const masterOn = notifMaster !== false;

  return (
    <div className="set">
      <div className="set__navbar set__navbar--center">
        <button className="set__backcircle" onClick={onBack} aria-label="Back">
          <ChevronL />
        </button>
        <span className="set__navtitle">Notifications</span>
        <span className="set__navspacer" />
      </div>

      <div className="set__scroll">
        {/* Global switches */}
        <div className="set-card">
          <ToggleRow
            icon={<SqIcon bg="#ff3b30"><BellG /></SqIcon>}
            label="Notification Sound"
            on={notifSound !== false}
            onChange={(v) => dispatch(saveSetting('notifSound', v))}
          />
          <div className="set-sep" />
          <ToggleRow
            icon={<SqIcon bg="#ff9500"><BellOffG /></SqIcon>}
            label="Close All Notifications"
            on={masterOn}
            onChange={(v) => dispatch(saveSetting('notifMaster', v))}
          />
        </div>

        {/* Per-app switches (every registered app). Dimmed + disabled when the
            master switch is off, since nothing can notify anyway. */}
        <div className={`set-card${masterOn ? '' : ' is-disabled'}`}>
          {list.map((app, i) => (
            <Fragment key={app.id}>
              {i > 0 && <div className="set-sep" />}
              <div className="set-row set-row--static">
                <span className="set-appico">
                  {app.icon ? (
                    <img src={app.icon} alt="" />
                  ) : (
                    <span className="set-appico__ph">{(app.label || '?').charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <span className="set-row__label">{app.label}</span>
                <Toggle
                  on={notifApps[app.id] !== false}
                  onChange={(v) => dispatch(setAppNotif(app.id, v))}
                />
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Profile screen ("Phone ID") ---------------------------------------- */
function ProfileScreen({ onBack }) {
  const dispatch = useDispatch();
  const identity = useSelector((s) => s.phone.identity);
  const gallery = useSelector((s) => s.photos.items);
  const [sheet, setSheet] = useState(false); // Upload Photo sheet open?
  const [url, setUrl] = useState('');

  const name = identity.name || 'My Profile';
  const email = identity.email || '';
  const avatar = identity.avatar || '';

  useEffect(() => {
    if (sheet) dispatch(loadPhotos());
  }, [sheet, dispatch]);

  const rename = async () => {
    const v = await dispatch(
      openPrompt({
        title: 'Change ID Name',
        message: 'Fill details to rename your ID.',
        placeholder: 'Your name',
        value: name === 'My Profile' ? '' : name,
        confirmText: 'Rename',
        maxLength: 40,
      })
    );
    if (v) dispatch(saveProfileName(v));
  };

  const applyPhoto = (u) => {
    const v = (u || '').trim();
    if (!v) return;
    dispatch(saveAvatar(v));
    setSheet(false);
    setUrl('');
  };

  // Open the Camera to capture a new profile photo, returning here afterwards.
  const openCamera = () => {
    dispatch(setShareTo('profile'));
    dispatch(openApp('camera'));
  };

  const sorted = [...gallery].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  return (
    <div className="set">
      <div className="set__navbar set__navbar--center">
        <button className="set__backcircle" onClick={onBack} aria-label="Back">
          <ChevronL />
        </button>
        <span className="set__navtitle">Phone ID</span>
        <span className="set__navspacer" />
      </div>

      <div className="set__scroll">
        <div className="prof">
          <div className="prof__avatar">
            {avatar ? <img src={avatar} alt="" /> : <span>{name.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="prof__name">{name}</div>
          {email && <div className="prof__email">{email}</div>}
        </div>

        <div className="set-card set-card--profile">
          <button className="set-row" onClick={() => setSheet(true)}>
            <SqIcon bg="#0a84ff"><CameraG /></SqIcon>
            <span className="set-row__label">Change Profile Photo</span>
          </button>
          <div className="set-sep" />
          <button className="set-row" onClick={rename}>
            <SqIcon bg="#34c759"><IdCardG /></SqIcon>
            <span className="set-row__label">Change ID Name</span>
          </button>
        </div>
      </div>

      {sheet && (
        <>
          <div className="set-up__backdrop" onClick={() => setSheet(false)} />
          <div className="set-up">
            <div className="set-up__head">
              <span className="set-up__title">Upload Photo</span>
              <button className="set-up__close" onClick={() => setSheet(false)} aria-label="Close">
                <XG />
              </button>
            </div>

            <div className="set-up__urlrow">
              <span className="set-up__urllabel">URL:</span>
              <input
                className="set-up__input"
                value={url}
                placeholder="Paste url in here…"
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyPhoto(url)}
              />
              <button className="set-up__btn" onClick={() => applyPhoto(url)} disabled={!url.trim()} aria-label="Use link">
                <LinkG />
              </button>
              <button className="set-up__btn" onClick={openCamera} aria-label="Take photo">
                <CameraG />
              </button>
            </div>

            <div className="set-up__grid">
              {sorted.length === 0 && <div className="set-up__empty">No photos yet.</div>}
              {sorted.map((item) => (
                <button key={item.id} className="set-up__cell" onClick={() => applyPhoto(item.url)}>
                  {item.type === 'video' ? (
                    <>
                      <video src={item.url} muted />
                      <span className="set-up__vid">▶</span>
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
  const launchTab = useSelector((s) => s.phone.launchTab);

  const name = identity.name || 'My Profile';
  const number = identity.number || '';
  const avatar = identity.avatar || '';
  // Copy digits only ("5553873"), not the formatted "555-3873".
  const numberRaw = identity.numberRaw || number.replace(/\D/g, '');

  // Returning from the Camera after a profile-photo capture reopens the Profile.
  useEffect(() => {
    if (launchTab === 'profile') {
      setView('profile');
      dispatch(setLaunchTab(null));
    }
  }, [launchTab, dispatch]);

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

  if (view === 'profile') return <ProfileScreen onBack={() => setView('list')} />;
  if (view === 'notifications') return <NotificationsScreen onBack={() => setView('list')} />;
  if (view === 'ringtones') return <RingtonesScreen onBack={() => setView('list')} />;
  if (view === 'wallpaper') return <WallpaperScreen onBack={() => setView('list')} />;
  if (view === 'display') return <DisplayScreen onBack={() => setView('list')} />;
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
            <span className="set-profile__avatar">
              {avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}
            </span>
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

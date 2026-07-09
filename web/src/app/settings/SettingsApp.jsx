import { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './SettingsApp.css';
import {
    setAirplane,
    saveSetting,
    saveSettingLive,
    flushSettings,
    setAppNotif,
} from '../../store/slices/settingsSlice';
import { saveProfileName, saveAvatar, setLaunchTab, openApp } from '../../store/slices/phoneSlice';
import { openPrompt } from '../../store/slices/promptSlice';
import { openDialog } from '../../store/slices/dialogSlice';
import { loadPhotos } from '../../store/slices/photosSlice';
import { loadRingtones, addRingtone, deleteRingtone } from '../../store/slices/ringtonesSlice';
import {
    loadClock,
    setAlarmTone,
    addAlarmTone,
    deleteAlarmTone,
} from '../../store/slices/clockSlice';
import { setShareTo } from '../../store/slices/messagesSlice';
import { openShare } from '../../store/slices/airdropSlice';
import { unblockNumber, loadPhoneState, digitsOf } from '../../store/slices/contactsSlice';
import { useAvailableApps } from '../useAvailableApps';
import { WALLPAPER_PRESETS, isWallpaperUrl } from '../../config/phone.config';
import { useT } from '../../i18n/useT';

const WIFI_NAME = 'iPhone';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const Chevron = () => (
    <svg
        className="set-chev"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M9 5l7 7-7 7" />
    </svg>
);
const ChevronL = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M15 5l-7 7 7 7" />
    </svg>
);
const AirplaneG = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
    </svg>
);
const WifiG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
    >
        <path d="M4.5 9.5a11 11 0 0115 0" />
        <path d="M7 12.5a7 7 0 0110 0" />
        <path d="M9.5 15.5a3 3 0 015 0" />
        <circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none" />
    </svg>
);
const AirdropG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
    >
        <path d="M8.9 21A9 9 0 1 1 15.1 21" />
        <path d="M10.05 17.86A5.7 5.7 0 1 1 13.95 17.86" />
        <path d="M11.11 14.94A2.6 2.6 0 1 1 12.89 14.94" />
        <circle cx="12" cy="12.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
);
const CheckG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M5 12l4.5 4.5L19 7" />
    </svg>
);
const BellG = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 22a2.2 2.2 0 002.2-2.2H9.8A2.2 2.2 0 0012 22zm7-6l-1.6-1.6V10a5.4 5.4 0 00-4-5.2V4a1.4 1.4 0 00-2.8 0v.8A5.4 5.4 0 006.6 10v4.4L5 16v1h14z" />
    </svg>
);
const BellOffG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M8.2 6.1A5.4 5.4 0 0117.4 10v3.7l1.5 1.9H9" />
        <path d="M6.7 15.6L5 13.7V10c0-.5.06-1 .18-1.45" />
        <path d="M10 19a2 2 0 004 0" />
        <line x1="4" y1="3.8" x2="20" y2="20" />
    </svg>
);
const RingtoneG = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 9v6h3l4 4V5L8 9H5z" />
        <path
            d="M16 8.5a4 4 0 010 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
        <path
            d="M18.5 6a7 7 0 010 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
    </svg>
);
const WallpaperG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
    >
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
        <circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" />
        <path d="M6 18l5-4.5 4 3 3-2.5" />
    </svg>
);
const DisplayG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
    >
        <circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" />
        {[...Array(8)].map((_, i) => {
            const a = (i * Math.PI) / 4;
            return (
                <line
                    key={i}
                    x1={12 + Math.cos(a) * 6}
                    y1={12 + Math.sin(a) * 6}
                    x2={12 + Math.cos(a) * 8.4}
                    y2={12 + Math.sin(a) * 8.4}
                />
            );
        })}
    </svg>
);
const LanguageG = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5z" />
    </svg>
);
const GlobeBigG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.6 2.5 4 5.7 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.7-4-9s1.4-6.5 4-9z" />
    </svg>
);
const AboutG = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 10h2v7h-2z" />
        <circle cx="12" cy="7" r="1.3" />
    </svg>
);
const PrivacyG = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M6.2 6.2l11.6 11.6" />
    </svg>
);
const CopyG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
    >
        <rect x="8" y="8" width="11" height="12" rx="2" />
        <path d="M5 16V5a2 2 0 012-2h9" />
    </svg>
);
const CameraG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
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
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
    >
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);
const TrashG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m2 0v12a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19V7" />
        <path d="M10 11v5M14 11v5" />
    </svg>
);
const LinkG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M9.5 14.5l5-5" />
        <path d="M11.5 7l1-1a3.6 3.6 0 015 5l-1 1" />
        <path d="M12.5 17l-1 1a3.6 3.6 0 01-5-5l1-1" />
    </svg>
);
const MusicNoteG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M9 18V7l9-2v9" />
        <circle cx="6.8" cy="18" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="15.8" cy="16" r="2.2" fill="currentColor" stroke="none" />
    </svg>
);
const PlayG = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5.2v13.6L19 12z" />
    </svg>
);
const PauseG = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" />
    </svg>
);
const SunG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
    >
        <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
        {[...Array(8)].map((_, i) => {
            const a = (i * Math.PI) / 4;
            return (
                <line
                    key={i}
                    x1={12 + Math.cos(a) * 7}
                    y1={12 + Math.sin(a) * 7}
                    x2={12 + Math.cos(a) * 9.2}
                    y2={12 + Math.sin(a) * 9.2}
                />
            );
        })}
    </svg>
);
const PhoneSizeG = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
    >
        <rect x="7" y="3" width="10" height="18" rx="2.4" />
        <line x1="10.5" y1="18.2" x2="13.5" y2="18.2" strokeLinecap="round" />
    </svg>
);

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

function SqIcon({ bg, children }) {
    return (
        <span className="set-ico" style={{ background: bg }}>
            {children}
        </span>
    );
}

function Toggle({ on, onChange }) {
    return (
        <button
            className={`set-toggle${on ? ' is-on' : ''}`}
            onClick={() => onChange(!on)}
            role="switch"
            aria-checked={on}
        >
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

const SUBTITLE_KEY = {
    about: 'settings.about',
};

function SubScreen({ id, onBack }) {
    const t = useT();
    const title = t(SUBTITLE_KEY[id] || 'settings.about');
    return (
        <div className="set">
            <div className="set__navbar">
                <button className="set__back" onClick={onBack}>
                    <ChevronL />
                    <span>{t('settings.title')}</span>
                </button>
                <span className="set__navtitle">{title}</span>
                <span className="set__navspacer" />
            </div>
            <div className="set__scroll set__scroll--center">
                <div className="set__soon">{t('common.comingSoon', { name: title })}</div>
            </div>
        </div>
    );
}

function DisplayScreen({ onBack }) {
    const dispatch = useDispatch();
    const t = useT();
    const brightness = useSelector((s) => s.settings.brightness);
    const scale = useSelector((s) => s.settings.scale) ?? 100;

    useEffect(() => () => dispatch(flushSettings()), [dispatch]);

    const setBrightness = (v) => dispatch(saveSettingLive('brightness', clamp(v, 20, 100)));
    const setScale = (v) => dispatch(saveSettingLive('scale', clamp(v, 75, 100)));

    return (
        <div className="set">
            <div className="set__navbar set__navbar--center">
                <button className="set__backcircle" onClick={onBack} aria-label="Back">
                    <ChevronL />
                </button>
                <span className="set__navtitle">{t('display.title')}</span>
                <span className="set__navspacer" />
            </div>

            <div className="set__scroll">
                <div className="set-grouptitle">
                    <span>{t('display.brightness')}</span>
                </div>
                <div className="set-card set-card--slider">
                    <ThickSlider
                        value={brightness}
                        min={20}
                        max={100}
                        onChange={setBrightness}
                        icon={<SunG />}
                    />
                </div>

                <div className="set-grouptitle">
                    <span>{t('display.phoneSize')}</span>
                    <span className="set-grouptitle__val">{Math.round(scale)}%</span>
                </div>
                <div className="set-card set-card--slider">
                    <ThickSlider
                        value={scale}
                        min={75}
                        max={100}
                        onChange={setScale}
                        icon={<PhoneSizeG />}
                    />
                </div>
                <p className="set-hint">{t('display.hint')}</p>
            </div>
        </div>
    );
}

function WallpaperScreen({ onBack }) {
    const dispatch = useDispatch();
    const t = useT();
    const current = useSelector((s) => s.settings.wallpaper) || '';
    const [url, setUrl] = useState('');

    const customActive = isWallpaperUrl(current);
    const typed = url.trim();
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
                <span className="set__navtitle">{t('wallpaper.title')}</span>
                <span className="set__navspacer" />
            </div>

            <div className="set__scroll">
                <div className="wp-custom">
                    <div className="wp-custom__preview">
                        {previewSrc ? (
                            <img src={previewSrc} alt="" />
                        ) : (
                            <div className="wp-custom__ph">
                                <WallpaperG />
                                <span>{t('wallpaper.previewHint')}</span>
                            </div>
                        )}
                        {customActive && !typed && (
                            <span className="wp-check">
                                <CheckG />
                            </span>
                        )}
                    </div>
                    <div className="wp-custom__row">
                        <input
                            className="wp-input"
                            value={url}
                            placeholder={t('wallpaper.pasteUrl')}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setCustom()}
                        />
                        <button className="wp-set" onClick={setCustom} disabled={!typed}>
                            {t('common.set')}
                        </button>
                    </div>
                </div>

                <div className="wp-section-title">{t('wallpaper.wallpapers')}</div>
                <div className="wp-grid">
                    {WALLPAPER_PRESETS.map((w) => (
                        <button
                            key={w.key}
                            className={`wp-tile${current === w.key ? ' is-on' : ''}`}
                            onClick={() => selectPreset(w.key)}
                        >
                            <img src={w.src} alt="" />
                            {current === w.key && (
                                <span className="wp-check">
                                    <CheckG />
                                </span>
                            )}
                            <span className="wp-tile__name">{w.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function RingtonesScreen({ onBack }) {
    const dispatch = useDispatch();
    const t = useT();
    const items = useSelector((s) => s.ringtones.items);
    const selected = useSelector((s) => s.settings.ringtone) || '';
    const volume = useSelector((s) => s.settings.volume);
    const alarmTones = useSelector((s) => s.clock.alarmTones);
    const alarmSelected = useSelector((s) => s.clock.alarmRingtone) || '';
    const [playing, setPlaying] = useState(null);
    const [playingAlarm, setPlayingAlarm] = useState(null);
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
        setPlayingAlarm(null);
    };

    useEffect(() => {
        dispatch(loadRingtones());
        dispatch(loadClock());
        return () => stopPreview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    const firstBuiltinId = (items.find((r) => r.builtin) || {}).id;
    const isSelected = (rt) =>
        selected ? rt.url && rt.url === selected : rt.id === firstBuiltinId;

    const togglePreview = (rt, e) => {
        e.stopPropagation();
        if (playing === rt.id) return stopPreview();
        stopPreview();
        if (!rt.url) return;
        try {
            const a = new Audio(rt.url);
            a.volume = Math.max(0, Math.min(1, (volume ?? 70) / 100));
            a.onended = () => setPlaying(null);
            const p = a.play();
            if (p && p.catch) p.catch(() => {});
            audioRef.current = a;
            setPlaying(rt.id);
            previewTimer.current = setTimeout(stopPreview, 5000);
        } catch (err) {}
    };

    const select = (rt) => dispatch(saveSetting('ringtone', rt.url));

    const addRingtoneFlow = async () => {
        const res = await dispatch(
            openPrompt({
                title: t('ringtones.addTitle'),
                message: t('ringtones.addMsg'),
                confirmText: t('common.add'),
                fields: [
                    { key: 'name', placeholder: t('ringtones.name'), maxLength: 40 },
                    { key: 'url', placeholder: t('ringtones.pasteUrl'), maxLength: 512 },
                ],
            }),
        );
        if (res && res.name && res.url) dispatch(addRingtone(res.name, res.url));
    };

    const removeFlow = async (rt) => {
        const ok = await dispatch(
            openDialog({
                title: t('ringtones.deleteTitle'),
                message: t('ringtones.deleteMsg', { name: rt.name }),
                buttons: [
                    { text: t('common.cancel'), style: 'cancel', value: false },
                    { text: t('common.delete'), style: 'destructive', value: true },
                ],
            }),
        );
        if (!ok) return;
        if (playing === rt.id) stopPreview();
        if (isSelected(rt)) dispatch(saveSetting('ringtone', ''));
        dispatch(deleteRingtone(rt.id));
    };

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

    const isAlarmSelected = (rt) =>
        alarmSelected ? rt.url && rt.url === alarmSelected : rt.builtin;
    const selectAlarm = (rt) => dispatch(setAlarmTone(rt.url));

    const togglePreviewAlarm = (rt, e) => {
        e.stopPropagation();
        if (playingAlarm === rt.id) return stopPreview();
        stopPreview();
        if (!rt.url) return;
        try {
            const a = new Audio(rt.url);
            a.volume = Math.max(0, Math.min(1, (volume ?? 70) / 100));
            a.onended = () => setPlayingAlarm(null);
            const p = a.play();
            if (p && p.catch) p.catch(() => {});
            audioRef.current = a;
            setPlayingAlarm(rt.id);
            previewTimer.current = setTimeout(stopPreview, 5000);
        } catch (err) {}
    };

    const addAlarmFlow = async () => {
        const res = await dispatch(
            openPrompt({
                title: t('ringtones.addAlarmTitle'),
                message: t('ringtones.addAlarmMsg'),
                confirmText: t('common.add'),
                fields: [
                    { key: 'name', placeholder: t('ringtones.name'), maxLength: 40 },
                    { key: 'url', placeholder: t('ringtones.pasteUrl'), maxLength: 512 },
                ],
            }),
        );
        if (res && res.name && res.url) dispatch(addAlarmTone(res.name, res.url));
    };

    const removeAlarmFlow = async (rt) => {
        const ok = await dispatch(
            openDialog({
                title: t('ringtones.deleteTitle'),
                message: t('ringtones.deleteMsg', { name: rt.name }),
                buttons: [
                    { text: t('common.cancel'), style: 'cancel', value: false },
                    { text: t('common.delete'), style: 'destructive', value: true },
                ],
            }),
        );
        if (!ok) return;
        if (playingAlarm === rt.id) stopPreview();
        dispatch(deleteAlarmTone(rt.id));
    };

    const startPressAlarm = (rt) => {
        longFired.current = false;
        if (rt.builtin) return;
        pressTimer.current = setTimeout(() => {
            longFired.current = true;
            removeAlarmFlow(rt);
        }, 550);
    };
    const rowClickAlarm = (rt) => {
        if (longFired.current) {
            longFired.current = false;
            return;
        }
        selectAlarm(rt);
    };

    return (
        <div className="set">
            <div className="set__navbar set__navbar--center">
                <button className="set__backcircle" onClick={onBack} aria-label="Back">
                    <ChevronL />
                </button>
                <span className="set__navtitle">{t('ringtones.title')}</span>
                <span className="set__navspacer" />
            </div>

            <div className="set__scroll">
                <div className="set-grouplabel">{t('ringtones.ringtoneSection')}</div>
                <div className="set-card">
                    <button className="set-row" onClick={addRingtoneFlow}>
                        <SqIcon bg="#0a84ff">
                            <MusicNoteG />
                        </SqIcon>
                        <span className="set-row__label">{t('ringtones.add')}</span>
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
                                <button
                                    className="rt-play"
                                    onClick={(e) => togglePreview(rt, e)}
                                    aria-label="Preview"
                                >
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

                <div className="set-grouplabel">{t('ringtones.alarmSection')}</div>
                <div className="set-card">
                    <button className="set-row" onClick={addAlarmFlow}>
                        <SqIcon bg="#ff9f0a">
                            <MusicNoteG />
                        </SqIcon>
                        <span className="set-row__label">{t('ringtones.addAlarm')}</span>
                        <Chevron />
                    </button>
                </div>

                <div className="set-card set-card--rt">
                    {alarmTones.map((rt, i) => (
                        <Fragment key={rt.id}>
                            {i > 0 && <div className="set-sep" />}
                            <div
                                className="set-row set-row--static rt-row"
                                onPointerDown={() => startPressAlarm(rt)}
                                onPointerUp={endPress}
                                onPointerLeave={endPress}
                            >
                                <button
                                    className="rt-play"
                                    onClick={(e) => togglePreviewAlarm(rt, e)}
                                    aria-label="Preview"
                                >
                                    {playingAlarm === rt.id ? <PauseG /> : <PlayG />}
                                </button>
                                <button className="rt-body" onClick={() => rowClickAlarm(rt)}>
                                    {rt.name}
                                </button>
                                <button
                                    className={`rt-check${isAlarmSelected(rt) ? ' is-on' : ''}`}
                                    onClick={() => rowClickAlarm(rt)}
                                    aria-label="Select"
                                >
                                    {isAlarmSelected(rt) && <CheckG />}
                                </button>
                            </div>
                        </Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}

const SealBadge = () => {
    const cx = 50,
        cy = 50,
        base = 42,
        amp = 6,
        lobes = 11,
        N = 160;
    let d = '';
    for (let i = 0; i < N; i++) {
        const th = (i / N) * Math.PI * 2;
        const r = base + amp * Math.cos(lobes * th);
        d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(th) * r).toFixed(2)} ${(cy + Math.sin(th) * r).toFixed(2)} `;
    }
    d += 'Z';
    return (
        <svg viewBox="0 0 100 100" className="about-badge__svg">
            <path d={d} fill="#0a84ff" />
            <circle cx="50" cy="37" r="3.7" fill="#fff" />
            <rect x="46.3" y="44.5" width="7.4" height="20" rx="3.7" fill="#fff" />
        </svg>
    );
};

const ABOUT_VERSION = '1.0';
const ABOUT_SERIAL = '6779686977';
const ABOUT_MODEL = 'oPhone 26';

function AboutScreen({ onBack }) {
    const t = useT();
    const identity = useSelector((s) => s.phone.identity);
    const name = identity.name || t('settings.myProfile');
    const email = identity.email || '—';

    const Row = ({ label, value }) => (
        <div className="set-row set-row--static about-row">
            <span className="set-row__label">{label}</span>
            <span className="set-row__value about-value">{value}</span>
        </div>
    );

    return (
        <div className="set">
            <div className="set__navbar set__navbar--center">
                <button className="set__backcircle" onClick={onBack} aria-label="Back">
                    <ChevronL />
                </button>
                <span className="set__navtitle">{t('about.title')}</span>
                <span className="set__navspacer" />
            </div>

            <div className="set__scroll about-scroll">
                <div className="about-badge">
                    <SealBadge />
                </div>

                <div className="set-card">
                    <Row label={t('about.name')} value={name} />
                    <div className="set-sep set-sep--profile" />
                    <Row label={t('about.phoneId')} value={email} />
                    <div className="set-sep set-sep--profile" />
                    <Row label={t('about.version')} value={ABOUT_VERSION} />
                    <div className="set-sep set-sep--profile" />
                    <Row label={t('about.serial')} value={ABOUT_SERIAL} />
                    <div className="set-sep set-sep--profile" />
                    <Row label={t('about.model')} value={ABOUT_MODEL} />
                </div>

                <div className="about-footer">{t('about.footer')}</div>
            </div>
        </div>
    );
}

function LanguageScreen({ onBack }) {
    const dispatch = useDispatch();
    const t = useT();
    const languages = useSelector((s) => s.i18n.languages);
    const current = useSelector((s) => s.settings.language) || 'en';

    const select = (code) => dispatch(saveSetting('language', code));

    return (
        <div className="set">
            <div className="set__navbar set__navbar--center">
                <button className="set__backcircle" onClick={onBack} aria-label="Back">
                    <ChevronL />
                </button>
                <span className="set__navtitle">{t('language.title')}</span>
                <span className="set__navspacer" />
            </div>

            <div className="set__scroll">
                <div className="lang-globe">
                    <GlobeBigG />
                </div>

                <div className="set-card">
                    {languages.map((l, i) => (
                        <Fragment key={l.code}>
                            {i > 0 && <div className="set-sep set-sep--profile" />}
                            <button className="set-row lang-row" onClick={() => select(l.code)}>
                                <span className="set-row__label">{l.name}</span>
                                {current === l.code && (
                                    <span className="lang-check">
                                        <CheckG />
                                    </span>
                                )}
                            </button>
                        </Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}

const BLK_ACTION_W = 92;

function BlockedRow({ number, name, t, onUnblock }) {
    const [dx, setDx] = useState(0);
    const openRef = useRef(false);
    const movedRef = useRef(false);
    const drag = useRef(null);

    const begin = (e) => {
        movedRef.current = false;
        drag.current = { x: e.clientX, base: openRef.current ? -BLK_ACTION_W : 0 };
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) {}
    };
    const move = (e) => {
        if (!drag.current) return;
        if (Math.abs(e.clientX - drag.current.x) > 4) movedRef.current = true;
        let next = drag.current.base + (e.clientX - drag.current.x);
        if (next < -BLK_ACTION_W) next = -BLK_ACTION_W + (next + BLK_ACTION_W) * 0.35;
        setDx(Math.max(-BLK_ACTION_W * 1.4, Math.min(0, next)));
    };
    const finish = () => {
        if (!drag.current) return;
        drag.current = null;
        const open = dx < -BLK_ACTION_W / 2;
        openRef.current = open;
        setDx(open ? -BLK_ACTION_W : 0);
    };
    const onClick = () => {
        if (movedRef.current) {
            movedRef.current = false;
            return;
        }
        if (openRef.current) {
            openRef.current = false;
            setDx(0);
        }
    };

    const dragging = !!drag.current;
    const progress = Math.min(1, Math.max(0, -dx / BLK_ACTION_W));
    const snap = 'cubic-bezier(.22,1,.36,1)';

    return (
        <div className="blk-row">
            <button
                className="blk-row__unblock"
                style={{
                    width: BLK_ACTION_W,
                    opacity: progress,
                    transform: `translateX(${(1 - progress) * 16}px)`,
                    transition: dragging ? 'none' : `opacity .26s ease, transform .26s ${snap}`,
                }}
                onClick={onUnblock}
            >
                {t('privacy.unblock')}
            </button>
            <div
                className="blk-row__front"
                style={{
                    transform: `translate3d(${dx}px,0,0)`,
                    transition: dragging ? 'none' : `transform .26s ${snap}`,
                }}
                onPointerDown={begin}
                onPointerMove={move}
                onPointerUp={finish}
                onPointerCancel={finish}
                onClick={onClick}
            >
                <span className="blk-row__av">
                    {(name || number || '#').charAt(0).toUpperCase()}
                </span>
                <div className="blk-row__txt">
                    <span className="blk-row__name">{name || number}</span>
                    {name ? <span className="blk-row__num">{number}</span> : null}
                </div>
            </div>
        </div>
    );
}

function PrivacyScreen({ onBack }) {
    const dispatch = useDispatch();
    const t = useT();
    const loaded = useSelector((s) => s.contacts.loaded);
    const blocked = useSelector((s) => s.contacts.blocked);
    const contacts = useSelector((s) => s.contacts.contacts);

    useEffect(() => {
        if (!loaded) dispatch(loadPhoneState());
    }, [loaded, dispatch]);

    const entries = Object.entries(blocked || {}).map(([digits, e]) => {
        const c = contacts.find((x) => digitsOf(x.number) === digits);
        return { digits, number: e.number || digits, name: e.name || (c && c.name) || null };
    });

    return (
        <div className="set">
            <div className="set__navbar set__navbar--center">
                <button className="set__backcircle" onClick={onBack} aria-label="Back">
                    <ChevronL />
                </button>
                <span className="set__navtitle">{t('privacy.title')}</span>
                <span className="set__navspacer" />
            </div>

            <div className="set__scroll">
                <div className="set-grouplabel">{t('privacy.blocked')}</div>
                {entries.length === 0 ? (
                    <div className="set-card">
                        <div className="blk-empty">{t('privacy.empty')}</div>
                    </div>
                ) : (
                    <div className="set-card set-card--blk">
                        {entries.map((it, i) => (
                            <Fragment key={it.digits}>
                                {i > 0 && <div className="set-sep" />}
                                <BlockedRow
                                    number={it.number}
                                    name={it.name}
                                    t={t}
                                    onUnblock={() => dispatch(unblockNumber(it.number))}
                                />
                            </Fragment>
                        ))}
                    </div>
                )}
                <p className="set-hint">{t('privacy.blockedHint')}</p>
            </div>
        </div>
    );
}

function NotificationsScreen({ onBack }) {
    const dispatch = useDispatch();
    const t = useT();
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
                <span className="set__navtitle">{t('notifications.title')}</span>
                <span className="set__navspacer" />
            </div>

            <div className="set__scroll">
                <div className="set-card">
                    <ToggleRow
                        icon={
                            <SqIcon bg="#ff3b30">
                                <BellG />
                            </SqIcon>
                        }
                        label={t('notifications.sound')}
                        on={notifSound !== false}
                        onChange={(v) => dispatch(saveSetting('notifSound', v))}
                    />
                    <div className="set-sep" />
                    <ToggleRow
                        icon={
                            <SqIcon bg="#ff9500">
                                <BellOffG />
                            </SqIcon>
                        }
                        label={t('notifications.closeAll')}
                        on={masterOn}
                        onChange={(v) => dispatch(saveSetting('notifMaster', v))}
                    />
                </div>

                <div className={`set-card${masterOn ? '' : ' is-disabled'}`}>
                    {list.map((app, i) => (
                        <Fragment key={app.id}>
                            {i > 0 && <div className="set-sep" />}
                            <div className="set-row set-row--static">
                                <span className="set-appico">
                                    {app.icon ? (
                                        <img src={app.icon} alt="" />
                                    ) : (
                                        <span className="set-appico__ph">
                                            {(app.label || '?').charAt(0).toUpperCase()}
                                        </span>
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

function ProfileScreen({ onBack }) {
    const dispatch = useDispatch();
    const t = useT();
    const identity = useSelector((s) => s.phone.identity);
    const gallery = useSelector((s) => s.photos.items);
    const [sheet, setSheet] = useState(false);
    const [url, setUrl] = useState('');

    const name = identity.name || t('settings.myProfile');
    const email = identity.email || '';
    const avatar = identity.avatar || '';

    useEffect(() => {
        if (sheet) dispatch(loadPhotos());
    }, [sheet, dispatch]);

    const rename = async () => {
        const v = await dispatch(
            openPrompt({
                title: t('profile.renameTitle'),
                message: t('profile.renameMsg'),
                placeholder: t('profile.yourName'),
                value: identity.name || '',
                confirmText: t('profile.rename'),
                maxLength: 40,
            }),
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

    const openCamera = () => {
        dispatch(setShareTo('profile'));
        dispatch(openApp('camera'));
    };

    const removePhoto = async () => {
        const ok = await dispatch(
            openDialog({
                title: t('profile.removeTitle'),
                message: t('profile.removeMsg'),
                buttons: [
                    { text: t('common.cancel'), style: 'cancel', value: false },
                    { text: t('profile.removePhoto'), style: 'destructive', value: true },
                ],
            }),
        );
        if (!ok) return;
        dispatch(saveAvatar(''));
    };

    const sorted = [...gallery]
        .filter((p) => p.type !== 'video')
        .sort((a, b) => (b.ts || 0) - (a.ts || 0));

    return (
        <div className="set">
            <div className="set__navbar set__navbar--center">
                <button className="set__backcircle" onClick={onBack} aria-label="Back">
                    <ChevronL />
                </button>
                <span className="set__navtitle">{t('profile.title')}</span>
                <span className="set__navspacer" />
            </div>

            <div className="set__scroll">
                <div className="prof">
                    <div className="prof__avatar">
                        {avatar ? (
                            <img src={avatar} alt="" />
                        ) : (
                            <span>{name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="prof__name">{name}</div>
                    {email && <div className="prof__email">{email}</div>}
                </div>

                <div className="set-card set-card--profile">
                    <button className="set-row" onClick={() => setSheet(true)}>
                        <SqIcon bg="#0a84ff">
                            <CameraG />
                        </SqIcon>
                        <span className="set-row__label">{t('profile.changePhoto')}</span>
                    </button>
                    <div className="set-sep" />
                    <button className="set-row" onClick={rename}>
                        <SqIcon bg="#34c759">
                            <IdCardG />
                        </SqIcon>
                        <span className="set-row__label">{t('profile.changeName')}</span>
                    </button>
                    {avatar && (
                        <>
                            <div className="set-sep" />
                            <button className="set-row" onClick={removePhoto}>
                                <SqIcon bg="#ff3b30">
                                    <TrashG />
                                </SqIcon>
                                <span
                                    className="set-row__label"
                                    style={{ color: '#ff3b30' }}
                                >
                                    {t('profile.removePhoto')}
                                </span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {sheet && (
                <>
                    <div className="set-up__backdrop" onClick={() => setSheet(false)} />
                    <div className="set-up">
                        <div className="set-up__head">
                            <span className="set-up__title">{t('profile.uploadPhoto')}</span>
                            <button
                                className="set-up__close"
                                onClick={() => setSheet(false)}
                                aria-label="Close"
                            >
                                <XG />
                            </button>
                        </div>

                        <div className="set-up__urlrow">
                            <span className="set-up__urllabel">URL:</span>
                            <input
                                className="set-up__input"
                                value={url}
                                placeholder={t('profile.pasteUrl')}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyPhoto(url)}
                            />
                            <button
                                className="set-up__btn"
                                onClick={() => applyPhoto(url)}
                                disabled={!url.trim()}
                                aria-label="Use link"
                            >
                                <LinkG />
                            </button>
                            <button
                                className="set-up__btn"
                                onClick={openCamera}
                                aria-label="Take photo"
                            >
                                <CameraG />
                            </button>
                        </div>

                        <div className="set-up__grid">
                            {sorted.length === 0 && (
                                <div className="set-up__empty">{t('profile.noPhotos')}</div>
                            )}
                            {sorted.map((item) => (
                                <button
                                    key={item.id}
                                    className="set-up__cell"
                                    onClick={() => applyPhoto(item.url)}
                                >
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
    const t = useT();
    const [view, setView] = useState('list');
    const [copied, setCopied] = useState(false);
    const identity = useSelector((s) => s.phone.identity);
    const airplane = useSelector((s) => s.settings.airplane);
    const airdrop = useSelector((s) => s.settings.airdrop);
    const launchTab = useSelector((s) => s.phone.launchTab);

    const name = identity.name || t('settings.myProfile');
    const number = identity.number || '';
    const avatar = identity.avatar || '';
    const numberRaw = identity.numberRaw || number.replace(/\D/g, '');

    useEffect(() => {
        if (launchTab === 'profile') {
            setView('profile');
            dispatch(setLaunchTab(null));
        }
    }, [launchTab, dispatch]);

    const copyNumber = () => {
        if (!numberRaw) return;
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
        if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(numberRaw).catch(() => {});
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };

    const shareMyCard = () =>
        dispatch(openShare({ kind: 'contact', contact: { name, number, img: avatar } }));

    if (view === 'profile') return <ProfileScreen onBack={() => setView('list')} />;
    if (view === 'notifications') return <NotificationsScreen onBack={() => setView('list')} />;
    if (view === 'ringtones') return <RingtonesScreen onBack={() => setView('list')} />;
    if (view === 'wallpaper') return <WallpaperScreen onBack={() => setView('list')} />;
    if (view === 'display') return <DisplayScreen onBack={() => setView('list')} />;
    if (view === 'language') return <LanguageScreen onBack={() => setView('list')} />;
    if (view === 'privacy') return <PrivacyScreen onBack={() => setView('list')} />;
    if (view === 'about') return <AboutScreen onBack={() => setView('list')} />;
    if (view !== 'list') return <SubScreen id={view} onBack={() => setView('list')} />;

    return (
        <div className="set">
            <div className="set__bar">
                <h1 className="set__title">{t('settings.title')}</h1>
            </div>

            <div className="set__scroll">
                <div className="set-card">
                    <button className="set-profile" onClick={() => setView('profile')}>
                        <span className="set-profile__avatar">
                            {avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}
                        </span>
                        <span className="set-profile__text">
                            <span className="set-profile__name">{name}</span>
                            <span className="set-profile__sub">{t('settings.profileSub')}</span>
                        </span>
                        <Chevron />
                    </button>
                    <div className="set-sep set-sep--profile" />
                    <div className="set-phonerow">
                        <span className="set-phonerow__text">
                            <span className="set-phonerow__label">{t('settings.phoneNumber')}</span>
                            <span className="set-phonerow__num">{number}</span>
                        </span>
                        <span className="set-phonerow__icons">
                            <button
                                className="set-phonerow__ico set-phonerow__ico--btn"
                                onClick={shareMyCard}
                                aria-label="Share my contact"
                            >
                                <AirdropG />
                            </button>
                            <button
                                className={`set-phonerow__ico set-phonerow__ico--btn${copied ? ' is-copied' : ''}`}
                                onClick={copyNumber}
                                aria-label="Copy number"
                            >
                                {copied ? <CheckG /> : <CopyG />}
                            </button>
                        </span>
                    </div>
                </div>

                <div className="set-card">
                    <ToggleRow
                        icon={
                            <SqIcon bg="#ff9f0a">
                                <AirplaneG />
                            </SqIcon>
                        }
                        label={t('settings.airplane')}
                        on={airplane}
                        onChange={(v) => dispatch(setAirplane(v))}
                    />
                    <div className="set-sep" />
                    <ValueRow
                        icon={
                            <SqIcon bg="#0a84ff">
                                <WifiG />
                            </SqIcon>
                        }
                        label={t('settings.wifi')}
                        value={WIFI_NAME}
                    />
                    <div className="set-sep" />
                    <ToggleRow
                        icon={
                            <SqIcon bg="#0a84ff">
                                <AirdropG />
                            </SqIcon>
                        }
                        label={t('settings.airdrop')}
                        on={airdrop}
                        onChange={(v) => dispatch(saveSetting('airdrop', v))}
                    />
                </div>

                <div className="set-card">
                    <NavRow
                        icon={
                            <SqIcon bg="#ff3b30">
                                <BellG />
                            </SqIcon>
                        }
                        label={t('settings.notifications')}
                        onClick={() => setView('notifications')}
                    />
                    <div className="set-sep" />
                    <NavRow
                        icon={
                            <SqIcon bg="#ff2d55">
                                <RingtoneG />
                            </SqIcon>
                        }
                        label={t('settings.ringtones')}
                        onClick={() => setView('ringtones')}
                    />
                    <div className="set-sep" />
                    <NavRow
                        icon={
                            <SqIcon bg="#30b0c7">
                                <WallpaperG />
                            </SqIcon>
                        }
                        label={t('settings.wallpaper')}
                        onClick={() => setView('wallpaper')}
                    />
                    <div className="set-sep" />
                    <NavRow
                        icon={
                            <SqIcon bg="#0a84ff">
                                <DisplayG />
                            </SqIcon>
                        }
                        label={t('settings.display')}
                        onClick={() => setView('display')}
                    />
                </div>

                <div className="set-card">
                    <NavRow
                        icon={
                            <SqIcon bg="#0a84ff">
                                <LanguageG />
                            </SqIcon>
                        }
                        label={t('settings.language')}
                        onClick={() => setView('language')}
                    />
                    <div className="set-sep" />
                    <NavRow
                        icon={
                            <SqIcon bg="#ff3b30">
                                <PrivacyG />
                            </SqIcon>
                        }
                        label={t('settings.privacy')}
                        onClick={() => setView('privacy')}
                    />
                    <div className="set-sep" />
                    <NavRow
                        icon={
                            <SqIcon bg="#8e8e93">
                                <AboutG />
                            </SqIcon>
                        }
                        label={t('settings.about')}
                        onClick={() => setView('about')}
                    />
                </div>
            </div>
        </div>
    );
}
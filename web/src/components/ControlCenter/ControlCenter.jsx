import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './ControlCenter.css';
import { fetchNui } from '../../utils/fetchNui';
import { setControlCenter, setFlashlight } from '../../store/slices/phoneSlice';
import { saveSetting, saveSettingLive, flushSettings, setAirplane } from '../../store/slices/settingsSlice';
import { setPosition } from '../../store/slices/musicSlice';
import { useT } from '../../i18n/useT';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Seconds -> "m:ss".
const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ---- glyphs -------------------------------------------------------------- */
const AirplaneGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
  </svg>
);
const AirDropGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" width="1em" height="1em">
    <path d="M8.9 21A9 9 0 1 1 15.1 21" />
    <path d="M10.05 17.86A5.7 5.7 0 1 1 13.95 17.86" />
    <path d="M11.11 14.94A2.6 2.6 0 1 1 12.89 14.94" />
    <circle cx="12" cy="12.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
const FlashlightGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M7 2h10l-1.2 4.2a2 2 0 01-.5.9l-1.1 1.1a1 1 0 00-.3.7V21a1 1 0 01-1 1h-2a1 1 0 01-1-1V8.9a1 1 0 00-.3-.7L7.7 7.1a2 2 0 01-.5-.9L6 2z" />
    <rect x="10" y="11" width="4" height="3" rx="1" fill="rgba(0,0,0,0.28)" />
  </svg>
);
const SunGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="1em" height="1em">
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    <g>
      {[...Array(8)].map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 12 + Math.cos(a) * 7, y1 = 12 + Math.sin(a) * 7;
        const x2 = 12 + Math.cos(a) * 9.2, y2 = 12 + Math.sin(a) * 9.2;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </g>
  </svg>
);
const SpeakerGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    <path d="M16 8.5a4 4 0 010 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M18.5 6a7 7 0 010 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const PlayGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M8 5v14l11-7z" /></svg>
);
const PauseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
);
const PrevGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M7 6v12h2V6zm12 0l-8 6 8 6z" /></svg>
);
const NextGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M17 6v12h-2V6zM5 6l8 6-8 6z" /></svg>
);
const NoteGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M9 17V6l10-2v9" fill="none" stroke="currentColor" strokeWidth="1.7" /><circle cx="7" cy="17" r="2.2" /><circle cx="17" cy="15" r="2.2" /></svg>
);

/* A draggable horizontal slider (fills from the left). */
function HSlider({ value, min = 0, max = 100, onChange, icon }) {
  const ref = useRef(null);
  const setFromX = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    const pct = clamp((clientX - r.left) / r.width, 0, 1);
    onChange(Math.round(min + pct * (max - min)));
  };
  const onDown = (e) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  };
  const onMove = (e) => { if (e.buttons) setFromX(e.clientX); };
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="cc-hslider" ref={ref} onPointerDown={onDown} onPointerMove={onMove}>
      <div className="cc-hslider__fill" style={{ width: `${fill}%` }} />
      <div className="cc-hslider__icon">{icon}</div>
    </div>
  );
}

/* A draggable media seek bar (thin track + thumb). */
function Scrubber({ value, max, onChange, disabled }) {
  const ref = useRef(null);
  const setFromX = (clientX) => {
    if (disabled || !max) return;
    const r = ref.current.getBoundingClientRect();
    const pct = clamp((clientX - r.left) / r.width, 0, 1);
    onChange(Math.round(pct * max));
  };
  const onDown = (e) => {
    if (disabled) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  };
  const onMove = (e) => { if (e.buttons) setFromX(e.clientX); };
  const pct = max ? clamp(value / max, 0, 1) * 100 : 0;
  return (
    <div className={`cc-scrub${disabled ? ' is-disabled' : ''}`} ref={ref} onPointerDown={onDown} onPointerMove={onMove}>
      <div className="cc-scrub__track"><div className="cc-scrub__fill" style={{ width: `${pct}%` }} /></div>
      <div className="cc-scrub__thumb" style={{ left: `${pct}%` }} />
    </div>
  );
}

export default function ControlCenter() {
  const dispatch = useDispatch();
  const t = useT();
  const open = useSelector((s) => s.phone.controlCenterOpen);
  const airplane = useSelector((s) => s.settings.airplane);
  const airdrop = useSelector((s) => s.settings.airdrop);
  const brightness = useSelector((s) => s.settings.brightness);
  const volume = useSelector((s) => s.settings.volume);
  const flashlightOn = useSelector((s) => s.phone.flashlightOn);
  const music = useSelector((s) => s.music);

  const close = () => dispatch(setControlCenter(false));
  const stop = (e) => e.stopPropagation();

  // Persist any pending slider change the moment the Control Center closes (open
  // -> false) or the phone unmounts, so it never relies solely on the debounce.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) dispatch(flushSettings());
    wasOpen.current = open;
  }, [open, dispatch]);
  useEffect(() => () => { dispatch(flushSettings()); }, [dispatch]);

  const toggleAirplane = () => dispatch(setAirplane(!airplane));
  const toggleAirdrop = () => dispatch(saveSetting('airdrop', !airdrop));
  const toggleFlashlight = () => {
    const on = !flashlightOn;
    dispatch(setFlashlight(on));
    fetchNui('phone:flashlight', { on }, { ok: true });
  };
  const setBrightness = (v) => dispatch(saveSettingLive('brightness', clamp(v, 20, 100)));
  const setVolume = (v) => dispatch(saveSettingLive('volume', clamp(v, 0, 100)));

  const hasTrack = !!music.title;

  return (
    <div className={`cc${open ? ' is-open' : ''}`} onPointerDown={close}>
      {/* Quick toggles */}
      <div className="cc-card cc-toggles" onPointerDown={stop}>
        <button className={`cc-toggle${airplane ? ' is-on cc-toggle--airplane' : ''}`} onClick={toggleAirplane}>
          <AirplaneGlyph />
          <span>{t('controlCenter.airplane')}</span>
        </button>
        <button className={`cc-toggle${airdrop ? ' is-on cc-toggle--airdrop' : ''}`} onClick={toggleAirdrop}>
          <AirDropGlyph />
          <span>{t('controlCenter.airdrop')}</span>
        </button>
        <button className={`cc-toggle${flashlightOn ? ' is-on cc-toggle--flash' : ''}`} onClick={toggleFlashlight}>
          <FlashlightGlyph />
          <span>{t('controlCenter.flashlight')}</span>
        </button>
      </div>

      {/* Brightness */}
      <div className="cc-card cc-slider-card" onPointerDown={stop}>
        <HSlider value={brightness} min={20} max={100} onChange={setBrightness} icon={<SunGlyph />} />
      </div>

      {/* Volume */}
      <div className="cc-card cc-slider-card" onPointerDown={stop}>
        <HSlider value={volume} min={0} max={100} onChange={setVolume} icon={<SpeakerGlyph />} />
      </div>

      {/* Now playing */}
      <div className="cc-card cc-music" onPointerDown={stop}>
        <div className="cc-music__head">
          <div className="cc-music__art">
            {music.artwork ? <img src={music.artwork} alt="" /> : <NoteGlyph />}
          </div>
          <div className="cc-music__meta">
            <div className="cc-music__title">{hasTrack ? music.title : t('controlCenter.noMusic')}</div>
            <div className="cc-music__artist">{hasTrack ? music.artist || t('controlCenter.unknownArtist') : t('controlCenter.notPlaying')}</div>
          </div>
        </div>

        <div className="cc-music__scrub">
          <span className="cc-music__time">{fmtTime(music.position)}</span>
          <Scrubber
            value={music.position}
            max={music.duration}
            disabled={!hasTrack || !music.duration}
            onChange={(v) => { dispatch(setPosition(v)); fetchNui('phone:spotify:seek', { position: v }, {}); }}
          />
          <span className="cc-music__time cc-music__time--end">
            {hasTrack && music.duration ? `-${fmtTime(music.duration - music.position)}` : fmtTime(music.duration)}
          </span>
        </div>

        <div className="cc-music__controls">
          <button className="cc-music__btn" disabled={!hasTrack} onClick={() => fetchNui('phone:spotify:prev', {}, {})}><PrevGlyph /></button>
          <button className="cc-music__btn cc-music__btn--play" disabled={!hasTrack} onClick={() => fetchNui('phone:spotify:toggle', {}, {})}>
            {music.playing ? <PauseGlyph /> : <PlayGlyph />}
          </button>
          <button className="cc-music__btn" disabled={!hasTrack} onClick={() => fetchNui('phone:spotify:next', {}, {})}><NextGlyph /></button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './Clock.css';
import { pauseTimer, resumeTimer, cancelTimer } from '../../store/slices/clockSlice';
import { fmtCountdown, timerRemaining } from '../../app/clock/format';
import { useTicker } from '../../app/clock/useTicker';
import { PauseGlyph, PlayGlyph, XGlyph } from '../../app/clock/icons';
import { useT } from '../../i18n/useT';

// A compact ring for the collapsed pill.
function MiniRing({ progress }) {
  const R = 9;
  const C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 24 24" className="clk-island__ringsvg">
      <circle cx="12" cy="12" r={R} className="clk-island__ringtrack" />
      <circle
        cx="12"
        cy="12"
        r={R}
        className="clk-island__ringbar"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - Math.max(0, Math.min(1, progress)))}
        transform="rotate(-90 12 12)"
        strokeLinecap="round"
      />
    </svg>
  );
}

// The Timer Dynamic Island — shown while a timer is active and the phone is open
// (home screen or any OTHER app; hidden on the lock screen and inside the Clock
// app itself). Tap to expand it into pause / cancel controls. Sits BELOW the
// call + AirDrop islands (they take priority).
export default function TimerIsland() {
  const dispatch = useDispatch();
  const t = useT();
  const timer = useSelector((s) => s.clock.timer);
  const locked = useSelector((s) => s.phone.locked);
  const activeApp = useSelector((s) => s.phone.activeApp);
  const ringing = useSelector((s) => s.clock.ringing);
  const inCall = useSelector((s) => !!s.call.state);
  const airdrop = useSelector((s) => s.airdrop.island);
  const [expanded, setExpanded] = useState(false);

  const active = timer && !locked && activeApp !== 'clock' && !ringing && !inCall && !airdrop;
  const now = useTicker(!!active && timer && !timer.paused, 250);

  if (!active) return null;

  const remain = timerRemaining(timer, now);
  const progress = timer.total > 0 ? remain / timer.total : 0;
  const time = fmtCountdown(remain);

  if (!expanded) {
    return (
      <div className="clk-island" onClick={() => setExpanded(true)}>
        <span className="clk-island__ring">
          <MiniRing progress={progress} />
        </span>
        <span className="clk-island__time clk-island__time--sm">{time}</span>
      </div>
    );
  }

  return (
    <div className="clk-island clk-island--open">
      <div className="clk-island__actions">
        {timer.paused ? (
          <button
            className="clk-island__btn clk-island__btn--amber"
            onClick={() => dispatch(resumeTimer())}
            aria-label="Resume"
          >
            <PlayGlyph />
          </button>
        ) : (
          <button
            className="clk-island__btn clk-island__btn--amber"
            onClick={() => dispatch(pauseTimer())}
            aria-label="Pause"
          >
            <PauseGlyph />
          </button>
        )}
        <button
          className="clk-island__btn clk-island__btn--gray"
          onClick={() => dispatch(cancelTimer())}
          aria-label="Cancel"
        >
          <XGlyph />
        </button>
      </div>
      <div className="clk-island__info" onClick={() => setExpanded(false)}>
        <span className="clk-island__label">{t('clock.timer')}</span>
        <span className="clk-island__time">{time}</span>
      </div>
    </div>
  );
}

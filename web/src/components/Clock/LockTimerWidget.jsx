import { useDispatch, useSelector } from 'react-redux';
import './Clock.css';
import { pauseTimer, resumeTimer, cancelTimer } from '../../store/slices/clockSlice';
import { fmtCountdown, timerRemaining } from '../../app/clock/format';
import { useTicker } from '../../app/clock/useTicker';
import { PauseGlyph, PlayGlyph, XGlyph } from '../../app/clock/icons';
import { useT } from '../../i18n/useT';

// Live-Activity style timer card for the LOCK-SCREEN Notification Center. Shows
// while a timer is active so it can be paused / cancelled without unlocking.
export default function LockTimerWidget() {
  const dispatch = useDispatch();
  const t = useT();
  const timer = useSelector((s) => s.clock.timer);
  const now = useTicker(!!timer && !timer.paused, 250);

  if (!timer) return null;

  const remain = timerRemaining(timer, now);
  const time = fmtCountdown(remain);

  return (
    <div className="clk-liveact">
      <div className="clk-liveact__actions">
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
      <div className="clk-liveact__info">
        <span className="clk-liveact__label">{t('clock.timer')}</span>
        <span className="clk-liveact__time">{time}</span>
      </div>
    </div>
  );
}

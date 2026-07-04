import { useDispatch, useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import { swStart, swStop, swReset, swLap } from '../../store/slices/clockSlice';
import { fmtStopwatch } from './format';
import { useTicker } from './useTicker';

export default function StopwatchTab() {
  const dispatch = useDispatch();
  const t = useT();
  const sw = useSelector((s) => s.clock.stopwatch);
  const now = useTicker(sw.running, 33); // ~30fps for the centiseconds

  const elapsed = sw.elapsed + (sw.running ? now - sw.startedAt : 0);
  const started = sw.running || sw.elapsed > 0;

  return (
    <div className="clk-screen clk-screen--center">
      <div className="clk-sw__display">{fmtStopwatch(elapsed)}</div>

      <div className="clk-btnrow">
        {sw.running ? (
          <button className="clk-rbtn clk-rbtn--soft" onClick={() => dispatch(swLap())}>
            {t('clock.lap')}
          </button>
        ) : (
          <button
            className="clk-rbtn clk-rbtn--soft"
            onClick={() => dispatch(swReset())}
            disabled={!started}
          >
            {t('clock.reset')}
          </button>
        )}

        {sw.running ? (
          <button className="clk-rbtn clk-rbtn--red" onClick={() => dispatch(swStop())}>
            {t('clock.stop')}
          </button>
        ) : (
          <button className="clk-rbtn clk-rbtn--green" onClick={() => dispatch(swStart())}>
            {t('clock.start')}
          </button>
        )}
      </div>

      {sw.laps.length > 0 && (
        <div className="clk-scroll clk-laps">
          {sw.laps.map((lap, i) => (
            <div key={i} className="clk-lap">
              <span>{t('clock.lapN', { n: sw.laps.length - i })}</span>
              <span className="clk-lap__t">{fmtStopwatch(lap)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

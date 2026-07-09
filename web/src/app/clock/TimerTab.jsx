import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import {
    startTimer,
    pauseTimer,
    resumeTimer,
    cancelTimer,
    startRecent,
    deleteRecent,
} from '../../store/slices/clockSlice';
import { fmtCountdown, fmtRecent, timerRemaining, pad2 } from './format';
import { useTicker } from './useTicker';
import Wheel from './Wheel';
import Ring from './Ring';
import { PlayGlyph } from './icons';

function ActiveTimer({ timer }) {
    const dispatch = useDispatch();
    const t = useT();
    const now = useTicker(!timer.paused, 250);
    const remain = timerRemaining(timer, now);
    const progress = timer.total > 0 ? remain / timer.total : 0;

    const endLabel = !timer.paused
        ? (() => {
              const d = new Date(timer.deadline);
              return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
          })()
        : null;

    return (
        <div className="clk-screen clk-screen--center">
            <Ring progress={progress} className="clk-ring--timer">
                <span className="clk-ring__time">{fmtCountdown(remain)}</span>
                {endLabel && (
                    <span className="clk-ring__ends">
                        <BellSmall /> {endLabel}
                    </span>
                )}
            </Ring>

            <div className="clk-btnrow">
                <button className="clk-rbtn clk-rbtn--soft" onClick={() => dispatch(cancelTimer())}>
                    {t('common.cancel')}
                </button>
                {timer.paused ? (
                    <button
                        className="clk-rbtn clk-rbtn--green"
                        onClick={() => dispatch(resumeTimer())}
                    >
                        {t('clock.resume')}
                    </button>
                ) : (
                    <button
                        className="clk-rbtn clk-rbtn--amber"
                        onClick={() => dispatch(pauseTimer())}
                    >
                        {t('clock.pause')}
                    </button>
                )}
            </div>
        </div>
    );
}

const BellSmall = () => (
    <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="currentColor"
        style={{ verticalAlign: '-0.12em' }}
    >
        <path d="M12 2.5a5.5 5.5 0 0 0-5.5 5.5c0 3.6-1 5.2-1.8 6.1-.4.5-.7.8-.7 1.4 0 .8.6 1.5 1.6 1.5h12.8c1 0 1.6-.7 1.6-1.5 0-.6-.3-.9-.7-1.4-.8-.9-1.8-2.5-1.8-6.1A5.5 5.5 0 0 0 12 2.5Z" />
    </svg>
);

function SetupTimer() {
    const dispatch = useDispatch();
    const t = useT();
    const recents = useSelector((s) => s.clock.recents);
    const [h, setH] = useState(0);
    const [m, setM] = useState(5);
    const [s, setS] = useState(0);
    const [editing, setEditing] = useState(false);

    const total = h * 3600 + m * 60 + s;

    return (
        <div className="clk-screen">
            <div className="clk-scroll clk-scroll--timer">
                <div className="clk-picker clk-picker--dur">
                    <Wheel max={23} value={h} onChange={setH} label={t('clock.hours')} />
                    <Wheel max={59} value={m} onChange={setM} label={t('clock.min')} />
                    <Wheel max={59} value={s} onChange={setS} label={t('clock.sec')} />
                </div>

                <div className="clk-btnrow">
                    <button className="clk-rbtn clk-rbtn--soft" disabled onClick={() => {}}>
                        {t('common.cancel')}
                    </button>
                    <button
                        className="clk-rbtn clk-rbtn--green"
                        disabled={total <= 0}
                        onClick={() => dispatch(startTimer(total))}
                    >
                        {t('clock.start')}
                    </button>
                </div>

                <div className="clk-recents">
                    <div className="clk-recents__head">
                        <span>{t('clock.recents')}</span>
                        {recents.length > 0 && (
                            <button
                                className="clk-recents__edit"
                                onClick={() => setEditing((v) => !v)}
                            >
                                {editing ? t('common.done') : t('clock.edit')}
                            </button>
                        )}
                    </div>

                    {recents.length === 0 ? (
                        <p className="clk-empty clk-empty--sm">{t('clock.noRecents')}</p>
                    ) : (
                        <div className="clk-recents__list">
                            {recents.map((r, i) => (
                                <div key={i} className="clk-recent">
                                    {editing ? (
                                        <button
                                            className="clk-recent__del"
                                            onClick={() => dispatch(deleteRecent(i))}
                                            aria-label={t('common.delete')}
                                        >
                                            <span />
                                        </button>
                                    ) : null}
                                    <div className="clk-recent__main">
                                        <span className="clk-recent__time">{fmtRecent(r)}</span>
                                        <span className="clk-recent__sub">{t('clock.timer')}</span>
                                    </div>
                                    {!editing && (
                                        <button
                                            className="clk-recent__go"
                                            onClick={() => dispatch(startRecent(r))}
                                            aria-label={t('clock.start')}
                                        >
                                            <PlayGlyph />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TimerTab() {
    const timer = useSelector((s) => s.clock.timer);
    return timer ? <ActiveTimer timer={timer} /> : <SetupTimer />;
}
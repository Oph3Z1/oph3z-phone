import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import { addAlarm, toggleAlarm, deleteAlarm } from '../../store/slices/clockSlice';
import { pad2 } from './format';
import Wheel from './Wheel';
import { PlusGlyph, MinusGlyph } from './icons';

function Switch({ on, onChange }) {
    return (
        <button
            className={`clk-switch${on ? ' is-on' : ''}`}
            onClick={onChange}
            role="switch"
            aria-checked={on}
        >
            <span className="clk-switch__knob" />
        </button>
    );
}

function AddSheet({ onClose }) {
    const dispatch = useDispatch();
    const t = useT();
    const now = new Date();
    const [hour, setHour] = useState(now.getHours());
    const [min, setMin] = useState(now.getMinutes());
    const [label, setLabel] = useState('');

    const save = () => {
        dispatch(addAlarm(hour, min, label.trim()));
        onClose();
    };

    return (
        <div className="clk-sheet" onClick={onClose}>
            <div className="clk-sheet__panel" onClick={(e) => e.stopPropagation()}>
                <div className="clk-sheet__bar">
                    <button className="clk-sheet__cancel" onClick={onClose}>
                        {t('common.cancel')}
                    </button>
                    <span className="clk-sheet__title">{t('clock.addAlarm')}</span>
                    <button className="clk-sheet__save" onClick={save}>
                        {t('common.add')}
                    </button>
                </div>

                <div className="clk-picker clk-picker--time">
                    <Wheel max={23} value={hour} onChange={setHour} />
                    <span className="clk-picker__colon">:</span>
                    <Wheel max={59} value={min} onChange={setMin} />
                </div>

                <div className="clk-sheet__field">
                    <span>{t('clock.label')}</span>
                    <input
                        value={label}
                        maxLength={40}
                        placeholder={t('clock.alarm')}
                        onChange={(e) => setLabel(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

export default function AlarmTab() {
    const dispatch = useDispatch();
    const t = useT();
    const alarms = useSelector((s) => s.clock.alarms);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        if (editing && alarms.length === 0) setEditing(false);
    }, [editing, alarms.length]);

    const sorted = [...alarms].sort((a, b) => a.hour * 60 + a.min - (b.hour * 60 + b.min));

    return (
        <div className="clk-screen">
            <div className="clk-head">
                <button
                    className="clk-head__edit"
                    onClick={() => setEditing((v) => !v)}
                    disabled={!alarms.length}
                >
                    {editing ? t('common.done') : t('clock.edit')}
                </button>
                <button
                    className="clk-head__add"
                    onClick={() => setAdding(true)}
                    aria-label={t('clock.addAlarm')}
                >
                    <PlusGlyph />
                </button>
            </div>

            <div className="clk-scroll">
                <h1 className="clk-title">{t('clock.alarms')}</h1>

                {sorted.length === 0 ? (
                    <p className="clk-empty">{t('clock.noAlarms')}</p>
                ) : (
                    <div className="clk-alarms">
                        {sorted.map((a) => (
                            <div key={a.id} className="clk-alarm">
                                {editing && (
                                    <button
                                        className="clk-alarm__del"
                                        onClick={() => dispatch(deleteAlarm(a.id))}
                                        aria-label={t('common.delete')}
                                    >
                                        <MinusGlyph />
                                    </button>
                                )}
                                <div className="clk-alarm__main">
                                    <span
                                        className={`clk-alarm__time${a.enabled ? '' : ' is-off'}`}
                                    >
                                        {pad2(a.hour)}:{pad2(a.min)}
                                    </span>
                                    <span className="clk-alarm__label">
                                        {a.label || t('clock.alarm')}
                                    </span>
                                </div>
                                {!editing && (
                                    <Switch
                                        on={a.enabled}
                                        onChange={() => dispatch(toggleAlarm(a.id))}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {adding && <AddSheet onClose={() => setAdding(false)} />}
        </div>
    );
}
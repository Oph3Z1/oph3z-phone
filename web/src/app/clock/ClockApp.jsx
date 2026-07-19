import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './ClockApp.css';

import { useT } from '../../i18n/useT';
import { loadClock } from '../../store/slices/clockSlice';
import AlarmTab from './AlarmTab';
import StopwatchTab from './StopwatchTab';
import TimerTab from './TimerTab';
import { AlarmIcon, StopwatchIcon, TimerIcon } from './icons';

const TABS = [
    { id: 'alarm', Icon: AlarmIcon },
    { id: 'stopwatch', Icon: StopwatchIcon },
    { id: 'timer', Icon: TimerIcon },
];

export default function ClockApp() {
    const dispatch = useDispatch();
    const t = useT();
    const loaded = useSelector((s) => s.clock.loaded);
    const [tab, setTab] = useState('alarm');

    useEffect(() => {
        if (!loaded) dispatch(loadClock());
    }, [loaded, dispatch]);

    const renderTab = () => {
        switch (tab) {
            case 'alarm':
                return <AlarmTab />;
            case 'stopwatch':
                return <StopwatchTab />;
            default:
                return <TimerTab />;
        }
    };

    return (
        <div className="clockapp">
            <div className="clockapp__body clockapp__body--in" key={tab}>
                {renderTab()}
            </div>

            <nav className="clockapp__tabbar">
                {TABS.map(({ id, Icon }) => (
                    <button
                        key={id}
                        className={`clockapp__tab${tab === id ? ' is-active' : ''}`}
                        onClick={() => setTab(id)}
                    >
                        <Icon className="clockapp__tabicon" />
                        <span>{t(`clock.tab_${id}`)}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
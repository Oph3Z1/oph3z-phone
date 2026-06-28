import { useState } from 'react';
import { useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import { InfoIcon } from '../components/icons';
import { fetchNui } from '../../../utils/fetchNui';
import { pad2 } from '../../../utils/misc';

const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

// Format a unix (seconds) timestamp like iOS recents.
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function RecentsView({ onOpen }) {
  const recents = useSelector((s) => s.contacts.recents);
  const contacts = useSelector((s) => s.contacts.contacts);
  const [filter, setFilter] = useState('all'); // 'all' | 'missed'

  const list = filter === 'missed' ? recents.filter((r) => r.missed) : recents;

  const contactIdFor = (number) => {
    const d = digitsOnly(number);
    const c = contacts.find((x) => digitsOnly(x.number) === d);
    return c ? c.id : null;
  };

  const call = (number) => fetchNui('phone:call:start', { number }, {});

  return (
    <>
      <div className="pa-topbar">
        <button className="pa-actionbtn" style={{ visibility: 'hidden' }}>
          Edit
        </button>
        <div className="pa-segment" style={{ margin: 0, width: '45%' }}>
          <button
            className={filter === 'all' ? 'is-active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'missed' ? 'is-active' : ''}
            onClick={() => setFilter('missed')}
          >
            Missed
          </button>
        </div>
        <span style={{ width: '3em' }} />
      </div>
      <div className="pa-title">Recents</div>

      <div className="pa-scroll">
        {list.length === 0 ? (
          <div className="pa-empty">
            <div className="pa-empty__title">No Recent Calls</div>
            <div>Your call history will appear here.</div>
          </div>
        ) : (
          <div className="pa-list">
            {list.map((r) => {
            const cid = contactIdFor(r.number);
            return (
              <button key={r.id} className="pa-row" onClick={() => call(r.number)}>
                <Avatar name={r.name || ''} img={r.img} />
                <span className="pa-row__main">
                  <span className={`pa-row__name${r.missed ? ' pa-row__name--missed' : ''}`}>
                    {r.name || r.number}
                  </span>
                  <span className="pa-row__sub">
                    {r.direction === 'out' ? '↗ outgoing' : r.missed ? '↙ missed' : '↙ incoming'}
                  </span>
                </span>
                <span className="pa-row__time">{formatTime(r.ts)}</span>
                <span
                  className="pa-row__info"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (cid) onOpen(cid);
                  }}
                >
                  <InfoIcon />
                </span>
              </button>
            );
          })}
          </div>
        )}
      </div>
    </>
  );
}

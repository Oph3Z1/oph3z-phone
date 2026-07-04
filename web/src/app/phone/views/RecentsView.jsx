import { useState } from 'react';
import { useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import { InfoIcon } from '../components/icons';
import { fetchNui } from '../../../utils/fetchNui';
import { pad2 } from '../../../utils/misc';
import { useT } from '../../../i18n/useT';

const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

// Format a unix (seconds) timestamp like iOS recents.
function formatTime(ts, t) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return t('phone.yesterday');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function RecentsView({ onProfile }) {
  const t = useT();
  const recents = useSelector((s) => s.contacts.recents);
  const contacts = useSelector((s) => s.contacts.contacts);
  const [filter, setFilter] = useState('all'); // 'all' | 'missed'

  const list = filter === 'missed' ? recents.filter((r) => r.missed) : recents;

  // Resolve the name/avatar live from contacts so a recent shows the contact's
  // name immediately after they're saved (its stored snapshot may be just a number).
  const resolve = (r) => {
    const c = contacts.find((x) => digitsOnly(x.number) === digitsOnly(r.number));
    return { name: (c && c.name) || r.name || '', img: (c && c.img) || r.img || '' };
  };

  const call = (number) => fetchNui('phone:call:start', { number }, {});

  return (
    <>
      <div className="pa-topbar">
        <button className="pa-actionbtn" style={{ visibility: 'hidden' }}>
          {t('phone.edit')}
        </button>
        <div className="pa-segment" style={{ margin: 0, width: '45%' }}>
          <button
            className={filter === 'all' ? 'is-active' : ''}
            onClick={() => setFilter('all')}
          >
            {t('phone.all')}
          </button>
          <button
            className={filter === 'missed' ? 'is-active' : ''}
            onClick={() => setFilter('missed')}
          >
            {t('phone.missed')}
          </button>
        </div>
        <span style={{ width: '3em' }} />
      </div>
      <div className="pa-title">{t('phone.recents')}</div>

      <div className="pa-scroll">
        {list.length === 0 ? (
          <div className="pa-empty">
            <div className="pa-empty__title">{t('phone.noRecents')}</div>
            <div>{t('phone.noRecentsHint')}</div>
          </div>
        ) : (
          <div className="pa-list">
            {list.map((r) => {
              const who = resolve(r);
              return (
              <button key={r.id} className="pa-row" onClick={() => call(r.number)}>
                <Avatar name={who.name} img={who.img} />
                <span className="pa-row__main">
                  <span className={`pa-row__name${r.missed ? ' pa-row__name--missed' : ''}`}>
                    {who.name || r.number}
                  </span>
                  <span className="pa-row__sub">
                    {r.direction === 'out'
                      ? `↗ ${t('phone.outgoing')}`
                      : r.missed
                      ? `↙ ${t('phone.missedLower')}`
                      : `↙ ${t('phone.incoming')}`}
                  </span>
                </span>
                <span className="pa-row__time">{formatTime(r.ts, t)}</span>
                <span
                  className="pa-row__info"
                  onClick={(e) => {
                    e.stopPropagation();
                    onProfile(r.number);
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

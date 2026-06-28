import { useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import { PlusIcon, SearchIcon } from '../components/icons';

// Group + sort contacts into { letter, items[] } sections.
function groupContacts(contacts) {
  const sorted = [...contacts].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
  const groups = {};
  for (const c of sorted) {
    const first = (c.name.trim()[0] || '#').toUpperCase();
    const key = /[A-ZÅÄÖ]/.test(first) ? first : '#';
    (groups[key] = groups[key] || []).push(c);
  }
  return Object.keys(groups)
    .sort()
    .map((letter) => ({ letter, items: groups[letter] }));
}

export default function ContactsView({ onOpen, onAdd }) {
  const contacts = useSelector((s) => s.contacts.contacts);
  const myNumber = useSelector((s) => s.contacts.number);
  const [query, setQuery] = useState('');

  const sectionRefs = useRef({});

  const sections = useMemo(() => groupContacts(contacts), [contacts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.number.toLowerCase().includes(q)
    );
  }, [query, contacts]);

  const scrollTo = (letter) => {
    sectionRefs.current[letter]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const Row = (c) => (
    <button key={c.id} className="pa-row" onClick={() => onOpen(c.id)}>
      <Avatar name={c.name} img={c.img} />
      <span className="pa-row__main">
        <span className="pa-row__name">{c.name}</span>
      </span>
    </button>
  );

  return (
    <>
      <div className="pa-topbar">
        <span />
        <button className="pa-actionbtn pa-actionbtn--round" onClick={onAdd}>
          <PlusIcon />
        </button>
      </div>
      <div className="pa-title">Contacts</div>

      <div className="pa-search">
        <SearchIcon />
        <input
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* My card */}
      <div className="pa-mycard">
        <Avatar name="" img="" size="3.2em" />
        <span className="pa-row__main">
          <span className="pa-mycard__name">My Card</span>
          <span className="pa-mycard__sub">{myNumber || '—'}</span>
        </span>
      </div>

      <div className="pa-scroll">
        {filtered ? (
          <div className="pa-list">
            {filtered.length === 0 ? (
              <div className="pa-empty">
                <div className="pa-empty__title">No Results</div>
              </div>
            ) : (
              filtered.map(Row)
            )}
          </div>
        ) : (
          <div className="pa-list">
            {sections.map((sec) => (
              <div key={sec.letter} ref={(el) => (sectionRefs.current[sec.letter] = el)}>
                <div className="pa-section">{sec.letter}</div>
                {sec.items.map(Row)}
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="pa-empty">
                <div className="pa-empty__title">No Contacts</div>
                <div>Tap + to add your first contact.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {!filtered && sections.length > 0 && (
        <div className="pa-azindex">
          {sections.map((sec) => (
            <button key={sec.letter} onClick={() => scrollTo(sec.letter)}>
              {sec.letter}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

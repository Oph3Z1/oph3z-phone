import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { PhoneIcon, BackspaceIcon, PersonIcon, PlusIcon } from '../components/icons';
import { fetchNui } from '../../../utils/fetchNui';

const KEYS = [
  { d: '1', l: '' },
  { d: '2', l: 'ABC' },
  { d: '3', l: 'DEF' },
  { d: '4', l: 'GHI' },
  { d: '5', l: 'JKL' },
  { d: '6', l: 'MNO' },
  { d: '7', l: 'PQRS' },
  { d: '8', l: 'TUV' },
  { d: '9', l: 'WXYZ' },
  { d: '*', l: '' },
  { d: '0', l: '+' },
  { d: '#', l: '' },
];

const digitsOnly = (s) => s.replace(/\D/g, '');

export default function KeypadView({ onAddContact }) {
  const contacts = useSelector((s) => s.contacts.contacts);
  const [value, setValue] = useState('');

  const typedDigits = digitsOnly(value);
  // Contact whose number contains the typed digits -> shown as a suggestion.
  const match =
    typedDigits.length >= 2
      ? contacts.find((c) => digitsOnly(c.number).includes(typedDigits))
      : null;
  // Does the typed number EXACTLY belong to a saved contact?
  const exists =
    typedDigits.length > 0 && contacts.some((c) => digitsOnly(c.number) === typedDigits);

  const press = (d) => setValue((v) => (v.length < 18 ? v + d : v));
  const backspace = () => setValue((v) => v.slice(0, -1));
  const callNumber = () => {
    if (value) fetchNui('phone:call:start', { number: value }, {});
  };

  // Type numbers from the physical keyboard (digits only) + backspace.
  // Ignored while a text field is focused (e.g. the contact editor).
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="pa-keypad">
      {/* top-right: add typed number to contacts (only for unknown numbers) */}
      <div className="pa-topbar" style={{ width: '100%' }}>
        <span />
        <button
          className="pa-actionbtn pa-actionbtn--round"
          style={{ visibility: value && !exists ? 'visible' : 'hidden' }}
          onClick={() => onAddContact(value)}
          aria-label="Add to contacts"
        >
          <PersonIcon style={{ fontSize: '0.8em' }} />
          <PlusIcon style={{ fontSize: '0.6em', marginLeft: '-0.2em' }} />
        </button>
      </div>

      <div className="pa-keypad__inner">
        <div className="pa-keypad__display">{value}</div>
        <div className="pa-keypad__match">{match ? match.name : ''}</div>

        <div className="pa-keypad__grid">
          {KEYS.map((k) => (
            <button key={k.d} className="pa-key" onClick={() => press(k.d)}>
              <span className="pa-key__digit">{k.d}</span>
              <span className="pa-key__letters">{k.l}</span>
            </button>
          ))}
        </div>

        <div className="pa-keypad__actions">
          <span />
          <button className="pa-callbtn" aria-label="Call" onClick={callNumber}>
            <PhoneIcon />
          </button>
          {value ? (
            <button className="pa-keypad__back" onClick={backspace} aria-label="Backspace">
              <BackspaceIcon />
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}

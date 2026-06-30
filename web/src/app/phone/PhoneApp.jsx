import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './PhoneApp.css';

import { loadPhoneState, setContactFocus, digitsOf } from '../../store/slices/contactsSlice';
import { setResumeThread } from '../../store/slices/messagesSlice';
import { openApp, setLaunchTab } from '../../store/slices/phoneSlice';
import { markNotifRead } from '../../store/slices/notificationsSlice';
import { StarIcon, ClockIcon, PersonIcon, KeypadIcon } from './components/icons';

import FavoritesView from './views/FavoritesView';
import RecentsView from './views/RecentsView';
import ContactsView from './views/ContactsView';
import KeypadView from './views/KeypadView';
import ContactDetail from './views/ContactDetail';
import ContactEditor from './views/ContactEditor';

const TABS = [
  { id: 'favorites', label: 'Favorites', Icon: StarIcon },
  { id: 'recents', label: 'Recents', Icon: ClockIcon },
  { id: 'contacts', label: 'Contacts', Icon: PersonIcon },
  { id: 'keypad', label: 'Keypad', Icon: KeypadIcon },
];

export default function PhoneApp() {
  const dispatch = useDispatch();
  const loaded = useSelector((s) => s.contacts.loaded);
  const contacts = useSelector((s) => s.contacts.contacts);
  const focus = useSelector((s) => s.contacts.focus);
  const launchTab = useSelector((s) => s.phone.launchTab);

  const [tab, setTab] = useState('favorites');
  // overlay: null | { type: 'detail', id } | { type: 'editor', contact }
  const [overlay, setOverlay] = useState(null);
  const [returnTo, setReturnTo] = useState(null); // conversation number to go back to

  useEffect(() => {
    if (!loaded) dispatch(loadPhoneState());
  }, [loaded, dispatch]);

  // A notification (or other app) requested a specific tab (e.g. Recents).
  useEffect(() => {
    if (launchTab) {
      setTab(launchTab);
      dispatch(setLaunchTab(null));
    }
  }, [launchTab, dispatch]);

  // Viewing Recents clears the missed-call badge.
  useEffect(() => {
    if (tab === 'recents') dispatch(markNotifRead({ app: 'call' }));
  }, [tab, dispatch]);

  // Opened from a Messages conversation header: jump straight to that person's
  // profile (or the new-contact editor if they're not saved). Consumed once.
  useEffect(() => {
    if (!focus || !loaded) return;
    const digits = digitsOf(focus.number);
    const contact = contacts.find((c) => digitsOf(c.number) === digits);
    if (contact) setOverlay({ type: 'detail', id: contact.id });
    else setOverlay({ type: 'editor', contact: { number: focus.number } });
    setReturnTo(focus.returnTo || null);
    dispatch(setContactFocus(null));
  }, [focus, loaded, contacts, dispatch]);

  const openDetail = (id) => setOverlay({ type: 'detail', id });
  const openEditor = (contact = null) => setOverlay({ type: 'editor', contact });
  const closeOverlay = () => setOverlay(null);

  // Open a profile by phone number: the saved contact's detail, or the new-contact
  // editor prefilled if they aren't saved (used by the Recents info button).
  const openByNumber = (number) => {
    const digits = digitsOf(number);
    const contact = contacts.find((c) => digitsOf(c.number) === digits);
    if (contact) setOverlay({ type: 'detail', id: contact.id });
    else setOverlay({ type: 'editor', contact: { number } });
  };

  // Back out of an overlay: return to the conversation if we came from Messages.
  const backFromOverlay = () => {
    if (returnTo) {
      const to = returnTo;
      setReturnTo(null);
      setOverlay(null);
      dispatch(setResumeThread(to));
      dispatch(openApp('message'));
    } else {
      closeOverlay();
    }
  };

  // Closing the editor: after editing an existing contact, return to its profile;
  // otherwise fall back (to Messages if we came from there, else the list).
  const closeEditor = (edited) => {
    if (edited && edited.id) setOverlay({ type: 'detail', id: edited.id });
    else backFromOverlay();
  };

  const renderTab = () => {
    switch (tab) {
      case 'favorites':
        return <FavoritesView onOpen={openDetail} onAdd={() => openEditor()} />;
      case 'recents':
        return <RecentsView onProfile={openByNumber} />;
      case 'contacts':
        return <ContactsView onOpen={openDetail} onAdd={() => openEditor()} />;
      case 'keypad':
        return <KeypadView onAddContact={(number) => openEditor({ number })} />;
      default:
        return null;
    }
  };

  return (
    <div className="phoneapp">
      <div className="phoneapp__body">{renderTab()}</div>

      <nav className="phoneapp__tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`phoneapp__tab${tab === id ? ' is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon className="phoneapp__tabicon" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {overlay?.type === 'detail' && (
        <ContactDetail
          id={overlay.id}
          onBack={backFromOverlay}
          backLabel={returnTo ? 'Messages' : 'Contacts'}
          onEdit={(contact) => setOverlay({ type: 'editor', contact })}
        />
      )}
      {overlay?.type === 'editor' && (
        <ContactEditor contact={overlay.contact} onClose={() => closeEditor(overlay.contact)} />
      )}
    </div>
  );
}

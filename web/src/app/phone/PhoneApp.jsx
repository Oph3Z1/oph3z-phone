import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './PhoneApp.css';

import { loadPhoneState } from '../../store/slices/contactsSlice';
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

  const [tab, setTab] = useState('favorites');
  // overlay: null | { type: 'detail', id } | { type: 'editor', contact }
  const [overlay, setOverlay] = useState(null);

  useEffect(() => {
    if (!loaded) dispatch(loadPhoneState());
  }, [loaded, dispatch]);

  const openDetail = (id) => setOverlay({ type: 'detail', id });
  const openEditor = (contact = null) => setOverlay({ type: 'editor', contact });
  const closeOverlay = () => setOverlay(null);

  const renderTab = () => {
    switch (tab) {
      case 'favorites':
        return <FavoritesView onOpen={openDetail} onAdd={() => openEditor()} />;
      case 'recents':
        return <RecentsView onOpen={openDetail} />;
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
          onBack={closeOverlay}
          onEdit={(contact) => setOverlay({ type: 'editor', contact })}
        />
      )}
      {overlay?.type === 'editor' && (
        <ContactEditor contact={overlay.contact} onClose={closeOverlay} />
      )}
    </div>
  );
}

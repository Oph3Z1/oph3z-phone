import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './PhoneApp.css';

import {
    loadPhoneState,
    setContactFocus,
    digitsOf,
    clearEditorDraft,
} from '../../store/slices/contactsSlice';
import { setResumeThread } from '../../store/slices/messagesSlice';
import { openApp, setLaunchTab } from '../../store/slices/phoneSlice';
import { markNotifRead } from '../../store/slices/notificationsSlice';
import { StarIcon, ClockIcon, PersonIcon, KeypadIcon } from './components/icons';
import { useT } from '../../i18n/useT';

import FavoritesView from './views/FavoritesView';
import RecentsView from './views/RecentsView';
import ContactsView from './views/ContactsView';
import KeypadView from './views/KeypadView';
import ContactDetail from './views/ContactDetail';
import ContactEditor from './views/ContactEditor';

const TABS = [
    { id: 'favorites', Icon: StarIcon },
    { id: 'recents', Icon: ClockIcon },
    { id: 'contacts', Icon: PersonIcon },
    { id: 'keypad', Icon: KeypadIcon },
];

export default function PhoneApp() {
    const dispatch = useDispatch();
    const t = useT();
    const loaded = useSelector((s) => s.contacts.loaded);
    const contacts = useSelector((s) => s.contacts.contacts);
    const focus = useSelector((s) => s.contacts.focus);
    const editorDraft = useSelector((s) => s.contacts.editorDraft);
    const launchTab = useSelector((s) => s.phone.launchTab);

    const [tab, setTab] = useState('favorites');
    const [overlay, setOverlay] = useState(null);
    const [returnTo, setReturnTo] = useState(null);

    useEffect(() => {
        if (!loaded) dispatch(loadPhoneState());
    }, [loaded, dispatch]);

    useEffect(() => {
        if (launchTab) {
            setTab(launchTab);
            dispatch(setLaunchTab(null));
        }
    }, [launchTab, dispatch]);

    useEffect(() => {
        if (tab === 'recents') dispatch(markNotifRead({ app: 'call' }));
    }, [tab, dispatch]);

    useEffect(() => {
        if (!editorDraft) return;
        setOverlay({ type: 'editor', contact: editorDraft });
        dispatch(clearEditorDraft());
    }, [editorDraft, dispatch]);

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

    const openByNumber = (number) => {
        const digits = digitsOf(number);
        const contact = contacts.find((c) => digitsOf(c.number) === digits);
        if (contact) setOverlay({ type: 'detail', id: contact.id });
        else setOverlay({ type: 'editor', contact: { number } });
    };

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
            <div className="phoneapp__body screen-in" key={tab}>
                {renderTab()}
            </div>

            <nav className="phoneapp__tabbar">
                {TABS.map(({ id, Icon }) => (
                    <button
                        key={id}
                        className={`phoneapp__tab${tab === id ? ' is-active' : ''}`}
                        onClick={() => setTab(id)}
                    >
                        <Icon className="phoneapp__tabicon" />
                        <span>{t(`phone.${id}`)}</span>
                    </button>
                ))}
            </nav>

            {overlay?.type === 'detail' && (
                <ContactDetail
                    id={overlay.id}
                    onBack={backFromOverlay}
                    backLabel={returnTo ? t('phone.messages') : t('phone.contacts')}
                    onEdit={(contact) => setOverlay({ type: 'editor', contact })}
                />
            )}
            {overlay?.type === 'editor' && (
                <ContactEditor
                    contact={overlay.contact}
                    onClose={() => closeEditor(overlay.contact)}
                />
            )}
        </div>
    );
}
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import './MessagesApp.css';

import { useNuiEvent } from '../../hooks/useNuiEvent';
import { loadThreads, receiveIncoming } from '../../store/slices/messagesSlice';
import { loadPhoneState } from '../../store/slices/contactsSlice';
import ThreadList from './components/ThreadList';
import Conversation from './components/Conversation';
import NewMessage from './components/NewMessage';

export default function MessagesApp() {
  const dispatch = useDispatch();
  const [view, setView] = useState({ name: 'list' }); // list | thread(number) | new

  useEffect(() => {
    dispatch(loadThreads());
    dispatch(loadPhoneState()); // contacts (for names + the New Message picker)
  }, [dispatch]);

  // Live incoming messages (push it into the store whether or not we're viewing).
  useNuiEvent('phone:messages:incoming', (d) => dispatch(receiveIncoming(d)));

  if (view.name === 'thread') {
    return <Conversation number={view.number} onBack={() => setView({ name: 'list' })} />;
  }
  if (view.name === 'new') {
    return (
      <NewMessage
        onClose={() => setView({ name: 'list' })}
        onOpen={(number) => setView({ name: 'thread', number })}
      />
    );
  }
  return (
    <ThreadList
      onOpen={(number) => setView({ name: 'thread', number })}
      onCompose={() => setView({ name: 'new' })}
    />
  );
}

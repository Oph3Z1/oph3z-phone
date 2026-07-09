import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './MessagesApp.css';

import { useNuiEvent } from '../../hooks/useNuiEvent';
import {
    loadThreads,
    receiveIncoming,
    updateMessageStatus,
    updateLocation,
    setResumeThread,
} from '../../store/slices/messagesSlice';
import {
    receiveGroupIncoming,
    setReadLocal,
    setReactionLocal,
    updateGroupLocation,
    removeGroup,
    setResumeGroup,
} from '../../store/slices/groupsSlice';
import { loadPhoneState } from '../../store/slices/contactsSlice';
import ThreadList from './components/ThreadList';
import Conversation from './components/Conversation';
import NewMessage from './components/NewMessage';
import NewGroup from './components/NewGroup';
import GroupConversation from './components/GroupConversation';
import GroupInfo from './components/GroupInfo';

export default function MessagesApp() {
    const dispatch = useDispatch();
    const [view, setView] = useState({ name: 'list' });
    const resumeThread = useSelector((s) => s.messages.resumeThread);
    const resumeGroup = useSelector((s) => s.groups.resumeGroup);

    useEffect(() => {
        dispatch(loadThreads());
        dispatch(loadPhoneState());
    }, [dispatch]);

    useEffect(() => {
        if (resumeThread) {
            setView({ name: 'thread', number: resumeThread });
            dispatch(setResumeThread(null));
        }
    }, [resumeThread, dispatch]);

    useEffect(() => {
        if (resumeGroup) {
            setView({ name: 'group', gid: resumeGroup });
            dispatch(setResumeGroup(null));
        }
    }, [resumeGroup, dispatch]);

    useNuiEvent('phone:messages:incoming', (d) => dispatch(receiveIncoming(d)));
    useNuiEvent('phone:messages:update', (d) => d && dispatch(updateMessageStatus(d)));
    useNuiEvent('phone:messages:locupdate', (d) => d && dispatch(updateLocation(d)));

    useNuiEvent('phone:groups:incoming', (d) => dispatch(receiveGroupIncoming(d)));
    useNuiEvent('phone:groups:read', (d) => d && dispatch(setReadLocal(d)));
    useNuiEvent(
        'phone:groups:react',
        (d) => d && dispatch(setReactionLocal({ ...d, emoji: d.emoji || '' })),
    );
    useNuiEvent('phone:groups:locupdate', (d) => d && dispatch(updateGroupLocation(d)));
    useNuiEvent('phone:groups:removed', (d) => {
        if (!d || !d.gid) return;
        dispatch(removeGroup(d.gid));
        dispatch(loadThreads());
        setView((v) =>
            (v.name === 'group' || v.name === 'groupinfo') && v.gid === d.gid
                ? { name: 'list' }
                : v,
        );
    });

    if (view.name === 'thread') {
        return (
            <Conversation
                number={view.number}
                onBack={() => setView({ name: 'list' })}
                onOpenThread={(num) => setView({ name: 'thread', number: num })}
            />
        );
    }
    if (view.name === 'group') {
        return (
            <GroupConversation
                gid={view.gid}
                onBack={() => setView({ name: 'list' })}
                onInfo={() => setView({ name: 'groupinfo', gid: view.gid })}
            />
        );
    }
    if (view.name === 'groupinfo') {
        return (
            <GroupInfo
                gid={view.gid}
                onBack={() => setView({ name: 'group', gid: view.gid })}
                onLeft={() => setView({ name: 'list' })}
            />
        );
    }
    if (view.name === 'new') {
        return (
            <NewMessage
                onClose={() => setView({ name: 'list' })}
                onOpen={(number) => setView({ name: 'thread', number })}
            />
        );
    }
    if (view.name === 'newgroup') {
        return (
            <NewGroup
                onClose={() => setView({ name: 'list' })}
                onCreated={(gid) => setView({ name: 'group', gid })}
            />
        );
    }
    return (
        <ThreadList
            onOpen={(t) =>
                setView(
                    t.isGroup
                        ? { name: 'group', gid: t.gid }
                        : { name: 'thread', number: t.number },
                )
            }
            onCompose={() => setView({ name: 'new' })}
            onNewGroup={() => setView({ name: 'newgroup' })}
        />
    );
}
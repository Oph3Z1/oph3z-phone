import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './MailApp.css';

import { useT } from '../../i18n/useT';
import { loadMail, readMail, deleteMail, setFocusMail } from '../../store/slices/mailSlice';
import { openDialog } from '../../store/slices/dialogSlice';
import { clearNotifsFor } from '../../store/slices/notificationsSlice';
import MailList from './MailList';
import MailDetail from './MailDetail';
import MailCompose from './MailCompose';

export default function MailApp() {
    const dispatch = useDispatch();
    const t = useT();
    const loaded = useSelector((s) => s.mail.loaded);
    const inbox = useSelector((s) => s.mail.inbox);
    const focusId = useSelector((s) => s.mail.focusId);

    const [folder, setFolder] = useState('inbox');
    const [view, setView] = useState({ name: 'list' });

    useEffect(() => {
        if (!loaded) dispatch(loadMail());
        dispatch(clearNotifsFor({ app: 'mail' }));
    }, [loaded, dispatch]);

    useEffect(() => {
        if (!focusId) return;
        const mail = inbox.find((m) => m.id === focusId);
        if (!mail) return;
        setFolder('inbox');
        openMail(mail, 'inbox');
        dispatch(setFocusMail(null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusId, inbox]);

    const openMail = (mail, f) => {
        if (f === 'inbox' && !mail.read) dispatch(readMail(mail.id));
        setView({ name: 'detail', mail, folder: f });
    };

    const confirmDelete = async (mail, f) => {
        const ok = await dispatch(
            openDialog({
                title: t('mail.deleteTitle'),
                message: t('mail.deleteMsg'),
                buttons: [
                    { text: t('common.cancel'), style: 'cancel', value: false },
                    { text: t('common.delete'), style: 'destructive', value: true },
                ],
            }),
        );
        if (!ok) return;
        dispatch(deleteMail(f, mail.id));
        setView({ name: 'list' });
    };

    if (view.name === 'detail') {
        return (
            <MailDetail
                mail={view.mail}
                folder={view.folder}
                onBack={() => setView({ name: 'list' })}
                onReply={(m) =>
                    setView({
                        name: 'compose',
                        draft: { to: m.from, subject: replySubject(m.subject) },
                    })
                }
                onDelete={(m) => confirmDelete(m, view.folder)}
            />
        );
    }

    if (view.name === 'compose') {
        return (
            <MailCompose
                draft={view.draft}
                onClose={() => setView({ name: 'list' })}
                onSent={() => {
                    setFolder('sent');
                    setView({ name: 'list' });
                }}
            />
        );
    }

    return (
        <MailList
            folder={folder}
            setFolder={setFolder}
            onOpen={(m) => openMail(m, folder)}
            onCompose={() => setView({ name: 'compose', draft: null })}
            onDelete={(m) => confirmDelete(m, folder)}
        />
    );
}

function replySubject(subject) {
    const s = subject || '';
    return /^re:/i.test(s) ? s : `Re: ${s}`;
}
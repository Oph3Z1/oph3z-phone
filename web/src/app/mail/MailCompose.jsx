import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import { sendMail } from '../../store/slices/mailSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { isEmail } from './mailUtil';
import { ChevronLeft, PhotoIcon, CloseIcon } from './icons';
import PhotoPickerSheet from './PhotoPickerSheet';

export default function MailCompose({ draft, onClose, onSent }) {
    const dispatch = useDispatch();
    const t = useT();
    const inbox = useSelector((s) => s.mail.inbox);
    const sent = useSelector((s) => s.mail.sent);

    const [to, setTo] = useState(draft?.to || '');
    const [subject, setSubject] = useState(draft?.subject || '');
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [picking, setPicking] = useState(false);
    const [sending, setSending] = useState(false);

    const known = useMemo(() => {
        const map = new Map();
        inbox.forEach(
            (m) => m.from && m.from.includes('@') && map.set(m.from, m.fromName || m.from),
        );
        sent.forEach((m) => m.to && map.set(m.to, m.toName || m.to));
        return [...map.entries()].map(([addr, name]) => ({ addr, name }));
    }, [inbox, sent]);

    const suggestions =
        to.trim() && !isEmail(to)
            ? known
                  .filter(
                      (k) =>
                          k.addr.includes(to.toLowerCase()) ||
                          k.name.toLowerCase().includes(to.toLowerCase()),
                  )
                  .slice(0, 4)
            : [];

    const canSend = isEmail(to) && (subject.trim() || body.trim() || attachments.length);

    const submit = async () => {
        if (!canSend || sending) return;
        setSending(true);
        const res = await dispatch(
            sendMail({ to: to.trim(), subject: subject.trim(), body, attachments }),
        );
        setSending(false);
        if (res && res.ok) {
            dispatch(pushToast({ type: 'success', title: t('mail.sent_toast') }));
            onSent();
        } else {
            const reason =
                res && res.reason === 'notfound' ? t('mail.noSuchAddress') : t('mail.sendFailed');
            dispatch(pushToast({ type: 'error', title: reason }));
        }
    };

    const removeAtt = (url) => setAttachments((a) => a.filter((x) => x.url !== url));

    return (
        <div className="mailapp mail-compose">
            <div className="mail-detail__bar">
                <button className="mail-detail__back" onClick={onClose}>
                    <ChevronLeft />
                    <span>{t('common.cancel')}</span>
                </button>
                <span className="mail-compose__heading">{t('mail.newMessage')}</span>
                <button
                    className={`mail-compose__send${canSend ? '' : ' is-off'}`}
                    onClick={submit}
                    disabled={!canSend || sending}
                >
                    {t('mail.send')}
                </button>
            </div>

            <div className="mail-compose__scroll">
                <div className="mail-field">
                    <span className="mail-field__label">{t('mail.toLabel')}</span>
                    <input
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        placeholder={t('mail.addressPlaceholder')}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
                {suggestions.length > 0 && (
                    <div className="mail-suggest">
                        {suggestions.map((s) => (
                            <button key={s.addr} onClick={() => setTo(s.addr)}>
                                <span className="mail-suggest__name">{s.name}</span>
                                <span className="mail-suggest__addr">{s.addr}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="mail-field">
                    <span className="mail-field__label">{t('mail.subjectLabel')}</span>
                    <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={t('mail.subjectPlaceholder')}
                        maxLength={140}
                    />
                </div>

                <textarea
                    className="mail-compose__body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={t('mail.bodyPlaceholder')}
                />

                {attachments.length > 0 && (
                    <div className="mail-compose__atts">
                        {attachments.map((a) => (
                            <div key={a.url} className="mail-compose__att">
                                {a.type === 'video' ? (
                                    <video src={a.url} muted playsInline preload="metadata" />
                                ) : (
                                    <img src={a.thumb || a.url} alt="" />
                                )}
                                {a.type === 'video' && <span className="mail-compose__attvid" />}
                                <button
                                    className="mail-compose__attx"
                                    onClick={() => removeAtt(a.url)}
                                >
                                    <CloseIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mail-compose__toolbar">
                <button onClick={() => setPicking(true)}>
                    <PhotoIcon />
                    <span>{t('mail.attach')}</span>
                </button>
            </div>

            {picking && (
                <PhotoPickerSheet
                    selected={attachments}
                    onClose={() => setPicking(false)}
                    onDone={(list) => {
                        setAttachments(list);
                        setPicking(false);
                    }}
                />
            )}
        </div>
    );
}
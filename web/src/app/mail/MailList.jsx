import { useRef } from 'react';
import { useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import { mailDate, initialOf, snippet, avatarColor } from './mailUtil';
import { ComposeIcon, PaperclipIcon } from './icons';

// A single mail row. `folder` picks whether we show the sender (inbox) or
// recipient (sent) as the headline party.
function Row({ mail, folder, onOpen, onDelete }) {
  const pressTimer = useRef(null);
  const longFired = useRef(false);
  const isInbox = folder === 'inbox';
  const party = isInbox ? mail.fromName || mail.from : mail.toName || mail.to;

  const start = () => {
    longFired.current = false;
    pressTimer.current = setTimeout(() => {
      longFired.current = true;
      onDelete(mail);
    }, 500);
  };
  const end = () => clearTimeout(pressTimer.current);
  const click = () => {
    if (longFired.current) { longFired.current = false; return; }
    onOpen(mail);
  };

  return (
    <button
      className={`mail-row${isInbox && !mail.read ? ' is-unread' : ''}`}
      onClick={click}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
    >
      <span className="mail-row__dot" />
      <span className="mail-row__avatar" style={{ background: avatarColor(party, mail.system) }}>
        {initialOf(party)}
      </span>
      <span className="mail-row__body">
        <span className="mail-row__top">
          <span className="mail-row__party">{party}</span>
          <span className="mail-row__time">{mailDate(mail.ts)}</span>
        </span>
        <span className="mail-row__subject">
          {mail.attachments && <PaperclipIcon className="mail-row__clip" />}
          {mail.subject || '(no subject)'}
        </span>
        <span className="mail-row__snippet">{snippet(mail.body) || ' '}</span>
      </span>
    </button>
  );
}

export default function MailList({ folder, setFolder, onOpen, onCompose, onDelete }) {
  const t = useT();
  const address = useSelector((s) => s.mail.address);
  const mails = useSelector((s) => (folder === 'sent' ? s.mail.sent : s.mail.inbox));
  const unread = useSelector((s) => s.mail.inbox.reduce((a, m) => a + (m.read ? 0 : 1), 0));

  return (
    <div className="mailapp">
      <div className="mail-head">
        <div className="mail-head__row">
          <h1 className="mail-head__title">{t('mail.title')}</h1>
          <button className="mail-head__compose" onClick={onCompose} aria-label={t('mail.compose')}>
            <ComposeIcon />
          </button>
        </div>
        <div className="mail-head__addr">{address}</div>

        <div className="mail-seg">
          <button
            className={folder === 'inbox' ? 'is-active' : ''}
            onClick={() => setFolder('inbox')}
          >
            {t('mail.inbox')}
            {unread > 0 && <span className="mail-seg__badge">{unread}</span>}
          </button>
          <button
            className={folder === 'sent' ? 'is-active' : ''}
            onClick={() => setFolder('sent')}
          >
            {t('mail.sent')}
          </button>
        </div>
      </div>

      <div className="mail-list">
        {mails.length === 0 ? (
          <div className="mail-empty">
            {folder === 'inbox' ? t('mail.emptyInbox') : t('mail.emptySent')}
          </div>
        ) : (
          mails.map((m) => (
            <Row key={m.id} mail={m} folder={folder} onOpen={onOpen} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  );
}

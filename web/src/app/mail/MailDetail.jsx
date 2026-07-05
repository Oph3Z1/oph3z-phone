import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useT } from '../../i18n/useT';
import { setLightbox } from '../../store/slices/photosSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { copyText } from '../../utils/clipboard';
import MailMediaViewer from './MailMediaViewer';
import { mailDateFull, initialOf, avatarColor } from './mailUtil';
import { ChevronLeft, TrashIcon, ReplyIcon } from './icons';

export default function MailDetail({ mail, folder, onBack, onReply, onDelete }) {
  const dispatch = useDispatch();
  const t = useT();
  const isInbox = folder === 'inbox';
  const party = isInbox ? mail.fromName || mail.from : mail.toName || mail.to;
  const partyAddr = isInbox ? mail.from : mail.to;
  const [viewer, setViewer] = useState(null); // a video attachment open in the viewer

  const copyAddr = async () => {
    if (!partyAddr || partyAddr === 'system') return;
    const ok = await copyText(partyAddr);
    dispatch(pushToast({ app: 'mail', title: ok ? t('mail.copied') : t('mail.copyFailed') }));
  };

  const atts = mail.attachments || [];
  const openAtt = (a) => (a.type === 'video' ? setViewer(a) : dispatch(setLightbox(a.url)));

  return (
    <div className="mailapp mail-detail">
      <div className="mail-detail__bar">
        <button className="mail-detail__back" onClick={onBack} aria-label={t('mail.inbox')}>
          <ChevronLeft />
          <span>{isInbox ? t('mail.inbox') : t('mail.sent')}</span>
        </button>
        <div className="mail-detail__actions">
          {isInbox && (
            <button onClick={() => onReply(mail)} aria-label={t('mail.reply')}>
              <ReplyIcon />
            </button>
          )}
          <button onClick={() => onDelete(mail)} aria-label={t('common.delete')}>
            <TrashIcon />
          </button>
        </div>
      </div>

      <div className="mail-detail__scroll">
        <h1 className="mail-detail__subject">{mail.subject || '(no subject)'}</h1>

        <div className="mail-detail__meta">
          <span className="mail-detail__avatar" style={{ background: avatarColor(party, mail.system) }}>
            {initialOf(party)}
          </span>
          <div className="mail-detail__who">
            <div className="mail-detail__name">{party}</div>
            <button className="mail-detail__sub" onClick={copyAddr} title={t('mail.copyAddress')}>
              {isInbox ? partyAddr : `${t('mail.toLabel')} ${partyAddr}`}
            </button>
          </div>
          <div className="mail-detail__date">{mailDateFull(mail.ts)}</div>
        </div>

        <div className="mail-detail__body">{mail.body || ' '}</div>

        {atts.length > 0 && (
          <div className="mail-detail__atts">
            {atts.map((a, i) => (
              <button key={i} className="mail-att" onClick={() => openAtt(a)}>
                {a.type === 'video' ? (
                  <video className="mail-att__media" src={a.url} poster={a.thumb} muted playsInline preload="metadata" />
                ) : (
                  <img className="mail-att__media" src={a.thumb || a.url} alt="" />
                )}
                {a.type === 'video' && <span className="mail-att__play" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewer && <MailMediaViewer item={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

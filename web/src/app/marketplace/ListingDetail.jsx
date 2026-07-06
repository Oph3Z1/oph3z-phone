import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { openApp } from '../../store/slices/phoneSlice';
import { setResumeThread } from '../../store/slices/messagesSlice';
import { digitsOf } from '../../store/slices/contactsSlice';
import { openDialog } from '../../store/slices/dialogSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import { useMarketNav } from './MarketNav';
import { fmtPrice, timeAgo, CATEGORY_ICON } from './util';
import MediaCarousel from './MediaCarousel';
import MediaViewer from './MediaViewer';
import Avatar from './Avatar';
import ShareSheet from './ShareSheet';
import { BackArrow, PhoneIcon, MessageIcon, EditIcon, TrashIcon, ShareIcon } from './icons';

// Full ad: media slider, price, title, description, seller card and the contact
// buttons (call / message, gated by the seller's toggles). Owner gets edit/delete.
export default function ListingDetail({ id, onBack, onChanged }) {
  const t = useT();
  const nav = useMarketNav();
  const dispatch = useDispatch();
  const [l, setL] = useState(null);
  const [missing, setMissing] = useState(false);
  const [viewer, setViewer] = useState(null); // media item shown fullscreen (zoom)
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchNui('phone:market:listing', { id }, { ok: false })
      .then((r) => { if (!alive) return; if (r && r.ok) setL(r.listing); else setMissing(true); });
    return () => { alive = false; };
  }, [id]);

  const call = () => { if (l.seller.number) fetchNui('phone:call:start', { number: l.seller.number }, {}); };
  const message = () => {
    if (!l.seller.number) return;
    // Threads are keyed by DIGITS (e.g. 5550199); the snapshot number is formatted
    // (555-0199). Normalise so we reopen the EXISTING conversation + its history,
    // not a blank thread.
    dispatch(setResumeThread(digitsOf(l.seller.number)));
    dispatch(openApp('message'));
  };

  const remove = async () => {
    const ok = await dispatch(openDialog({
      title: t('market.deleteTitle'),
      message: t('market.deleteMsg'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel', value: false },
        { text: t('common.delete'), style: 'destructive', value: true },
      ],
    }));
    if (!ok) return;
    await fetchNui('phone:market:delete', { id }, { ok: true });
    dispatch(pushToast({ type: 'success', title: t('market.deleted'), body: '' }));
    onChanged && onChanged();
    onBack();
  };

  if (missing) {
    return (
      <div className="mkt-screen">
        <Topbar t={t} onBack={onBack} />
        <div className="mkt-empty">{t('market.gone')}</div>
      </div>
    );
  }
  if (!l) {
    return (
      <div className="mkt-screen">
        <Topbar t={t} onBack={onBack} />
        <div className="mkt-empty">{t('market.loading')}</div>
      </div>
    );
  }

  return (
    <div className="mkt-screen">
      <Topbar t={t} onBack={onBack} onShare={() => setSharing(true)} />
      <div className="mkt-scroll mkt-detail">
        <MediaCarousel media={l.media} onOpen={(item) => setViewer(item)} />

        <div className="mkt-detail__pad">
          <div className="mkt-detail__toprow">
            <span className="mkt-detail__cat">{CATEGORY_ICON[l.category]} {t(`market.cat_${l.category}`)}</span>
            <span className="mkt-detail__time">{timeAgo(l.createdAt)}</span>
          </div>
          <div className="mkt-detail__price">{fmtPrice(l.price, t)}</div>
          <h2 className="mkt-detail__title">{l.title}</h2>
          {l.desc ? <p className="mkt-detail__desc">{l.desc}</p> : null}

          <button className="mkt-seller" onClick={() => nav.openProfile(l.seller.cid)}>
            <Avatar account={l.seller} size="2.8em" />
            <div className="mkt-seller__id">
              <span className="mkt-seller__name">{l.seller.name}</span>
              {l.seller.number ? <span className="mkt-seller__num">{l.seller.number}</span> : null}
            </div>
            <span className="mkt-seller__go">›</span>
          </button>

          {l.isMine ? (
            <div className="mkt-detail__owner">
              <button className="mkt-btn mkt-btn--ghost" onClick={() => nav.openEdit(l)}><EditIcon size={18} /> {t('market.edit')}</button>
              <button className="mkt-btn mkt-btn--danger" onClick={remove}><TrashIcon size={18} /> {t('market.delete')}</button>
            </div>
          ) : (
            <div className="mkt-detail__contact">
              {l.allowCalls && (
                <button className="mkt-btn mkt-btn--solid" onClick={call}><PhoneIcon size={18} /> {t('market.call')}</button>
              )}
              {l.allowMsg && (
                <button className="mkt-btn mkt-btn--ghost" onClick={message}><MessageIcon size={18} /> {t('market.message')}</button>
              )}
            </div>
          )}
        </div>
      </div>

      {viewer && <MediaViewer item={viewer} onClose={() => setViewer(null)} />}
      {sharing && <ShareSheet kind="listing" listing={l} onClose={() => setSharing(false)} />}
    </div>
  );
}

function Topbar({ t, onBack, onShare }) {
  return (
    <div className="mkt-topbar">
      <button className="mkt-iconbtn" onClick={onBack}><BackArrow /></button>
      <span className="mkt-topbar__title">{t('market.listing')}</span>
      {onShare ? (
        <button className="mkt-iconbtn" onClick={onShare} aria-label={t('market.share')}><ShareIcon /></button>
      ) : (
        <span className="mkt-topbar__spacer" />
      )}
    </div>
  );
}

import { useDispatch } from 'react-redux';
import './Airdrop.css';
import { AirDropGlyph, describeAirdrop } from './airdropShared';
import { acceptAirdrop, declineAirdrop } from '../../store/slices/airdropSlice';
import { useT } from '../../i18n/useT';

// A pending AirDrop shown in the Notification Center / lock screen — accept or
// decline it later (the payload was captured when it was sent).
export default function AirdropPendingCard({ transfer }) {
  const dispatch = useDispatch();
  const t = useT();
  return (
    <div className="ad-pcard">
      <div className="ad-pcard__row">
        <span className="ad-pcard__icon"><AirDropGlyph /></span>
        <div className="ad-pcard__text">
          <div className="ad-pcard__title">{t('airdrop.title')}</div>
          <div className="ad-pcard__body">{describeAirdrop(transfer, t)}</div>
        </div>
      </div>
      <div className="ad-pcard__actions">
        <button className="ad-pcard__btn ad-pcard__btn--decline" onClick={() => dispatch(declineAirdrop(transfer))}>
          {t('airdrop.decline')}
        </button>
        <button className="ad-pcard__btn ad-pcard__btn--accept" onClick={() => dispatch(acceptAirdrop(transfer))}>
          {t('airdrop.accept')}
        </button>
      </div>
    </div>
  );
}

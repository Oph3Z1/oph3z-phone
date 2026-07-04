import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './Airdrop.css';
import { AirDropGlyph, AirdropPreview, describeAirdrop } from './airdropShared';
import { acceptAirdrop, declineAirdrop, stashIsland } from '../../store/slices/airdropSlice';
import { useT } from '../../i18n/useT';

// How long the island stays before it auto-dismisses (then it slips into the
// Notification Center for later), and the close-animation length.
const SHOW_MS = 5500;
const CLOSE_MS = 340;

// The Dynamic-Island receive prompt (shown while the phone is open when an AirDrop
// arrives). Icon + "AirDrop" + "<name> would like to share …" + preview + actions.
export default function AirdropIsland() {
  const dispatch = useDispatch();
  const t = useT();
  const transfer = useSelector((s) => s.airdrop.island);
  const [closing, setClosing] = useState(false);

  // Auto-dismiss timer: after SHOW_MS, play the close animation.
  useEffect(() => {
    setClosing(false);
    if (!transfer) return undefined;
    const hide = setTimeout(() => setClosing(true), SHOW_MS);
    return () => clearTimeout(hide);
  }, [transfer]);

  // Once closing, wait for the animation, then stash it to the Notification Center.
  useEffect(() => {
    if (!closing) return undefined;
    const done = setTimeout(() => dispatch(stashIsland()), CLOSE_MS);
    return () => clearTimeout(done);
  }, [closing, dispatch]);

  if (!transfer) return null;

  return (
    <div className={`ad-island${closing ? ' is-closing' : ''}`} key={transfer.id}>
      <div className="ad-island__row">
        <span className="ad-island__appicon"><AirDropGlyph /></span>
        <div className="ad-island__text">
          <div className="ad-island__title">{t('airdrop.title')}</div>
          <div className="ad-island__body">{describeAirdrop(transfer, t)}</div>
        </div>
        <AirdropPreview transfer={transfer} className="ad-preview--island" />
      </div>
      <div className="ad-island__actions">
        <button className="ad-island__btn ad-island__btn--decline" onClick={() => dispatch(declineAirdrop(transfer))}>
          {t('airdrop.decline')}
        </button>
        <button className="ad-island__btn ad-island__btn--accept" onClick={() => dispatch(acceptAirdrop(transfer))}>
          {t('airdrop.accept')}
        </button>
      </div>
    </div>
  );
}

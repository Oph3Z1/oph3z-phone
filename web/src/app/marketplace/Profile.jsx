import { useEffect, useState } from 'react';
import { fetchNui } from '../../utils/fetchNui';
import { useT } from '../../i18n/useT';
import { useMarketNav } from './MarketNav';
import ListingCard from './ListingCard';
import Avatar from './Avatar';
import ShareSheet from './ShareSheet';
import { BackArrow, ShareIcon } from './icons';

// A seller's page: identity card + the grid of their ads. `cid` null = my own
// profile. Tapping an ad opens its detail (where the owner can edit / delete).
export default function Profile({ cid, reloadToken, onBack }) {
  const t = useT();
  const nav = useMarketNav();
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null); setMissing(false);
    fetchNui('phone:market:profile', { cid: cid || undefined }, { ok: false })
      .then((r) => { if (!alive) return; if (r && r.ok) setData(r); else setMissing(true); });
    return () => { alive = false; };
  }, [cid, reloadToken]);

  const seller = data && data.seller;
  const listings = (data && data.listings) || [];

  return (
    <div className="mkt-screen">
      <div className="mkt-topbar">
        <button className="mkt-iconbtn" onClick={onBack}><BackArrow /></button>
        <span className="mkt-topbar__title">{t('market.profile')}</span>
        {seller ? (
          <button className="mkt-iconbtn" onClick={() => setSharing(true)} aria-label={t('market.share')}><ShareIcon size={18} /></button>
        ) : (
          <span className="mkt-topbar__spacer" />
        )}
      </div>

      <div className="mkt-scroll">
        {missing ? (
          <div className="mkt-empty">{t('market.noSeller')}</div>
        ) : !seller ? (
          <div className="mkt-empty">{t('market.loading')}</div>
        ) : (
          <>
            <div className="mkt-pcard">
              <Avatar account={seller} size="4.6em" />
              <div className="mkt-pcard__name">{seller.name}{seller.isMe ? <span className="mkt-pcard__you">{t('market.you')}</span> : null}</div>
              {seller.number ? <div className="mkt-pcard__num">{seller.number}</div> : null}
              <div className="mkt-pcard__count">{t('market.adsCount', { count: listings.length })}</div>
            </div>

            {listings.length === 0 ? (
              <div className="mkt-empty mkt-empty--sm">{seller.isMe ? t('market.youNoAds') : t('market.sellerNoAds')}</div>
            ) : (
              <div className="mkt-grid mkt-grid--profile">
                {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}
          </>
        )}
      </div>

      {sharing && seller && (
        <ShareSheet kind="profile" seller={{ ...seller, count: listings.length }} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}

import { useT } from '../../i18n/useT';
import { useMarketNav } from './MarketNav';
import { fmtPrice, timeAgo, CATEGORY_ICON } from './util';
import Avatar from './Avatar';
import { PlayIcon } from './icons';

// A single ad in the feed grid: cover media, price badge, title, seller + time.
export default function ListingCard({ listing }) {
  const t = useT();
  const nav = useMarketNav();
  const cover = (listing.media && listing.media[0]) || null;
  const count = listing.media ? listing.media.length : 0;

  return (
    <button className="mkt-card" onClick={() => nav.openListing(listing.id)}>
      <div className="mkt-card__media">
        {cover ? (
          <img src={cover.type === 'video' ? (cover.thumb || cover.url) : cover.url} alt="" />
        ) : (
          <div className="mkt-card__nomedia">{CATEGORY_ICON[listing.category] || '📦'}</div>
        )}
        <span className="mkt-card__price">{fmtPrice(listing.price, t)}</span>
        {cover && cover.type === 'video' && <span className="mkt-card__vbadge"><PlayIcon size={14} /></span>}
        {count > 1 && <span className="mkt-card__count">{count}</span>}
      </div>
      <div className="mkt-card__body">
        <div className="mkt-card__title">{listing.title}</div>
        <div className="mkt-card__foot">
          <Avatar account={listing.seller} size="1.35em" />
          <span className="mkt-card__seller">{listing.seller.name}</span>
          <span className="mkt-card__dot">·</span>
          <span className="mkt-card__time">{timeAgo(listing.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}

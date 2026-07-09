import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { openShare } from '../../store/slices/airdropSlice';
import { sendMessage } from '../../store/slices/messagesSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';
import ContactPickerSheet from '../wallet/ContactPickerSheet';
import Avatar from './Avatar';
import { fmtPrice, CATEGORY_ICON } from './util';
import { ShareIcon, MessageIcon } from './icons';

function coverOf(listing) {
    const c = listing && listing.media && listing.media[0];
    if (!c) return null;
    return c.type === 'video' ? c.thumb || c.url : c.url;
}

export default function ShareSheet({ kind, listing, seller, onClose }) {
    const t = useT();
    const dispatch = useDispatch();
    const [picking, setPicking] = useState(false);

    const isListing = kind === 'listing';
    if ((isListing && !listing) || (!isListing && !seller)) return null;

    const title = isListing ? listing.title : seller.name;
    const subtitle = isListing
        ? fmtPrice(listing.price, t)
        : t('market.adsCount', { count: seller.count || 0 });
    const image = isListing ? coverOf(listing) : seller.avatar || null;
    const payload = isListing ? { listingId: listing.id } : { cid: seller.cid };

    const doAirdrop = () => {
        dispatch(
            openShare({
                kind: 'app',
                app: { id: 'marketplace', title, icon: image, payload, preview: image },
            }),
        );
        onClose();
    };
    const toContact = (contact) => {
        dispatch(
            sendMessage(contact.number, {
                type: 'appshare',
                body: title,
                meta: { appId: 'marketplace', title, subtitle, image, data: payload },
            }),
        );
        dispatch(pushToast({ title: t('market.sharedWith', { name: contact.name }), body: '' }));
        onClose();
    };

    if (picking) return <ContactPickerSheet onClose={() => setPicking(false)} onPick={toContact} />;

    return (
        <div className="mkt-sheet" onClick={onClose}>
            <div className="mkt-sheet__panel" onClick={(e) => e.stopPropagation()}>
                <div className="mkt-sheet__title">
                    {isListing ? t('market.shareListing') : t('market.shareProfile')}
                </div>

                <div className="mkt-share__item">
                    {isListing ? (
                        <span
                            className="mkt-share__thumb"
                            style={image ? { backgroundImage: `url(${image})` } : undefined}
                        >
                            {!image && (
                                <span className="mkt-share__ph">
                                    {CATEGORY_ICON[listing.category] || '📦'}
                                </span>
                            )}
                        </span>
                    ) : (
                        <Avatar account={seller} size="3em" />
                    )}
                    <div className="mkt-share__meta">
                        <div className="mkt-share__iname">{title}</div>
                        <div className="mkt-share__isub">{subtitle}</div>
                    </div>
                </div>

                <button className="mkt-sheet__btn" onClick={doAirdrop}>
                    <ShareIcon size={20} /> {t('market.shareAirdrop')}
                </button>
                <button className="mkt-sheet__btn" onClick={() => setPicking(true)}>
                    <MessageIcon size={20} /> {t('market.shareMessages')}
                </button>
                <button className="mkt-sheet__btn mkt-sheet__btn--cancel" onClick={onClose}>
                    {t('common.cancel')}
                </button>
            </div>
        </div>
    );
}
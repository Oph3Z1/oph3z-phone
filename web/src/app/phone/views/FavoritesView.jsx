import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import { InfoIcon, StarIcon } from '../components/icons';
import { toggleFavorite } from '../../../store/slices/contactsSlice';
import { fetchNui } from '../../../utils/fetchNui';
import { useT } from '../../../i18n/useT';

export default function FavoritesView({ onOpen }) {
    const dispatch = useDispatch();
    const t = useT();
    const favorites = useSelector((s) => s.contacts.contacts.filter((c) => c.favorite));
    const [editing, setEditing] = useState(false);

    const call = (contact) => {
        fetchNui('phone:call:start', { number: contact.number }, {});
    };

    return (
        <>
            <div className="pa-topbar" style={{ minHeight: '1.5em' }}>
                <button
                    className="pa-actionbtn"
                    onClick={() => setEditing((e) => !e)}
                    style={{ visibility: favorites.length ? 'visible' : 'hidden' }}
                >
                    {editing ? t('phone.done') : t('phone.edit')}
                </button>
            </div>
            <div className="pa-title">{t('phone.favorites')}</div>

            <div className="pa-scroll">
                {favorites.length === 0 ? (
                    <div className="pa-empty">
                        <StarIcon style={{ fontSize: '2.4em', color: '#3a3a3c' }} />
                        <div className="pa-empty__title">{t('phone.noFavorites')}</div>
                        <div>{t('phone.noFavoritesHint')}</div>
                    </div>
                ) : (
                    <div className="pa-list">
                        {favorites.map((c) => (
                            <button
                                key={c.id}
                                className="pa-row"
                                onClick={() => !editing && call(c)}
                            >
                                {editing && (
                                    <span
                                        className="pa-fav-remove"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dispatch(toggleFavorite(c.id, false));
                                        }}
                                    >
                                        –
                                    </span>
                                )}
                                <Avatar name={c.name} img={c.img} />
                                <span className="pa-row__main">
                                    <span className="pa-row__name">{c.name}</span>
                                    <span className="pa-row__sub">{t('phone.mobile')}</span>
                                </span>
                                {!editing && (
                                    <span
                                        className="pa-row__info"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpen(c.id);
                                        }}
                                    >
                                        <InfoIcon />
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
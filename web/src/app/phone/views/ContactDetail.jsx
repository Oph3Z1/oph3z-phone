import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import { ChevronLeftIcon, PhoneIcon } from '../components/icons';
import {
  deleteContact,
  toggleFavorite,
  blockNumber,
  unblockNumber,
  digitsOf,
} from '../../../store/slices/contactsSlice';
import { fetchNui } from '../../../utils/fetchNui';

// Small inline message glyph (chat bubble).
const MessageGlyph = (p) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 3 5.6V21l3.9-2.1c1 .2 2 .4 3.1.4 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
  </svg>
);

export default function ContactDetail({ id, onBack, onEdit }) {
  const dispatch = useDispatch();
  const contact = useSelector((s) => s.contacts.contacts.find((c) => c.id === id));
  const blocked = useSelector((s) => s.contacts.blocked);
  const isBlocked = contact ? !!blocked[digitsOf(contact.number)] : false;

  // If the contact disappears (deleted), close the detail view.
  useEffect(() => {
    if (!contact) onBack();
  }, [contact, onBack]);

  if (!contact) return null;

  const remove = () => {
    dispatch(deleteContact(contact.id));
    onBack();
  };

  return (
    <div className="pa-detail">
      <div className="pa-detail__nav">
        <button className="pa-actionbtn" onClick={onBack}>
          <ChevronLeftIcon /> Contacts
        </button>
        <button className="pa-actionbtn" onClick={() => onEdit(contact)}>
          Edit
        </button>
      </div>

      <div className="pa-detail__hero">
        <Avatar name={contact.name} img={contact.img} size="6em" />
        <div className="pa-detail__name">{contact.name}</div>
      </div>

      {/* Call / Message are visual for now (call screen comes later). */}
      <div className="pa-detail__actions">
        <button className="pa-quick">
          <span className="pa-quick__circle">
            <MessageGlyph />
          </span>
          message
        </button>
        <button
          className="pa-quick"
          onClick={() => fetchNui('phone:call:start', { number: contact.number }, {})}
        >
          <span className="pa-quick__circle">
            <PhoneIcon />
          </span>
          call
        </button>
      </div>

      <div className="pa-card">
        <div className="pa-card__item">
          <div className="pa-card__label">mobile</div>
          <div className="pa-card__value">{contact.number}</div>
        </div>
        {contact.notes ? (
          <div className="pa-card__item">
            <div className="pa-card__label">notes</div>
            <div className="pa-card__value pa-card__value--plain">{contact.notes}</div>
          </div>
        ) : null}
      </div>

      <div className="pa-card">
        <button
          className="pa-card__btn"
          onClick={() => dispatch(toggleFavorite(contact.id, !contact.favorite))}
        >
          {contact.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>
      </div>

      <div className="pa-card">
        <button
          className="pa-card__btn pa-card__btn--danger"
          onClick={() =>
            dispatch(
              isBlocked ? unblockNumber(contact.number) : blockNumber(contact.number)
            )
          }
        >
          {isBlocked ? 'Unblock this Caller' : 'Block this Caller'}
        </button>
      </div>

      <div className="pa-card">
        <button className="pa-card__btn pa-card__btn--danger" onClick={remove}>
          Delete Contact
        </button>
      </div>
    </div>
  );
}

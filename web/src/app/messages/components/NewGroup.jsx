import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from './Avatar';
import GroupAvatar from './GroupAvatar';
import { digitsOf } from '../../../store/slices/contactsSlice';
import { createGroup } from '../../../store/slices/groupsSlice';
import { loadPhotos } from '../../../store/slices/photosSlice';

export default function NewGroup({ onClose, onCreated }) {
  const dispatch = useDispatch();
  const contacts = useSelector((s) => s.contacts.contacts);
  const gallery = useSelector((s) => s.photos.items);

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState([]); // [{ number(digits), name }]
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const has = (d) => members.some((m) => m.number === d);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const qd = digitsOf(query);
    return contacts
      .filter((c) => !has(digitsOf(c.number)))
      .filter((c) => c.name.toLowerCase().includes(q) || (qd && digitsOf(c.number).includes(qd)))
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, contacts, members]);

  const addMember = (number, name) => {
    const d = digitsOf(number);
    if (d.length < 3 || has(d)) return;
    setMembers((m) => [...m, { number: d, name: name || null }]);
    setQuery('');
  };
  const removeMember = (d) => setMembers((m) => m.filter((x) => x.number !== d));

  const openPhoto = () => {
    dispatch(loadPhotos());
    setPicking(true);
  };

  const create = async () => {
    if (members.length < 1 || busy) return;
    setBusy(true);
    const gid = await dispatch(
      createGroup({ name: name.trim(), members: members.map((m) => m.number), photo })
    );
    setBusy(false);
    if (gid) onCreated(gid);
  };

  return (
    <div className="msg msg--new">
      <div className="msg-new__bar msg-new__bar--3">
        <button className="msg-new__cancel" onClick={onClose}>
          Cancel
        </button>
        <span className="msg-new__title">New Group</span>
        <button className="msg-new__done" disabled={members.length < 1 || busy} onClick={create}>
          {busy ? '…' : 'Create'}
        </button>
      </div>

      <div className="gnew__head">
        <button className="gnew__photo" onClick={openPhoto}>
          {photo ? <img src={photo} alt="" /> : <GroupAvatar group={{ name: name || 'Group' }} className="msg-avatar--lg" />}
          <span className="gnew__photoedit">Edit</span>
        </button>
        <input
          className="gnew__nameinput"
          placeholder="Group Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
      </div>

      <div className="msg-new__to">
        <span className="msg-new__tolabel">Add:</span>
        <input
          className="msg-new__toinput"
          value={query}
          placeholder="Name or number"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addMember(query);
          }}
        />
      </div>

      {members.length > 0 && (
        <div className="gnew__chips">
          {members.map((m) => (
            <span key={m.number} className="msg-new__chip">
              {m.name || m.number}
              <button onClick={() => removeMember(m.number)} aria-label="Remove">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="msg-new__suggest">
          {suggestions.map((c) => (
            <button key={c.id} className="msg-new__sug" onClick={() => addMember(c.number, c.name)}>
              <Avatar name={c.name} src={c.img} className="msg-avatar--sm" />
              <div className="msg-new__sugtext">
                <div className="msg-new__sugname">{c.name}</div>
                <div className="msg-new__sugnum">{c.number}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!query && members.length === 0 && (
        <div className="gnew__hint">Add people by contact or phone number, then tap Create.</div>
      )}

      {picking && (
        <>
          <div className="msg-cash-backdrop" onClick={() => setPicking(false)} />
          <div className="msg-gallery">
            <button className="msg-cash__grab" onClick={() => setPicking(false)} aria-label="Close" />
            <div className="msg-gallery__title">Choose a Group Photo</div>
            <div className="msg-gallery__grid">
              {gallery.filter((i) => i.type !== 'video').length === 0 && (
                <div className="msg-gallery__empty">No photos yet.</div>
              )}
              {[...gallery]
                .filter((i) => i.type !== 'video')
                .sort((a, b) => (b.ts || 0) - (a.ts || 0))
                .map((item) => (
                  <button
                    key={item.id}
                    className="msg-gallery__cell"
                    onClick={() => {
                      setPhoto(item.url);
                      setPicking(false);
                    }}
                  >
                    <img src={item.url} alt="" />
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

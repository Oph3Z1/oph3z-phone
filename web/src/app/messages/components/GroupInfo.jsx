import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from './Avatar';
import GroupAvatar from './GroupAvatar';
import { ChevronLeftIcon } from './icons';
import { digitsOf } from '../../../store/slices/contactsSlice';
import { manageGroup } from '../../../store/slices/groupsSlice';
import { loadPhotos } from '../../../store/slices/photosSlice';
import { useT } from '../../../i18n/useT';

export default function GroupInfo({ gid, onBack, onLeft }) {
    const dispatch = useDispatch();
    const t = useT();
    const group = useSelector((s) => s.groups.byGid[gid]);
    const contacts = useSelector((s) => s.contacts.contacts);
    const gallery = useSelector((s) => s.photos.items);

    const [renaming, setRenaming] = useState(false);
    const [nameVal, setNameVal] = useState(group?.name || '');
    const [adding, setAdding] = useState(false);
    const [picking, setPicking] = useState(false);
    const [query, setQuery] = useState('');
    const [pendingAdd, setPendingAdd] = useState([]);

    const suggestions = useMemo(() => {
        if (!group) return [];
        const q = query.trim().toLowerCase();
        if (!q) return [];
        const qd = digitsOf(query);
        const taken = (d) =>
            group.members.some((m) => m.number === d) || pendingAdd.some((m) => m.number === d);
        return contacts
            .filter((c) => !taken(digitsOf(c.number)))
            .filter(
                (c) => c.name.toLowerCase().includes(q) || (qd && digitsOf(c.number).includes(qd)),
            )
            .slice(0, 6);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, contacts, group, pendingAdd]);

    if (!group) return null;
    const isOwner = group.isOwner;

    const existing = (d) =>
        group.members.some((m) => m.number === d) || pendingAdd.some((m) => m.number === d);

    const saveName = () => {
        const n = nameVal.trim();
        setRenaming(false);
        if (n && n !== group.name) dispatch(manageGroup(gid, 'rename', { name: n }));
        else setNameVal(group.name);
    };

    const setGroupPhoto = (url) => {
        setPicking(false);
        dispatch(manageGroup(gid, 'setphoto', { photo: url }));
    };

    const remove = (number) => dispatch(manageGroup(gid, 'remove', { number }));

    const addPending = (number, name) => {
        const d = digitsOf(number);
        if (d.length < 3 || existing(d)) return;
        setPendingAdd((m) => [...m, { number: d, name: name || null }]);
        setQuery('');
    };
    const confirmAdd = async () => {
        if (pendingAdd.length) {
            await dispatch(manageGroup(gid, 'add', { members: pendingAdd.map((m) => m.number) }));
        }
        setPendingAdd([]);
        setAdding(false);
    };

    const leave = async () => {
        await dispatch(manageGroup(gid, 'leave'));
        onLeft();
    };
    const del = async () => {
        await dispatch(manageGroup(gid, 'delete'));
        onLeft();
    };

    return (
        <div className="msg ginfo">
            <div className="msg-conv__bar">
                <button className="msg-conv__back" onClick={onBack} aria-label="Back">
                    <ChevronLeftIcon />
                </button>
                <span className="ginfo__bartitle">{t('messages.groupInfo')}</span>
                <div className="msg-conv__spacer" />
            </div>

            <div className="ginfo__scroll">
                <div className="ginfo__hero">
                    <button
                        className="ginfo__photo"
                        onClick={
                            isOwner
                                ? () => {
                                      dispatch(loadPhotos());
                                      setPicking(true);
                                  }
                                : undefined
                        }
                    >
                        <GroupAvatar group={group} className="msg-avatar--xl" />
                        {isOwner && <span className="ginfo__photoedit">{t('messages.edit')}</span>}
                    </button>

                    {renaming ? (
                        <input
                            className="ginfo__nameinput"
                            value={nameVal}
                            autoFocus
                            onChange={(e) => setNameVal(e.target.value)}
                            onBlur={saveName}
                            onKeyDown={(e) => e.key === 'Enter' && saveName()}
                            maxLength={40}
                        />
                    ) : (
                        <button
                            className="ginfo__name"
                            onClick={
                                isOwner
                                    ? () => {
                                          setNameVal(group.name);
                                          setRenaming(true);
                                      }
                                    : undefined
                            }
                        >
                            {group.name}
                            {isOwner && (
                                <span className="ginfo__rename">{t('messages.editName')}</span>
                            )}
                        </button>
                    )}
                    <div className="ginfo__count">
                        {t('messages.membersCount', { n: group.members.length })}
                    </div>
                </div>

                <div className="ginfo__section">
                    <div className="ginfo__sechead">
                        <span>{t('messages.members')}</span>
                        <button className="ginfo__add" onClick={() => setAdding(true)}>
                            {t('messages.addPlus')}
                        </button>
                    </div>
                    {group.members.map((m) => (
                        <div key={m.number} className="ginfo__member">
                            <Avatar name={m.name} src={m.avatar} className="msg-avatar--md" />
                            <div className="ginfo__memtext">
                                <div className="ginfo__memname">
                                    {m.number === group.selfNumber ? t('messages.you') : m.name}
                                    {m.isOwner && (
                                        <span className="ginfo__ownerbadge">
                                            {t('messages.owner')}
                                        </span>
                                    )}
                                </div>
                                <div className="ginfo__memnum">{m.number}</div>
                            </div>
                            {isOwner && !m.isOwner && m.number !== group.selfNumber && (
                                <button
                                    className="ginfo__remove"
                                    onClick={() => remove(m.number)}
                                    aria-label="Remove"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="ginfo__actions">
                    <button className="ginfo__danger" onClick={leave}>
                        {t('messages.leaveGroup')}
                    </button>
                    {isOwner && (
                        <button className="ginfo__danger" onClick={del}>
                            {t('messages.deleteGroup')}
                        </button>
                    )}
                </div>
            </div>

            {adding && (
                <div className="ginfo__addsheet">
                    <div className="msg-new__bar msg-new__bar--3">
                        <button
                            className="msg-new__cancel"
                            onClick={() => {
                                setAdding(false);
                                setPendingAdd([]);
                            }}
                        >
                            {t('messages.cancel')}
                        </button>
                        <span className="msg-new__title">{t('messages.addMembers')}</span>
                        <button
                            className="msg-new__done"
                            disabled={!pendingAdd.length}
                            onClick={confirmAdd}
                        >
                            {t('messages.addAction')}
                        </button>
                    </div>
                    <div className="msg-new__to">
                        <span className="msg-new__tolabel">{t('messages.add')}</span>
                        <input
                            className="msg-new__toinput"
                            value={query}
                            placeholder={t('messages.nameOrNumber')}
                            autoFocus
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addPending(query)}
                        />
                    </div>
                    {pendingAdd.length > 0 && (
                        <div className="gnew__chips">
                            {pendingAdd.map((m) => (
                                <span key={m.number} className="msg-new__chip">
                                    {m.name || m.number}
                                    <button
                                        onClick={() =>
                                            setPendingAdd((p) =>
                                                p.filter((x) => x.number !== m.number),
                                            )
                                        }
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                    {suggestions.length > 0 && (
                        <div className="msg-new__suggest">
                            {suggestions.map((c) => (
                                <button
                                    key={c.id}
                                    className="msg-new__sug"
                                    onClick={() => addPending(c.number, c.name)}
                                >
                                    <Avatar name={c.name} src={c.img} className="msg-avatar--sm" />
                                    <div className="msg-new__sugtext">
                                        <div className="msg-new__sugname">{c.name}</div>
                                        <div className="msg-new__sugnum">{c.number}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {picking && (
                <>
                    <div className="msg-cash-backdrop" onClick={() => setPicking(false)} />
                    <div className="msg-gallery">
                        <button
                            className="msg-cash__grab"
                            onClick={() => setPicking(false)}
                            aria-label="Close"
                        />
                        <div className="msg-gallery__title">{t('messages.chooseGroupPhoto')}</div>
                        <div className="msg-gallery__grid">
                            {gallery.filter((i) => i.type !== 'video').length === 0 && (
                                <div className="msg-gallery__empty">{t('messages.noPhotos')}</div>
                            )}
                            {[...gallery]
                                .filter((i) => i.type !== 'video')
                                .sort((a, b) => (b.ts || 0) - (a.ts || 0))
                                .map((item) => (
                                    <button
                                        key={item.id}
                                        className="msg-gallery__cell"
                                        onClick={() => setGroupPhoto(item.url)}
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
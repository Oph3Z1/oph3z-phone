import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { openDialog } from '../../store/slices/dialogSlice';
import { useT } from '../../i18n/useT';
import { useXNav } from './XNav';
import Avatar from './Avatar';
import { BackArrow, Verified } from './icons';

// One person row. Tap opens the profile. On MY OWN followers tab a "Remove"
// button appears (removes them as a follower); elsewhere a follow/unfollow button.
export function UserRow({ acc, canRemove, onRemove }) {
  const t = useT();
  const nav = useXNav();
  const dispatch = useDispatch();
  const [following, setFollowing] = useState(acc.isFollowing);

  const toggle = async (e) => {
    e.stopPropagation();
    const next = !following;
    setFollowing(next);
    const res = await fetchNui('phone:x:follow', { id: acc.id, on: next }, { ok: true, following: next });
    if (res && res.ok) setFollowing(res.following);
  };

  const remove = async (e) => {
    e.stopPropagation();
    const ok = await dispatch(openDialog({
      title: t('x.removeFollowerTitle'),
      message: t('x.removeFollowerMsg', { handle: acc.handle }),
      buttons: [
        { text: t('common.cancel'), style: 'cancel', value: false },
        { text: t('x.remove'), style: 'destructive', value: true },
      ],
    }));
    if (ok) onRemove(acc.id);
  };

  return (
    <button className="x-userrow" onClick={() => nav.openProfile({ id: acc.id, handle: acc.handle })}>
      <Avatar account={acc} size="2.7em" />
      <div className="x-userrow__mid">
        <span className="x-userrow__name">{acc.name}<Verified size={13} tier={acc.badge} /></span>
        <span className="x-userrow__handle">@{acc.handle}</span>
        {acc.bio ? <span className="x-userrow__bio">{acc.bio}</span> : null}
      </div>
      {canRemove ? (
        <span className="x-btn x-btn--sm x-btn--outline" role="button" onClick={remove}>{t('x.remove')}</span>
      ) : !acc.isMe ? (
        <span
          className={`x-btn x-btn--sm${following ? ' x-btn--outline' : ' x-btn--solid'}`}
          role="button"
          onClick={toggle}
        >
          {following ? t('x.following') : t('x.follow')}
        </span>
      ) : null}
    </button>
  );
}

// Followers / Following list for one account, with switchable tabs.
export default function FollowListScreen({ target, initialTab, isSelf, me, onBack }) {
  const t = useT();
  const [tab, setTab] = useState(initialTab || 'followers');
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    fetchNui('phone:x:followList', { id: target.id, handle: target.handle, type: tab }, { ok: true, accounts: [] })
      .then((r) => { if (alive && r && r.ok) setItems(r.accounts || []); });
    return () => { alive = false; };
  }, [tab, target.id, target.handle]);

  const removeFollower = async (accId) => {
    await fetchNui('phone:x:removeFollower', { id: accId }, { ok: true });
    setItems((list) => (list || []).filter((a) => a.id !== accId));
  };

  return (
    <div className="x-screen">
      <div className="x-topbar">
        <button className="x-iconbtn" onClick={onBack}><BackArrow /></button>
        <div className="x-topbar__stack">
          <span className="x-topbar__title">@{target.handle}</span>
        </div>
        <span className="x-topbar__spacer" />
      </div>

      <div className="x-tabs">
        {['followers', 'following'].map((k) => (
          <button key={k} className={`x-tab${tab === k ? ' is-on' : ''}`} onClick={() => setTab(k)}>
            {t(`x.tab_${k}`)}
            {tab === k && <span className="x-tab__ind" />}
          </button>
        ))}
      </div>

      <div className="x-scroll">
        {items === null ? (
          <div className="x-empty">{t('x.loading')}</div>
        ) : items.length === 0 ? (
          <div className="x-empty x-empty--sm">{tab === 'followers' ? t('x.noFollowers') : t('x.noFollowing')}</div>
        ) : (
          items.map((a) => (
            <UserRow key={a.id} acc={a} canRemove={isSelf && tab === 'followers'} onRemove={removeFollower} />
          ))
        )}
      </div>
    </div>
  );
}

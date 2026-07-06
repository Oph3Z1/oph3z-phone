import { useEffect, useState } from 'react';
import { fetchNui } from '../../utils/fetchNui';
import { useT } from '../../i18n/useT';
import { useXNav } from './XNav';
import { fullDate, fmtCount } from './xUtil';
import PostCard from './PostCard';
import { BackArrow, EmojiIcon } from './icons';
import EmojiPicker from '../messages/components/EmojiPicker';

// Post detail: ancestor chain, the focused post, an inline reply bar and replies.
export default function PostDetail({ id, me, reloadToken, onBack }) {
  const t = useT();
  const nav = useXNav();
  const [data, setData] = useState(null);
  const [reply, setReply] = useState('');
  const [emoji, setEmoji] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetchNui('phone:x:thread', { id }, { ok: true, post: null, ancestors: [], replies: [] });
    if (res && res.ok) setData(res);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, reloadToken]);

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || busy) return;
    setBusy(true);
    const res = await fetchNui('phone:x:post', { text, parentId: id }, { ok: true, post: null });
    setBusy(false);
    if (res && res.ok) { setReply(''); setEmoji(false); load(); }
  };

  const post = data && data.post;

  return (
    <div className="x-screen x-detail">
      <div className="x-topbar">
        <button className="x-iconbtn" onClick={onBack}><BackArrow /></button>
        <span className="x-topbar__title">{t('x.postTitle')}</span>
        <span className="x-topbar__spacer" />
      </div>

      <div className="x-scroll x-detail__scroll">
        {!post ? (
          <div className="x-empty">{t('x.loading')}</div>
        ) : (
          <>
            {data.ancestors && data.ancestors.map((a) => (
              <div className="x-detail__ancestor" key={a.id}><PostCard post={a} me={me} onChanged={load} /></div>
            ))}

            <div className="x-detail__main">
              <PostCard post={post} me={me} onChanged={onBack} big />
              <div className="x-detail__meta">{fullDate(post.createdAt)}</div>
              {(post.repostCount > 0 || post.likeCount > 0) && (
                <div className="x-detail__stats">
                  {post.repostCount > 0 && (
                    <button className="x-detail__stat" onClick={() => nav.openEngagers({ postId: post.id, tab: 'reposts' })}>
                      <b>{fmtCount(post.repostCount)}</b> {t(post.repostCount === 1 ? 'x.repostOne' : 'x.repostMany')}
                    </button>
                  )}
                  {post.likeCount > 0 && (
                    <button className="x-detail__stat" onClick={() => nav.openEngagers({ postId: post.id, tab: 'likes' })}>
                      <b>{fmtCount(post.likeCount)}</b> {t(post.likeCount === 1 ? 'x.likeOne' : 'x.likeMany')}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="x-detail__replies">
              {data.replies && data.replies.length > 0 ? (
                data.replies.map((r) => <PostCard key={r.id} post={r} me={me} onChanged={load} />)
              ) : (
                <div className="x-empty x-empty--sm">{t('x.noReplies')}</div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="x-replybar">
        <input
          value={reply}
          placeholder={t('x.replyPh')}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }}
        />
        <button className="x-replybar__emoji" onClick={() => setEmoji((v) => !v)}><EmojiIcon size={20} /></button>
        <button className="x-replybar__send" disabled={!reply.trim() || busy} onClick={sendReply}>{t('x.commentBtn')}</button>
      </div>
      {emoji && (
        <div className="x-detail__emoji"><EmojiPicker onSelect={(e) => setReply((v) => v + e)} onClose={() => setEmoji(false)} /></div>
      )}
    </div>
  );
}

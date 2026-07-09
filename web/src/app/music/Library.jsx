import { useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import { useSpotify } from './ctx';
import { gradientFor, greeting } from './util';
import { HeartIcon, PlusIcon, NoteIcon } from './icons';

// Home: a greeting, a standout Liked Songs hero, and your playlists as big tiles.
// The create-playlist popup lives at the app root (SpotifyApp) — opened via ctx.
export default function Library({ onOpenPlaylist }) {
  const t = useT();
  const sp = useSpotify();
  const library = useSelector((s) => s.spotify.library);

  const playlists = library.playlists || [];
  const liked = library.liked || [];
  const likedArt = liked[0] && liked[0].artwork;

  return (
    <div className="sp-screen">
      <div className="sp-home__head">
        <div>
          <div className="sp-home__hi">{greeting(t)}</div>
          <div className="sp-home__sub">{t('spotify.yourLibrary')}</div>
        </div>
        <button className="sp-round" onClick={sp.openCreate} aria-label={t('spotify.newPlaylist')}><PlusIcon size={20} /></button>
      </div>

      {/* Liked Songs hero */}
      <button className="sp-hero" onClick={() => onOpenPlaylist({ id: 'liked' })}>
        <span className="sp-hero__art" style={likedArt ? { backgroundImage: `url(${likedArt})` } : undefined}>
          <span className="sp-hero__heart"><HeartIcon size={30} filled /></span>
        </span>
        <span className="sp-hero__body">
          <span className="sp-hero__title">{t('spotify.likedSongs')}</span>
          <span className="sp-hero__sub">{t('spotify.songCount', { count: liked.length })}</span>
        </span>
        <span className="sp-hero__glow" />
      </button>

      <div className="sp-sect">{t('spotify.yourPlaylists')}</div>

      {playlists.length === 0 ? (
        <button className="sp-empty" onClick={sp.openCreate}>
          <NoteIcon size={40} />
          <div className="sp-empty__title">{t('spotify.noPlaylists')}</div>
          <div className="sp-empty__sub">{t('spotify.noPlaylistsSub')}</div>
        </button>
      ) : (
        <div className="sp-tiles">
          {playlists.map((p) => {
            const cover = (p.tracks || []).find((tk) => tk.artwork);
            return (
              <button className="sp-tile" key={p.id} onClick={() => onOpenPlaylist(p)}>
                <span className="sp-tile__art" style={cover ? { backgroundImage: `url(${cover.artwork})` } : { background: gradientFor(p.name) }}>
                  {!cover && <NoteIcon size={26} />}
                </span>
                <span className="sp-tile__name">{p.name}</span>
                <span className="sp-tile__sub">{t('spotify.songCount', { count: (p.tracks || []).length })}</span>
              </button>
            );
          })}
          <button className="sp-tile sp-tile--add" onClick={sp.openCreate}>
            <span className="sp-tile__art sp-tile__art--add"><PlusIcon size={28} /></span>
            <span className="sp-tile__name">{t('spotify.newPlaylist')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

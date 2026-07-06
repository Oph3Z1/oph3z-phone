import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './SpotifyApp.css';

import { fetchNui } from '../../utils/fetchNui';
import { loadLibrary, loadSpotifyState } from '../../store/slices/spotifySlice';
import { clearDeliver } from '../../store/slices/airdropSlice';
import { useT } from '../../i18n/useT';
import { SpotifyCtx } from './ctx';
import { gradientFor } from './util';
import AmbientBackground from './AmbientBackground';
import Library from './Library';
import Search from './Search';
import PlaylistView from './PlaylistView';
import NowPlaying from './NowPlaying';
import ShareSheet from './ShareSheet';
import TrackMenu from './TrackMenu';
import CreatePlaylistSheet from './CreatePlaylistSheet';
import { LibraryIcon, SearchIcon, PlayIcon, PauseIcon, NoteIcon, Waveform } from './icons';

export default function SpotifyApp() {
  const dispatch = useDispatch();
  const t = useT();
  const music = useSelector((s) => s.music);
  const current = useSelector((s) => s.spotify.current);
  const deliver = useSelector((s) => s.airdrop.deliver);

  const [tab, setTab] = useState('library');       // 'library' | 'search'
  const [playlist, setPlaylist] = useState(null);  // open playlist id or null
  const [nowOpen, setNowOpen] = useState(false);
  const [share, setShare] = useState(null);        // track being shared
  const [menu, setMenu] = useState(null);          // { track, playlistId }
  const [creating, setCreating] = useState(false); // create-playlist popup

  useEffect(() => { dispatch(loadLibrary()); dispatch(loadSpotifyState()); }, [dispatch]);

  // A shared track was delivered (AirDrop accept / Messages card tap): play it.
  useEffect(() => {
    if (deliver && deliver.appId === 'spotify') {
      const track = deliver.payload && deliver.payload.track;
      dispatch(clearDeliver());
      if (track) { fetchNui('phone:spotify:play', { track, queue: [track], index: 1 }, {}); setNowOpen(true); }
    }
  }, [deliver, dispatch]);

  const play = useCallback((track, queue, index) => {
    fetchNui('phone:spotify:play', { track, queue: queue || [track], index: index || 1 }, {});
  }, []);

  const ctx = useMemo(() => ({
    play,
    openMenu: (track, playlistId) => setMenu({ track, playlistId }),
    openNow: () => setNowOpen(true),
    openPlaylist: (id) => setPlaylist(id),
    openCreate: () => setCreating(true),
  }), [play]);

  const shareCurrent = () => setShare(current || (music.title ? { title: music.title, artist: music.artist, artwork: music.artwork } : null));
  const go = (nextTab) => { setTab(nextTab); setPlaylist(null); };

  return (
    <SpotifyCtx.Provider value={ctx}>
      <div className="spapp">
        <AmbientBackground artwork={music.artwork} />

        <div className="sp-content">
          {playlist ? (
            <PlaylistView playlistId={playlist} onBack={() => setPlaylist(null)} />
          ) : tab === 'library' ? (
            <Library onOpenPlaylist={(p) => setPlaylist(p.id)} />
          ) : (
            <Search />
          )}
        </div>

        {/* Floating mini player */}
        {music.title && (
          <div className="sp-mini" onClick={() => setNowOpen(true)}>
            <span className="sp-mini__art" style={music.artwork ? undefined : { background: gradientFor(music.title) }}>
              {music.artwork ? <img src={music.artwork} alt="" /> : <NoteIcon size={16} />}
            </span>
            <span className="sp-mini__meta">
              <span className="sp-mini__title">{music.title}</span>
              <span className="sp-mini__artist">{music.artist || '—'}</span>
            </span>
            <span className="sp-mini__wave"><Waveform size={14} on={music.playing} /></span>
            <button className="sp-mini__play" onClick={(e) => { e.stopPropagation(); fetchNui('phone:spotify:toggle', {}, {}); }} aria-label="Play/Pause">
              {music.playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
            </button>
            <span className="sp-mini__bar" style={{ width: music.duration ? `${Math.min(100, (music.position / music.duration) * 100)}%` : '0%' }} />
          </div>
        )}

        {/* Floating glass pill nav */}
        <div className="sp-nav">
          <button className={`sp-nav__btn${tab === 'library' && !playlist ? ' is-on' : ''}`} onClick={() => go('library')}>
            <LibraryIcon size={21} /><span>{t('spotify.library')}</span>
          </button>
          <button className={`sp-nav__btn${tab === 'search' && !playlist ? ' is-on' : ''}`} onClick={() => go('search')}>
            <SearchIcon size={21} /><span>{t('spotify.search')}</span>
          </button>
        </div>

        {creating && <CreatePlaylistSheet onClose={() => setCreating(false)} />}
        {nowOpen && <NowPlaying onClose={() => setNowOpen(false)} onShare={shareCurrent} />}
        {share && <ShareSheet track={share} onClose={() => setShare(null)} />}
        {menu && <TrackMenu track={menu.track} playlistId={menu.playlistId} onShare={(tr) => setShare(tr)} onClose={() => setMenu(null)} />}
      </div>
    </SpotifyCtx.Provider>
  );
}

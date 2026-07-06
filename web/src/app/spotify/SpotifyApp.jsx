import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './SpotifyApp.css';

import { fetchNui } from '../../utils/fetchNui';
import { loadLibrary, loadSpotifyState } from '../../store/slices/spotifySlice';
import { clearDeliver } from '../../store/slices/airdropSlice';
import { useT } from '../../i18n/useT';
import { SpotifyCtx } from './ctx';
import { gradientFor } from './util';
import Library from './Library';
import Search from './Search';
import PlaylistView from './PlaylistView';
import NowPlaying from './NowPlaying';
import ShareSheet from './ShareSheet';
import TrackMenu from './TrackMenu';
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
  }), [play]);

  const shareCurrent = () => setShare(current || (music.title ? { title: music.title, artist: music.artist, artwork: music.artwork } : null));

  return (
    <SpotifyCtx.Provider value={ctx}>
      <div className="spapp">
        <div className="sp-body">
          {playlist ? (
            <PlaylistView playlistId={playlist} onBack={() => setPlaylist(null)} />
          ) : tab === 'library' ? (
            <Library onOpenPlaylist={(p) => setPlaylist(p.id)} />
          ) : (
            <Search />
          )}
        </div>

        {/* Mini player */}
        {music.title && (
          <div className="sp-mini" onClick={() => setNowOpen(true)}>
            <span className="sp-mini__art" style={music.artwork ? undefined : { background: gradientFor(music.title) }}>
              {music.artwork ? <img src={music.artwork} alt="" /> : <NoteIcon size={16} />}
            </span>
            <span className="sp-mini__meta">
              <span className="sp-mini__title">{music.title}</span>
              <span className="sp-mini__artist">{music.artist || '—'}</span>
            </span>
            <span className="sp-mini__wave"><Waveform size={15} on={music.playing} /></span>
            <button className="sp-mini__play" onClick={(e) => { e.stopPropagation(); fetchNui('phone:spotify:toggle', {}, {}); }} aria-label="Play/Pause">
              {music.playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
            </button>
          </div>
        )}

        {/* Tab bar */}
        <div className="sp-tabs">
          <button className={`sp-tab${tab === 'library' && !playlist ? ' is-on' : ''}`} onClick={() => { setTab('library'); setPlaylist(null); }}>
            <LibraryIcon size={22} /><span>{t('spotify.library')}</span>
          </button>
          <button className={`sp-tab${tab === 'search' && !playlist ? ' is-on' : ''}`} onClick={() => { setTab('search'); setPlaylist(null); }}>
            <SearchIcon size={22} /><span>{t('spotify.search')}</span>
          </button>
        </div>

        {nowOpen && (
          <div className="sp-overlay">
            <NowPlaying onClose={() => setNowOpen(false)} onShare={shareCurrent} />
          </div>
        )}
        {share && <ShareSheet track={share} onClose={() => setShare(null)} />}
        {menu && <TrackMenu track={menu.track} playlistId={menu.playlistId} onShare={(tr) => setShare(tr)} onClose={() => setMenu(null)} />}
      </div>
    </SpotifyCtx.Provider>
  );
}

import { useXNav } from './XNav';

// Renders a post's media (1-4 items) in an X-style rounded grid.
//  - image  -> opens the shared lightbox
//  - gif    -> animated <img>, opens the lightbox
//  - video  -> poster + play badge, opens the in-phone video viewer
export default function MediaGrid({ media }) {
  const nav = useXNav();
  if (!media || media.length === 0) return null;
  const items = media.slice(0, 4);

  return (
    <div className={`x-media x-media--${items.length}`} onClick={(e) => e.stopPropagation()}>
      {items.map((m, i) => {
        if (m.type === 'video') {
          return (
            <button key={i} className="x-media__cell" onClick={() => nav.openVideo && nav.openVideo(m)}>
              {m.thumb ? <img src={m.thumb} alt="" /> : <video src={m.url} muted playsInline preload="metadata" />}
              <span className="x-media__play" />
            </button>
          );
        }
        // image or gif
        return (
          <button key={i} className="x-media__cell" onClick={() => nav.openLightbox && nav.openLightbox(m.url)}>
            <img src={m.url} alt="" loading="lazy" />
            {m.type === 'gif' && <span className="x-media__gifbadge">GIF</span>}
          </button>
        );
      })}
    </div>
  );
}

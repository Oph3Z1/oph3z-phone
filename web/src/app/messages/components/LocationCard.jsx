import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CUSTOM_CRS, toLatLng, tileUrl } from '../../maps/crs';

const pin = L.divIcon({
  className: 'msg-loc-pin',
  html: '<span></span>',
  iconSize: [20, 26],
  iconAnchor: [10, 24],
});

const PinMini = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a7 7 0 00-7 7c0 4.8 7 13 7 13s7-8.2 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
  </svg>
);

// A chat location bubble: a non-interactive mini-map + a header that names the
// type (Location / Live Location) and reflects when a live share ends or stops.
// Tapping opens the full Maps app on it.
export default function LocationCard({ msg, out, onOpen, onStopLive }) {
  const meta = msg.meta || {};
  const { x = 0, y = 0, label, live, sid, endReason } = meta;
  const isLive = !!sid; // it was/is a live share (static locations have no sid)
  const ended = isLive && !live;

  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Build the mini-map once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const m = L.map(elRef.current, {
      crs: CUSTOM_CRS,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      tap: false,
      // No zoom/fade animation: avoids Leaflet leaving a CSS scale() transform on
      // the tile pane (which upscales the bitmaps and looks blurry in a small map).
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      zoomSnap: 1,
      center: toLatLng(x, y),
      zoom: 5,
    });
    L.tileLayer(tileUrl, { minZoom: 0, maxZoom: 5, maxNativeZoom: 5, noWrap: true }).addTo(m);
    markerRef.current = L.marker(toLatLng(x, y), { icon: pin }).addTo(m);
    mapRef.current = m;
    setTimeout(() => m.invalidateSize(), 60);
    return () => {
      m.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow live position updates.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !markerRef.current) return;
    const ll = toLatLng(x, y);
    markerRef.current.setLatLng(ll);
    m.setView(ll, m.getZoom(), { animate: true });
  }, [x, y]);

  const title = isLive ? 'Live Location' : 'Location';
  let sub;
  if (ended) sub = endReason === 'stopped' ? (out ? 'You stopped sharing' : 'Stopped sharing') : 'Live ended';
  else if (isLive) sub = out ? 'Sharing your location' : 'Sharing live';
  else sub = label || 'Current Location';

  return (
    <div
      className={`msg-loc${live ? ' is-live' : ''}${ended ? ' is-ended' : ''}`}
      onClick={() => onOpen && onOpen(meta)}
    >
      <div className="msg-loc__head">
        {isLive ? <span className="msg-loc__dot" /> : <PinMini />}
        <span className="msg-loc__title">{title}</span>
      </div>

      <div className="msg-loc__map" ref={elRef} />

      <div className="msg-loc__bar">
        <div className="msg-loc__text">
          {isLive && <span className="msg-loc__label">{label || 'Current Location'}</span>}
          <span className="msg-loc__status">{sub}</span>
        </div>
        {out && live && (
          <button
            className="msg-loc__stop"
            onClick={(e) => {
              e.stopPropagation();
              onStopLive && onStopLive(msg);
            }}
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

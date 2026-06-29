import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapsApp.css';

import { fetchNui } from '../../utils/fetchNui';
import { useNuiEvent } from '../../hooks/useNuiEvent';
import { loadBlips, addBlip, moveBlip, deleteBlip } from '../../store/slices/mapsSlice';

// GTA V map transform (from the gta-v-map-leaflet tileset). center_x/y + scale_x/y
// map GTA world coords onto the tile pixels. Tune here if the marker is offset.
const MAP = { centerX: 117.3, centerY: 172.8, scaleX: 0.02072, scaleY: 0.0205, minZoom: 0, maxZoom: 5 };

const CUSTOM_CRS = L.Util.extend({}, L.CRS.Simple, {
  projection: L.Projection.LonLat,
  scale: (zoom) => Math.pow(2, zoom),
  zoom: (sc) => Math.log(sc) / 0.6931471805599453,
  distance: (p1, p2) => {
    const dx = p2.lng - p1.lng;
    const dy = p2.lat - p1.lat;
    return Math.sqrt(dx * dx + dy * dy);
  },
  transformation: new L.Transformation(MAP.scaleX, MAP.centerX, -MAP.scaleY, MAP.centerY),
  infinite: true,
});

// GTA (x, y) -> Leaflet latLng (lat = y, lng = x).
const toLatLng = (x, y) => [y, x];

// The atlas image spans projected 0..256 (at zoom 0); convert that to GTA bounds
// so the map can't be panned into the void around it.
const MAP_BOUNDS = L.latLngBounds(
  [(MAP.centerY - 256) / MAP.scaleY, (0 - MAP.centerX) / MAP.scaleX],
  [MAP.centerY / MAP.scaleY, (256 - MAP.centerX) / MAP.scaleX]
);

const playerIcon = L.divIcon({
  className: 'maps-player',
  html: '<span class="maps-player__pulse"></span><span class="maps-player__dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});
const blipIcon = L.divIcon({
  className: 'maps-blip',
  html: '<span class="maps-blip__pin"></span>',
  iconSize: [24, 30],
  iconAnchor: [12, 28],
});
const pendingIcon = L.divIcon({
  className: 'maps-blip maps-blip--pending',
  html: '<span class="maps-blip__pin"></span>',
  iconSize: [24, 30],
  iconAnchor: [12, 28],
});

const LocateIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
  </svg>
);

export default function MapsApp() {
  const dispatch = useDispatch();
  const blips = useSelector((s) => s.maps.blips);

  const mapEl = useRef(null);
  const map = useRef(null);
  const blipLayer = useRef(null);
  const playerMarker = useRef(null);
  const pendingMarker = useRef(null);
  const pendingCoords = useRef(null); // live position of the draggable pin
  const follow = useRef(true);
  const lastPos = useRef(null);

  const [pending, setPending] = useState(null); // { x, y }
  const [pendingName, setPendingName] = useState('');
  const [selected, setSelected] = useState(null); // a blip

  // Create the map once.
  useEffect(() => {
    const atlas = L.tileLayer('./mapStyles/styleAtlas/{z}/{x}/{y}.jpg', {
      minZoom: MAP.minZoom,
      maxZoom: MAP.maxZoom,
      noWrap: true,
      continuousWorld: false,
    });

    const m = L.map(mapEl.current, {
      crs: CUSTOM_CRS,
      minZoom: 1,
      maxZoom: 5,
      maxNativeZoom: 5,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      layers: [atlas],
      center: [0, 0],
      zoom: 3,
      maxBounds: MAP_BOUNDS,
      maxBoundsViscosity: 1.0, // solid edges — can't drag past the map
    });
    map.current = m;
    blipLayer.current = L.layerGroup().addTo(m);

    m.on('dragstart', () => (follow.current = false)); // panning stops follow
    m.on('click', () => setSelected(null)); // left-click closes an open blip sheet
    m.on('contextmenu', (e) => {
      // Right-click drops a draggable pin to save as a place.
      setSelected(null);
      setPendingName('');
      setPending({ x: e.latlng.lng, y: e.latlng.lat });
    });

    setTimeout(() => {
      m.invalidateSize();
      // Don't allow zooming out past the point where the map fills the screen
      // (otherwise the small map leaves black bars top/bottom).
      const size = m.getSize();
      const cover = Math.ceil(Math.log2(Math.max(size.x, size.y) / 256));
      m.setMinZoom(Math.max(1, cover));
      if (m.getZoom() < m.getMinZoom()) m.setZoom(m.getMinZoom());
    }, 120);

    fetchNui('phone:maps:enter', {}, {}); // start streaming our position
    dispatch(loadBlips());

    return () => {
      fetchNui('phone:maps:exit', {}, {});
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live player position from Lua.
  useNuiEvent('phone:maps:pos', (d) => {
    if (!d || !map.current) return;
    lastPos.current = d;
    const ll = toLatLng(d.x, d.y);
    if (!playerMarker.current) {
      playerMarker.current = L.marker(ll, { icon: playerIcon, zIndexOffset: 1000 }).addTo(map.current);
      map.current.setView(ll, 4); // center on me on first fix
    } else {
      playerMarker.current.setLatLng(ll);
    }
    if (follow.current) map.current.panTo(ll, { animate: true, duration: 0.4 });
  });

  // Redraw blips when they change.
  useEffect(() => {
    const layer = blipLayer.current;
    if (!layer) return;
    layer.clearLayers();
    blips.forEach((b) => {
      const mk = L.marker(toLatLng(b.x, b.y), { icon: blipIcon, draggable: true }).addTo(layer);
      mk.on('click', () => {
        setPending(null);
        setSelected(b);
      });
      mk.on('dragend', (e) => {
        const ll = e.target.getLatLng();
        dispatch(moveBlip(b.id, ll.lng, ll.lat)); // drag to reposition a saved place
      });
    });
  }, [blips]);

  // Draggable pin for the pending new blip (right-click drop, then drag to place).
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (pendingMarker.current) {
      m.removeLayer(pendingMarker.current);
      pendingMarker.current = null;
    }
    if (pending) {
      pendingCoords.current = { x: pending.x, y: pending.y };
      const mk = L.marker(toLatLng(pending.x, pending.y), {
        icon: pendingIcon,
        draggable: true,
        autoPan: true,
        zIndexOffset: 1200,
      }).addTo(m);
      mk.on('drag', (e) => {
        const ll = e.target.getLatLng();
        pendingCoords.current = { x: ll.lng, y: ll.lat };
      });
      pendingMarker.current = mk;
    }
  }, [pending]);

  const recenter = () => {
    follow.current = true;
    if (lastPos.current && map.current) {
      map.current.setView(toLatLng(lastPos.current.x, lastPos.current.y), 4, { animate: true });
    }
  };

  const savePending = async () => {
    const c = pendingCoords.current; // where the pin was dragged to
    if (!c) return;
    await dispatch(addBlip({ x: c.x, y: c.y, label: pendingName.trim() || 'Saved place' }));
    setPending(null);
    setPendingName('');
  };

  const setWaypoint = () => {
    if (selected) fetchNui('phone:maps:waypoint', { x: selected.x, y: selected.y }, {});
    setSelected(null);
  };
  const removeSelected = () => {
    if (selected) dispatch(deleteBlip(selected.id));
    setSelected(null);
  };

  return (
    <div className="maps">
      <div className="maps__map" ref={mapEl} />

      <div className="maps__tip">
        Right-click to add · hold <b>Ctrl</b> + drag to move a pin
      </div>

      <button className="maps__locate" onClick={recenter} aria-label="Recenter">
        <LocateIcon />
      </button>

      {pending && (
        <div className="maps__sheet">
          <div className="maps__sheet-title">New place</div>
          <div className="maps__hint">Hold Ctrl + drag the pin to move it</div>
          <input
            className="maps__input"
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            placeholder="Name this place"
            maxLength={40}
            autoFocus
          />
          <div className="maps__row">
            <button className="maps__btn maps__btn--ghost" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button className="maps__btn maps__btn--primary" onClick={savePending}>
              Save
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div className="maps__sheet">
          <div className="maps__sheet-head">
            <div className="maps__sheet-title">{selected.label}</div>
            <button className="maps__close" onClick={() => setSelected(null)} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="maps__row">
            <button className="maps__btn maps__btn--primary" onClick={setWaypoint}>
              Set Waypoint
            </button>
            <button className="maps__btn maps__btn--danger" onClick={removeSelected}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

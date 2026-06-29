import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapsApp.css';

import { fetchNui } from '../../utils/fetchNui';
import { useNuiEvent } from '../../hooks/useNuiEvent';
import { loadBlips, addBlip, moveBlip, deleteBlip } from '../../store/slices/mapsSlice';
import { setFocus } from '../../store/slices/mapsSlice';
import { setResumeThread } from '../../store/slices/messagesSlice';
import { openApp } from '../../store/slices/phoneSlice';
import { MAP, CUSTOM_CRS, toLatLng, MAP_BOUNDS, tileUrl } from './crs';

const ChevronLeft = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5l-7 7 7 7" />
  </svg>
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
  const focus = useSelector((s) => s.maps.focus); // shared location to jump to

  const mapEl = useRef(null);
  const map = useRef(null);
  const blipLayer = useRef(null);
  const playerMarker = useRef(null);
  const pendingMarker = useRef(null);
  const pendingCoords = useRef(null); // live position of the draggable pin
  const focusMarker = useRef(null);
  const follow = useRef(true);
  const lastPos = useRef(null);

  const [pending, setPending] = useState(null); // { x, y }
  const [pendingName, setPendingName] = useState('');
  const [selected, setSelected] = useState(null); // a blip
  const [shared, setShared] = useState(null); // a location opened from Messages
  const [returnTo, setReturnTo] = useState(null); // conversation number to go back to
  const viewOnly = !!returnTo; // opened from a location: look-only, no editing

  // Create the map once.
  useEffect(() => {
    const atlas = L.tileLayer(tileUrl, {
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

  // A location was opened from Messages: center on it, drop a marker, and offer
  // a waypoint. Consumed once (cleared from the store).
  useEffect(() => {
    const m = map.current;
    if (!m || !focus) return;
    follow.current = false;
    const ll = toLatLng(focus.x, focus.y);
    if (focusMarker.current) m.removeLayer(focusMarker.current);
    focusMarker.current = L.marker(ll, { icon: pendingIcon, zIndexOffset: 1500 }).addTo(m);

    // Opened from Messages: view-only — no panning, zooming, or dropping pins.
    m.dragging.disable();
    m.scrollWheelZoom.disable();
    m.doubleClickZoom.disable();
    m.touchZoom.disable();
    m.boxZoom.disable();
    m.keyboard.disable();
    m.off('contextmenu');

    // The map may still be sizing up on first mount; settle before centering.
    setTimeout(() => {
      m.invalidateSize();
      m.setView(ll, 4, { animate: false });
    }, 160);
    setShared({ x: focus.x, y: focus.y, label: focus.label || 'Shared Location' });
    if (focus.number) setReturnTo(focus.number);
    dispatch(setFocus(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  // Redraw blips when they change. Hidden entirely in view-only (location) mode.
  useEffect(() => {
    const layer = blipLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (viewOnly) return;
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
  }, [blips, viewOnly]);

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
  const closeShared = () => {
    if (focusMarker.current && map.current) {
      map.current.removeLayer(focusMarker.current);
      focusMarker.current = null;
    }
    setShared(null);
  };
  // Back to the conversation that opened this location.
  const backToChat = () => {
    if (returnTo) dispatch(setResumeThread(returnTo));
    dispatch(openApp('message'));
  };
  const waypointShared = () => {
    if (shared) fetchNui('phone:maps:waypoint', { x: shared.x, y: shared.y }, {});
    closeShared();
  };
  const removeSelected = () => {
    if (selected) dispatch(deleteBlip(selected.id));
    setSelected(null);
  };

  return (
    <div className="maps">
      <div className="maps__map" ref={mapEl} />

      {viewOnly ? (
        <button className="maps__back" onClick={backToChat}>
          <ChevronLeft /> Messages
        </button>
      ) : (
        <>
          <div className="maps__tip">
            Right-click to add · hold <b>Ctrl</b> + drag to move a pin
          </div>
          <button className="maps__locate" onClick={recenter} aria-label="Recenter">
            <LocateIcon />
          </button>
        </>
      )}

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

      {shared && (
        <div className="maps__sheet">
          <div className="maps__sheet-head">
            <div className="maps__sheet-title">{shared.label}</div>
            <button className="maps__close" onClick={closeShared} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="maps__row">
            <button className="maps__btn maps__btn--primary" onClick={waypointShared}>
              Set Waypoint
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

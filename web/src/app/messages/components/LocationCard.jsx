import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CUSTOM_CRS, toLatLng, tileUrl } from '../../maps/crs';
import { useT } from '../../../i18n/useT';

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

export default function LocationCard({ msg, out, onOpen, onStopLive }) {
    const t = useT();
    const meta = msg.meta || {};
    const { x = 0, y = 0, label, live, sid, endReason } = meta;
    const isLive = !!sid;
    const ended = isLive && !live;

    const elRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);

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

    useEffect(() => {
        const m = mapRef.current;
        if (!m || !markerRef.current) return;
        const ll = toLatLng(x, y);
        markerRef.current.setLatLng(ll);
        m.setView(ll, m.getZoom(), { animate: true });
    }, [x, y]);

    const title = isLive ? t('messages.liveLocation') : t('messages.location');
    let sub;
    if (ended)
        sub =
            endReason === 'stopped'
                ? out
                    ? t('messages.locYouStopped')
                    : t('messages.locStopped')
                : t('messages.locEnded');
    else if (isLive) sub = out ? t('messages.locSharingYour') : t('messages.locSharingLive');
    else sub = label || t('messages.locCurrent');

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
                    {isLive && (
                        <span className="msg-loc__label">{label || t('messages.locCurrent')}</span>
                    )}
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
                        {t('messages.locStop')}
                    </button>
                )}
            </div>
        </div>
    );
}
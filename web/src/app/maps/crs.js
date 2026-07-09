import L from 'leaflet';

export const MAP = {
    centerX: 117.3,
    centerY: 172.8,
    scaleX: 0.02072,
    scaleY: 0.0205,
    minZoom: 0,
    maxZoom: 5,
};

export const CUSTOM_CRS = L.Util.extend({}, L.CRS.Simple, {
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

export const toLatLng = (x, y) => [y, x];

export const MAP_BOUNDS = L.latLngBounds(
    [(MAP.centerY - 256) / MAP.scaleY, (0 - MAP.centerX) / MAP.scaleX],
    [MAP.centerY / MAP.scaleY, (256 - MAP.centerX) / MAP.scaleX],
);

export const tileUrl = './mapStyles/styleAtlas/{z}/{x}/{y}.jpg';
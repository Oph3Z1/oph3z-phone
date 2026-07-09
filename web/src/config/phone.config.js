const wallpaperFiles = import.meta.glob('../assets/wallpapers/*.{png,jpg,jpeg,webp}', {
    eager: true,
    import: 'default',
});

const prettyName = (base) =>
    base
        .replace(/[-_]+/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());

export const WALLPAPER_PRESETS = Object.entries(wallpaperFiles)
    .map(([path, src]) => {
        const key = path
            .split('/')
            .pop()
            .replace(/\.[^.]+$/, '');
        return { key, name: prettyName(key), src };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

export const WALLPAPERS = WALLPAPER_PRESETS.reduce((map, w) => {
    map[w.key] = w.src;
    return map;
}, {});

const DEFAULT_KEY = WALLPAPERS.blackTitanium
    ? 'blackTitanium'
    : (WALLPAPER_PRESETS[0] && WALLPAPER_PRESETS[0].key) || '';
WALLPAPERS.default = WALLPAPERS[DEFAULT_KEY];

export const isWallpaperUrl = (v) => typeof v === 'string' && /^(https?:|data:|blob:)/i.test(v);

export function getWallpaper(key) {
    if (isWallpaperUrl(key)) return key;
    return (
        WALLPAPERS[key] ||
        WALLPAPERS[DEFAULT_KEY] ||
        (WALLPAPER_PRESETS[0] && WALLPAPER_PRESETS[0].src)
    );
}

export const DESIGN_WIDTH = 390;
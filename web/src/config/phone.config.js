// Wallpapers auto-register from the assets folder. Drop any image into
//   web/src/assets/wallpapers/   (.png .jpg .jpeg .webp)
// then rebuild (`npm run build`) — it becomes a selectable option in
// Settings > Wallpaper automatically. No code changes needed.
//
// The filename (without extension) is the saved key; a display name is derived
// from it (camelCase / kebab / snake_case -> "Title Case"), e.g.
//   blackTitanium.png -> key "blackTitanium", name "Black Titanium"
//   desert_sunset.jpg -> key "desert_sunset", name "Desert Sunset"
const wallpaperFiles = import.meta.glob('../assets/wallpapers/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
});

const prettyName = (base) =>
  base
    .replace(/[-_]+/g, ' ') // kebab/snake -> spaces
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase -> spaced
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case

// Built-in wallpaper presets (Settings > Wallpaper), sorted by display name.
export const WALLPAPER_PRESETS = Object.entries(wallpaperFiles)
  .map(([path, src]) => {
    const key = path.split('/').pop().replace(/\.[^.]+$/, '');
    return { key, name: prettyName(key), src };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// Wallpaper registry — keys match settings.wallpaper from the JSON DB.
export const WALLPAPERS = WALLPAPER_PRESETS.reduce((map, w) => {
  map[w.key] = w.src;
  return map;
}, {});

// Preferred default (Config.DefaultSettings.wallpaper), else the first available.
const DEFAULT_KEY = WALLPAPERS.blackTitanium
  ? 'blackTitanium'
  : (WALLPAPER_PRESETS[0] && WALLPAPER_PRESETS[0].key) || '';
// Alias: players saved with the old 'default' fall back to the default preset.
WALLPAPERS.default = WALLPAPERS[DEFAULT_KEY];

// A custom wallpaper is stored as a raw URL; presets are stored as a key.
export const isWallpaperUrl = (v) => typeof v === 'string' && /^(https?:|data:|blob:)/i.test(v);

export function getWallpaper(key) {
  if (isWallpaperUrl(key)) return key; // custom URL — use as-is
  return WALLPAPERS[key] || WALLPAPERS[DEFAULT_KEY] || (WALLPAPER_PRESETS[0] && WALLPAPER_PRESETS[0].src);
}

// The phone screen is laid out against this reference width (CSS px).
// A ResizeObserver scales everything proportionally from here, so all in-UI
// sizes are written in `em` relative to a font-size derived from this value.
export const DESIGN_WIDTH = 390;

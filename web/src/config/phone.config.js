import wallpaperDefault from '../assets/wallpapers/wallpaper.png';

// Wallpaper registry — keys match settings.wallpaper from the JSON DB.
export const WALLPAPERS = {
  default: wallpaperDefault,
};

export function getWallpaper(key) {
  return WALLPAPERS[key] || WALLPAPERS.default;
}

// The phone screen is laid out against this reference width (CSS px).
// A ResizeObserver scales everything proportionally from here, so all in-UI
// sizes are written in `em` relative to a font-size derived from this value.
export const DESIGN_WIDTH = 390;

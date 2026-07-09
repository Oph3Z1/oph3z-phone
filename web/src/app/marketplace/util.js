export const CATEGORIES = ['ads', 'cars', 'items', 'houses', 'other'];

export const FILTERS = ['all', ...CATEGORIES];

export const CATEGORY_ICON = {
    all: '🛍️',
    ads: '📢',
    cars: '🚗',
    items: '📦',
    houses: '🏠',
    other: '✨',
};

export function fmtPrice(n, t) {
    const v = Number(n);
    if (!v || v <= 0) return t ? t('market.free') : 'Free';
    return '$' + Math.floor(v).toLocaleString('en-US');
}

export function timeAgo(ts) {
    const diff = Math.max(0, Math.floor(Date.now() / 1000) - (ts || 0));
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}w`;
}
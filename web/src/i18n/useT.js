import { useCallback } from 'react';
import { useSelector } from 'react-redux';

function resolvePath(obj, key) {
    if (!obj) return undefined;
    return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

export function translateFrom(state, key, vars) {
    const lang = (state.settings && state.settings.language) || 'en';
    const translations = (state.i18n && state.i18n.translations) || {};
    let str = resolvePath(translations[lang], key);
    if (str == null) str = resolvePath(translations.en, key);
    if (str == null) return key;
    if (vars) str = String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return str;
}

export function useT() {
    const lang = useSelector((s) => s.settings.language) || 'en';
    const translations = useSelector((s) => s.i18n.translations);

    return useCallback(
        (key, vars) => {
            let str = resolvePath(translations[lang], key);
            if (str == null) str = resolvePath(translations.en, key);
            if (str == null) return key;
            if (vars) {
                str = String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
            }
            return str;
        },
        [translations, lang],
    );
}
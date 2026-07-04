import { useCallback } from 'react';
import { useSelector } from 'react-redux';

// Resolve a dotted key path ("settings.title") within a nested object.
function resolvePath(obj, key) {
  if (!obj) return undefined;
  return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

// Non-hook translator for use in thunks/selectors (where `useT` can't run). Pass
// the Redux state; resolves the same way as the hook (language -> English -> key).
export function translateFrom(state, key, vars) {
  const lang = (state.settings && state.settings.language) || 'en';
  const translations = (state.i18n && state.i18n.translations) || {};
  let str = resolvePath(translations[lang], key);
  if (str == null) str = resolvePath(translations.en, key);
  if (str == null) return key;
  if (vars) str = String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return str;
}

// Translation hook. Returns a `t(key, vars?)` function:
//   t('settings.title')                         -> "Settings"
//   t('ringtones.deleteMsg', { name: 'Apex' })  -> "Remove “Apex” from your ringtones?"
// Missing keys fall back to English, then to the raw key. `{var}` placeholders in
// the string are replaced from `vars`.
export function useT() {
  const lang = useSelector((s) => s.settings.language) || 'en';
  const translations = useSelector((s) => s.i18n.translations);

  return useCallback(
    (key, vars) => {
      let str = resolvePath(translations[lang], key);
      if (str == null) str = resolvePath(translations.en, key); // fall back to English
      if (str == null) return key; // last resort: show the key
      if (vars) {
        str = String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
      }
      return str;
    },
    [translations, lang]
  );
}

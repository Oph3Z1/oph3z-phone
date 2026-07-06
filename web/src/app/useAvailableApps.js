import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { APPS } from './registry';

// The full set of apps that currently exist (built-in from Config.Apps + any
// registered third-party apps), in a stable order. Each entry:
//   { id, label, icon, external, deletable, place, url?, store?, ...storeMeta }
export function useAvailableApps() {
  const layout = useSelector((s) => s.apps.layout);
  const external = useSelector((s) => s.apps.external);

  return useMemo(() => {
    const list = [];
    for (const e of layout) {
      if (e.enabled === false) continue;
      const def = APPS[e.id];
      // A built-in app flagged `store` is store-gated: not auto-placed on the
      // home screen and uninstallable, just like a third-party app — but it
      // still renders via the built-in registry (not an iframe).
      const store = e.store === true;
      list.push({
        id: e.id,
        label: e.label || (def && def.name) || e.id,
        icon: def && def.icon,
        external: false,
        store,
        deletable: store, // default apps can't be uninstalled; store apps can
        place: e.place || 'grid',
        // App Store page metadata (only meaningful for store-gated built-ins).
        // Developer is hard-coded: every built-in store app is by Oph3Z.
        developer: store ? 'Oph3Z' : undefined,
        description: e.description,
        headerImage: e.headerImage,
        swiperItems: e.swiperItems,
      });
    }
    for (const a of external) {
      list.push({
        id: a.id,
        label: a.label || a.id,
        icon: a.icon,
        external: true,
        deletable: a.deletable !== false,
        place: a.place || 'grid',
        url: a.url,
      });
    }
    const map = {};
    for (const a of list) map[a.id] = a;
    return { list, map };
  }, [layout, external]);
}

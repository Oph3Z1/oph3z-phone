import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { APPS } from './registry';

export function useAvailableApps() {
    const layout = useSelector((s) => s.apps.layout);
    const external = useSelector((s) => s.apps.external);

    return useMemo(() => {
        const list = [];
        for (const e of layout) {
            if (e.enabled === false) continue;
            const def = APPS[e.id];
            const store = e.store === true;
            list.push({
                id: e.id,
                label: e.label || (def && def.name) || e.id,
                icon: def && def.icon,
                external: false,
                store,
                deletable: store,
                place: e.place || 'grid',
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
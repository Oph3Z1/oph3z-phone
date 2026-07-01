import './HomeScreen.css';
import { useSelector } from 'react-redux';
import AppIcon from '../../components/AppIcon/AppIcon';
import { APPS } from '../../app/registry';

// Merge a built-in layout entry (id/label/place from Config.Apps) with its bundled
// icon from the registry.
function mergeBuiltIn(entry) {
  const def = APPS[entry.id];
  return { id: entry.id, label: entry.label || (def && def.name) || entry.id, icon: def && def.icon, external: false };
}
// A third-party app registered at runtime carries its own icon + iframe url.
function mergeExternal(a) {
  return { id: a.id, label: a.label || a.id, icon: a.icon, external: true };
}

export default function HomeScreen() {
  const layout = useSelector((s) => s.apps.layout);
  const external = useSelector((s) => s.apps.external);

  const builtIn = layout.filter((a) => a.enabled !== false);
  const dock = [
    ...builtIn.filter((a) => a.place === 'dock').map(mergeBuiltIn),
    ...external.filter((a) => a.place === 'dock').map(mergeExternal),
  ];
  const grid = [
    ...builtIn.filter((a) => a.place === 'grid' || a.place == null).map(mergeBuiltIn),
    ...external.filter((a) => a.place !== 'dock' && a.place !== 'hidden').map(mergeExternal),
  ];

  return (
    <div className="homescreen">
      {/* App grid */}
      <div className="homescreen__grid">
        {grid.map((app) => (
          <AppIcon key={app.id} app={app} />
        ))}
      </div>

      {/* Bottom dock */}
      <div className="homescreen__dock">
        {dock.map((app) => (
          <AppIcon key={app.id} app={app} showLabel={false} />
        ))}
      </div>
    </div>
  );
}

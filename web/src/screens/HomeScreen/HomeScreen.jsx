import './HomeScreen.css';
import AppIcon from '../../components/AppIcon/AppIcon';
import { HOME_GRID, DOCK } from '../../app/registry';

export default function HomeScreen() {
  return (
    <div className="homescreen">
      {/* App grid */}
      <div className="homescreen__grid">
        {HOME_GRID.map((id) => (
          <AppIcon key={id} appId={id} />
        ))}
      </div>

      {/* Bottom dock */}
      <div className="homescreen__dock">
        {DOCK.map((id) => (
          <AppIcon key={id} appId={id} showLabel={false} />
        ))}
      </div>
    </div>
  );
}

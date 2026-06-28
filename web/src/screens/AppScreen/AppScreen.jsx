import './AppScreen.css';
import { getApp } from '../../app/registry';

/**
 * Renders an open app.
 * Phase 1: every app uses the placeholder below.
 * Phase 2: if the app defines a `component`, that renders instead.
 *
 * @param {{ appId: string }} props
 */
export default function AppScreen({ appId }) {
  const app = getApp(appId);
  if (!app) return null;

  if (app.component) {
    const AppComponent = app.component;
    return <AppComponent />;
  }

  return (
    <div className="appscreen">
      <div className="appscreen__placeholder">
        <span className="appscreen__icon">
          <img src={app.icon} alt="" />
        </span>
        <div className="appscreen__name">{app.name}</div>
        <div className="appscreen__soon">Coming soon</div>
        <div className="appscreen__hint">Tap the bar below to go home</div>
      </div>
    </div>
  );
}

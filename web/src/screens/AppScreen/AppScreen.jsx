import { useSelector } from 'react-redux';
import './AppScreen.css';
import { getApp } from '../../app/registry';
import { selectExternalApp } from '../../store/slices/appsSlice';
import ExternalApp from '../../app/external/ExternalApp';

/**
 * Renders an open app:
 *  - a registered third-party app  -> its iframe (ExternalApp)
 *  - a built-in app with a screen  -> that component
 *  - a built-in app without one    -> the "coming soon" placeholder
 *
 * @param {{ appId: string }} props
 */
export default function AppScreen({ appId }) {
  const external = useSelector(selectExternalApp(appId));
  if (external) return <ExternalApp app={external} />;

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

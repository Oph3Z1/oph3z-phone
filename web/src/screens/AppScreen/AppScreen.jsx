import { useSelector } from 'react-redux';
import './AppScreen.css';
import { getApp } from '../../app/registry';
import { selectExternalApp } from '../../store/slices/appsSlice';
import ExternalApp from '../../app/external/ExternalApp';
import { useT } from '../../i18n/useT';

export default function AppScreen({ appId }) {
    const t = useT();
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
                <div className="appscreen__soon">{t('common.comingSoonShort')}</div>
                <div className="appscreen__hint">{t('common.goHomeHint')}</div>
            </div>
        </div>
    );
}
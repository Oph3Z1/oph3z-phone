import { useDispatch, useSelector } from 'react-redux';
import { openApp } from '../../../store/slices/phoneSlice';
import { setDeliver } from '../../../store/slices/airdropSlice';
import { pushToast } from '../../../store/slices/toastSlice';
import { appIsInstalled } from '../../../store/slices/homeSlice';
import { getApp } from '../../registry';
import { useT } from '../../../i18n/useT';

export default function AppShareCard({ msg }) {
    const dispatch = useDispatch();
    const t = useT();
    const meta = msg.meta || {};
    const externalApp = useSelector((s) => s.apps.external.find((x) => x.id === meta.appId));
    const installed = useSelector((s) => appIsInstalled(s, meta.appId));
    const builtin = getApp(meta.appId);
    const appIcon = (externalApp && externalApp.icon) || (builtin ? builtin.icon : null);

    const open = () => {
        if (!meta.appId) return;
        if (!installed) {
            const appName =
                (builtin && builtin.name) || (externalApp && externalApp.name) || meta.appId;
            dispatch(
                pushToast({ body: t('airdrop.cantOpenApp', { app: appName }), app: meta.appId }),
            );
            return;
        }
        if (meta.data !== undefined)
            dispatch(setDeliver({ appId: meta.appId, payload: meta.data }));
        dispatch(openApp(meta.appId));
    };

    return (
        <button className="msg-appshare" onClick={open}>
            {meta.image ? (
                <span className="msg-appshare__img">
                    <img src={meta.image} alt="" />
                </span>
            ) : (
                appIcon && (
                    <span className="msg-appshare__img msg-appshare__img--icon">
                        <img src={appIcon} alt="" />
                    </span>
                )
            )}
            <div className="msg-appshare__info">
                <div className="msg-appshare__title">{meta.title}</div>
                {meta.subtitle && <div className="msg-appshare__sub">{meta.subtitle}</div>}
            </div>
            {appIcon && (
                <span className="msg-appshare__badge">
                    <img src={appIcon} alt="" />
                </span>
            )}
        </button>
    );
}

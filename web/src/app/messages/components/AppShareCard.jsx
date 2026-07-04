import { useDispatch, useSelector } from 'react-redux';
import { openApp } from '../../../store/slices/phoneSlice';
import { setDeliver } from '../../../store/slices/airdropSlice';

// A shared item from a third-party app (sent via the Messages Share sheet). Shows
// the app icon + optional image + title/subtitle. Tapping opens the app and hands
// it the payload (delivered as oph3z:airdrop:received).
export default function AppShareCard({ msg }) {
  const dispatch = useDispatch();
  const meta = msg.meta || {};
  const appIcon = useSelector((s) => {
    const a = s.apps.external.find((x) => x.id === meta.appId);
    return a ? a.icon : null;
  });

  const open = () => {
    if (!meta.appId) return;
    if (meta.data !== undefined) dispatch(setDeliver({ appId: meta.appId, payload: meta.data }));
    dispatch(openApp(meta.appId));
  };

  return (
    <button className="msg-appshare" onClick={open}>
      {meta.image ? (
        <span className="msg-appshare__img"><img src={meta.image} alt="" /></span>
      ) : (
        appIcon && <span className="msg-appshare__img msg-appshare__img--icon"><img src={appIcon} alt="" /></span>
      )}
      <div className="msg-appshare__info">
        <div className="msg-appshare__title">{meta.title}</div>
        {meta.subtitle && <div className="msg-appshare__sub">{meta.subtitle}</div>}
      </div>
      {appIcon && <span className="msg-appshare__badge"><img src={appIcon} alt="" /></span>}
    </button>
  );
}

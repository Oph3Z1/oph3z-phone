import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './AppStoreApp.css';
import { openApp } from '../../store/slices/phoneSlice';
import { startDownload, cancelDownload, folderFlat } from '../../store/slices/homeSlice';
import { ChevronLeftIcon } from '../messages/components/icons';

// Set of app ids currently on the home screen (dock + pages + folders).
function useInstalledSet() {
  const dock = useSelector((s) => s.home.dock);
  const pages = useSelector((s) => s.home.pages);
  const folders = useSelector((s) => s.home.folders);
  return useMemo(() => {
    const set = new Set(dock);
    pages.forEach((p) => p.forEach((id) => set.add(id)));
    Object.values(folders).forEach((f) => folderFlat(f).forEach((id) => set.add(id)));
    return set;
  }, [dock, pages, folders]);
}

function AppIconImg({ app, className }) {
  return (
    <span className={`astore-icon ${className || ''}`}>
      {app.icon ? <img src={app.icon} alt="" /> : <span className="astore-icon__fallback">{(app.label || '?').charAt(0)}</span>}
    </span>
  );
}

// Circular progress used by the Get button while installing.
function Ring({ progress }) {
  const R = 13;
  const C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 32 32" className="astore-ring">
      <circle cx="16" cy="16" r={R} className="astore-ring__track" />
      <circle cx="16" cy="16" r={R} className="astore-ring__bar" style={{ strokeDasharray: C, strokeDashoffset: C * (1 - progress) }} />
      <rect x="12.5" y="12.5" width="7" height="7" rx="1.4" className="astore-ring__stop" />
    </svg>
  );
}

// Get / Open / (downloading) button.
function ActionButton({ app, installed }) {
  const dispatch = useDispatch();
  const dl = useSelector((s) => s.home.downloads[app.id]);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  if (dl != null) {
    return (
      <button className="astore-getbtn astore-getbtn--ring" onClick={stop(() => dispatch(cancelDownload(app.id)))} aria-label="Cancel">
        <Ring progress={dl} />
      </button>
    );
  }
  if (installed) {
    return <button className="astore-getbtn" onClick={stop(() => dispatch(openApp(app.id)))}>Open</button>;
  }
  return <button className="astore-getbtn" onClick={stop(() => dispatch(startDownload(app.id)))}>Get</button>;
}

function StoreList({ apps, installed, onOpen }) {
  return (
    <div className="astore">
      <div className="astore__topbar" />
      <div className="astore__scroll">
        <h1 className="astore__title">Apps</h1>
        {apps.length === 0 && <div className="astore__empty">No apps available.</div>}
        {apps.map((a) => (
          <div key={a.id} className="astore-row" role="button" onClick={() => onOpen(a.id)}>
            <AppIconImg app={a} />
            <div className="astore-row__text">
              <div className="astore-row__name">{a.label}</div>
              <div className="astore-row__desc">{a.description || a.developer || ''}</div>
            </div>
            <ActionButton app={a} installed={installed.has(a.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StoreDetail({ app, installed, onBack }) {
  const shots = Array.isArray(app.swiperItems) ? app.swiperItems : [];
  return (
    <div className="astore astore--detail">
      <div className="astore-detail__header" style={app.headerImage ? { backgroundImage: `url(${app.headerImage})` } : undefined}>
        <button className="astore-detail__back" onClick={onBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        {!app.headerImage && <span className="astore-detail__headertext">{app.label}</span>}
      </div>

      <div className="astore__scroll">
        <div className="astore-detail__head">
          <AppIconImg app={app} className="astore-icon--lg" />
          <div className="astore-detail__meta">
            <div className="astore-detail__name">{app.label}</div>
            <div className="astore-detail__dev">Developed by {app.developer || 'Unknown'}</div>
            <div className="astore-detail__action">
              <ActionButton app={app} installed={installed} />
            </div>
          </div>
        </div>

        <div className="astore-detail__section">Preview</div>
        {shots.length > 0 ? (
          <div className="astore-detail__shots">
            {shots.map((src, i) => (
              <div className="astore-detail__shot" key={i}>
                <img src={src} alt="" />
              </div>
            ))}
          </div>
        ) : (
          <div className="astore-detail__noshots">No preview images available</div>
        )}

        {app.description && <div className="astore-detail__about">{app.description}</div>}
      </div>
    </div>
  );
}

export default function AppStoreApp() {
  const apps = useSelector((s) => s.apps.external);
  const installed = useInstalledSet();
  const [detail, setDetail] = useState(null);

  const current = detail ? apps.find((a) => a.id === detail) : null;
  if (current) {
    return <StoreDetail app={current} installed={installed.has(current.id)} onBack={() => setDetail(null)} />;
  }
  return <StoreList apps={apps} installed={installed} onOpen={setDetail} />;
}

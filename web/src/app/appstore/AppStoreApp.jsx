import { useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './AppStoreApp.css';
import { openApp } from '../../store/slices/phoneSlice';
import { startDownload, cancelDownload, folderFlat } from '../../store/slices/homeSlice';
import { ChevronLeftIcon } from '../messages/components/icons';
import { SearchIcon } from '../phone/components/icons';
import { useT } from '../../i18n/useT';
import { useAvailableApps } from '../useAvailableApps';

function useStoreCatalog() {
    const { list } = useAvailableApps();
    return useMemo(() => list.filter((a) => a.external || a.store), [list]);
}

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
            {app.icon ? (
                <img src={app.icon} alt="" />
            ) : (
                <span className="astore-icon__fallback">{(app.label || '?').charAt(0)}</span>
            )}
        </span>
    );
}

function Ring({ progress }) {
    const R = 13;
    const C = 2 * Math.PI * R;
    return (
        <svg viewBox="0 0 32 32" className="astore-ring">
            <circle cx="16" cy="16" r={R} className="astore-ring__track" />
            <circle
                cx="16"
                cy="16"
                r={R}
                className="astore-ring__bar"
                style={{ strokeDasharray: C, strokeDashoffset: C * (1 - progress) }}
            />
            <rect x="12.5" y="12.5" width="7" height="7" rx="1.4" className="astore-ring__stop" />
        </svg>
    );
}

function ActionButton({ app, installed }) {
    const dispatch = useDispatch();
    const t = useT();
    const dl = useSelector((s) => s.home.downloads[app.id]);
    const stop = (fn) => (e) => {
        e.stopPropagation();
        fn();
    };
    if (dl != null) {
        return (
            <button
                className="astore-getbtn astore-getbtn--ring"
                onClick={stop(() => dispatch(cancelDownload(app.id)))}
                aria-label="Cancel"
            >
                <Ring progress={dl} />
            </button>
        );
    }
    if (installed) {
        return (
            <button className="astore-getbtn" onClick={stop(() => dispatch(openApp(app.id)))}>
                {t('appstore.open')}
            </button>
        );
    }
    return (
        <button className="astore-getbtn" onClick={stop(() => dispatch(startDownload(app.id)))}>
            {t('appstore.get')}
        </button>
    );
}

function StoreList({ apps, installed, onOpen }) {
    const t = useT();
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const filtered = useMemo(() => {
        if (!q) return apps;
        return apps.filter((a) =>
            `${a.label || ''} ${a.developer || ''} ${a.description || ''}`
                .toLowerCase()
                .includes(q),
        );
    }, [apps, q]);
    return (
        <div className="astore">
            <div className="astore__topbar" />
            <div className="astore__scroll">
                <h1 className="astore__title">{t('appstore.title')}</h1>
                <div className="astore-search">
                    <SearchIcon className="astore-search__icon" />
                    <input
                        className="astore-search__input"
                        type="text"
                        placeholder={t('appstore.search')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button
                            className="astore-search__clear"
                            onClick={() => setQuery('')}
                            aria-label="Clear"
                        >
                            ×
                        </button>
                    )}
                </div>
                {apps.length === 0 && <div className="astore__empty">{t('appstore.noApps')}</div>}
                {apps.length > 0 && filtered.length === 0 && (
                    <div className="astore__empty">
                        {t('appstore.noResults', { query: query.trim() })}
                    </div>
                )}
                {filtered.map((a, i) => (
                    <div
                        key={a.id}
                        className="astore-row astore-row--in"
                        style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}
                        role="button"
                        onClick={() => onOpen(a.id)}
                    >
                        <AppIconImg app={a} />
                        <div className="astore-row__text">
                            <div className="astore-row__name">{a.label}</div>
                            <div className="astore-row__desc">
                                {a.description || a.developer || ''}
                            </div>
                        </div>
                        <ActionButton app={a} installed={installed.has(a.id)} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function StoreDetail({ app, installed, onBack }) {
    const t = useT();
    const shots = Array.isArray(app.swiperItems) ? app.swiperItems : [];
    return (
        <div className="astore astore--detail">
            <div
                className="astore-detail__header"
                style={app.headerImage ? { backgroundImage: `url(${app.headerImage})` } : undefined}
            >
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
                        <div className="astore-detail__dev">
                            {t('appstore.developedBy', {
                                dev: app.developer || t('appstore.unknown'),
                            })}
                        </div>
                        <div className="astore-detail__action">
                            <ActionButton app={app} installed={installed} />
                        </div>
                    </div>
                </div>

                <div className="astore-detail__section">{t('appstore.preview')}</div>
                {shots.length > 0 ? (
                    <div className="astore-detail__shots">
                        {shots.map((src, i) => (
                            <div className="astore-detail__shot" key={i}>
                                <img src={src} alt="" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="astore-detail__noshots">{t('appstore.noPreview')}</div>
                )}

                {app.description && <div className="astore-detail__about">{app.description}</div>}
            </div>
        </div>
    );
}

export default function AppStoreApp() {
    const apps = useStoreCatalog();
    const installed = useInstalledSet();

    const [layers, setLayers] = useState([{ id: 0, v: null }]);
    const nextId = useRef(1);
    const go = (v) => {
        setLayers((cur) => {
            const base = cur[cur.length - 1];
            if (base.v === v) return cur;
            return [
                { id: base.id, v: base.v },
                { id: nextId.current++, v, entering: true },
            ];
        });
    };
    const pruneLayers = () => setLayers((cur) => (cur.length > 1 ? cur.slice(-1) : cur));

    const renderView = (v) => {
        const current = v ? apps.find((a) => a.id === v) : null;
        if (current) {
            return (
                <StoreDetail
                    app={current}
                    installed={installed.has(current.id)}
                    onBack={() => go(null)}
                />
            );
        }
        return <StoreList apps={apps} installed={installed} onOpen={(id) => go(id)} />;
    };

    return (
        <div className="astore-stack">
            {layers.map((l) => (
                <div
                    key={l.id}
                    className={`astore-layer${l.entering ? ' astore-layer--in' : ''}`}
                    onAnimationEnd={l.entering ? pruneLayers : undefined}
                >
                    {renderView(l.v)}
                </div>
            ))}
        </div>
    );
}

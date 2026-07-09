import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './HomeScreen.css';
import { openApp } from '../../store/slices/phoneSlice';
import { useAvailableApps } from '../../app/useAvailableApps';
import {
    DOCK_MAX,
    reconcile,
    saveHome,
    setEditing,
    setPage,
    swapItems,
    moveItem,
    createFolder,
    addToFolder,
    setOpenFolder,
    removeApp,
    addPage,
    endDrag,
    folderFlat,
} from '../../store/slices/homeSlice';
import { openDialog } from '../../store/slices/dialogSlice';
import FolderView from './FolderView';

const COLS = 4;
const ROWS = 6;
const MOVE_THRESHOLD = 8;
const LONGPRESS_MS = 420;
const EDGE_MS = 550;
const FOLDER_DWELL = 1000;

const countFor = (items, id) => items.reduce((a, n) => a + (!n.read && n.app === id ? 1 : 0), 0);

function Badge({ count }) {
    if (!count) return null;
    return <span className="hs-badge">{count > 99 ? '99+' : count}</span>;
}

function DownloadRing({ progress }) {
    const R = 15;
    const C = 2 * Math.PI * R;
    return (
        <svg viewBox="0 0 36 36" className="hs-dlring">
            <circle cx="18" cy="18" r={R} className="hs-dlring__track" />
            <circle
                cx="18"
                cy="18"
                r={R}
                className="hs-dlring__bar"
                style={{ strokeDasharray: C, strokeDashoffset: C * (1 - progress) }}
            />
            <rect x="14.5" y="14.5" width="7" height="7" rx="1.4" className="hs-dlring__stop" />
        </svg>
    );
}

function AppTile({ app, onDelete }) {
    const count = useSelector((s) => (app ? countFor(s.notifications.items, app.id) : 0));
    const dl = useSelector((s) => (app ? s.home.downloads[app.id] : undefined));
    const downloading = dl != null;
    return (
        <>
            <span className="hs-tile__iconwrap">
                <span className={`hs-tile__img${downloading ? ' is-downloading' : ''}`}>
                    {app && app.icon ? (
                        <img src={app.icon} alt="" draggable={false} />
                    ) : (
                        <span className="hs-tile__fallback">
                            {((app && app.label) || '?').charAt(0).toUpperCase()}
                        </span>
                    )}
                    {downloading && <DownloadRing progress={dl} />}
                </span>
                {onDelete && (
                    <button
                        className="hs-tile__del"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={onDelete}
                        aria-label="Delete app"
                    >
                        −
                    </button>
                )}
                {!downloading && <Badge count={count} />}
            </span>
            <span className="hs-tile__label">{app ? app.label : ''}</span>
        </>
    );
}

function FolderTile({ folder, appMap }) {
    const flat = folderFlat(folder);
    const count = useSelector((s) =>
        flat.reduce((a, id) => a + countFor(s.notifications.items, id), 0),
    );
    return (
        <>
            <span className="hs-tile__iconwrap">
                <span className="hs-tile__img hs-folder">
                    <span className="hs-folder__grid">
                        {flat.slice(0, 9).map((id) => {
                            const a = appMap[id];
                            return (
                                <span key={id} className="hs-folder__mini">
                                    {a && a.icon ? (
                                        <img src={a.icon} alt="" draggable={false} />
                                    ) : null}
                                </span>
                            );
                        })}
                    </span>
                </span>
                <Badge count={count} />
            </span>
            <span className="hs-tile__label">{folder.name}</span>
        </>
    );
}

export default function HomeScreen() {
    const dispatch = useDispatch();
    const { list, map } = useAvailableApps();
    const home = useSelector((s) => s.home);
    const { dock, pages, folders, editing, page, openFolder } = home;

    const rootRef = useRef(null);
    const pagerRef = useRef(null);
    const dockRef = useRef(null);

    const idsKey = list.map((a) => a.id).join(',');
    useEffect(() => {
        dispatch(reconcile({ apps: list }));
        dispatch(saveHome());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsKey]);

    const [drag, setDrag] = useState(null);
    const [clone, setClone] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const [folderTarget, setFolderTarget] = useState(null);
    const [swapTarget, setSwapTarget] = useState(null);
    const [swipeDx, setSwipeDx] = useState(0);

    const press = useRef(null);
    const geom = useRef({});
    const lp = useRef(null);
    const edge = useRef(null);
    const hover = useRef(null);
    const foldTimer = useRef(null);
    const dragRef = useRef(null);
    dragRef.current = drag;

    const captureGeom = () => {
        geom.current.pager = pagerRef.current ? pagerRef.current.getBoundingClientRect() : null;
        geom.current.dock = dockRef.current ? dockRef.current.getBoundingClientRect() : null;
        geom.current.home = rootRef.current ? rootRef.current.getBoundingClientRect() : null;
    };

    const cloneXY = (cx, cy) => {
        const h = geom.current.home;
        return { x: cx - (h ? h.left : 0), y: cy - (h ? h.top : 0) };
    };

    const beginDrag = (itemId, isFolder, cx, cy) => {
        const g = geom.current.pager;
        const w = g ? g.width / COLS : 60;
        const h = g ? g.height / ROWS : 76;
        hover.current = null;
        const { x, y } = cloneXY(cx, cy);
        setDrag({ itemId, isFolder });
        setClone({ x, y, w, h });
    };

    const clearPress = () => {
        clearTimeout(lp.current);
        clearTimeout(foldTimer.current);
        lp.current = null;
        press.current = null;
        edge.current = null;
        hover.current = null;
    };

    const onPointerDown = (e) => {
        if (openFolder) return;
        const tileEl = e.target.closest('[data-item]');
        captureGeom();
        press.current = {
            x0: e.clientX,
            y0: e.clientY,
            moved: false,
            mode: null,
            itemId: tileEl ? tileEl.getAttribute('data-item') : null,
            isFolder: tileEl ? tileEl.getAttribute('data-folder') === '1' : false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        if (tileEl && !editing) {
            lp.current = setTimeout(() => {
                if (!press.current) return;
                dispatch(setEditing(true));
                press.current.mode = 'armed';
            }, LONGPRESS_MS);
        }
    };

    const hitTest = (x, y) => {
        const el = document.elementFromPoint(x, y);
        const tile = el && el.closest('[data-item]');
        return tile ? tile.getAttribute('data-item') : undefined;
    };

    const onPointerMove = (e) => {
        const d = dragRef.current;
        if (d) {
            const cp = cloneXY(e.clientX, e.clientY);
            setClone((c) => ({ ...c, x: cp.x, y: cp.y }));
            const p = geom.current.pager;
            if (p) {
                let dir = 0;
                if (e.clientX < p.left + p.width * 0.08) dir = -1;
                else if (e.clientX > p.right - p.width * 0.08) dir = 1;
                if (dir) {
                    if (!edge.current || edge.current.dir !== dir)
                        edge.current = { dir, t: Date.now() };
                    else if (Date.now() - edge.current.t > EDGE_MS) {
                        const np = page + dir;
                        if (np >= 0 && np < pages.length) dispatch(setPage(np));
                        else if (
                            dir === 1 &&
                            np === pages.length &&
                            (pages[page] || []).length > 0
                        ) {
                            dispatch(addPage());
                            dispatch(setPage(np));
                        }
                        hover.current = null;
                        clearTimeout(foldTimer.current);
                        edge.current = { dir, t: Date.now() };
                    }
                } else edge.current = null;
            }

            const over = hitTest(e.clientX, e.clientY);
            if (!over || over === d.itemId) {
                hover.current = null;
                clearTimeout(foldTimer.current);
                if (swapTarget) setSwapTarget(null);
                if (folderTarget) setFolderTarget(null);
                return;
            }

            if (!hover.current || hover.current.over !== over) {
                hover.current = { over };
                clearTimeout(foldTimer.current);
                if (folderTarget) setFolderTarget(null);
                setSwapTarget(over);
                if (!d.isFolder) {
                    foldTimer.current = setTimeout(() => {
                        if (dragRef.current && hover.current && hover.current.over === over) {
                            setFolderTarget(over);
                            setSwapTarget(null);
                        }
                    }, FOLDER_DWELL);
                }
            }
            return;
        }

        const pr = press.current;
        if (!pr) return;
        const dx = e.clientX - pr.x0,
            dy = e.clientY - pr.y0;
        if (!pr.mode) {
            if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
                clearTimeout(lp.current);
                if (editing && pr.itemId) {
                    pr.mode = 'drag';
                    beginDrag(pr.itemId, pr.isFolder, e.clientX, e.clientY);
                } else if (Math.abs(dx) > Math.abs(dy)) {
                    pr.mode = 'swipe';
                } else {
                    pr.mode = 'ignore';
                }
            }
        } else if (pr.mode === 'armed') {
            if ((Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) && pr.itemId) {
                pr.mode = 'drag';
                beginDrag(pr.itemId, pr.isFolder, e.clientX, e.clientY);
            }
        }
        if (pr.mode === 'swipe') {
            let d2 = dx;
            const atStart = page === 0,
                atEnd = page === pages.length - 1;
            if ((d2 > 0 && atStart) || (d2 < 0 && atEnd)) d2 *= 0.28;
            setSwipeDx(d2);
        }
    };

    const onPointerUp = (e) => {
        const d = dragRef.current;
        if (d) {
            if (folderTarget && !d.isFolder) {
                if (folders[folderTarget])
                    dispatch(addToFolder({ appId: d.itemId, folderId: folderTarget }));
                else dispatch(createFolder({ targetId: folderTarget, dropId: d.itemId }));
            } else if (swapTarget && swapTarget !== d.itemId) {
                dispatch(swapItems({ a: d.itemId, b: swapTarget }));
            } else if (geom.current.dock && e.clientY >= geom.current.dock.top) {
                if (dock.length < DOCK_MAX && !dock.includes(d.itemId)) {
                    dispatch(moveItem({ itemId: d.itemId, toKey: 'dock', toIndex: dock.length }));
                }
            } else {
                const curArr = pages[page] || [];
                const originPage = pages.findIndex((pg) => pg.includes(d.itemId));
                if (curArr.length === 0) {
                    dispatch(moveItem({ itemId: d.itemId, toKey: `p:${page}`, toIndex: 0 }));
                } else if (originPage !== page && curArr.length < COLS * ROWS) {
                    dispatch(
                        moveItem({ itemId: d.itemId, toKey: `p:${page}`, toIndex: curArr.length }),
                    );
                }
            }
            clearTimeout(foldTimer.current);
            dispatch(endDrag());
            dispatch(saveHome());
            setDrag(null);
            setFolderTarget(null);
            setSwapTarget(null);
            clearPress();
            return;
        }
        const pr = press.current;
        if (pr && !pr.mode && pr.itemId) {
            if (pr.isFolder) dispatch(setOpenFolder(pr.itemId));
            else if (home.downloads[pr.itemId] != null) {
            } else if (!editing) dispatch(openApp(pr.itemId));
        } else if (pr && pr.mode === 'swipe') {
            const p = geom.current.pager;
            const w = p ? p.width : 300;
            let np = page;
            if (swipeDx < -w * 0.35 && page < pages.length - 1) np = page + 1;
            else if (swipeDx > w * 0.35 && page > 0) np = page - 1;
            dispatch(setPage(np));
        }
        setSwipeDx(0);
        clearPress();
    };

    const trackStyle = {
        transform: `translateX(calc(${-page * 100}% + ${swipeDx}px))`,
        transition: swipeDx ? 'none' : 'transform 0.45s cubic-bezier(0.32,0.72,0,1)',
        willChange: swipeDx ? 'transform' : 'auto',
    };

    const confirmDelete = async (id) => {
        const label = (map[id] && map[id].label) || 'this app';
        const ok = await dispatch(
            openDialog({
                title: `Delete “${label}”?`,
                message: `Deleting “${label}” removes it from your Home Screen. You can get it again from the App Store.`,
                buttons: [
                    { text: 'Cancel', style: 'cancel', value: false },
                    { text: 'Delete', style: 'destructive', value: true },
                ],
            }),
        );
        if (ok) dispatch(removeApp(id));
    };

    const renderTile = (itemId, container, index) => {
        const isFolder = !!folders[itemId];
        const app = map[itemId];
        if (!isFolder && !app) return null;
        const hidden = drag && drag.itemId === itemId;
        const isFolderTarget = folderTarget === itemId;
        const isSwapTarget = swapTarget === itemId && !isFolderTarget;
        const deletable = !isFolder && app && app.deletable;
        const style =
            container === 'dock'
                ? undefined
                : {
                      transform: `translate(${(index % COLS) * 100}%, ${Math.floor(index / COLS) * 100}%)`,
                  };
        return (
            <div
                key={itemId}
                className={`hs-tile${container === 'dock' ? ' hs-tile--dock' : ''}${editing ? ' is-editing' : ''}${
                    hidden ? ' is-dragging' : ''
                }${isFolderTarget ? ' is-foldertarget' : ''}${isSwapTarget ? ' is-swaptarget' : ''}`}
                style={style}
                data-item={itemId}
                data-folder={isFolder ? '1' : '0'}
            >
                <div className="hs-tile__inner">
                    {isFolder ? (
                        <FolderTile folder={folders[itemId]} appMap={map} />
                    ) : (
                        <AppTile
                            app={app}
                            onDelete={
                                editing && deletable ? () => confirmDelete(itemId) : undefined
                            }
                        />
                    )}
                </div>
            </div>
        );
    };

    const cloneItem = drag ? (folders[drag.itemId] ? null : map[drag.itemId]) : null;
    const cloneFolder = drag && folders[drag.itemId];

    return (
        <div
            ref={rootRef}
            className={`homescreen${editing ? ' is-editing' : ''}${drag ? ' is-grabbing' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
        >
            <div className="hs-pager" ref={pagerRef}>
                <div className="hs-track" style={trackStyle}>
                    {pages.map((pageArr, pi) => (
                        <div className="hs-page" key={pi}>
                            {pageArr.map((itemId, idx) => renderTile(itemId, `p:${pi}`, idx))}
                        </div>
                    ))}
                </div>
            </div>

            {pages.length > 1 && (
                <div className="hs-dots">
                    {pages.map((_, i) => (
                        <span
                            key={i}
                            className={`hs-dot${i === page ? ' is-on' : ''}`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => dispatch(setPage(i))}
                        />
                    ))}
                </div>
            )}

            <div className="hs-dock" ref={dockRef}>
                {dock.map((itemId, idx) => renderTile(itemId, 'dock', idx))}
            </div>

            {drag && (
                <div className="hs-clone" style={{ left: clone.x, top: clone.y }}>
                    {cloneFolder ? (
                        <FolderTile folder={cloneFolder} appMap={map} />
                    ) : (
                        <AppTile app={cloneItem} />
                    )}
                </div>
            )}

            {openFolder && folders[openFolder] && <FolderView folderId={openFolder} appMap={map} />}
        </div>
    );
}
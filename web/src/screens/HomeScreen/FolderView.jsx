import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { openApp } from '../../store/slices/phoneSlice';
import {
  FOLDER_PAGE,
  setEditing,
  setOpenFolder,
  renameFolder,
  removeFromFolder,
  swapInFolder,
  moveInFolder,
  deleteApp,
  saveHome,
} from '../../store/slices/homeSlice';
import { openDialog } from '../../store/slices/dialogSlice';

const FCOLS = 3;
const FROWS = 3;
const LONGPRESS_MS = 420;
const MOVE_THRESHOLD = 8;
const EDGE_MS = 550;

// iOS-style folder: a frosted card with the apps in a 3x3 grid, paged with dots.
// Dragging works exactly like the home screen — swap on drop, drag to the right
// edge to spawn a new page, swipe/edge-hold to change pages, drag out to unfolder.
export default function FolderView({ folderId, appMap }) {
  const dispatch = useDispatch();
  const folder = useSelector((s) => s.home.folders[folderId]);
  const editing = useSelector((s) => s.home.editing);
  const homePage = useSelector((s) => s.home.page);

  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const pagerRef = useRef(null);
  const press = useRef(null);
  const lp = useRef(null);
  const dragRef = useRef(null);
  const edge = useRef(null); // { dir, t } page-flip hold

  const [fpage, setFpage] = useState(0);
  const [swipeDx, setSwipeDx] = useState(0);
  const [drag, setDrag] = useState(null); // { appId }
  const [clone, setClone] = useState({ x: 0, y: 0 });
  const [swapTarget, setSwapTarget] = useState(null); // app under pointer -> swap on drop
  const [extraPage, setExtraPage] = useState(false); // transient empty page while dragging
  dragRef.current = drag;

  if (!folder) return null;
  const pagesData = folder.pages && folder.pages.length ? folder.pages : [[]];
  const pages = extraPage ? [...pagesData, []] : pagesData;
  const page = Math.min(fpage, pages.length - 1);

  const close = () => dispatch(setOpenFolder(null));

  const confirmDelete = async (appId) => {
    const label = (appMap[appId] && appMap[appId].label) || 'this app';
    const ok = await dispatch(
      openDialog({
        title: `Delete “${label}”?`,
        message: `Deleting “${label}” removes it from your Home Screen. You can get it again from the App Store.`,
        buttons: [
          { text: 'Cancel', style: 'cancel', value: false },
          { text: 'Delete', style: 'destructive', value: true },
        ],
      })
    );
    if (ok) { dispatch(deleteApp(appId)); dispatch(saveHome()); }
  };

  const cloneXY = (cx, cy) => {
    const r = rootRef.current && rootRef.current.getBoundingClientRect();
    return { x: cx - (r ? r.left : 0), y: cy - (r ? r.top : 0) };
  };

  // The app id under the pointer (or undefined over empty space).
  const hitTest = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const tile = el && el.closest('[data-fapp]');
    return tile ? tile.getAttribute('data-fapp') : undefined;
  };

  const beginDrag = (appId, cx, cy) => {
    dragRef.current = { appId };
    edge.current = null;
    setDrag({ appId });
    setSwapTarget(null);
    setClone(cloneXY(cx, cy));
  };

  const onDown = (e) => {
    const tileEl = e.target.closest('[data-fapp]');
    const appId = tileEl ? tileEl.getAttribute('data-fapp') : null;
    press.current = { x0: e.clientX, y0: e.clientY, mode: null, appId };
    e.currentTarget.setPointerCapture(e.pointerId);
    // Long-press an app to enter edit mode (jiggle); the drag begins on movement.
    if (!editing && appId) {
      lp.current = setTimeout(() => {
        if (!press.current) return;
        dispatch(setEditing(true));
        press.current.mode = 'armed';
      }, LONGPRESS_MS);
    }
  };

  const onMove = (e) => {
    const pr = press.current;
    if (!pr) return;

    if (dragRef.current) {
      setClone(cloneXY(e.clientX, e.clientY));
      const pg = pagerRef.current && pagerRef.current.getBoundingClientRect();
      if (!pg) return;

      // Edge -> flip page (held). Past the last page (when it has apps) spawn a
      // fresh empty page so an app can be dropped onto its own new page.
      let dir = 0;
      if (e.clientX < pg.left + pg.width * 0.12) dir = -1;
      else if (e.clientX > pg.right - pg.width * 0.12) dir = 1;
      if (dir) {
        if (!edge.current || edge.current.dir !== dir) edge.current = { dir, t: Date.now() };
        else if (Date.now() - edge.current.t > EDGE_MS) {
          const np = page + dir;
          if (np >= 0 && np < pages.length) setFpage(np);
          else if (dir === 1 && np === pages.length && !extraPage && (pagesData[page] || []).length > 0) {
            setExtraPage(true);
            setFpage(np);
          }
          edge.current = { dir, t: Date.now() };
        }
      } else edge.current = null;

      const over = hitTest(e.clientX, e.clientY);
      setSwapTarget(over && over !== dragRef.current.appId ? over : null);
      return;
    }

    const dx = e.clientX - pr.x0, dy = e.clientY - pr.y0;
    const moved = Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD;
    if (!pr.mode) {
      if (moved) {
        clearTimeout(lp.current);
        if (editing && pr.appId) { pr.mode = 'drag'; beginDrag(pr.appId, e.clientX, e.clientY); }
        else if (Math.abs(dx) > Math.abs(dy)) pr.mode = 'swipe';
        else pr.mode = 'ignore';
      }
    } else if (pr.mode === 'armed') {
      if (moved && pr.appId) { pr.mode = 'drag'; beginDrag(pr.appId, e.clientX, e.clientY); }
    }
    if (pr.mode === 'swipe') {
      let d = dx;
      const atStart = page === 0, atEnd = page === pages.length - 1;
      if ((d > 0 && atStart) || (d < 0 && atEnd)) d *= 0.28;
      setSwipeDx(d);
    }
  };

  const endDrag = () => {
    dragRef.current = null;
    edge.current = null;
    setDrag(null);
    setSwapTarget(null);
    setExtraPage(false);
  };

  const onUp = (e) => {
    clearTimeout(lp.current);
    const pr = press.current;
    press.current = null;

    if (dragRef.current) {
      const appId = dragRef.current.appId;
      const panel = panelRef.current && panelRef.current.getBoundingClientRect();
      const outside =
        panel &&
        (e.clientX < panel.left || e.clientX > panel.right || e.clientY < panel.top || e.clientY > panel.bottom);
      if (outside) {
        // Dragged clear of the folder card -> pop it back onto the home screen.
        dispatch(removeFromFolder({ appId, folderId, toKey: `p:${homePage}`, toIndex: 999 }));
        close();
      } else if (swapTarget && swapTarget !== appId) {
        // Dropped on another app -> swap slots.
        dispatch(swapInFolder({ folderId, a: appId, b: swapTarget }));
      } else {
        // Dropped on empty space. Move here (rather than snap back) when it's a
        // *different* page than the app came from — so you can pull an app onto a
        // new/other page and the emptied page auto-removes. A same-page gap snaps
        // back (keeps the current page tidy).
        let originPage = -1;
        pagesData.forEach((pgArr, pi) => { if (pgArr.includes(appId)) originPage = pi; });
        const curArr = pages[page] || [];
        if (curArr.length === 0) {
          dispatch(moveInFolder({ folderId, appId, toPage: page, toIndex: 0 }));
        } else if (originPage !== page && curArr.length < FOLDER_PAGE) {
          dispatch(moveInFolder({ folderId, appId, toPage: page, toIndex: curArr.length }));
        }
      }
      dispatch(saveHome());
      endDrag();
      return;
    }

    if (pr && pr.mode === 'swipe') {
      const w = pagerRef.current ? pagerRef.current.getBoundingClientRect().width : 200;
      let np = page;
      if (swipeDx < -w * 0.3 && page < pages.length - 1) np = page + 1;
      else if (swipeDx > w * 0.3 && page > 0) np = page - 1;
      setFpage(np);
      setSwipeDx(0);
    } else if (pr && !pr.mode && pr.appId && !editing) {
      dispatch(openApp(pr.appId));
      close();
    }
  };

  const trackStyle = {
    transform: `translateX(calc(${-page * 100}% + ${swipeDx}px))`,
    transition: swipeDx ? 'none' : 'transform 0.4s cubic-bezier(0.32,0.72,0,1)',
    // Promote to a GPU layer only WHILE swiping; a permanent layer softens the
    // folder icons/labels (grayscale AA). Idle = 'auto' so they stay crisp.
    willChange: swipeDx ? 'transform' : 'auto',
  };

  return (
    <div className={`hs-folderview${drag ? ' is-grabbing' : ''}`} ref={rootRef} onPointerDown={close}>
      {editing ? (
        <input
          className="hs-folderview__name"
          defaultValue={folder.name}
          maxLength={24}
          autoFocus
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={(e) => { dispatch(renameFolder({ folderId, name: e.target.value })); dispatch(saveHome()); }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      ) : (
        <div className="hs-folderview__title">{folder.name}</div>
      )}

      <div
        className="hs-folderview__panel"
        ref={panelRef}
        onPointerDown={(e) => { e.stopPropagation(); onDown(e); }}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="hs-fpager" ref={pagerRef}>
          <div className="hs-ftrack" style={trackStyle}>
            {pages.map((items, pi) => (
              <div className="hs-fpage" key={pi}>
                {items.map((appId) => {
                  const a = appMap[appId];
                  if (!a) return null;
                  const hidden = drag && drag.appId === appId;
                  const isSwap = swapTarget === appId;
                  return (
                    <div
                      key={appId}
                      className={`hs-tile${editing ? ' is-editing' : ''}${hidden ? ' is-dragging' : ''}${
                        isSwap ? ' is-swaptarget' : ''
                      }`}
                      data-fapp={appId}
                    >
                      <div className="hs-tile__inner">
                        <span className="hs-tile__iconwrap">
                          <span className="hs-tile__img">
                            {a.icon ? <img src={a.icon} alt="" draggable={false} /> : <span className="hs-tile__fallback">{a.label.charAt(0)}</span>}
                          </span>
                          {editing && a.deletable && (
                            <button
                              className="hs-tile__del"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => confirmDelete(appId)}
                              aria-label="Delete app"
                            >
                              −
                            </button>
                          )}
                        </span>
                        <span className="hs-tile__label">{a.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {pages.length > 1 && (
          <div className="hs-fdots">
            {pages.map((_, i) => (
              <span
                key={i}
                className={`hs-dot${i === page ? ' is-on' : ''}`}
                onPointerDown={(e) => { e.stopPropagation(); setFpage(i); }}
              />
            ))}
          </div>
        )}
      </div>

      {drag && appMap[drag.appId] && (
        <div className="hs-clone" style={{ left: clone.x, top: clone.y }}>
          <span className="hs-tile__img" style={{ width: '3.4em', height: '3.4em' }}>
            {appMap[drag.appId].icon ? <img src={appMap[drag.appId].icon} alt="" /> : null}
          </span>
        </div>
      )}
    </div>
  );
}

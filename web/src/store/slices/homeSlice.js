import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';
import { doLogout } from './xSlice';

export const PAGE_SIZE = 24; // 4 x 6
export const DOCK_MAX = 4;
export const FOLDER_MAX = 16;
export const FOLDER_PAGE = 9; // 3 x 3, apps per folder page

// ---- helpers (operate on the immer draft) --------------------------------

const isFolderId = (state, id) => !!state.folders[id];

// Folders store apps as explicit pages (like the home screen). Flatten for reads.
export const folderFlat = (f) => (f && f.pages ? f.pages.flat() : (f && f.items) || []);

const chunkArr = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out.length ? out : [[]];
};

// Clone (and migrate old flat-`items`) folders into the paged shape.
const clonePages = (f) => (f.pages ? f.pages.map((p) => [...p]) : chunkArr(f.items || [], FOLDER_PAGE));

// Drop empty pages from a folder, keeping at least one.
function pruneFolderPages(f) {
  f.pages = f.pages.filter((pg) => pg.length > 0);
  if (f.pages.length === 0) f.pages = [[]];
}

// Get a top-level container's array by key: 'dock' or 'p:<n>'.
function listByKey(state, key) {
  if (key === 'dock') return state.dock;
  if (key.startsWith('p:')) return state.pages[Number(key.slice(2))];
  return null;
}

// Remove an item id from wherever it sits at the TOP level (dock or a page).
function removeTopLevel(state, itemId) {
  const i = state.dock.indexOf(itemId);
  if (i >= 0) return state.dock.splice(i, 1);
  for (const page of state.pages) {
    const j = page.indexOf(itemId);
    if (j >= 0) return page.splice(j, 1);
  }
}

// Remove an app id from any folder it may be inside.
function removeFromAnyFolder(state, appId) {
  for (const f of Object.values(state.folders)) {
    for (const pg of f.pages) {
      const j = pg.indexOf(appId);
      if (j >= 0) { pg.splice(j, 1); break; }
    }
  }
}

// Remove an app from its page within one folder.
function removeFromFolderPages(f, appId) {
  for (const pg of f.pages) {
    const j = pg.indexOf(appId);
    if (j >= 0) { pg.splice(j, 1); return; }
  }
}

// Cascade page overflow, drop empty folders + their refs, trim trailing empty
// pages (keep >= 1), and clamp the current page.
function firstFreePage(state) {
  let target = state.pages.find((pg) => pg.length < PAGE_SIZE);
  if (!target) { target = []; state.pages.push(target); }
  return target;
}

function normalize(state) {
  // A folder needs 2+ apps. Prune empty pages first; dissolve any that dropped
  // below 2 apps: a lone app takes the folder's own slot, an empty one vacates it.
  for (const id of Object.keys(state.folders)) {
    const f = state.folders[id];
    pruneFolderPages(f);
    const flat = folderFlat(f);
    if (flat.length >= 2) continue;
    const lone = flat[0]; // may be undefined (empty folder)
    let arr = null, idx = -1;
    const di = state.dock.indexOf(id);
    if (di >= 0) { arr = state.dock; idx = di; }
    else {
      for (const pg of state.pages) {
        const j = pg.indexOf(id);
        if (j >= 0) { arr = pg; idx = j; break; }
      }
    }
    if (arr) {
      if (lone) arr[idx] = lone;   // the last app pops out where the folder was
      else arr.splice(idx, 1);     // empty -> remove the slot
    }
    delete state.folders[id];
  }
  // Dock capacity: bump overflow (from the end) back onto a page.
  while (state.dock.length > DOCK_MAX) {
    firstFreePage(state).push(state.dock.pop());
  }
  // Overflow: push items past PAGE_SIZE onto the next page.
  for (let p = 0; p < state.pages.length; p++) {
    while (state.pages[p].length > PAGE_SIZE) {
      if (!state.pages[p + 1]) state.pages[p + 1] = [];
      state.pages[p + 1].unshift(state.pages[p].pop());
    }
  }
  // Trim trailing empty pages (keep at least one).
  while (state.pages.length > 1 && state.pages[state.pages.length - 1].length === 0) {
    state.pages.pop();
  }
  if (state.pages.length === 0) state.pages = [[]];
  if (state.page > state.pages.length - 1) state.page = state.pages.length - 1;
  if (state.page < 0) state.page = 0;
}

const initialState = {
  loaded: false,
  saved: null, // the persisted blob from the server, applied on first reconcile
  dock: [],
  pages: [[]],
  folders: {}, // id -> { id, name, items:[appId] }
  removed: [],
  nextFolder: 1,
  editing: false,
  page: 0,
  openFolder: null,
  downloads: {}, // appId -> progress 0..1 (App Store install animation)
  downloadMs: 2500,
};

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    setSaved(state, action) {
      // Re-seed from the server's authoritative layout on each open (handles
      // character switches without a resource restart).
      state.saved = action.payload || null;
      state.loaded = false;
      state.editing = false;
      state.openFolder = null;
      state.page = 0;
    },

    // Build/refresh the layout from the saved blob + the currently available apps.
    // payload: { apps: [{id, place}] }  (apps = ordered built-in then external)
    reconcile(state, action) {
      const { apps } = action.payload;
      const saved = state.saved;
      const order = apps.map((a) => a.id);
      const valid = new Set(order);

      // First run: seed from the saved layout, or from Config default placement.
      if (!state.loaded) {
        if (saved && Array.isArray(saved.pages)) {
          // Deep-clone: `saved` lives in state and is frozen by immer, so we must
          // not assign its arrays/objects directly (later splices would throw).
          state.dock = [...(saved.dock || [])];
          state.pages = (saved.pages.length ? saved.pages : [[]]).map((p) => [...p]);
          state.folders = {};
          for (const id of Object.keys(saved.folders || {})) {
            const f = saved.folders[id];
            state.folders[id] = { id: f.id, name: f.name, pages: clonePages(f) };
          }
          state.removed = [...(saved.removed || [])];
          state.nextFolder = saved.nextFolder || 1;
        } else {
          // Default layout is built from pre-installed BUILT-IN apps only;
          // third-party apps AND store-gated built-ins are installed from the
          // App Store, not auto-placed.
          const gated = (a) => a.external || a.store;
          const dock = apps.filter((a) => a.place === 'dock' && !gated(a)).map((a) => a.id).slice(0, DOCK_MAX);
          const gridIds = apps
            .filter((a) => a.place !== 'dock' && a.place !== 'hidden' && !gated(a))
            .map((a) => a.id);
          const dockSet = new Set(dock);
          const rest = gridIds.filter((id) => !dockSet.has(id));
          const pages = [];
          for (let i = 0; i < rest.length; i += PAGE_SIZE) pages.push(rest.slice(i, i + PAGE_SIZE));
          state.dock = dock;
          state.pages = pages.length ? pages : [[]];
        }
        state.loaded = true;
      }

      // Drop uninstalled apps everywhere; keep folder ids that still have members.
      state.removed = state.removed.filter((id) => valid.has(id));
      const removedSet = new Set(state.removed);
      const keep = (id) => isFolderId(state, id) || (valid.has(id) && !removedSet.has(id));
      state.dock = state.dock.filter(keep);
      state.pages = state.pages.map((pg) => pg.filter(keep));
      for (const f of Object.values(state.folders)) {
        f.pages = f.pages.map((pg) => pg.filter((id) => valid.has(id) && !removedSet.has(id)));
        pruneFolderPages(f);
      }

      // Everything currently placed (top-level apps + folder members).
      const placed = new Set(state.removed);
      const noteApp = (id) => { if (!isFolderId(state, id)) placed.add(id); };
      state.dock.forEach(noteApp);
      state.pages.forEach((pg) => pg.forEach(noteApp));
      Object.values(state.folders).forEach((f) => folderFlat(f).forEach((id) => placed.add(id)));

      // Auto-place brand-new pre-installed BUILT-IN apps (respect Config order).
      // Third-party apps and store-gated built-ins only reach the home screen
      // once installed from the App Store, so they are NOT auto-appended here.
      const isGated = {};
      apps.forEach((a) => { isGated[a.id] = a.external || a.store; });
      for (const id of order) {
        if (placed.has(id) || isGated[id]) continue;
        firstFreePage(state).push(id);
        placed.add(id);
      }

      normalize(state);
    },

    setEditing(state, action) {
      // Leaving edit mode keeps any open folder open (so "Done" only ends editing).
      state.editing = action.payload;
    },
    setPage(state, action) {
      state.page = action.payload;
    },
    setOpenFolder(state, action) {
      state.openFolder = action.payload;
    },

    // Move a top-level item (app or folder) to a container/index. Used live while
    // dragging, so it does NOT normalize (that happens on drop / endDrag).
    moveItem(state, action) {
      const { itemId, toKey, toIndex } = action.payload;
      const list = listByKey(state, toKey);
      if (!list) return;
      // Dock overflow is allowed transiently while dragging; normalize() bumps the
      // displaced app back to a page on drop (so dock<->home swaps work).
      removeTopLevel(state, itemId);
      const dest = listByKey(state, toKey);
      const idx = Math.max(0, Math.min(toIndex, dest.length));
      dest.splice(idx, 0, itemId);
    },

    // Swap two top-level items (apps or folders), wherever they sit — including
    // across the dock and pages (a dock app and a page app trade places).
    swapItems(state, action) {
      const { a, b } = action.payload;
      if (!a || !b || a === b) return;
      const locate = (id) => {
        const di = state.dock.indexOf(id);
        if (di >= 0) return { arr: state.dock, i: di };
        for (const pg of state.pages) {
          const j = pg.indexOf(id);
          if (j >= 0) return { arr: pg, i: j };
        }
        return null;
      };
      const la = locate(a), lb = locate(b);
      if (!la || !lb) return;
      la.arr[la.i] = b;
      lb.arr[lb.i] = a;
    },

    // Drop app `dropId` onto app `targetId` -> new folder in the target's slot.
    createFolder(state, action) {
      const { targetId, dropId } = action.payload;
      // Locate the target's container + index before removing anything.
      let key = null, index = 0;
      const di = state.dock.indexOf(targetId);
      if (di >= 0) { key = 'dock'; index = di; }
      else {
        for (let p = 0; p < state.pages.length; p++) {
          const j = state.pages[p].indexOf(targetId);
          if (j >= 0) { key = `p:${p}`; index = j; break; }
        }
      }
      if (!key) return;
      removeTopLevel(state, dropId);
      removeTopLevel(state, targetId);
      const id = `f${state.nextFolder++}`;
      state.folders[id] = { id, name: 'Folder', pages: [[targetId, dropId]] };
      const dest = listByKey(state, key);
      dest.splice(Math.min(index, dest.length), 0, id);
    },

    addToFolder(state, action) {
      const { appId, folderId } = action.payload;
      const f = state.folders[folderId];
      if (!f) return;
      const flat = folderFlat(f);
      if (flat.includes(appId) || flat.length >= FOLDER_MAX) return;
      removeTopLevel(state, appId);
      // Land on the last page if it has room, else start a fresh page.
      let last = f.pages[f.pages.length - 1];
      if (!last || last.length >= FOLDER_PAGE) { last = []; f.pages.push(last); }
      last.push(appId);
    },

    // Swap two apps inside a folder (swap-on-drop, mirrors the home screen) — works
    // across folder pages too.
    swapInFolder(state, action) {
      const { folderId, a, b } = action.payload;
      const f = state.folders[folderId];
      if (!f || a === b) return;
      let la = null, lb = null;
      f.pages.forEach((pg, pi) => {
        const ia = pg.indexOf(a); if (ia >= 0) la = { pi, i: ia };
        const ib = pg.indexOf(b); if (ib >= 0) lb = { pi, i: ib };
      });
      if (!la || !lb) return;
      f.pages[la.pi][la.i] = b;
      f.pages[lb.pi][lb.i] = a;
    },

    // Move an app to a folder page/index (place on an empty/new page). Prunes any
    // page it emptied, so pulling the last app off a page collapses that page.
    moveInFolder(state, action) {
      const { folderId, appId, toPage, toIndex } = action.payload;
      const f = state.folders[folderId];
      if (!f) return;
      removeFromFolderPages(f, appId);
      while (f.pages.length <= toPage) f.pages.push([]);
      const dest = f.pages[toPage];
      const idx = Math.max(0, Math.min(toIndex == null ? dest.length : toIndex, dest.length));
      dest.splice(idx, 0, appId);
      pruneFolderPages(f);
    },

    // Pull an app out of a folder onto a container.
    removeFromFolder(state, action) {
      const { appId, folderId, toKey, toIndex } = action.payload;
      const f = state.folders[folderId];
      if (!f) return;
      removeFromFolderPages(f, appId);
      const dest = listByKey(state, toKey) || state.pages[state.page];
      dest.splice(Math.max(0, Math.min(toIndex, dest.length)), 0, appId);
      normalize(state);
    },

    renameFolder(state, action) {
      const { folderId, name } = action.payload;
      const f = state.folders[folderId];
      if (f) f.name = (name || '').trim() || 'Folder';
    },

    deleteApp(state, action) {
      const id = action.payload;
      removeTopLevel(state, id);
      removeFromAnyFolder(state, id);
      if (!state.removed.includes(id)) state.removed.push(id);
      normalize(state);
    },

    // Install an app onto the home screen (App Store "Get"). No-op if already there.
    installApp(state, action) {
      const id = action.payload;
      state.removed = state.removed.filter((x) => x !== id);
      const onHome =
        state.dock.includes(id) || state.pages.some((pg) => pg.includes(id));
      if (!onHome) firstFreePage(state).push(id);
    },

    // Remove an app from the home screen WITHOUT marking it "removed" (used when a
    // download is cancelled — it simply goes back to "Get" in the store).
    uninstallApp(state, action) {
      const id = action.payload;
      removeTopLevel(state, id);
      removeFromAnyFolder(state, id);
      normalize(state);
    },

    setDownloadMs(state, action) {
      if (action.payload > 0) state.downloadMs = action.payload;
    },
    setDownload(state, action) {
      const { id, progress } = action.payload;
      state.downloads[id] = progress;
    },
    clearDownload(state, action) {
      delete state.downloads[action.payload];
    },

    addPage(state) {
      state.pages.push([]);
    },

    endDrag(state) {
      normalize(state);
    },
  },
});

export const {
  setSaved,
  reconcile,
  setEditing,
  setPage,
  setOpenFolder,
  moveItem,
  swapItems,
  createFolder,
  addToFolder,
  swapInFolder,
  moveInFolder,
  removeFromFolder,
  renameFolder,
  deleteApp,
  installApp,
  uninstallApp,
  setDownloadMs,
  setDownload,
  clearDownload,
  addPage,
  endDrag,
} = homeSlice.actions;

// ---- App Store install / download animation -------------------------------
const dlTimers = {}; // appId -> interval id

// Tap "Get": drop the icon onto the home screen immediately and fill its download
// ring over downloadMs, then finish.
export const startDownload = (id) => (dispatch, getState) => {
  if (dlTimers[id]) return;
  dispatch(installApp(id));
  dispatch(setDownload({ id, progress: 0 }));
  const ms = getState().home.downloadMs || 2500;
  const started = Date.now();
  dlTimers[id] = setInterval(() => {
    const p = Math.min(1, (Date.now() - started) / ms);
    dispatch(setDownload({ id, progress: p }));
    if (p >= 1) {
      clearInterval(dlTimers[id]);
      delete dlTimers[id];
      dispatch(clearDownload(id));
      dispatch(saveHome());
    }
  }, 60);
};

// Tap the ring mid-download: stop and remove the app (back to "Get").
export const cancelDownload = (id) => (dispatch) => {
  if (dlTimers[id]) { clearInterval(dlTimers[id]); delete dlTimers[id]; }
  dispatch(clearDownload(id));
  dispatch(uninstallApp(id));
  dispatch(saveHome());
};

// Persist the current layout (debounced) to the server.
let saveTimer = null;
export const saveHome = () => (dispatch, getState) => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const h = getState().home;
    fetchNui(
      'phone:home:save',
      { dock: h.dock, pages: h.pages, folders: h.folders, removed: h.removed, nextFolder: h.nextFolder },
      true
    );
  }, 500);
};

// Uninstall an app from the Home Screen (jiggle-mode delete) + persist. Some
// apps clean up when removed — deleting X logs the account out so a reinstall
// starts at the sign-in screen instead of a stale session.
export const removeApp = (id) => (dispatch) => {
  dispatch(deleteApp(id));
  dispatch(saveHome());
  if (id === 'x') dispatch(doLogout());
};

export default homeSlice.reducer;

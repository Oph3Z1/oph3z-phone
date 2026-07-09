import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';
import { doLogout } from './xSlice';

export const PAGE_SIZE = 24;
export const DOCK_MAX = 4;
export const FOLDER_MAX = 16;
export const FOLDER_PAGE = 9;

const isFolderId = (state, id) => !!state.folders[id];

export const folderFlat = (f) => (f && f.pages ? f.pages.flat() : (f && f.items) || []);

export const appIsInstalled = (rootState, id) => {
    if (!id) return false;
    const ext = rootState.apps && rootState.apps.external;
    if (ext && ext.some((a) => a.id === id)) return true;
    const h = rootState.home || {};
    if ((h.dock || []).includes(id)) return true;
    if ((h.pages || []).some((p) => p.includes(id))) return true;
    return Object.values(h.folders || {}).some((f) => folderFlat(f).includes(id));
};

const chunkArr = (arr, n) => {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out.length ? out : [[]];
};

const clonePages = (f) =>
    f.pages ? f.pages.map((p) => [...p]) : chunkArr(f.items || [], FOLDER_PAGE);

function pruneFolderPages(f) {
    f.pages = f.pages.filter((pg) => pg.length > 0);
    if (f.pages.length === 0) f.pages = [[]];
}

function listByKey(state, key) {
    if (key === 'dock') return state.dock;
    if (key.startsWith('p:')) return state.pages[Number(key.slice(2))];
    return null;
}

function removeTopLevel(state, itemId) {
    const i = state.dock.indexOf(itemId);
    if (i >= 0) return state.dock.splice(i, 1);
    for (const page of state.pages) {
        const j = page.indexOf(itemId);
        if (j >= 0) return page.splice(j, 1);
    }
}

function removeFromAnyFolder(state, appId) {
    for (const f of Object.values(state.folders)) {
        for (const pg of f.pages) {
            const j = pg.indexOf(appId);
            if (j >= 0) {
                pg.splice(j, 1);
                break;
            }
        }
    }
}

function removeFromFolderPages(f, appId) {
    for (const pg of f.pages) {
        const j = pg.indexOf(appId);
        if (j >= 0) {
            pg.splice(j, 1);
            return;
        }
    }
}

function firstFreePage(state) {
    let target = state.pages.find((pg) => pg.length < PAGE_SIZE);
    if (!target) {
        target = [];
        state.pages.push(target);
    }
    return target;
}

function normalize(state) {
    for (const id of Object.keys(state.folders)) {
        const f = state.folders[id];
        pruneFolderPages(f);
        const flat = folderFlat(f);
        if (flat.length >= 2) continue;
        const lone = flat[0];
        let arr = null,
            idx = -1;
        const di = state.dock.indexOf(id);
        if (di >= 0) {
            arr = state.dock;
            idx = di;
        } else {
            for (const pg of state.pages) {
                const j = pg.indexOf(id);
                if (j >= 0) {
                    arr = pg;
                    idx = j;
                    break;
                }
            }
        }
        if (arr) {
            if (lone) arr[idx] = lone;
            else arr.splice(idx, 1);
        }
        delete state.folders[id];
    }
    while (state.dock.length > DOCK_MAX) {
        firstFreePage(state).push(state.dock.pop());
    }
    for (let p = 0; p < state.pages.length; p++) {
        while (state.pages[p].length > PAGE_SIZE) {
            if (!state.pages[p + 1]) state.pages[p + 1] = [];
            state.pages[p + 1].unshift(state.pages[p].pop());
        }
    }
    while (state.pages.length > 1 && state.pages[state.pages.length - 1].length === 0) {
        state.pages.pop();
    }
    if (state.pages.length === 0) state.pages = [[]];
    if (state.page > state.pages.length - 1) state.page = state.pages.length - 1;
    if (state.page < 0) state.page = 0;
}

const initialState = {
    loaded: false,
    saved: null,
    dock: [],
    pages: [[]],
    folders: {},
    removed: [],
    nextFolder: 1,
    editing: false,
    page: 0,
    openFolder: null,
    downloads: {},
    downloadMs: 2500,
};

const homeSlice = createSlice({
    name: 'home',
    initialState,
    reducers: {
        setSaved(state, action) {
            state.saved = action.payload || null;
            state.loaded = false;
            state.editing = false;
            state.openFolder = null;
            state.page = 0;
        },

        reconcile(state, action) {
            const { apps } = action.payload;
            const saved = state.saved;
            const order = apps.map((a) => a.id);
            const valid = new Set(order);

            if (!state.loaded) {
                if (saved && Array.isArray(saved.pages)) {
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
                    const gated = (a) => a.external || a.store;
                    const dock = apps
                        .filter((a) => a.place === 'dock' && !gated(a))
                        .map((a) => a.id)
                        .slice(0, DOCK_MAX);
                    const gridIds = apps
                        .filter((a) => a.place !== 'dock' && a.place !== 'hidden' && !gated(a))
                        .map((a) => a.id);
                    const dockSet = new Set(dock);
                    const rest = gridIds.filter((id) => !dockSet.has(id));
                    const pages = [];
                    for (let i = 0; i < rest.length; i += PAGE_SIZE)
                        pages.push(rest.slice(i, i + PAGE_SIZE));
                    state.dock = dock;
                    state.pages = pages.length ? pages : [[]];
                }
                state.loaded = true;
            }

            state.removed = state.removed.filter((id) => valid.has(id));
            const removedSet = new Set(state.removed);
            const keep = (id) => isFolderId(state, id) || (valid.has(id) && !removedSet.has(id));
            state.dock = state.dock.filter(keep);
            state.pages = state.pages.map((pg) => pg.filter(keep));
            for (const f of Object.values(state.folders)) {
                f.pages = f.pages.map((pg) =>
                    pg.filter((id) => valid.has(id) && !removedSet.has(id)),
                );
                pruneFolderPages(f);
            }

            const placed = new Set(state.removed);
            const noteApp = (id) => {
                if (!isFolderId(state, id)) placed.add(id);
            };
            state.dock.forEach(noteApp);
            state.pages.forEach((pg) => pg.forEach(noteApp));
            Object.values(state.folders).forEach((f) =>
                folderFlat(f).forEach((id) => placed.add(id)),
            );

            const isGated = {};
            apps.forEach((a) => {
                isGated[a.id] = a.external || a.store;
            });
            for (const id of order) {
                if (placed.has(id) || isGated[id]) continue;
                firstFreePage(state).push(id);
                placed.add(id);
            }

            normalize(state);
        },

        setEditing(state, action) {
            state.editing = action.payload;
        },
        setPage(state, action) {
            state.page = action.payload;
        },
        setOpenFolder(state, action) {
            state.openFolder = action.payload;
        },

        moveItem(state, action) {
            const { itemId, toKey, toIndex } = action.payload;
            const list = listByKey(state, toKey);
            if (!list) return;
            removeTopLevel(state, itemId);
            const dest = listByKey(state, toKey);
            const idx = Math.max(0, Math.min(toIndex, dest.length));
            dest.splice(idx, 0, itemId);
        },

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
            const la = locate(a),
                lb = locate(b);
            if (!la || !lb) return;
            la.arr[la.i] = b;
            lb.arr[lb.i] = a;
        },

        createFolder(state, action) {
            const { targetId, dropId } = action.payload;
            let key = null,
                index = 0;
            const di = state.dock.indexOf(targetId);
            if (di >= 0) {
                key = 'dock';
                index = di;
            } else {
                for (let p = 0; p < state.pages.length; p++) {
                    const j = state.pages[p].indexOf(targetId);
                    if (j >= 0) {
                        key = `p:${p}`;
                        index = j;
                        break;
                    }
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
            let last = f.pages[f.pages.length - 1];
            if (!last || last.length >= FOLDER_PAGE) {
                last = [];
                f.pages.push(last);
            }
            last.push(appId);
        },

        swapInFolder(state, action) {
            const { folderId, a, b } = action.payload;
            const f = state.folders[folderId];
            if (!f || a === b) return;
            let la = null,
                lb = null;
            f.pages.forEach((pg, pi) => {
                const ia = pg.indexOf(a);
                if (ia >= 0) la = { pi, i: ia };
                const ib = pg.indexOf(b);
                if (ib >= 0) lb = { pi, i: ib };
            });
            if (!la || !lb) return;
            f.pages[la.pi][la.i] = b;
            f.pages[lb.pi][lb.i] = a;
        },

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

        installApp(state, action) {
            const id = action.payload;
            state.removed = state.removed.filter((x) => x !== id);
            const onHome = state.dock.includes(id) || state.pages.some((pg) => pg.includes(id));
            if (!onHome) firstFreePage(state).push(id);
        },

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

const dlTimers = {};

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

export const cancelDownload = (id) => (dispatch) => {
    if (dlTimers[id]) {
        clearInterval(dlTimers[id]);
        delete dlTimers[id];
    }
    dispatch(clearDownload(id));
    dispatch(uninstallApp(id));
    dispatch(saveHome());
};

let saveTimer = null;
export const saveHome = () => (dispatch, getState) => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        const h = getState().home;
        fetchNui(
            'phone:home:save',
            {
                dock: h.dock,
                pages: h.pages,
                folders: h.folders,
                removed: h.removed,
                nextFolder: h.nextFolder,
            },
            true,
        );
    }, 500);
};

export const removeApp = (id) => (dispatch) => {
    dispatch(deleteApp(id));
    dispatch(saveHome());
    if (id === 'twexa') dispatch(doLogout());
};

export default homeSlice.reducer;
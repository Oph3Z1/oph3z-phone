import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

// Browser-dev mock gallery (so the app isn't empty via `npm run dev`).
const MOCK = [
  { id: 1, url: 'https://picsum.photos/id/1015/600', type: 'image', favorite: true, ts: 1719500000 },
  { id: 2, url: 'https://picsum.photos/id/1025/600', type: 'image', favorite: false, ts: 1719490000 },
  { id: 3, url: 'https://picsum.photos/id/1039/600', type: 'image', favorite: false, ts: 1719480000 },
  { id: 4, url: 'https://picsum.photos/id/1043/600', type: 'image', favorite: true, ts: 1719470000 },
  { id: 5, url: 'https://picsum.photos/id/1062/600', type: 'image', favorite: false, ts: 1719460000 },
];

const initialState = {
  loaded: false,
  items: [],
  lightbox: null, // url currently shown fullscreen (outside the phone), or null
};

const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    hydrate(state, action) {
      state.items = action.payload || [];
      state.loaded = true;
    },
    upsertPhoto(state, action) {
      const p = action.payload;
      const i = state.items.findIndex((x) => x.id === p.id);
      if (i >= 0) state.items[i] = p;
      else state.items.push(p);
    },
    setPhotoFavoriteLocal(state, action) {
      const { id, favorite } = action.payload;
      const item = state.items.find((x) => x.id === id);
      if (item) item.favorite = favorite;
    },
    removePhotosLocal(state, action) {
      const ids = new Set(action.payload);
      state.items = state.items.filter((x) => !ids.has(x.id));
    },
    setLightbox(state, action) {
      state.lightbox = action.payload;
    },
  },
});

export const {
  hydrate,
  upsertPhoto,
  setPhotoFavoriteLocal,
  removePhotosLocal,
  setLightbox,
} = photosSlice.actions;

// ---- Thunks ---------------------------------------------------------------
export const loadPhotos = () => async (dispatch) => {
  const items = await fetchNui('phone:photos:get', {}, MOCK);
  dispatch(hydrate(items));
};

export const addPhoto = (url, type = 'image') => async (dispatch) => {
  const created = await fetchNui('phone:photos:add', { url, type }, {
    id: Date.now(),
    url,
    type,
    favorite: false,
    ts: Math.floor(Date.now() / 1000),
  });
  if (created) dispatch(upsertPhoto(created));
  return created;
};

export const togglePhotoFavorite = (id, favorite) => async (dispatch) => {
  dispatch(setPhotoFavoriteLocal({ id, favorite })); // optimistic
  await fetchNui('phone:photos:setFavorite', { id, favorite }, true);
};

export const deletePhotos = (ids) => async (dispatch) => {
  dispatch(removePhotosLocal(ids)); // optimistic
  await fetchNui('phone:photos:delete', { ids }, true);
};

export default photosSlice.reducer;

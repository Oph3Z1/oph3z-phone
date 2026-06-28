# oph3z-phone — Architecture

Custom iPhone-style phone for **QBox (qbx_core)**, built from scratch.
NUI = **React + Redux Toolkit (Vite)**. Game side = **Lua**. Storage = **per-citizenid
JSON files** (no SQL).

> Companion docs: [API.md](API.md) (the full Lua↔NUI contract) and
> [FEATURES.md](FEATURES.md) (feature-by-feature reference + config).

---

## High-level data flow

```
            ┌──────────────────────── client (Lua) ─────────────────────────┐
 React NUI  │  client/main.lua   open/close, prop+anim, flashlight, glow,    │
 (web/)     │                    call lifecycle, /airplane                   │
   ▲  │     │  client/nui.lua    RegisterNUICallback  (UI -> Lua)            │
   │  │     │  client/utils.lua  item check, in-game time/weather            │
   │  └─SendNUIMessage──────────────────────────────────────────────────────┤
   └────fetchNui (https://cfx-nui-…)─────────────────────────────────────────┘
                                   │ ox_lib callbacks / net events
            ┌──────────────────────▼──────────── server (Lua) ──────────────┐
            │  server/main.lua      callbacks (data/contacts/block/airplane),│
            │                       call manager (events), recents           │
            │  server/database.lua  JSON read/write, number registry, blocked│
            └───────────────────────────────────────────────────────────────┘
                                   │ LoadResourceFile / SaveResourceFile
                          data/<citizenid>.json  +  data/_numbers.json
```

- **NUI → Lua**: `fetchNui(event, data)` → `RegisterNUICallback(event, …)`.
- **Lua → NUI**: `SendNUIMessage({ action, data })` → `useNuiEvent(action, …)`.
- **Client ↔ Server**: `lib.callback` (request/response) and `TriggerServerEvent` /
  `TriggerClientEvent` (calls are event-driven because they're multi-step/async).

---

## Folder structure

```
oph3z-phone/
├── fxmanifest.lua            shared/client/server scripts, ui_page, files{} (incl. audio)
├── config.lua                ALL tunables (shared client+server as `Config`)
├── client/
│   ├── utils.lua             Phone.dbg / hasItem / getTimeData (time + weather category)
│   ├── main.lua              lifecycle + prop/anim + flashlight + screen glow + CALLS
│   ├── nui.lua               RegisterNUICallback handlers (UI actions -> server)
│   └── app/<name>/<name>.lua MODULAR per-app client (e.g. app/photos/photos.lua)
├── server/
│   ├── database.lua          DB.* : load/save, number gen + registry, contacts, blocked, recents
│   ├── main.lua              ox_lib callbacks + call manager
│   └── app/<name>/<name>.lua MODULAR per-app server (e.g. app/photos/photos.lua)
├── data/                     runtime JSON (per citizenid) + _numbers.json registry
├── docs/                     <- you are here
└── web/                      React + Redux NUI (Vite)
    ├── public/audio/         ringback.mp3 / end.mp3 / busy.mp3 (+ future: CameraShot, notify)
    ├── src/
    │   ├── App.jsx           NUI bridge (useNuiEvent) + routing + Escape-to-close
    │   ├── store/            Redux Toolkit store + slices
    │   │   └── slices/       phoneSlice, settingsSlice, contactsSlice, callSlice, photosSlice
    │   ├── hooks/            useNuiEvent, useCallAudio
    │   ├── utils/            fetchNui, misc (isEnvBrowser/pad2/clamp), datetime
    │   ├── config/           phone.config.js (wallpaper map, DESIGN_WIDTH)
    │   ├── components/       Phone (frame), StatusBar, HomeBar, AppIcon, Lightbox (fullscreen image)
    │   ├── screens/          LockScreen, HomeScreen, AppScreen
    │   └── app/              ALL apps live here (one folder per app)
    │       ├── registry.js   app list + dock/grid layout; maps 'call'->PhoneApp, 'photos'->PhotosApp
    │       ├── phone/        Phone app (PhoneApp + components/ + views/ + call/)
    │       ├── photos/       Photos app (PhotosApp + components/: grid/thumb/viewer/nav)
    │       └── camera/       Camera app (CameraApp, in-phone; case clipped to a window)
    └── build/                compiled output (generated; served via fxmanifest files{})
```

---

## JSON data schema

`data/<citizenid>.json`:
```jsonc
{
  "citizenid": "ABC12345",
  "settings": { "wallpaper": "default", "brightness": 100, "locked": true, "airplane": false },
  "phone": {
    "number": "555-0142",          // display
    "numberRaw": "5550142",        // digits (registry key)
    "contacts": [
      { "id": 1, "name": "Pappa", "number": "555-0199", "notes": "", "img": "", "favorite": true }
    ],
    "recents": [
      { "id": 1, "number": "555-0199", "name": "Pappa", "img": "",
        "direction": "in|out", "missed": false, "ts": 1719500000 }
    ],
    "blocked": { "5550199": { "number": "555-0199", "name": "Pappa", "ts": 1719500000 } },
    "nextContactId": 2,
    "nextRecentId": 5
  },
  "photos": {                      // Photos app (app/photos/)
    "items": [
      { "id": 1, "url": "https://…", "type": "image|video", "thumb": null,
        "favorite": false, "ts": 1719500000 }
    ],
    "nextId": 2
  },
  "createdAt": 1719400000,
  "updatedAt": 1719500000
}
```

> **Modular apps:** new apps live in `client/app/<name>/<name>.lua` +
> `server/app/<name>/<name>.lua` (Lua, registered in fxmanifest) and
> `web/src/app/<name>/` (UI). App servers use the generic
> `DB.GetCitizenId` + `DB.Load/Save`. To hand-seed photos: append
> `{ "url": "https://…", "type": "image" }` to `photos.items` — missing fields auto-fill.

`data/_numbers.json` (global registry, cached in memory server-side):
```jsonc
{ "5550142": "ABC12345", "5550199": "XYZ67890" }   // numberDigits -> citizenid
```

- Numbers are **generated & owned by this resource** (framework-agnostic), format
  `555` + 4 digits (`Config.PhoneNumberPrefix`). Registry guarantees uniqueness and
  enables reverse lookup for calls (`DB.GetCitizenIdByNumber`).

---

## Identity (QBox)

- Server: `exports.qbx_core:GetPlayer(src).PlayerData.citizenid`,
  `exports.qbx_core:GetPlayerByCitizenId(cid)` (returns nil if offline).
- Client: `exports.qbx_core:GetPlayerData().citizenid` (not currently needed; server resolves).

---

## Dependencies (runtime, NOT hard fxmanifest deps)

- **qbx_core**, **ox_lib** (hard deps).
- **pma-voice** — call voice (`setCallChannel`, `toggleMutePlayer`, `isPlayerMuted`).
- **xsound** — 3D ringtone (`PlayUrlPos`, `Distance`, `Destroy`, `Position`, `soundExists`).
- **ox_inventory** — optional phone item.

pma-voice & xsound are used via exports but intentionally NOT listed as hard
dependencies (to avoid startup failures if names differ).

---

## Responsive UI

- The phone screen is **centered in the case** via `top/left:50%` + `translate(-50%,-50%)`,
  sized by `--screen-width` / `--screen-height` (% of the case).
- A `ResizeObserver` in `Phone.jsx` sets `font-size = (screenWidth/390)*16px`; everything
  inside is sized in `em`, so the whole UI scales with the phone at any resolution.
- Safe areas: `--safe-top` / `--safe-bottom` (on `.phone__screen`) reserve space for the
  floating StatusBar and home indicator; apps run fullscreen beneath them.

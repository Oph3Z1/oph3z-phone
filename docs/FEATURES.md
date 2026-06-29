# oph3z-phone — Features & Config

Status snapshot of everything built, how each piece works, where it lives, and how to
extend it. See [API.md](API.md) for the exact contract and [ARCHITECTURE.md](ARCHITECTURE.md)
for structure/data.

---

## Phase 1 — Core phone

| Feature | Where | Notes |
|---|---|---|
| Phone frame | `components/Phone/*` | case.png frame + centered screen; ResizeObserver scaling |
| Lock screen | `screens/LockScreen/*` | live clock/date/weather, **swipe-up** unlock (slide anim), flashlight+camera buttons, home indicator + bouncing "Swipe up to open" |
| Home screen | `screens/HomeScreen/*` | dock + 4-col grid, hover lift; `apps/registry.js` defines DOCK/HOME_GRID |
| App routing | `screens/AppScreen` + `phoneSlice.activeApp` | apps render fullscreen; StatusBar + HomeBar float on top |
| Status bar | `components/StatusBar/*` | time, Dynamic Island (camera-lens.png), signal/wifi/battery svgs, **airplane icon** when on |

### Phone prop + hand animation (client/main.lua)
- `Phone.startAnim()` / `Phone.stopAnim()` — attaches `Config.PropModel` to `Config.PropBone`,
  plays `cellphone@` enter/idle/exit. Cleaned up on resource stop. Toggle `Config.UseProp`.

### Flashlight (client/main.lua)
- `Phone.setFlashlight(on)` draws a real `DrawSpotLight` beam from the phone, only while
  the phone is open. Direction = player's forward vector (static, not camera).
- Toggled from the lock-screen button → `fetchNui('phone:flashlight',{on})`. Off on close.
- Tunables: `FlashlightColor/Forward/Distance/Brightness/Radius/Falloff/Tilt`.

### Screen glow (client/main.lua)
- Soft `DrawLightWithRange` near the face while the phone is open (so you're lit in the
  dark). Tunables: `ScreenGlow*`.

---

## Phone app  (`apps/phone/`)

Bottom **iOS liquid-glass** tab bar (frosted, floating capsule). Tabs:

| Tab | View | Behaviour |
|---|---|---|
| Favorites | `FavoritesView` | favorites list; row tap = **call**, ⓘ = detail; **Edit** removes favorites |
| Recents | `RecentsView` | call history (in/out/missed-red) + time; All/Missed; row tap = call, ⓘ = detail |
| Contacts | `ContactsView` | search, **My Card** (your number), A–Z sections + index; tap = detail |
| Keypad | `KeypadView` | dial pad, live contact-match suggestion (under number), call, backspace, add-to-contacts (only for unknown numbers), **physical keyboard input** (digits + backspace, ignored while a field is focused) |

- Only the inner `.pa-scroll` region scrolls; headers stay fixed.
- Contact detail: call (visual), number, notes, favorite toggle, **Block/Unblock**, delete.
- Contact editor: Name, Phone number, Notes, optional image-URL (letter-avatar fallback,
  single Apple-gray color).
- Avatars: photo if `img` set, else gray letter circle, else person glyph.
- Data persists per citizenid; `loadPhoneState` refreshes after each call (for recents).

---

## Calls  (server/main.lua call manager + client/main.lua)

Real player-to-player voice via **pma-voice** call channels.

**Flow:** `call:start` → server resolves number → online player (registry + QBox) →
assigns a channel → `outgoing` to caller, `incoming` to callee (+ 3D ringtone) →
`accept` → `connected` (both `setCallChannel(channel)`) → `hangup`/`decline`/30s
timeout → `ended`. Both sides logged to Recents (caller=out, callee=in/missed).

- **Incoming UI:** Dynamic-Island banner if the phone was open; **auto-opens to a full
  incoming screen** if closed. Calling/in-call screens show **End + Mute only**.
- **Mute:** relayed — the *other* player's client `toggleMutePlayer`s you (pma-safe; pma
  forbids `NetworkSetVoiceActive`). "You can still talk" is normal; *they* can't hear you.
- **Ringtone (3D, xsound):** server `PlayUrlPos(-1, …, calleeCoords, loop)` so callee +
  nearby players hear it; callee client updates `Position` to follow them; destroyed on
  answer/decline/timeout/hangup. URL = `Config.RingtoneUrl`
  (`https://cfx-nui-xsound/html/sounds/ringtone.mp3`).
- **2D UI sounds (web/public/audio/):** `ringback` (caller waiting), `end` (ended),
  `busy` (failed: busy/unavailable/invalid/airplane). Tries `.mp3/.ogg/.wav`.
- **Bad numbers:** offline/invalid → `unavailable`; in a call → `busy`.

---

## Airplane mode

- Per-player `settings.airplane`. **Callee airplane → caller gets "Unavailable."**
  **Caller airplane → "No Service"** (can't place calls). Status bar shows airplane icon.
- Toggle now: **`/airplane`** (dev). Server callbacks `setAirplane` (explicit) +
  `toggleAirplane`. Future: a Settings switch (use `setAirplane` thunk).

## Block list

- Per-player `phone.blocked` (map `digits -> {number,name,ts}`). If you block a number,
  when **they call you they get "Unavailable"** (silent, not logged). You can still call them.
- Block/unblock now: **Contact detail → Block/Unblock this Caller**. Server callbacks
  `block`/`unblock`. Future: a blocked-list view in Settings (data already in `getState`).

---

## Photos app  (client+server/app/photos/photos.lua + web/src/app/photos/)

First **modular app** (per-app folder, both Lua sides). iOS-18 style.

- **Library / Favorites** tabs in a floating liquid-glass nav; a **search** button that
  **expands** the bar into a search field (filters by date label / type for now).
- **Grid** of square thumbnails (3-col), **chronological (newest LAST**, like iPhone;
  auto-scrolls to the newest on open). Videos show their **duration** (e.g. `0:02`)
  bottom-right instead of a play icon.
- **Fullscreen viewer** (iPhone-style): back + centered **date/time** header, the photo,
  **prev/next arrows**, a **filmstrip** of all items (current one enlarged + outlined, tap
  to jump), and **favorite + delete** at the bottom. Swipe left/right too. No share/3-dots.
- **Custom video player** (`VideoPlayer.jsx`): tap to play/pause, big center play when
  paused, a glass control bar with play/pause + scrubber + time labels (not the browser's
  default controls).
- **Video duration**: recorded with the clip (`photo.duration`, from the record timer) and
  shown in the grid + player. Old clips with no stored duration are read from the file —
  MediaRecorder webm reports `Infinity` until forced to seek (`readDuration` in
  `duration.js`), which is why they used to show `0:00`.
- **Select mode** (`Select`): multi-select → bulk Favorite / Delete.
- **Storage**: `doc.photos.items[]` per citizenid. Add via Camera later, the `/addphoto
  <url> [image|video]` dev command, or by hand-editing the JSON (fields auto-normalise).
- Server: `server/app/photos/photos.lua`. Client bridge: `client/app/photos/photos.lua`.
  UI: `web/src/app/photos/`. Slice: `photos`. (New Lua files → needs `refresh`.)

## Camera app  (client+server/app/camera/main.lua + web/src/app/camera/)

Uses GTA's **native phone camera** (`CreateMobilePhone` + `CellCamActivate` +
`CellFrontCamActivate` `0x2491A93618B7D838`) so the viewfinder is the character's
**real point of view** — rear cam = the forward view, front cam = a selfie — with
the built-in hold-up animation. Modeled on the user's `recordvideo` test script.

The live view is **rendered into a `<canvas>` inside the phone screen**:
`web/public/gamerender/gamerender.js` uses FiveM's patched Three.js where
`CfxTexture` is backed by the game backbuffer; it reads back a **centered portrait
strip** (matching the phone screen aspect) into `.camera__feed` every frame. So the
canvas IS exactly the phone view. The camera app sits INSIDE the phone case like
every other app. Renderer is no-op outside FiveM's CEF (browser dev = black feed).
> Constraint: `CfxTexture` grabs the single fullscreen backbuffer, so the phone
> shows the *same* camera that's on screen (the native phone cam), and the game
> still renders fullscreen behind the phone.

**Capture saves the PHONE VIEW, not a PC screenshot.** The NUI captures the
`.camera__feed` canvas (photo = `toDataURL` JPEG, video = `captureStream` +
`MediaRecorder` webm) and **uploads it client-side** (`fetch` + `FormData`, which
is binary-safe) to the configured provider, then `phone:camera:save` → the shared
`oph3z-phone:server:photos:add` callback → gallery update. Provider config is sent
to the NUI by the `phone:camera:enter` callback.

**Provider is config-selectable** (`Config.Camera.provider`):
- `'discord'` → POST to the webhook with a `payload_json` part `{"attachments":
  [{"id":0,"filename":…}]}` **plus** `files[0]` (both required, else Discord 400/403).
  Reads `attachments[0].url`. Free, but on some networks Cloudflare blocks FiveM's
  CEF from uploading to Discord (`403 40333 "internal network error"`) — then use…
- `'fivemanage'` → POST `file` + `Authorization` header; reads `data.url`. Needs a
  (free) API key, works everywhere.

> Upload is **client-side** because FiveM's server `PerformHttpRequest` is not
> binary-safe (mangles the image → Discord `400 "no body"`). The webhook/key is
> therefore sent to the client. (screencapture is no longer used.)

- **Photo:** tap shutter → white flash → capture canvas → upload → `Photos.Add`
  → live thumbnail + gallery update. No screen-hiding needed (canvas = clean view).
- **Video:** tap shutter to start (red, REC timer), tap to stop → upload webm →
  saved as `type:video`. Recorded entirely in the NUI from the canvas stream.
- **View:** PHOTO = native phone camera (framed POV; player rooted; **flip** rear ↔
  front native selfie via `CellFrontCamActivate`; selfie shifts the crop left).
  VIDEO = **scripted cam** (`CreateCam` + `RenderScriptCams`) ahead of the head with
  the held phone model destroyed, so the player can **walk/run** while filming;
  **flip** moves the cam out front looking back (centred selfie, no crop shift);
  **scroll zooms** the FOV (`videoFov`, 22–75). (An earlier first-person attempt with
  the phone model spawned blocked the view = black; the scripted cam avoids that.)
- **Input:** keep-input on. BOTH modes **rotate only while holding RIGHT MOUSE**
  (plain mouse = cursor only, no twitch). PHOTO = no walking, scroll zoom (native).
  VIDEO = walk/run/sprint, scroll zoom (FOV), flip selfie — all usable **while
  recording**. Mode via `phone:camera:mode`; flip resets the crop-shift on mode change.
- **Timer:** the REC timer is shown the whole time in video mode (dim `00:00` idle)
  and blinks + counts once recording starts.
- **On close:** `exitCamera` re-runs `Phone.startAnim()` so the hold pose isn't
  dropped (the native cam clears the ped task).
- **Layout:** in-phone viewfinder (`.camera__feed` canvas) with a black top bar
  (flat bottom, height 4.9em) + black bottom controls bar.
- **Controls:** PHOTO/VIDEO toggle, shutter, flip, gallery thumb (→ opens Photos),
  Esc to exit.

---

## Maps app  (client+server/app/maps/main.lua + web/src/app/maps/)

A **Leaflet** GTA V map (raw Leaflet, not react-leaflet) using the `gta-v-map-leaflet`
**atlas** tiles. Tiles live in `web/public/mapStyles/styleAtlas/{z}/{x}/{y}.jpg` (served
to the NUI; globbed in fxmanifest) and load via a **custom CRS** (`L.CRS.Simple` +
`L.Transformation(scaleX, centerX, -scaleY, centerY)`, values in `MAP` at the top of
`MapsApp.jsx` — tune if the marker is offset). GTA `(x,y)` → Leaflet `[y, x]`.

- **Live player marker**: client streams `GetEntityCoords` every 500ms while the app is
  open (`phone:maps:enter`/`exit` → `phone:maps:pos`). Pulsing blue dot. Opens **centered
  on you and follows**; panning the map stops follow.
- **Recenter button**: snaps back to you (re-enables follow).
- **Custom blips (saved places)**: **right-click** the map → a **draggable pin** drops →
  drag to position → name it → **Save** (persisted per citizenid in `doc.maps.blips`).
  Tap a saved blip → **Set Waypoint** (real in-game `SetNewWaypoint`) or **Delete**;
  **hold-drag a saved blip** to reposition it (persists via `phone:maps:move`).
  Name-only. Left-click closes an open blip sheet.
- **Zoom/pan limits**: solid `maxBounds` (no panning into the void) + a dynamic `minZoom`
  (computed from the container so the map always covers the screen — no black bars).
- Slice: `maps` (blips). Dep: `leaflet` (npm). Server CRUD: `oph3z-phone:server:maps:*`.
- **Planned (with Messages)**: *Send location* + *Send live location* (with a timer/expiry
  and the ability to stop sharing). Built later when the Messages app exists.

> ⚠️ New Lua files + fxmanifest tiles → needs `refresh` then `restart`.

---

## Messages app  (client+server/app/messages/main.lua + web/src/app/messages/)

iMessage-style 1-on-1 texting by phone number. **Core text messaging is done**;
the 4 attachment features are the next phase.

- **Three screens** (match the iPhone Messages UI): **thread list** (large "Messages"
  title, Filters, compose ✎; rows = avatar + name + preview + time + unread dot),
  **conversation** (back + centered avatar/name, blue/gray bubbles, link-ify, composer
  bar with camera/＋/mic/send — **no Spotify bar**), **new message** (To: field with
  contact suggestions + Cancel).
- **Storage**: each player keeps their own threads in `doc.messages.threads[otherDigits]
  = { number, items[], unread }`. Sending writes BOTH sides + live-pushes to the
  recipient if online (`oph3z-phone:client:messages:incoming` → `phone:messages:incoming`);
  offline players get it on next load. Blocked sender → recipient copy skipped.
- Server: `oph3z-phone:server:messages:{threads,open,send}`. Names/avatars resolved from
  contacts at read time (`DB.ResolveContact`). Slice: `messages`.
- **Next (features, chosen):** send **money** (bank transfer, qbx_core), send **photo/video**
  (gallery + new capture), send **location / live location** (tappable card → opens Maps;
  live has expiry + stop), **voice message** (MediaRecorder + getUserMedia — works only if
  the build allows mic access; FiveM CEF usually blocks it).

---

## Config reference (config.lua)

Config is intentionally **lean** — only meaningful options live here; fiddly tunables
(flashlight/glow colors, anim clips, prop bone/offset, selfie offsets, capture
encoding/size, ring volume/distance) are hardcoded in the relevant Lua files.

| Group | Keys |
|---|---|
| General | `Debug`, `Command`, `Keybind`, `ItemName`, `RequireItem`, `DataFolder` |
| Numbers | `PhoneNumberPrefix` (`555`) |
| Defaults | `DefaultSettings` = `{wallpaper, brightness, locked, airplane}` |
| Prop | `UseProp`, `PropModel` |
| Calls | `RingTimeout` (30), `MaxRecents` (50), `RingtoneUrl` |
| Camera | `Camera.provider` (`discord`/`fivemanage`), `Camera.discord.webhook`, `Camera.fivemanage.{apiKey,url}` |
| Lock/time | `UseGameTime, Temperature, TempUnit` |

---

## Dev workflow ⚠️

- **NUI changes:** rebuild — `cd web && npm run build`. Hashed filenames bust CEF cache.
  Then `restart oph3z-phone`.
- **Lua changes to EXISTING files:** plain `restart oph3z-phone` is enough.
- **NEW Lua file added to fxmanifest:** needs `refresh` first (then restart) — the user's
  reload flow doesn't re-scan new files. **Prefer adding code to existing files** (that's
  why animation/flashlight/calls all live in client/main.lua, not separate files).
- **Audio files:** drop into `web/public/audio/` then rebuild (copied to `build/audio/`,
  served via fxmanifest `files{}`). Ringtone lives in `xsound/html/sounds/` instead.
- Browser dev: `cd web && npm run dev` — auto-opens with mock data (isEnvBrowser).

---

## Roadmap / next

- **Photos** ✅ → **Camera** ✅ → **Messages** (uses Camera + Photos) ← next.
- **Settings app**: wallpaper, scale slider, **airplane toggle**, **blocked-numbers list**
  (unblock), brightness — backends already exist.
- Phone app polish after live 2-player test (mute/voice verification).
- Possible: in-call "Add To Contacts", PIN lock, notifications.

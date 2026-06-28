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
- **Grid** of square thumbnails (3-col), newest-first; videos show a play badge and play
  in the viewer. **Fullscreen viewer**: swipe between items, favorite, delete.
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
- **View:** PHOTO = native phone camera (framed POV; **flip** rear ↔ front native
  selfie via `CellFrontCamActivate`; selfie shifts crop left). VIDEO = first-person
  gameplay cam (`SetFollowPedCamViewMode 4`). The native phone cam ROOTS the player,
  so video switches off it to allow movement. Flip is photo-only. `applyCameraForMode`.
- **Input:** keep-input on. PHOTO = **rotate by holding RIGHT MOUSE** (no free
  mouse-look), zoom via scroll, **no walking**. VIDEO = **free look 360° + walk/run/
  sprint** (first-person). Client switches cam/controls via `phone:camera:mode`.
- **Timer:** the REC timer is shown the whole time in video mode (dim `00:00` idle)
  and blinks + counts once recording starts.
- **On close:** `exitCamera` re-runs `Phone.startAnim()` so the hold pose isn't
  dropped (the native cam clears the ped task).
- **Layout:** in-phone viewfinder (`.camera__feed` canvas) with a black top bar
  (flat bottom, height 4.9em) + black bottom controls bar.
- **Controls:** PHOTO/VIDEO toggle, shutter, flip, gallery thumb (→ opens Photos),
  Esc to exit.

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

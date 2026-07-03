# oph3z-phone — Lua ↔ NUI contract

Every message/callback/event the resource uses. Keep this in sync when adding features.

---

## 1. Server ox_lib callbacks  (`lib.callback.register` in server/main.lua)

Called from the client via `lib.callback.await('<name>', false, ...args)`.

| Name | Args | Returns |
|---|---|---|
| `oph3z-phone:server:getData` | – | `{ citizenid, name, email, avatar, settings, number, numberRaw, home }` (also ensures phone number, mail address + profile) |
| `oph3z-phone:server:saveSettings` | `patch` (table) | `bool` |
| `oph3z-phone:server:phone:getState` | – | `{ number, contacts, recents, blocked, airplane }` |
| `oph3z-phone:server:phone:addContact` | `{name,number,notes,img}` | `contact` or `nil` |
| `oph3z-phone:server:phone:updateContact` | `{id,name,number,notes,img}` | `bool` |
| `oph3z-phone:server:phone:deleteContact` | `id` | `bool` |
| `oph3z-phone:server:phone:setFavorite` | `{id,favorite}` | `bool` |
| `oph3z-phone:server:phone:block` | `number` (string) | `blocked` map |
| `oph3z-phone:server:phone:unblock` | `number` (string) | `blocked` map |
| `oph3z-phone:server:phone:setAirplane` | `value` (bool) | new bool |
| `oph3z-phone:server:phone:toggleAirplane` | – | new bool |

Server input is sanitized/length-capped (`sanitizeContact`, `clean`).

### Photos app  (server/app/photos/photos.lua)
| Name | Args | Returns |
|---|---|---|
| `oph3z-phone:server:photos:get` | – | `items[]` |
| `oph3z-phone:server:photos:add` | `{url,type,thumb?}` | `photo` or `nil` |
| `oph3z-phone:server:photos:setFavorite` | `{id,favorite}` | `bool` |
| `oph3z-phone:server:photos:delete` | `ids[]` | `bool` |

Photo item: `{ id, url, type:'image'|'video', thumb?, favorite, ts }`. Stored in
`doc.photos = { items[], nextId }`. Hand-added entries (`{url,type}`) are normalised on
load (id/favorite/ts filled in). NUI callbacks: `phone:photos:get|add|setFavorite|delete`.
Dev command: `/addphoto <url> [image|video]`. Redux slice: `photos { loaded, items, lightbox }`.
Reusable on the server: `Photos.Add(citizenid, {url,type})`. Server push to client:
`oph3z-phone:client:photoAdded` (photo) → NUI `phone:photos:added`.

### Profile app  (server/app/profile/main.lua, client/app/profile/main.lua)
The phone "ID": display name + avatar, stored in `doc.profile = { name, avatar }`
(independent of the QBox character name). Mail address is generated in
`DB.EnsureMail` and is read-only here.
| Name | Args | Returns |
|---|---|---|
| `oph3z-phone:server:profile:setName` | `name` (string) | saved name or `false` |
| `oph3z-phone:server:profile:setAvatar` | `url` (string, `''` clears) | saved url or `false` |

NUI callbacks: `phone:profile:setName {name}`, `phone:profile:setAvatar {url}`.
Thunks (phoneSlice): `saveProfileName`, `saveAvatar` — both optimistically update
`phone.identity` then persist.

### Ringtones app  (server/app/ringtones/main.lua, client/app/ringtones/main.lua)
Built-ins from `Config.Ringtones` + player custom ones in `doc.ringtones = {items[],
nextId}`. Selection is `doc.settings.ringtone` (URL, saved via `saveSettings`).
`Ringtones.UrlFor(cid)` resolves the callee's ringtone for `startRingtone`.
| Name | Args | Returns |
|---|---|---|
| `oph3z-phone:server:ringtones:get` | – | `{ ringtones:[{id,name,url,builtin}], selected }` |
| `oph3z-phone:server:ringtones:add` | `{name,url}` | new item or `nil` |
| `oph3z-phone:server:ringtones:delete` | `id` (string) | `bool` |

NUI callbacks: `phone:ringtones:get|add|delete`. Slice: `ringtones { loaded, items[] }`
(thunks `loadRingtones`, `addRingtone`, `deleteRingtone`; selection via
`saveSetting('ringtone', url)`). Preview plays in the NUI `<audio>`.

### Notifications  (server/app/notifications/main.lua)
`Notif.Push(citizenid, { app, title, body, icon?, route? })` stores + live-pushes a
notification — **unless** the player's settings suppress it: `settings.notifMaster
== false` (master off) or `settings.notifApps[app] == false` (that app off) → the
push is dropped entirely (nothing stored/delivered/badged). The
`settings.notifSound` toggle is honoured client-side in `App.jsx` (sound only).
| Name | Args | Returns |
|---|---|---|
| `oph3z-phone:server:notifications:get` | – | `items[]` (newest first) |
| `oph3z-phone:server:notifications:read` | `{all}\|{id}\|{app}\|{number}\|{gid}` | `bool` |
| `oph3z-phone:server:notifications:clear` | `{id}\|{app}\|{number}\|{gid}\|{}` | `bool` |

### Camera app  (server/app/camera/main.lua, client/app/camera/main.lua)
Captures via the **screencapture** resource, uploads to Discord/Fivemanage
(`Config.Camera.provider`), saves the URL via `Photos.Add`.
| Direction | Name | Notes |
|---|---|---|
| server cb | `oph3z-phone:server:camera:photo` | capture+upload photo → returns the new photo |
| C→S event | `oph3z-phone:server:camera:videoStart` / `videoStop` | start/stop recording |
| S→C event | `oph3z-phone:client:camera:videoStarted` / `videoDone` | recording state |
| NUI cb | `phone:camera:enter` / `exit` | enter/leave camera mode (keep-input, disable combat) |
| NUI cb | `phone:camera:photo` | hide UI+cursor → capture → restore → returns photo |
| NUI cb | `phone:camera:videoStart` / `videoStop` / `flip` | record + selfie toggle |
| NUI msg | `phone:camera:capturing` (bool) / `phone:camera:videoState` ({recording}) | UI hints |

Camera renders **inside the phone**: in camera mode the screen goes transparent and the
opaque case's center is **clip-path'd into a window** (`.phone--camera`) so the live game
shows through as the viewfinder. Photo capture hides the whole phone (App `visibility`)
for one clean frame. Selfie = a `CreateCam` facing the player. The capture is the full
screen (the in-phone viewfinder shows the slice behind the phone).

---

## 2. Call net events

### Client → Server (`TriggerServerEvent`)
| Event | Args |
|---|---|
| `oph3z-phone:call:start` | `rawNumber` |
| `oph3z-phone:call:accept` | `callId` |
| `oph3z-phone:call:decline` | `callId` |
| `oph3z-phone:call:hangup` | `callId` |
| `oph3z-phone:call:mute` | `callId, muted` |

### Server → Client (`TriggerClientEvent`)
| Event | Payload |
|---|---|
| `oph3z-phone:call:outgoing` | `{ callId, number, name, img }` (what caller sees of callee) |
| `oph3z-phone:call:incoming` | `{ callId, number, name, img }` (what callee sees of caller) |
| `oph3z-phone:call:connected` | `{ callId, channel }` → both `setCallChannel(channel)` |
| `oph3z-phone:call:ended` | `{ callId, reason }` |
| `oph3z-phone:call:failed` | `{ reason }`  (reasons: `unavailable`/`busy`/`invalid`/`airplane`) |
| `oph3z-phone:call:remoteMute` | `otherSrc, muted` → receiver `toggleMutePlayer(otherSrc)` |

`reason` values surfaced in the UI: `unavailable, busy, invalid, declined, noanswer,
hangup, airplane` (see `CallScreen.jsx` REASON_TEXT).

---

## 3. Client NUI callbacks  (`RegisterNUICallback` in client/nui.lua + main.lua)

Called from React via `fetchNui('<event>', data, mock)`.

| Event | data | Action |
|---|---|---|
| `phone:close` | – | release focus, hide |
| `phone:saveSettings` | settings patch | persist via server (also used for `notifSound`/`notifMaster`/`notifApps`) |
| `phone:profile:setName` | `{ name }` | → server profile:setName |
| `phone:profile:setAvatar` | `{ url }` | → server profile:setAvatar |
| `phone:flashlight` | `{ on }` | toggle in-game beam |
| `phone:ready` | – | readiness ping |
| `phone:phone:getState` | – | → server getState |
| `phone:phone:addContact` | `{name,number,notes,img}` | → server addContact |
| `phone:phone:updateContact` | `{id,…}` | → server updateContact |
| `phone:phone:deleteContact` | `{id}` | → server deleteContact |
| `phone:phone:setFavorite` | `{id,favorite}` | → server setFavorite |
| `phone:phone:block` | `{number}` | → server block |
| `phone:phone:unblock` | `{number}` | → server unblock |
| `phone:phone:setAirplane` | `{value}` | → server setAirplane |
| `phone:call:start` | `{number}` | → server call start |
| `phone:call:accept` | `{callId}` | → server accept |
| `phone:call:decline` | `{callId}` | → server decline |
| `phone:call:hangup` | `{callId}` | → server hangup |
| `phone:call:mute` | `{callId, muted}` | → server mute relay |

---

## 4. Client → NUI messages  (`SendNUIMessage`, consumed by `useNuiEvent` in App.jsx)

| action | data |
|---|---|
| `phone:setVisible` | `{ visible, settings, time }` (settings/time only when opening) |
| `phone:time` | time object (streamed every 1s while open) |
| `phone:settings` | partial settings, e.g. `{ airplane }` (live external change) |
| `phone:call` | `{ type, … }` — `type`: `incoming` (`island`,callId,number,name,img) / `outgoing` / `active` / `ended`(reason) / `failed`(reason) |

`time` object: `{ useGameTime, hours, minutes, day, month, weekday, year, weather, temperature, tempUnit }`
where `weather` is a category string: `clear/cloudy/fog/rain/thunder/snow`.

---

## 5. Redux store (web/src/store)

| Slice | State |
|---|---|
| `phone` | `visible, locked, activeApp, flashlightOn, controlCenterOpen, launchTab, identity{number,numberRaw,citizenid,name,email,avatar}, time` |
| `settings` | `loaded, wallpaper, brightness, volume, airdrop, airplane, notifSound, notifMaster, notifApps{}` |
| `contacts` | `loaded, number, contacts[], recents[], blocked{}` |
| `call` | `state, island, callId, number, name, img, muted, answeredAt, reason` |
| `dialog` | `open, title, message, buttons[]` (confirm/alert) |
| `prompt` | `open, title, message, placeholder, value, confirmText, cancelText, maxLength` (text-input popup) |

Notable thunks: `loadPhoneState`, `addContact/editContact/deleteContact`,
`toggleFavorite`, `blockNumber/unblockNumber`, `saveSetting`, `saveSettingLive`,
`flushSettings`, `setAirplane`, `setAppNotif`, `saveProfileName`, `saveAvatar`,
`openDialog`/`resolveDialog`, `openPrompt`/`resolvePrompt`.

---

## 6. Commands / keybinds / exports (client)

- Keybind: `+oph3z_phone` (default **F1**, `Config.Keybind`) toggles the phone.
- `/phone` (`Config.Command`) toggles.
- `/airplane` — dev toggle for airplane mode (becomes a Settings switch later).
- ox_inventory item export: `oph3z-phone.usePhone` (item `Config.ItemName`).

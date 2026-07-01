# Building third-party apps for oph3z-phone

You can add apps to the phone from your **own resource**, without editing
oph3z-phone. Your app is a normal FiveM resource that:

1. **registers itself** with the phone (icon + name), and
2. **renders its own UI** (any framework) inside the phone via an iframe.

Data and actions are exposed through **exports**. There's a ready-to-copy starter
in `resources/[phone]/oph3z-phone-app-template`.

---

## 1. Register your app (client)

```lua
local resource = GetCurrentResourceName()

local APP = {
    id        = 'myapp',                                    -- unique id
    label     = 'My App',                                   -- name under the icon
    developer = 'your-name',                                -- shown in the App Store
    place     = 'grid',                                     -- 'grid' (home) or 'dock' (bottom bar)
    icon      = ('nui://%s/ui/icon.svg'):format(resource),  -- any image url
    ui        = ('nui://%s/ui/index.html'):format(resource),-- the iframe page

    -- App Store (optional; used later by the App Store app)
    addAppStore = false,
    headerImage = ('nui://%s/ui/header.webp'):format(resource),
    swiperItems = {},                                       -- screenshot urls
}

local function register()
    if GetResourceState('oph3z-phone') ~= 'started' then return end
    exports['oph3z-phone']:RegisterApp(APP)
end

CreateThread(function() Wait(1000) register() end)         -- on our start
AddEventHandler('oph3z-phone:requestApps', register)        -- when the phone (re)starts
```

Registration fields: `id`, `label`, `developer`, `place` (`'grid'`/`'dock'`),
`icon` (image url), `ui` (the iframe page). The App Store fields (`addAppStore`,
`headerImage`, `swiperItems`) are optional and reserved for the upcoming store.

Expose your page + icon in your `fxmanifest.lua`:

```lua
client_script 'client.lua'
files { 'ui/index.html', 'ui/style.css', 'ui/app.js', 'ui/icon.svg' }
```

> **Do NOT set `ui_page`.** `ui_page` makes FiveM render your page as its own
> always-on fullscreen NUI layer (it would cover the screen even when the phone is
> closed). Your page is loaded by the phone inside an iframe, so it only needs to
> be listed under `files`. `fetchNui` ↔ your own `RegisterNUICallback` still works
> from the iframe without a `ui_page`.

The phone automatically **removes** your app when your resource stops.

### Client exports

| Export | Description |
|---|---|
| `RegisterApp(def)` | Add/replace your app. `def = { id, label, developer?, icon, ui, place, addAppStore?, headerImage?, swiperItems? }`. Returns `true` on success. |
| `UnregisterApp(id)` | Remove an app you registered. |
| `OpenApp(id)` | Open the phone (if closed) and jump to an app (yours or built-in). |
| `IsOpen()` | Is the phone currently open? |
| `GetNumber()` | The player's formatted number (cached once the phone has been opened; may be `nil` before then). |
| `GetIdentity()` | `{ number, numberRaw, citizenid }` (same caveat as above). |

---

## 2. The iframe bridge

Your page runs inside an iframe. The phone talks to it with `postMessage`:

| Direction | Message | Meaning |
|---|---|---|
| phone → app | `{ type:'oph3z:init', identity:{ number, numberRaw, citizenid }, app:{ id, label } }` | Sent on load; the player's identity. |
| app → phone | `{ type:'oph3z:ready' }` | Ask the phone to (re)send `oph3z:init`. |
| app → phone | `{ type:'oph3z:close' }` | Send the player back to the home screen. |

```js
window.addEventListener('message', (e) => {
  if (e.data?.type === 'oph3z:init') {
    const { number, citizenid } = e.data.identity;
    // ...build your UI
  }
});
window.parent.postMessage({ type: 'oph3z:ready' }, '*'); // request identity
```

**Layout note:** your iframe fills the whole phone screen. The phone's status bar
floats at the top and the home indicator at the bottom — keep ~3.2em top padding
and ~2em bottom padding clear of them.

---

## 3. Reading data & doing actions (server exports)

Phone data lives **server-side**, so call these from your **server script** with
the player's `source`. Your iframe → your `client.lua` (`fetchNui`) → your
`server.lua` → these exports.

### Reads

| Export | Returns |
|---|---|
| `GetCitizenId(src)` | The player's citizenid. |
| `GetPhoneNumber(src)` | Formatted number, e.g. `"555-0142"`. |
| `GetPhoneNumberRaw(src)` | Digits only, e.g. `"5550142"`. |
| `GetContacts(src)` | `{ { id, name, number, notes, img, favorite }, ... }` |
| `ResolveContact(src, number)` | One contact by number, or `nil`. |
| `GetPhotos(src)` | `{ { id, url, type, thumb, favorite, ts }, ... }` |
| `GetRecents(src)` | `{ { id, number, name, img, direction, missed, ts }, ... }` |
| `IsAirplaneMode(src)` | `true`/`false`. |
| `GetBlockedNumbers(src)` | `{ [digits] = { number, name, ts }, ... }` |
| `IsBlocked(src, number)` | `true`/`false`. |

### Actions

| Export | Description |
|---|---|
| `PushNotification(src, data)` | Notify the phone. `data = { app, title, body, icon?, route? }`. Set `app` to **your app id** so the badge lands on your icon. `route = { app = 'myapp' }` makes tapping it open your app. |
| `SendMessage(src, toNumber, payload)` | Send a message **from this player** to a number. `payload = { type?, body, meta? }` (`type` defaults to `'text'`). |
| `PlaceCall(src, toNumber)` | Start a call from this player to a number. Returns the call id. |

```lua
-- server.lua
RegisterNetEvent('myapp:doThing', function()
    local src = source
    local contacts = exports['oph3z-phone']:GetContacts(src)
    exports['oph3z-phone']:PushNotification(src, {
        app = 'myapp', title = 'My App', body = 'Something happened!',
        route = { app = 'myapp' },
    })
end)
```

> Reads are exposed broadly; **writes are intentionally limited** to notifications,
> messages and calls. Contacts, settings and the block list are read-only to
> third-party apps.

### Your own storage

The phone does **not** store data for your app. If your app needs persistence
(an Instagram feed, notes, etc.), use your own database (oxmysql, JSON files,
KVP — whatever you like) in your resource.

---

## 4. Notifications & badges

`PushNotification(src, { app = 'myapp', ... })` will:

- show on the lock screen / banner / closed-phone peek like built-in apps, and
- put an unread **badge** on your app's home-screen icon (badge counts unread
  notifications whose `app` equals your app id).

Add `route = { app = 'myapp' }` so tapping the notification opens your app.

---

## 5. Editing the built-in apps

The built-in app layout (names, order, dock/grid placement, enabling) lives in
`config.lua` under `Config.Apps` — edit it there, no UI changes needed.

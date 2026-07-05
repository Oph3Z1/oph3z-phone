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
    id          = 'myapp',                                    -- unique id
    label       = 'My App',                                   -- name under the icon
    developer   = 'your-name',                                -- shown in the App Store
    description = 'What my app does.',                         -- App Store description
    place       = 'grid',                                     -- where it lands once installed: 'grid'/'dock'
    icon        = ('nui://%s/ui/icon.svg'):format(resource),  -- icon (home + store)
    ui          = ('nui://%s/ui/index.html'):format(resource),-- the iframe page

    -- App Store page (optional)
    headerImage = ('nui://%s/ui/header.webp'):format(resource),
    swiperItems = {},                                         -- screenshot urls
}

local function register()
    if GetResourceState('oph3z-phone') ~= 'started' then return end
    exports['oph3z-phone']:RegisterApp(APP)
end

CreateThread(function() Wait(1000) register() end)         -- on our start
AddEventHandler('oph3z-phone:requestApps', register)        -- when the phone (re)starts
```

**Third-party apps are always listed in the phone's App Store.** They do NOT
auto-appear on the home screen — the player installs them from the App Store (a
"Get" download), then they land on the home screen (in `place`). If the player
deletes your app, it stays in the App Store to reinstall.

Registration fields: `id`, `label`, `developer`, `description`, `place`
(`'grid'`/`'dock'`), `icon` (image url), `ui` (the iframe page), and the optional
App Store page media `headerImage` + `swiperItems` (screenshot urls).

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
| `RegisterApp(def)` | Add/replace your app. `def = { id, label, developer?, description?, icon, ui, place, deletable?, share?, headerImage?, swiperItems? }`. `share = true` lists it in the Messages Share sheet. Returns `true` on success. |
| `UnregisterApp(id)` | Remove an app you registered. |
| `OpenApp(id)` | Open the phone (if closed) and jump to an app (yours or built-in). |
| `IsOpen()` | Is the phone currently open? |
| `Toast(type, title, body, app?)` | Pop a transient status toast (`type`: `'success'`/`'error'`/`'info'`). Throwaway feedback — shows a few seconds, not saved. Only shows while the phone is open. `app` (optional) is an app id to borrow the icon from; defaults to the app currently open. Returns `true` if shown. |
| `GetNumber()` | The player's formatted number (cached once the phone has been opened; may be `nil` before then). |
| `GetIdentity()` | `{ number, numberRaw, citizenid }` (same caveat as above). |

---

## 2. The iframe bridge

Your page runs inside an iframe. The phone talks to it with `postMessage`:

| Direction | Message | Meaning |
|---|---|---|
| phone → app | `{ type:'oph3z:init', identity:{ number, numberRaw, citizenid, name, email, avatar }, app:{ id, label } }` | Sent on load; the player's identity (`name`/`email`/`avatar` are the phone-ID profile). |
| app → phone | `{ type:'oph3z:ready' }` | Ask the phone to (re)send `oph3z:init`. |
| app → phone | `{ type:'oph3z:close' }` | Send the player back to the home screen. |
| app → phone | `{ type:'oph3z:confirm', id, title, message, confirmText?, cancelText?, destructive? }` | Show a native yes/no confirm; reply `{ type:'oph3z:confirm:result', id, confirmed }`. |
| app → phone | `{ type:'oph3z:alert', id, title, message, buttons:[{ text, style?, value? }] }` | Show a native dialog with custom buttons; reply `{ type:'oph3z:alert:result', id, value }`. |
| app → phone | `{ type:'oph3z:prompt', id, title, message?, placeholder?, value?, confirmText?, cancelText?, maxLength?, fields? }` | Show a native **text-input** popup; reply `{ type:'oph3z:prompt:result', id, value }`. `value` = a **string**, or an **object** `{ [key]: value }` when `fields:[{key,placeholder?,value?,optional?}]` is given, or `null` if cancelled. |
| app → phone | `{ type:'oph3z:toast', toastType?, title?, body? }` | Show a **transient status toast** (`toastType`: `'success'`/`'error'`/`'info'`). Looks like a notification but is throwaway — shows a few seconds, never saved. The icon is automatically your app's icon. Fire-and-forget (no reply). Only one shows at a time. |
| app → phone | `{ type:'oph3z:airdrop', title?, payload }` | **AirDrop** `payload` to a nearby player. The phone shows the nearby-people picker + the receiver's Accept/Decline prompt. On accept, the **same app** opens on the receiver's phone. |
| phone → app | `{ type:'oph3z:airdrop:received', payload }` | Delivered to the receiver's app after they **accept** an AirDrop from your app (also fired when someone taps a shared card you sent into a chat). |
| phone → app | `{ type:'oph3z:shareRequest' }` | Your app was opened from the Messages **Share** sheet (register with `share: true`) to provide a shareable item. |
| app → phone | `{ type:'oph3z:shareResult', item:{ title, subtitle?, image?, data? } }` | The item to send into the conversation as a card. Tapping the card re-opens your app with `data` (via `oph3z:airdrop:received`). |
| app → phone | `{ type:'oph3z:shareCancel' }` | Abort the share and return to the chat. |

```js
window.addEventListener('message', (e) => {
  if (e.data?.type === 'oph3z:init') {
    const { number, citizenid } = e.data.identity;
    // ...build your UI
  }
});
window.parent.postMessage({ type: 'oph3z:ready' }, '*'); // request identity
```

### Native confirm / alert dialog

Use the phone's built-in iOS-style dialog instead of `window.confirm`. Send a
request with a unique `id` and await the matching reply:

```js
function phoneConfirm(opts) {
  return new Promise((resolve) => {
    const id = 'c' + Math.random().toString(36).slice(2);
    function onResult(e) {
      if (e.data?.type === 'oph3z:confirm:result' && e.data.id === id) {
        window.removeEventListener('message', onResult);
        resolve(e.data.confirmed);
      }
    }
    window.addEventListener('message', onResult);
    window.parent.postMessage({ type: 'oph3z:confirm', id, ...opts }, '*');
  });
}

// usage
if (await phoneConfirm({ title: 'Delete post?', message: 'This cannot be undone.',
                         confirmText: 'Delete', destructive: true })) {
  // ...they confirmed
}
```

`style` for `oph3z:alert` buttons is `'default'` | `'cancel'` | `'destructive'`.

### Native text-input popup

Use the phone's built-in input popup (the same one Settings uses to rename the
phone ID) instead of `window.prompt`. Resolves the entered string, or `null` on
cancel:

```js
function phonePrompt(opts) {
  return new Promise((resolve) => {
    const id = 'p' + Math.random().toString(36).slice(2);
    function onResult(e) {
      if (e.data?.type === 'oph3z:prompt:result' && e.data.id === id) {
        window.removeEventListener('message', onResult);
        resolve(e.data.value); // string on confirm, null on cancel
      }
    }
    window.addEventListener('message', onResult);
    window.parent.postMessage({ type: 'oph3z:prompt', id, ...opts }, '*');
  });
}

// usage — single field (resolves a string)
const name = await phonePrompt({ title: 'Set nickname', placeholder: 'Type…',
                                 confirmText: 'Save' });
if (name !== null) { /* they confirmed — use `name` */ }

// usage — multiple fields (resolves an object { name, url })
const item = await phonePrompt({
  title: 'Add New Item', confirmText: 'Add',
  fields: [ { key: 'name', placeholder: 'Name' }, { key: 'url', placeholder: 'Paste URL' } ],
});
if (item) { /* item.name, item.url */ }
```

Both `phoneConfirm()` and `phonePrompt()` ship ready-to-use in the
**oph3z-phone-app-template** (`ui/app.js`).

### Status toast (success / error / info)

A lightweight, throwaway message that pops at the top for a few seconds and is
**never saved** (unlike a notification). Use it for quick feedback — "Saved",
"Couldn't connect". The icon is automatically your app's icon. Fire-and-forget:

```js
function phoneToast(toastType, title, body) {
  window.parent.postMessage({ type: 'oph3z:toast', toastType, title, body }, '*');
}

// usage
phoneToast('success', 'Saved', 'Your changes were saved.');
phoneToast('error', 'Oops', 'Something went wrong.');
```

Only one toast shows at a time — while one is on screen, further toasts are
dropped (a status message doesn't stack). Ships ready-to-use in the template.

### AirDrop (share with a nearby player)

Hand a payload to a nearby player who also has your app. The phone handles the
nearby-people picker and the receiver's Accept/Decline prompt; on accept, the
**same app** opens on their phone and receives the payload. Great for "share this
profile / post / item" features.

```js
// Sender: AirDrop a payload. `title` shows in the receiver's prompt
// ("<name> would like to share <title>").
function phoneAirdrop(title, payload) {
  window.parent.postMessage({ type: 'oph3z:airdrop', title, payload }, '*');
}
phoneAirdrop('a profile', { userId: 42, handle: '@john' });

// Receiver: your app opens with the payload once they accept.
window.addEventListener('message', (e) => {
  if (e.data?.type === 'oph3z:airdrop:received') {
    const payload = e.data.payload; // { userId: 42, handle: '@john' }
    // ...open the profile, save it, etc.
  }
});
```

The receiver must have **AirDrop turned on** (Control Center) and be within range
(`Config.Airdrop.Range`). If they don't have your app installed, the sender is told.
Ships ready-to-use in the template (the **AirDrop to nearby** button).

### Share into a conversation (Messages "Share" sheet)

Register your app with **`share = true`** and it appears in the Messages `+` →
**Share** sheet. When the player picks it, the phone opens your app with
`oph3z:shareRequest`; you show your own picker and return an item, which is posted
into the conversation as a card. Tapping that card later re-opens your app with the
item's `data`.

```lua
-- config.lua / RegisterApp def
exports['oph3z-phone']:RegisterApp({ id = 'myapp', ui = '…', share = true, --[[ … ]] })
```
```js
window.addEventListener('message', (e) => {
  if (e.data?.type === 'oph3z:shareRequest') {
    // show your picker, then return the chosen item:
    window.parent.postMessage({
      type: 'oph3z:shareResult',
      item: { title: 'Profile: @john', subtitle: 'Tap to open', data: { userId: 42 } },
    }, '*');
    // ...or window.parent.postMessage({ type: 'oph3z:shareCancel' }, '*');
  }
});
```

Ships ready-to-use in the template (`share = true` + a demo picker).

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
| `SendMail(src, opts)` | Drop **system mail** into this player's Mail inbox. `opts = { from = 'LS Bank', fromAddress? = 'noreply@lsbank.com', subject, body, attachments? = { { url, thumb? } } }`. Fires a phone notification. Returns the stored inbox item. |
| `CreateBill(target, data)` | Add a **bill** to a player's Wallet. `target` = server id OR citizenid string. `data = { issuer = 'LS Water', label = 'Water bill', amount = 250 }`. Fires a phone notification. Returns the stored bill. *(This uses the default bills provider — see below.)* |

**Swappable billing provider.** The Wallet reads/pays bills only through `server/app/wallet/bills_provider.lua`. Everyone's billing system differs, so to integrate your own, edit that one file to call your resource, keeping these functions + return shapes:
- `BillsProvider.Get(citizenid)` → `{ { id, issuer, label, amount, ts, paid }, ... }`
- `BillsProvider.Pay(citizenid, billId)` → `{ ok = true, amount, issuer, label }` or `{ ok = false, reason }` (the provider owns the charge)
- `BillsProvider.CreateBill(citizenid, data)` → the stored bill (optional; drop it if bills come from your resource)

The default provider stores bills in the phone DB and charges the player's bank.

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

Your app gets the **exact same** notification system as the built-in apps. There
are two, deliberately separate kinds:

**Saved notification** — `PushNotification(src, { app = 'myapp', ... })` (server export). It:

- shows on the lock screen / banner / closed-phone peek like the built-ins,
- is **saved** to the Notification Center and survives relogs (works offline too),
- puts a red unread **count badge** on your app's home-screen icon — top corner,
  exactly like Messages and Phone (the badge counts unread notifications whose
  `app` equals your app id), and
- automatically uses **your app's icon** on the card (no need to pass `icon`).

When the player **opens your app**, its notifications are **removed** — both the
badge and the entries in the Notification Center — exactly like opening a chat in
Messages. Add `route = { app = 'myapp' }` so tapping a notification opens your app
(which then clears it).

```lua
-- server.lua
exports['oph3z-phone']:PushNotification(src, {
    app = 'myapp', title = 'New order', body = 'You have a delivery request.',
    route = { app = 'myapp' }, -- tap opens your app
})
```

> Respects the player's **Notifications settings** — the master switch and the
> per-app toggle for your app gate it server-side (a disabled notification is
> dropped entirely: not stored, delivered or badged).

**Status toast** — `oph3z:toast` postMessage (client, from your iframe). Transient
success/error/info feedback: shows for a few seconds, is **never saved**, and does
**not** badge. See "Status toast" in §2. Use `PushNotification` for things the
player should be able to come back to; use a toast for throwaway feedback.

---

## 5. Editing the built-in apps

The built-in app layout (names, order, dock/grid placement, enabling) lives in
`config.lua` under `Config.Apps` — edit it there, no UI changes needed.

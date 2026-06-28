# oph3z-phone

A custom, iPhone-style phone for the **Qbox (qbx_core)** framework.
Built from scratch with **React + Redux Toolkit (Vite)** on the NUI side and Lua
on the game side. Player data is stored as **per-citizenid JSON files** — no SQL.

> **Status:** Phase 1 + Phone app + Calls + Airplane/Block done. Messages app next.
>
> 📚 **Full developer docs live in [`docs/`](docs/README.md)** — read those before
> changing anything: [ARCHITECTURE](docs/ARCHITECTURE.md) · [API contract](docs/API.md) ·
> [FEATURES & config](docs/FEATURES.md).

---

## Features (Phase 1)

- Pixel-styled iPhone frame using your `case.png`, anchored bottom-right and
  fully **responsive** (scales with screen resolution).
- **Lock screen**: live in-game clock, date, weather glyph + temperature,
  swipe-up / tap to unlock, flashlight & camera quick buttons.
- **Home screen**: 4-column app grid + frosted dock, tap an icon to open it.
- **JSON database**: one file per player keyed by `citizenid`.
- Opens via **F1 keybind**, the **`/phone`** command, or an **ox_inventory item**.

---

## Requirements

- `qbx_core`
- `ox_lib`
- `ox_inventory` (only if you use the phone *item*)

---

## Installation

1. Place this folder at `resources/[phone]/oph3z-phone`.

2. **Build the UI** (needs [Node.js](https://nodejs.org) 18+):

   ```bash
   cd resources/[phone]/oph3z-phone/web
   npm install
   npm run build
   ```

   This produces `web/build/`, which the resource serves as its NUI.
   Re-run `npm run build` whenever you change anything under `web/src`.

3. Add to your `server.cfg` (after `qbx_core` and `ox_lib`):

   ```cfg
   ensure oph3z-phone
   ```

4. (Optional) Add the **phone item** to ox_inventory — see below.

---

## ox_inventory item (optional)

Add this to `ox_inventory/data/items.lua`:

```lua
['phone'] = {
    label = 'Phone',
    weight = 190,
    stack = false,
    close = true,
    description = 'A smartphone',
    client = {
        export = 'oph3z-phone.usePhone',
    },
},
```

Give a player one with: `/giveitem <id> phone 1`.

To make the phone require the item (instead of always opening on keybind),
set `Config.RequireItem = true` in `config.lua`.

---

## Configuration

All tunables live in [`config.lua`](config.lua): keybind, command, item name,
whether the item is required, default settings, and the lock-screen temperature.

### Fine-tuning the screen position inside the case

If the screen doesn't sit perfectly inside the bezel of your `case.png`, nudge
the CSS variables at the top of
[`web/src/components/Phone/Phone.css`](web/src/components/Phone/Phone.css):

```css
--phone-height: 92vh;     /* overall size */
--screen-inset-x: 2.7%;   /* left/right gap to the bezel */
--screen-inset-y: 1.5%;   /* top/bottom gap to the bezel */
--screen-radius: 8%;      /* screen corner rounding */
```

Rebuild after changing (`npm run build`).

---

## Project structure

```
oph3z-phone/
├── fxmanifest.lua
├── config.lua                  shared config (client + server)
├── client/
│   ├── utils.lua               item check, in-game time/weather
│   ├── main.lua                open/close lifecycle, keybind, item hook
│   └── nui.lua                 NUI callbacks (close, save settings)
├── server/
│   ├── database.lua            JSON read/write per citizenid
│   └── main.lua                ox_lib callbacks (load/save)
├── data/                       per-citizenid JSON files (runtime)
└── web/                        React + Redux NUI (Vite)
    ├── src/
    │   ├── App.jsx             NUI bridge + routing
    │   ├── store/              Redux Toolkit (phone + settings slices)
    │   ├── hooks/              useNuiEvent
    │   ├── utils/              fetchNui, datetime, misc
    │   ├── config/             wallpapers + design constants
    │   ├── apps/registry.js    app definitions + dock/grid layout
    │   ├── components/         Phone, StatusBar, HomeBar, AppIcon
    │   ├── screens/            LockScreen, HomeScreen, AppScreen
    │   └── assets/             case, wallpaper, icons (your exports)
    └── build/                  compiled output (generated)
```

---

## Development (in a browser)

```bash
cd web
npm run dev
```

When not running inside FiveM the app auto-opens on a dark backdrop with mock
data so you can build and preview the UI without launching the server.

---

## Roadmap

- Phase 2: real apps (Phone, Messages, Settings, …), notifications, PIN lock.
- Backend events to wire apps to other Qbox resources.

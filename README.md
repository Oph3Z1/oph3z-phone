# oph3z-phone

A custom, iPhone-style phone for FiveM. It works on ESX, QBCore and Qbox, and comes with a full set of apps, calls, messages, a camera, music, a social app and more, all built to feel like a real smartphone.

> This is a beta release. Please read the [Beta and feedback](#beta-and-feedback) part before reporting anything.

## Showcase

See it in action: [YouTube video](YOUTUBE-LINK-HERE)
<!-- Replace YOUTUBE-LINK-HERE with your video link. -->

## Features

The phone looks and feels like an iPhone. It scales to any screen size and has a lock screen with a live clock and weather, a home screen with apps you can move around, a control center, notifications and a dynamic island. There is also a walk mode so you can move around while using it, and the whole interface can be shown in different languages.

You can open the phone with a key (F1 by default), a command, or as an inventory item.

Apps included:

- Phone: real voice calls through pma-voice, with ringtones, a recents list, a speaker mode so players next to you can hear the call, a proper "phone to your ear" animation, and FaceTime-style video calls.
- Messages: iMessage-style chats with GIFs, voice messages, group chats, and sharing of photos, location and money.
- Camera and Photos: take photos and videos with a front or back camera, save them to your gallery, and AirDrop them to players nearby.
- Music: search and play real songs, build playlists, and play out loud so people around you hear it too.
- Twexa: a built-in social app, a bit like X (Twitter), where players post, follow, reply and repost.
- Marketplace: buy and sell in the city. Post cars, houses or items with photos and a price.
- Wallet: check your balance and transactions, send and receive money, and pay bills.
- Mail, Maps with live GPS, a Clock with alarms and timers that nearby players can hear, a Calculator, Settings, and an App Store to install or remove apps.

## Third-party apps

Developers can build their own apps and add them to the phone without touching the main code. There is a separate starter template for that:

[oph3z-phone-app-template](TEMPLATE-REPO-LINK-HERE)
<!-- Replace TEMPLATE-REPO-LINK-HERE with the template repo link. -->

## Tech stack

- Interface: React 18, Redux Toolkit, Vite, and plain CSS
- Game side: Lua 5.4
- Storage: JSON files, one per player (MySQL is only used for billing)
- Voice and sound: pma-voice and xsound
- Video calls: WebRTC

## Requirements

- A FiveM server on recent artifacts
- One framework: ESX, QBCore or Qbox (older ESX and QB versions work too)
- pma-voice, for calls and voice
- xsound, for ringtones, music and alarm sounds
- oxmysql, only needed for the billing and invoices feature
- An inventory (ox_inventory, qb-inventory, qs-inventory or codem-inventory), only if you want the phone as an item
- Node.js 18 or newer, to build the interface
- ffmpeg on the server, optional, only for recording video with nearby players' voices

## Installation

1. Download the resource and put it in your resources folder, for example `resources/[phone]/oph3z-phone`.

2. Build the interface. You need Node.js 18 or newer.

   ```bash
   cd resources/[phone]/oph3z-phone/web
   npm install
   npm run build
   ```

   This creates a `build` folder at the root of the resource. Run `npm run build` again any time you change something in `web/src`.

3. Add it to your `server.cfg`, after your framework, pma-voice, xsound and oxmysql:

   ```cfg
   ensure oph3z-phone
   ```

4. Open `config.lua` and set it up for your server:

   - `Config.Framework`: esx, oldesx, qb, oldqb or qbox
   - `Config.MySQL`: oxmysql or ghmattimysql
   - `Config.Inventory`: your inventory resource
   - `Config.Keybind`: the key that opens the phone (F1 by default)
   - The billing options, if you use invoices

5. Optional: add your API keys in `config.lua` for the features that need them. Everything else works without keys.

   - Music search needs a YouTube Data API v3 key (`Config.Music.apiKey`)
   - GIFs in Messages need a GIPHY key (`Config.Gif.apiKey`)
   - The Camera uploads photos and videos through Fivemanage or a Discord webhook (`Config.Camera`)

6. Optional: use the phone as an item. Add this to `ox_inventory/data/items.lua`:

   ```lua
   ['phone'] = {
       label = 'Phone',
       weight = 190,
       stack = false,
       close = true,
       description = 'A smartphone',
       client = { export = 'oph3z-phone.usePhone' },
   },
   ```

   Then set `Config.RequireItem = true` if you want the phone to open only when the player has the item.

7. Optional: record video with nearby players' voices. Install ffmpeg on the server, set `Config.VideoAudio = 'nearby'` in `config.lua`, and add this line to your `server.cfg`:

   ```cfg
   add_unsafe_child_process_permission oph3z-phone
   ```

## Video calls on a public server

Video calls (FaceTime) send the picture over WebRTC. The voice still goes through pma-voice, only the video image uses WebRTC.

- On the same PC or the same local network, video calls just work and you don't have to set up anything.
- On a real server where players are on different internet connections, most will connect fine, but players behind a strict router or mobile/CGNAT internet will get stuck on "Connecting video". To make it work for everyone, you need to add a TURN server.

A TURN server is just a relay that passes the video through when two players can't reach each other directly. WebRTC always tries a direct connection first and only uses the relay when it has to, so it carries only the calls that really need it. Only the video goes through it (the voice stays on pma-voice), which is about 1 to 2 Mbps per relayed call.

Add your TURN server to `Config.VideoCall.IceServers` in `config.lua`:

```lua
Config.VideoCall = {
    IceServers = {
        { urls = 'stun:stun.l.google.com:19302' },
        { urls = 'turn:YOUR_TURN_HOST:3478', username = 'user', credential = 'pass' },
    },
}
```

You have two ways to get a TURN server:

- Use a hosted one (easiest). Services like Cloudflare, Metered / OpenRelay (has a free tier) or Twilio give you a host, a username and a password. Paste them into the list above.
- Host your own with `coturn` on your VPS. Set a username and password, then open port 3478 (UDP and TCP), port 5349 (for TLS, optional) and the relay UDP port range (coturn uses 49152 to 65535 by default). Point it at `turn:your-vps-ip:3478`.

You don't need to change any FiveM settings for this, only the ICE list above.

## Configuration

Everything lives in `config.lua`, and each option has a short note next to it: the open key, the walk key, which apps show up, ringtones, how far away players can hear calls and music, and the API keys. Change what you need and restart the resource.

## Beta and feedback

Right now this is a beta. I have only been able to test it with two clients on the same PC, so there are probably a few bugs I have not run into yet. If you find one, or you have an idea or a suggestion, join the Discord and let me know:

[Discord server](DISCORD-INVITE-HERE)
<!-- Replace DISCORD-INVITE-HERE with your Discord invite. -->

## License

Free to use and edit on your own server. Please do not resell it or re-release it as your own.

## Screenshots

_Add screenshots here._

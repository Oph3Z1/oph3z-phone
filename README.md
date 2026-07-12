# oph3z-phone

A custom, iPhone-style phone for FiveM. It works on ESX, QBCore and Qbox, and comes with a full set of apps, calls, messages, a camera, music, a social app and more, all built to feel like a real smartphone.

> This is a beta release. Please read the [Beta and feedback](#beta-and-feedback) part before reporting anything.

## Showcase

See it in action with full details: [YouTube video](https://www.youtube.com/watch?v=nweWkywqcTw)

## Features

The phone looks and feels like an iPhone. It scales to any screen size and has a lock screen with a live clock, the date and your notifications, a home screen with apps you can move around, a control center and a dynamic island. There is also a walk mode so you can move around while using it, and the whole interface is available in English and Turkish, with more languages coming later.

You can open the phone with a key (F1 by default), a command, or as an inventory item.

Apps included:

- **Phone**: real voice calls through pma-voice, with ringtones, a recents list, a speaker mode so players next to you can hear the call, a proper "phone to your ear" animation, and FaceTime-style video calls.
- **Messages**: iMessage-style chats with GIFs, voice messages, group chats, and sharing of photos, location and money.
- **Camera and Photos**: take photos and videos with a front or back camera, save them to your gallery, and AirDrop them to players nearby.
- **Music**: search and play real songs, build playlists, and play out loud so people around you hear it too.
- **Twexa**: a built-in social app, a bit like X (Twitter), where players post, follow, reply and repost.
- **Marketplace**: buy and sell in the city. Post cars, houses or items with photos and a price.
- **Wallet**: check your balance and transactions, send (online and offline) and receive money, and pay bills.
- **Mail**: send and read emails right from the phone.
- **Maps**: a live map with GPS and saved locations.
- **Clock**: set alarms and timers that nearby players can hear too.
- **Calculator**: a simple everyday calculator.
- **Settings**: change the wallpaper, brightness, language, ringtones and more.
- **App Store**: install or remove apps on the phone.

This already covers all the base features you need to use a phone in roleplay, nothing important is missing. I also have a few more custom apps in mind that I will build and add to the phone over time.

## Third-party apps

Developers can build their own apps and add them to the phone without touching the main code. There is a separate starter template for that:

[oph3z-phone-app-template](https://github.com/Oph3Z1/oph3z-phone-example-app)

## Tech stack

- Interface: React 18, Redux Toolkit, Vite, and plain CSS
- Game side: Lua 5.4
- Storage: JSON files, one per player (MySQL is only used for billing)
- Voice and sound: pma-voice and xsound
- Video calls: WebRTC

## Requirements

- One framework: ESX, QBCore or Qbox (older ESX and QB versions work too)
- pma-voice, for calls and voice
- xsound, for ringtones, music and alarm sounds
- A MySQL resource (oxmysql, ghmattimysql or mysql-async), only needed for the billing and invoices feature
- An inventory (ox_inventory, qb-inventory, qs-inventory or codem-inventory), only if you want the phone as an item
- ffmpeg on the server, optional, only for recording video with nearby players' voices

## Installation

1. Download the resource and put it in your resources folder, for example `resources/[phone]/oph3z-phone`. The interface is already built and included, so you can run it as is.

2. Add it to your `server.cfg`, after your framework, pma-voice, xsound and your MySQL resource:

   ```cfg
   ensure oph3z-phone
   ```

3. Open `config.lua` and set it up for your server:

   - `Config.Framework`: esx, oldesx, qb, oldqb or qbox
   - `Config.MySQL`: oxmysql, ghmattimysql or mysql-async
   - `Config.Inventory`: your inventory resource
   - `Config.Keybind`: the key that opens the phone (F1 by default)
   - The billing options, if you use invoices

4. Add your own API keys in `config.lua`. The phone does not come with any keys, so the apps below will not work until you add yours:

   - Music needs a YouTube Data API v3 key to search and play songs (`Config.Music.apiKey`)
   - Messages needs a GIPHY key to send GIFs (`Config.Gif.apiKey`)
   - Camera needs Fivemanage or a Discord webhook to upload photos and videos (`Config.Camera`)

5. Optional: use the phone as an item. Add this to `ox_inventory/data/items.lua`:

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

   > Note: the phone was tested with ox_inventory, but it supports more inventories. The snippet above is just an ox_inventory example, so add the item the way your own inventory expects. See `config.lua` for the supported inventories.

6. Optional: record video with nearby players' voices. Install ffmpeg on the server, set `Config.VideoAudio = 'nearby'` in `config.lua`, and add this line to your `server.cfg`:

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

## Development

The interface is already built and shipped in the `build` folder, so you do not need Node.js just to run the phone. You only need it if you want to change the interface yourself. For that you need Node.js 18 or newer:

```bash
cd resources/[phone]/oph3z-phone/web
npm install
npm run build
```

This rebuilds the `build` folder at the root of the resource. Run `npm run build` again after each change you make in `web/src`.

## Beta and feedback

Right now this is a beta. I have only been able to test it with two clients on the same PC, so there are probably a few bugs I have not run into yet. If you find one, or you have an idea or a suggestion, join the Discord and let me know:

[Discord server](DISCORD-INVITE-HERE)

## License

Free to use and edit on your own server. Please do not resell it or re-release it as your own.

## Screenshots
<img width="310" height="642" alt="Screenshot_2" src="https://github.com/user-attachments/assets/b5ea1a97-047a-466f-bf6f-0d0eac682499" />
<img width="309" height="640" alt="Screenshot_3" src="https://github.com/user-attachments/assets/aabe9a22-b9c4-4a76-9f75-563e4cf2f47f" />
<img width="312" height="642" alt="Screenshot_11" src="https://github.com/user-attachments/assets/a3d67aa2-8b19-4a13-b7d0-f24b203deaa0" />
<img width="306" height="640" alt="Screenshot_4" src="https://github.com/user-attachments/assets/21d95779-feec-408e-8a9e-a5386ff89da3" />
<img width="310" height="642" alt="Screenshot_5" src="https://github.com/user-attachments/assets/eec006d9-9c44-47a8-9959-75b60dbeb7f9" />
<img width="310" height="640" alt="Screenshot_6" src="https://github.com/user-attachments/assets/ba948fe5-e2a3-440d-8f9c-52f5849239c2" />
<img width="311" height="642" alt="Screenshot_7" src="https://github.com/user-attachments/assets/03c8f135-5886-4915-b3d0-5173c567014f" />
<img width="307" height="640" alt="Screenshot_8" src="https://github.com/user-attachments/assets/66af7437-0062-4462-88b6-2a45172c2454" />
<img width="311" height="640" alt="Screenshot_9" src="https://github.com/user-attachments/assets/d3c4cce3-85bd-4070-a372-db6fd982964a" />
<img width="306" height="643" alt="Screenshot_10" src="https://github.com/user-attachments/assets/21687ad1-3086-4acd-a8b7-37e3012abbd7" />
<img width="312" height="640" alt="Screenshot_31" src="https://github.com/user-attachments/assets/dde3b55c-5a72-4db1-b593-5835ae5c9de3" />
<img width="295" height="602" alt="Screenshot_32" src="https://github.com/user-attachments/assets/8fe51fde-dcd0-4244-afe9-83ac0db753ec" />
<img width="311" height="641" alt="Screenshot_33" src="https://github.com/user-attachments/assets/d2ab45b6-104f-4583-9b1f-2b911b2ca316" />
<img width="313" height="642" alt="Screenshot_34" src="https://github.com/user-attachments/assets/cec1042b-a316-42cc-91d4-8f4d2b5feaff" />
<img width="309" height="641" alt="Screenshot_12" src="https://github.com/user-attachments/assets/578e7133-7c22-4a18-89fb-8dc3f1e2f657" />
<img width="313" height="642" alt="Screenshot_13" src="https://github.com/user-attachments/assets/46767582-5033-4f6c-b321-fd7b2535c7ff" />
<img width="312" height="643" alt="Screenshot_14" src="https://github.com/user-attachments/assets/a1217cc9-2b42-4554-a3b3-9c55e3121b84" />
<img width="313" height="643" alt="Screenshot_15" src="https://github.com/user-attachments/assets/33b0089f-3e4e-4811-91f0-bf50cac6b01e" />
<img width="312" height="643" alt="Screenshot_16" src="https://github.com/user-attachments/assets/6e87153c-d0ab-420c-8177-bf21d5d3fe5c" />
<img width="310" height="646" alt="Screenshot_17" src="https://github.com/user-attachments/assets/c7faf38a-a46c-40f8-b2ae-e7e5df800535" />
<img width="311" height="645" alt="Screenshot_18" src="https://github.com/user-attachments/assets/faae4dfc-29c0-490f-8095-df15ef5e3565" />
<img width="312" height="641" alt="Screenshot_19" src="https://github.com/user-attachments/assets/9db8ff7b-c974-4c4a-bb40-715d7b92b798" />
<img width="311" height="643" alt="Screenshot_20" src="https://github.com/user-attachments/assets/ffb2a627-c06e-47ed-a1c9-4961675c3d27" />
<img width="310" height="640" alt="Screenshot_21" src="https://github.com/user-attachments/assets/92974910-64e9-40d9-b48a-a07dc3004b11" />
<img width="310" height="643" alt="Screenshot_22" src="https://github.com/user-attachments/assets/33e159f4-0648-4dee-a4c8-b6407a9e5ca1" />
<img width="312" height="644" alt="Screenshot_23" src="https://github.com/user-attachments/assets/33f2c6b0-0c0e-4ee6-ab4b-53ceac76d3f9" />
<img width="307" height="642" alt="Screenshot_24" src="https://github.com/user-attachments/assets/7ae5b0b7-6af2-4a31-ae4b-1be7d327765a" />
<img width="311" height="644" alt="Screenshot_25" src="https://github.com/user-attachments/assets/87d24795-92a7-469c-8f1b-43ebd85b0ec1" />
<img width="311" height="644" alt="Screenshot_26" src="https://github.com/user-attachments/assets/c0e13009-48ff-4cdf-b4a8-94917a48f802" />
<img width="307" height="640" alt="Screenshot_27" src="https://github.com/user-attachments/assets/b5b08b5b-0224-4cba-bcf8-230f402658f6" />
<img width="312" height="641" alt="Screenshot_28" src="https://github.com/user-attachments/assets/7a5f409f-cdac-4a00-9542-8c4187604e3f" />
<img width="312" height="642" alt="Screenshot_29" src="https://github.com/user-attachments/assets/83d56341-4d50-4d92-8309-eb2e4834439f" />
<img width="312" height="641" alt="Screenshot_30" src="https://github.com/user-attachments/assets/4fe41db3-d587-4085-afd0-eda6e3296aed" />



# oph3z-phone — Documentation

Reference docs for the phone resource. **Read these before changing things** so we don't
lose track of how the pieces connect.

- [ARCHITECTURE.md](ARCHITECTURE.md) — folder structure, data flow, JSON schema, deps,
  responsive scaling.
- [API.md](API.md) — the complete **Lua ↔ NUI contract**: ox_lib callbacks, call net
  events, NUI callbacks, NUI messages, Redux slices, commands/exports.
- [FEATURES.md](FEATURES.md) — every feature (lock/home, prop/anim, flashlight, screen
  glow, Phone app, calls, airplane, block), the full **config reference**, and the
  **dev workflow** (build/restart/refresh rules).

## Status (kept current)

- **Phase 1:** done — lock/home, prop+anim, flashlight, screen glow, status bar.
- **Phone app:** done — Favorites / Recents / Contacts / Keypad, contacts CRUD +
  favorites, generated `555-XXXX` numbers, liquid-glass tab bar, English UI.
- **Calls:** done — pma-voice voice, ring/accept/decline/hangup/timeout/busy/unavailable,
  island + full incoming, in-call (End+Mute), xsound 3D ringtone, recents logging.
- **Airplane mode + Block list:** done (backend + `/airplane` + contact Block/Unblock).
- **Messages app:** done — 1:1 + groups, money/photo/GIF/location/voice, emoji keyboard.
- **Settings app:** in progress — **Profile** (ID name + avatar), auto **Mail** address
  (`firstname.lastname@<MailDomain>`), **Notifications** (sound + master + per-app,
  enforced in `Notif.Push`), Airplane/Wi-Fi/AirDrop. Reusable **InputDialog** popup
  (also on the third-party bridge as `oph3z:prompt`). Ringtones/Wallpaper/Display/
  Language/About sub-screens are placeholders.
- **Next:** remaining Settings sub-screens; a Mail app for the generated inbox.

> ⚠️ Quick rules: rebuild NUI with `npm run build` after web changes; plain
> `restart oph3z-phone` for edits to existing Lua files; **`refresh` is required when a
> NEW Lua file is added** to the manifest — so prefer extending existing files.

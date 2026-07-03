--[[
    oph3z-phone | Shared configuration
    Edit values here; they are available on both client and server as `Config`.
--]]

Config = {}

-- General -------------------------------------------------------------------
Config.Debug = false                       -- prints extra info to console

-- Opening the phone ---------------------------------------------------------
Config.Command   = 'phone'                 -- chat command to toggle the phone (dev/QoL)
Config.Keybind   = 'F1'                     -- default key (player can rebind in GTA settings)
Config.ItemName  = 'phone'                 -- ox_inventory item that opens the phone

-- Item integration ----------------------------------------------------------
-- If true, the phone can ONLY be opened while the player owns Config.ItemName.
-- If false, the keybind/command always works (handy during development).
Config.RequireItem = false

-- Persistence (JSON "database") ---------------------------------------------
-- One JSON file per player is stored under: <resource>/data/<citizenid>.json
Config.DataFolder = 'data'

-- Phone numbers -------------------------------------------------------------
-- The phone generates and owns each player's number (framework-agnostic).
-- 555 + 4 digits -> displayed as "555-0142".
Config.PhoneNumberPrefix = '555'

-- Mail ----------------------------------------------------------------------
-- Every player gets an auto-generated mail address on first phone open, built as
-- firstname.lastname@<Config.MailDomain>   e.g. "barbara.orton@lsmail.com"
-- Duplicates (same first + last name) get a numeric suffix ("barbara.orton2@").
-- The Mail app (added later) reads/writes this same inbox.
Config.MailDomain = 'mail.com'

-- Default phone settings written on first use for a citizen.
Config.DefaultSettings = {
    wallpaper  = 'blackTitanium',          -- preset key (see WALLPAPER_PRESETS) or a custom URL
    brightness = 100,                      -- screen brightness (Control Center, 20-100)
    volume     = 70,                       -- media volume (Control Center / Music app)
    airdrop    = false,                    -- AirDrop receiving toggle (Control Center)
    locked     = true,                     -- start locked when opened
    airplane   = false,                    -- airplane mode (unreachable + can't call)
    scale      = 100,                      -- phone size on screen (50-100; Display & Brightness)
    notifSound = true,                     -- play a sound on new notifications
    notifMaster = true,                    -- master switch: off = silence ALL notifications
    -- notifApps: per-app enable map { [appId] = false } (missing = enabled). Set
    -- from the Settings > Notifications screen; not seeded here (all on by default).
}

-- Home screen apps ----------------------------------------------------------
-- The name, placement and order of every BUILT-IN app live here so you can edit
-- them without touching the UI code. Order in this list = display order.
--   id       must match the app's id in the UI (don't rename built-ins).
--   label    the name shown under the icon (rename freely).
--   place    'dock'  -> bottom bar (max 4)
--            'grid'  -> home-screen grid
--            'hidden'-> registered but not shown
--   enabled  set false to remove the app entirely.
-- These are DEFAULT apps: they can't be uninstalled and are never in the App Store.
-- `place`/`enabled` here are the DEFAULT layout; once a player rearranges their
-- home screen their own layout is saved and used instead (new apps drop into the
-- first free slot).
-- Third-party apps are NOT listed here — they add themselves at runtime via
-- exports['oph3z-phone']:RegisterApp{...} (see docs/THIRD_PARTY_APPS.md).
Config.Apps = {
    { id = 'call',       label = 'Phone',      place = 'dock' },
    { id = 'message',    label = 'Messages',   place = 'dock' },
    { id = 'camera',     label = 'Camera',     place = 'dock' },
    { id = 'photos',     label = 'Photos',     place = 'dock' },
    { id = 'maps',       label = 'Maps',       place = 'grid' },
    { id = 'clock',      label = 'Clock',      place = 'grid' },
    { id = 'settings',   label = 'Settings',   place = 'grid' },
    { id = 'calculator', label = 'Calculator', place = 'grid' },
    { id = 'appstore',   label = 'App Store',  place = 'grid' }
}

-- App Store -----------------------------------------------------------------
-- Third-party apps (registered via exports.RegisterApp) are always listed in the
-- App Store and installed with a "Get" download. Default apps above are never in
-- the store and can't be uninstalled.
Config.AppStore = {
    downloadSeconds = 5,   -- how long the fake download takes
}

-- Phone prop ----------------------------------------------------------------
Config.UseProp   = true                    -- attach a phone prop + play hand animation
Config.PropModel = 'prop_amb_phone'        -- prop model to put in the player's hand

-- Calls ---------------------------------------------------------------------
Config.RingTimeout = 30                     -- seconds before an unanswered call is "missed"
Config.MaxRecents  = 50                     -- how many recent-call entries to keep
-- Fallback ringtone (used when a player hasn't picked one in Settings > Ringtones).
-- Played in 3D via xsound so the callee + nearby players hear it.
Config.RingtoneUrl = 'https://cfx-nui-xsound/html/sounds/ringtone.mp3'

-- Ringtones -----------------------------------------------------------------
-- Built-in ringtones listed in Settings > Ringtones. Players can add their own by
-- URL on top of these; the selected one plays (3D, via xsound) on an incoming call.
--   `file` = a filename bundled in the phone's web/build/audio/ folder, OR give a
--   full `url` instead (any http(s)/cfx-nui URL playable by xsound + the browser).
Config.Ringtones = {
    { id = 'default', name = 'Default', file = 'ringtone.mp3' },
}

-- Camera --------------------------------------------------------------------
-- The phone-view photo/video is uploaded to your chosen provider and the
-- returned URL is saved to Photos. Pick whichever you prefer:
--
--   provider = 'discord'     -> uploads straight to a Discord webhook. Free, no
--                               account. BUT some networks have Cloudflare block
--                               FiveM's browser from uploading to Discord
--                               (403 "internal network error"). If that happens,
--                               use fivemanage instead. Set discord.webhook.
--   provider = 'fivemanage'  -> uploads to Fivemanage (https://fivemanage.com).
--                               Needs a free API key, works everywhere. Set
--                               fivemanage.apiKey.
Config.Camera = {
    provider = 'fivemanage',                  -- 'discord' or 'fivemanage'
    
    discord = {
        webhook = '',
    },
    
    fivemanage = {
        apiKey = 'MaUggIdxK7oGR98qa7HjRWcFqveBP1pp',
        url    = 'https://api.fivemanage.com/api/v3/file',
    },
}

-- GIFs (Messages) -----------------------------------------------------------
-- The GIF button in the Messages composer searches GIPHY. Get a free API key at
-- https://developers.giphy.com/ (create an app) and paste it below. Without a key
-- the picker shows a friendly "set up your key" notice.
Config.Gif = {
    apiKey = 'fbkCoWNVgakEayeG0G9hDALim5pwNWr8',   -- <-- paste your GIPHY API key here
}


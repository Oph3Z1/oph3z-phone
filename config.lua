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

-- Default phone settings written on first use for a citizen.
Config.DefaultSettings = {
    wallpaper  = 'default',                -- key into the web wallpaper map
    brightness = 100,                      -- reserved for a later Settings app
    locked     = true,                     -- start locked when opened
    airplane   = false,                    -- airplane mode (unreachable + can't call)
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
    { id = 'appstore',   label = 'App Store',  place = 'grid' },
}

-- Phone prop ----------------------------------------------------------------
Config.UseProp   = true                    -- attach a phone prop + play hand animation
Config.PropModel = 'prop_amb_phone'        -- prop model to put in the player's hand

-- Calls ---------------------------------------------------------------------
Config.RingTimeout = 30                     -- seconds before an unanswered call is "missed"
Config.MaxRecents  = 50                     -- how many recent-call entries to keep
-- Ringtone played in 3D via xsound (callee + nearby hear it). Swap the file in
-- xsound/html/sounds/ or change this URL.
Config.RingtoneUrl = 'https://cfx-nui-xsound/html/sounds/ringtone.mp3'

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

-- Lock screen / time --------------------------------------------------------
-- Use the in-game GTA clock for the lock screen time instead of real OS time.
Config.UseGameTime = true

-- Static temperature shown on the lock screen until a weather app exists.
-- (We map GTA weather -> an icon on the UI side.)
Config.Temperature = 70                    -- degrees shown next to the weather icon
Config.TempUnit    = 'F'                   -- 'F' or 'C' (display only)

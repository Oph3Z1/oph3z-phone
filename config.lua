Config = {}

Config.Debug = false -- prints extra info to console
Config.DataFolder = 'data' -- Dont touch if you dont know what you are doing

Config.Framework = 'qbox' -- esx, oldesx, qb, oldqb, qbox
Config.MySQL = 'oxmysql' -- oxmysql, ghmattimysql, mysql-async
Config.Inventory = 'ox_inventory' -- ox_inventory, qb-inventory, qs-inventory, codem-inventory

Config.Keybind   = 'F1' -- default key (player can rebind in GTA settings)
Config.WalkKey   = 'F7' -- while the phone is open, tap to toggle "walk mode" (move + use phone). LMENU = Left Alt
Config.ItemName  = 'phone'-- ox_inventory item that opens the phone
Config.RequireItem = false -- If true, the phone can ONLY be opened while the player owns Config.ItemName

Config.XVerifyCommand = 'xverify' -- admin command to grant an X verified badge: /xverify <@username> [gold|blue]

Config.PhoneNumberPrefix = '555' -- 555 + 4 digits -> displayed as "555-0142".
Config.DefaultLocale = 'en' -- en, tr
Config.MailDomain = 'mail.com'

-- Billing
-- A MySQL resource (Config.MySQL) is required.
Config.BillingScript = 'qbox' -- 'esx_billing' | 'qb' | 'codem-billing' | 'qbox'
Config.BillingTax = 0 -- informational tax % shown on a bill when the biller doesn't send one
-- 'qb' (phone_invoices) ONLY: how the billed society/job account gets paid.
-- ('qbox' reads phone_invoices too but pays the society via Renewed-Banking.)
Config.QBBanking = true -- true = qb-banking (new management), false = qb-management (legacy)
Config.QBCreateJobAccount = false -- qb-banking: auto-create the society account if it is missing

Config.Airdrop = {
    Range = 8.0, -- metres: who counts as "nearby" when sharing
    MaxPhotos = 20, -- max photos/videos in a single AirDrop
    RequirePhone = false, -- true = receiver must have their phone open to be discoverable
}

-- The Clock app's alarms + timers.
Config.Clock = {
    Range = 12.0, -- metres: how far the alarm / timer sound carries (nearby players)
    Volume = 0.5, -- xsound volume for the alarm / timer sound (0.0-1.0)
    RingSeconds = 30, -- auto-stop a ringing alarm / finished timer after this many seconds
}

-- Default phone settings written on first use for a citizen.
Config.DefaultSettings = {
    wallpaper = 'blackTitanium', -- preset key (see WALLPAPER_PRESETS) or a custom URL
    brightness = 100, -- screen brightness (Control Center, 20-100)
    volume = 70, -- media volume (Control Center / Music app)
    airdrop = false, -- AirDrop receiving toggle (Control Center)
    airplane = false, -- airplane mode (unreachable + can't call)
    scale = 85, -- phone size on screen (75-100; Display & Brightness)
    notifSound = true, -- play a sound on new notifications
    notifMaster = true, -- master switch: off = silence ALL notifications
    language = 'en', -- selected UI language (see locales/, Settings > Language)
}

-- Apps
Config.Apps = {
    { id = 'call',       label = 'Phone',      place = 'dock' },
    { id = 'message',    label = 'Messages',   place = 'dock' },
    { id = 'camera',     label = 'Camera',     place = 'dock' },
    { id = 'photos',     label = 'Photos',     place = 'dock' },
    { id = 'maps',       label = 'Maps',       place = 'grid' },
    { id = 'clock',      label = 'Clock',      place = 'grid' },
    { id = 'mail',       label = 'Mail',       place = 'grid' },
    { id = 'wallet',     label = 'Wallet',     place = 'grid' },
    { id = 'settings',   label = 'Settings',   place = 'grid' },
    { id = 'calculator', label = 'Calculator', place = 'grid' },
    { id = 'appstore',   label = 'App Store',  place = 'grid' },
    -- For example Twexa is a BUILT-IN app but store-gated: it isn't auto-placed on the home screen.
    -- Players install it from the App Store (and can uninstall it).
    -- `store` = list it in the App Store; the extra fields are its store page.
    {
        id = 'twexa',
        label = 'Twexa',
        place = 'grid',
        store = true,
        description = 'The town square. Post what\'s happening, follow people, reply, repost and see what everyone in the city is talking about.',
    },

    {
        id = 'marketplace', 
        label = 'Marketplace', 
        place = 'grid', 
        store = true,
        description = 'Buy and sell across the city. Post cars, houses and items with photos, set your price and let buyers call or message you directly.',
    },

    {
        id = 'music',
        label = 'Music',
        place = 'grid',
        store = true,
        description = 'Millions of songs, all in one place. Search, build playlists, share tracks with friends and play out loud so everyone nearby can listen with you.',
    }
}

Config.AppStore = {
    downloadSeconds = 5, -- how long the download takes (seconds)
}

-- Phone prop
Config.UseProp = true -- attach a phone prop + play hand animation
Config.PropModel = 'prop_amb_phone' -- prop model to put in the player's hand

-- Calls
Config.RingTimeout = 30 -- seconds before an unanswered call is "missed"
Config.MaxRecents  = 50 -- how many recent-call entries to keep
Config.CallSpeakerRange = 6.0 -- metres: how far nearby players can hear a call put on speaker
-- Fallback ringtone (used when a player hasn't picked one in Settings > Ringtones).
-- Played in 3D via xsound so the callee + nearby players hear it.
Config.RingtoneUrl = 'https://cfx-nui-xsound/html/sounds/ringtone.mp3'

-- Ringtones
Config.Ringtones = {
    { id = 'default', name = 'Default', file = 'ringtone.mp3' },
}

-- Video calls (FaceTime)
-- Video travels over WebRTC (audio stays on the normal voice call). Two players
-- on the SAME machine/LAN connect with no setup. For real servers whose players
-- are on different networks, add a TURN server below (see the README,
-- "Video calls on a public server").
Config.VideoCall = {
    IceServers = {
        { urls = 'stun:stun.l.google.com:19302' },
        -- { urls = 'turn:your.turn.server:3478', username = 'user', credential = 'pass' },
    },
}

-- Camera app
Config.Camera = {
    provider = 'fivemanage', -- 'discord' or 'fivemanage'
    
    discord = {
        webhook = '',
    },
    
    fivemanage = {
        apiKey = '',
        url = 'https://api.fivemanage.com/api/v3/file',
    }
}

-- Video recording audio (Camera app)
--   'off'    -> video is silent (no audio captured).
--   'self'   -> only YOUR own microphone is mixed into the video. No infra,
--               instant, works on any host (localhost included).
--   'nearby' -> captures the voices of ALL nearby players (and yours), mixed
--               into the video by a server-side ffmpeg step. Needs ffmpeg on
--               the host (VPS / dedicated). A short "Processing" screen shows
--               after you stop recording while the audio is mixed in.
Config.VideoAudio = 'self'

-- How far (metres) to gather nearby microphones in 'nearby' mode.
Config.VideoAudioRange = 12.0

-- Only capture a player while they are actually transmitting voice (talking).
-- Uses the game's voice/talking state, so it works with pma-voice, mumble and
-- SaltyChat. Set false to capture the microphone continuously while recording.
Config.VideoAudioGate = true

-- ffmpeg, used only by 'nearby' mode to mix the audio onto the video.
-- Leave as 'ffmpeg': the script auto-detects it from the system PATH and from
-- common install locations (winget / chocolatey / /usr/bin, etc.), so this
-- works on any host without changes. Only set an absolute path here if ffmpeg
-- is installed somewhere unusual and auto-detection fails,
-- e.g. 'C:/ffmpeg/bin/ffmpeg.exe' or '/usr/bin/ffmpeg'.
Config.FFmpegPath = 'ffmpeg'

-- GIFs (Messages)
Config.Gif = {
    apiKey = '', -- paste your GIPHY API key here
}

-- Music app / Spotify
Config.Music = {
    apiKey = '', -- YouTube Data API v3 key: https://console.cloud.google.com
    AllowNearby = true, -- let players broadcast to nearby players (in-app speaker toggle)
    NearbyRange = 12.0, -- metres nearby players can hear the music
}
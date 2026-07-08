Config = {}

Config.Debug = false -- prints extra info to console
Config.DataFolder = 'data' -- Dont touch if you dont know what you are doing

Config.Framework = 'qbox' -- esx, oldesx, qb, oldqb, qbox
Config.MySQL = 'oxmysql' -- oxmysql, ghmattimysql
Config.Inventory = 'ox_inventory' -- ox_inventory, qb-inventory, qs-inventory, codem-inventory

Config.Keybind   = 'F1' -- default key (player can rebind in GTA settings)
Config.ItemName  = 'phone'-- ox_inventory item that opens the phone
Config.RequireItem = false -- If true, the phone can ONLY be opened while the player owns Config.ItemName

Config.XVerifyCommand = 'xverify' -- admin command to grant an X verified badge: /xverify <@username> [gold|blue]

Config.PhoneNumberPrefix = '555' -- 555 + 4 digits -> displayed as "555-0142".
Config.DefaultLocale = 'en' -- en
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
    -- X is a BUILT-IN app but store-gated: it isn't auto-placed on the home screen.
    -- Players install it from the App Store (and can uninstall it).
    -- `store` = list it in the App Store; the extra fields are its store page.
    {
        id = 'x', 
        label = 'X', 
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
        id = 'spotify', 
        label = 'Spotify', 
        place = 'grid', 
        store = true,
        description = 'Music for everyone. Search millions of songs, build playlists, share tracks with friends and play out loud so everyone nearby can vibe with you.',
    }
}

Config.AppStore = {
    downloadSeconds = 5, -- how long the download takes (seconds)
}

-- Phone prop ----------------------------------------------------------------
Config.UseProp = true -- attach a phone prop + play hand animation
Config.PropModel = 'prop_amb_phone' -- prop model to put in the player's hand

-- Calls ---------------------------------------------------------------------
Config.RingTimeout = 30 -- seconds before an unanswered call is "missed"
Config.MaxRecents  = 50 -- how many recent-call entries to keep
-- Fallback ringtone (used when a player hasn't picked one in Settings > Ringtones).
-- Played in 3D via xsound so the callee + nearby players hear it.
Config.RingtoneUrl = 'https://cfx-nui-xsound/html/sounds/ringtone.mp3'

-- Ringtones
Config.Ringtones = {
    { id = 'default', name = 'Default', file = 'ringtone.mp3' },
}

-- Camera app
Config.Camera = {
    provider = 'fivemanage', -- 'discord' or 'fivemanage'
    
    discord = {
        webhook = '',
    },
    
    fivemanage = {
        apiKey = 'MaUggIdxK7oGR98qa7HjRWcFqveBP1pp',
        url = 'https://api.fivemanage.com/api/v3/file',
    }
}

-- GIFs (Messages)
Config.Gif = {
    apiKey = 'fbkCoWNVgakEayeG0G9hDALim5pwNWr8', -- paste your GIPHY API key here
}

-- Music app / Spotify
Config.Music = {
    apiKey = 'AIzaSyAo41rsOkmsNUV0E--psc7IAmKsVvuan-8', -- YouTube Data API v3 key: https://console.cloud.google.com
    AllowNearby = true, -- let players broadcast to nearby players (in-app speaker toggle)
    NearbyRange = 12.0, -- metres nearby players can hear the music
}
--[[
    oph3z-phone | Public SERVER export API

    Lets other resources read phone data and perform a small, safe set of actions
    WITHOUT touching this resource's code. Call from any server script:

        local number = exports['oph3z-phone']:GetPhoneNumber(src)
        exports['oph3z-phone']:PushNotification(src, { app = 'myapp', title = 'Hi', body = '...' })

    Every function takes `src` = the player's server id. Reads return nil/empty on
    a bad/unknown player. See docs/THIRD_PARTY_APPS.md for the full reference.
--]]

local function cidOf(src)
    local player = exports.qbx_core:GetPlayer(src)
    return player and player.PlayerData.citizenid or nil
end

local function docOf(src)
    local cid = cidOf(src)
    if not cid then return nil, nil end
    return DB.EnsurePhone(cid, DB.LoadOrCreate(cid)), cid
end

-- ---- Identity ------------------------------------------------------------

exports('GetCitizenId', function(src)
    return cidOf(src)
end)

-- Formatted number, e.g. "555-0142".
exports('GetPhoneNumber', function(src)
    local doc = docOf(src)
    return doc and doc.phone.number or nil
end)

-- Digits only, e.g. "5550142".
exports('GetPhoneNumberRaw', function(src)
    local doc = docOf(src)
    return doc and DB.Digits(doc.phone.numberRaw) or nil
end)

-- ---- Reads ---------------------------------------------------------------

-- The player's saved contacts: { { id, name, number, notes, img, favorite }, ... }
exports('GetContacts', function(src)
    local doc = docOf(src)
    return doc and doc.phone.contacts or {}
end)

-- Resolve one contact by number (digits or formatted). Returns the contact or nil.
exports('ResolveContact', function(src, number)
    local cid = cidOf(src)
    if not cid then return nil end
    return DB.ResolveContact(cid, DB.Digits(number))
end)

-- The player's gallery: { { id, url, type, thumb, favorite, ts }, ... }
exports('GetPhotos', function(src)
    local doc = docOf(src)
    return doc and doc.photos and doc.photos.items or {}
end)

-- Recent calls: { { id, number, name, img, direction, missed, ts }, ... }
exports('GetRecents', function(src)
    local doc = docOf(src)
    return doc and doc.phone.recents or {}
end)

-- Airplane mode on/off.
exports('IsAirplaneMode', function(src)
    local doc = docOf(src)
    return (doc and doc.settings and doc.settings.airplane) and true or false
end)

-- Blocked numbers map: { [digits] = { number, name, ts }, ... }
exports('GetBlockedNumbers', function(src)
    local doc = docOf(src)
    return doc and doc.phone.blocked or {}
end)

-- Is a number blocked by this player?
exports('IsBlocked', function(src, number)
    local doc = docOf(src)
    return doc and DB.IsBlocked(doc, DB.Digits(number)) or false
end)

-- ---- Writes (allowed actions) -------------------------------------------

-- Push a notification to the phone (persists + live-shows like the built-ins).
-- data = { app, title, body, icon?, route? }. `app` should be your app id so the
-- icon badges your app. Returns true on success.
exports('PushNotification', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' or not Notif then return false end
    Notif.Push(cid, {
        app   = data.app or 'system',
        title = data.title,
        body  = data.body,
        icon  = data.icon,
        route = data.route,
    })
    return true
end)

-- Send a phone message FROM this player TO a number. payload = { type?, body, meta? }
-- (type defaults to 'text'). Returns the stored outgoing message, or nil.
exports('SendMessage', function(src, toNumber, payload)
    local cid = cidOf(src)
    if not cid or not Messages then return nil end
    payload = type(payload) == 'table' and payload or { body = payload }
    return Messages.Send(cid, toNumber, payload.type or 'text', payload.body, payload.meta)
end)

-- Place a call FROM this player TO a number (uses the phone's call system).
-- Returns the call id, or nil if it couldn't start.
exports('PlaceCall', function(src, toNumber)
    if not PhoneCall then return nil end
    return PhoneCall.Start(src, toNumber)
end)

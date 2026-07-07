local function cidOf(src)
    return GetIdentifier(src)
end

local function docOf(src)
    local cid = cidOf(src)
    if not cid then return nil, nil end
    return DB.EnsurePhone(cid, DB.LoadOrCreate(cid)), cid
end

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

exports('GetLanguage', function(src)
    local doc = docOf(src)
    return (doc and doc.settings and doc.settings.language) or Config.DefaultLocale or 'en'
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

exports('SendMessage', function(src, toNumber, payload)
    local cid = cidOf(src)
    if not cid or not Messages then return nil end
    payload = type(payload) == 'table' and payload or { body = payload }
    return Messages.Send(cid, toNumber, payload.type or 'text', payload.body, payload.meta)
end)

exports('PlaceCall', function(src, toNumber)
    if not PhoneCall then return nil end
    return PhoneCall.Start(src, toNumber)
end)

exports('SendMail', function(src, opts)
    local cid = cidOf(src)
    if not cid or not Mail then return nil end
    return Mail.SendSystem(cid, opts)
end)

exports('CreateBill', function(target, data)
    local cid = type(target) == 'string' and target or cidOf(target)
    if not cid or not BillsProvider or not BillsProvider.CreateBill then return nil end
    return BillsProvider.CreateBill(cid, data)
end)
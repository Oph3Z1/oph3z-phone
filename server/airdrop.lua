local AirdropCfg = Config.Airdrop or {}
local RANGE      = AirdropCfg.Range or 8.0
local MAX_PHOTOS = AirdropCfg.MaxPhotos or 20
local phoneOpen = {}

local function coordsOf(src)
    local ped = GetPlayerPed(src)
    if not ped or ped == 0 then return nil end
    return GetEntityCoords(ped)
end

local function cidOf(src)
    return GetIdentifier(src)
end

local function identityOf(src)
    local cid = cidOf(src)
    if not cid then return nil end
    local doc = DB.EnsurePhone(cid, DB.LoadOrCreate(cid))
    return {
        cid    = cid,
        name   = doc.profile and doc.profile.name or 'Unknown',
        avatar = doc.profile and doc.profile.avatar or nil,
        number = doc.phone and doc.phone.number or nil,
    }, doc
end

local function isReceiving(src)
    local cid = cidOf(src)
    if not cid then return false end
    local doc = DB.LoadOrCreate(cid)
    if not (doc.settings and doc.settings.airdrop == true) then return false end
    if AirdropCfg.RequirePhone and not phoneOpen[src] then return false end
    return true
end

local function ensureAirdrops(doc)
    doc.airdrops = doc.airdrops or {}
    doc.airdrops.pending = doc.airdrops.pending or {}
    doc.airdrops.nextId  = doc.airdrops.nextId or 1
    return doc
end

local function cleanContact(c)
    if type(c) ~= 'table' then return nil end
    local name = tostring(c.name or ''):sub(1, 60)
    local number = tostring(c.number or ''):sub(1, 24)
    if name == '' or number == '' then return nil end
    return { name = name, number = number, img = c.img and tostring(c.img):sub(1, 512) or nil }
end

local function cleanPhotos(list)
    if type(list) ~= 'table' then return nil end
    local out = {}
    for _, p in ipairs(list) do
        if type(p) == 'table' and p.url then
            out[#out + 1] = {
                url   = tostring(p.url):sub(1, 512),
                type  = (p.type == 'video') and 'video' or 'image',
                thumb = p.thumb and tostring(p.thumb):sub(1, 512) or nil,
            }
            if #out >= MAX_PHOTOS then break end
        end
    end
    if #out == 0 then return nil end
    return out
end

RegisterNetEvent('oph3z-phone:server:airdrop:presence', function(open)
    phoneOpen[source] = open and true or nil
end)

AddEventHandler('playerDropped', function()
    phoneOpen[source] = nil
end)

RegisterCallback('oph3z-phone:server:airdrop:nearby', function(source)
    local mine = coordsOf(source)
    if not mine then return {} end

    local out = {}
    for _, pidStr in ipairs(GetPlayers()) do
        local pid = tonumber(pidStr)
        if pid and pid ~= source then
            local theirs = coordsOf(pid)
            if theirs and #(mine - theirs) <= RANGE and isReceiving(pid) then
                local id = identityOf(pid)
                if id then
                    out[#out + 1] = { id = pid, name = id.name, avatar = id.avatar }
                end
            end
        end
    end
    return out
end)

RegisterCallback('oph3z-phone:server:airdrop:send', function(source, data)
    if type(data) ~= 'table' then return { ok = false, reason = 'bad' } end
    local target = tonumber(data.to)
    if not target then return { ok = false, reason = 'bad' } end

    local mine, theirs = coordsOf(source), coordsOf(target)
    if not mine or not theirs or #(mine - theirs) > RANGE then return { ok = false, reason = 'range' } end
    if not isReceiving(target) then return { ok = false, reason = 'off' } end

    local from = identityOf(source)
    if not from then return { ok = false, reason = 'bad' } end

    local transfer = { kind = data.kind, ts = os.time() }
    if data.kind == 'contact' then
        transfer.contact = cleanContact(data.contact)
        if not transfer.contact then return { ok = false, reason = 'bad' } end
        transfer.preview = transfer.contact.img
    elseif data.kind == 'photos' then
        transfer.photos = cleanPhotos(data.photos)
        if not transfer.photos then return { ok = false, reason = 'bad' } end
        transfer.preview = transfer.photos[1].thumb or transfer.photos[1].url
    elseif data.kind == 'xprofile' then
        local xp = data.xprofile
        if type(xp) ~= 'table' or type(xp.handle) ~= 'string' or xp.handle == '' then return { ok = false, reason = 'bad' } end
        transfer.xprofile = {
            handle = tostring(xp.handle):sub(1, 20),
            name   = tostring(xp.name or xp.handle):sub(1, 40),
            avatar = xp.avatar and tostring(xp.avatar):sub(1, 512) or nil,
        }
        transfer.preview = transfer.xprofile.avatar
    elseif data.kind == 'app' then
        if type(data.app) ~= 'table' or type(data.app.id) ~= 'string' then return { ok = false, reason = 'bad' } end
        local payload = data.app.payload
        if payload ~= nil and #json.encode(payload) > 16000 then return { ok = false, reason = 'big' } end
        transfer.app = {
            id      = data.app.id,
            title   = data.app.title and tostring(data.app.title):sub(1, 80) or data.app.id,
            icon    = data.app.icon and tostring(data.app.icon):sub(1, 512) or nil,
            payload = payload,
        }
        transfer.preview = transfer.app.icon
    else
        return { ok = false, reason = 'bad' }
    end

    local tcid = cidOf(target)
    if not tcid then return { ok = false, reason = 'bad' } end
    local tdoc = ensureAirdrops(DB.EnsurePhone(tcid, DB.LoadOrCreate(tcid)))
    transfer.id      = tdoc.airdrops.nextId
    transfer.from    = { name = from.name, avatar = from.avatar, number = from.number }
    transfer.fromSrc = source
    tdoc.airdrops.nextId = tdoc.airdrops.nextId + 1
    tdoc.airdrops.pending[#tdoc.airdrops.pending + 1] = transfer
    DB.Save(tcid, tdoc)

    TriggerClientEvent('oph3z-phone:client:airdrop:incoming', target, transfer)

    return { ok = true, id = transfer.id }
end)

local function takePending(doc, id)
    local list = doc.airdrops and doc.airdrops.pending
    if not list then return nil end
    for i = #list, 1, -1 do
        if list[i].id == id then
            local t = list[i]
            table.remove(list, i)
            return t
        end
    end
    return nil
end

RegisterCallback('oph3z-phone:server:airdrop:accept', function(source, id)
    local cid = cidOf(source)
    if not cid then return { ok = false } end
    local doc = ensureAirdrops(DB.EnsurePhone(cid, DB.LoadOrCreate(cid)))
    local t = takePending(doc, id)
    if not t then return { ok = false, reason = 'gone' } end

    local result = { ok = true, kind = t.kind }

    if t.kind == 'contact' and t.contact then
        local digits = DB.Digits(t.contact.number)
        local exists = false
        for _, c in ipairs(doc.phone.contacts) do
            if DB.Digits(c.number) == digits then exists = true break end
        end
        if not exists then
            local contact = {
                id = doc.phone.nextContactId, name = t.contact.name,
                number = t.contact.number, notes = nil, img = t.contact.img, favorite = false,
            }
            doc.phone.nextContactId = doc.phone.nextContactId + 1
            doc.phone.contacts[#doc.phone.contacts + 1] = contact
        end
        result.name = t.contact.name
    elseif t.kind == 'photos' and t.photos then
        DB.Save(cid, doc)
        local n = 0

        for _, p in ipairs(t.photos) do
            if Photos and Photos.Add(cid, p) then n = n + 1 end
        end

        if t.fromSrc then
            TriggerClientEvent('oph3z-phone:client:airdrop:status', t.fromSrc, { ok = true, accepted = true })
        end

        return { ok = true, kind = 'photos', count = n }
    elseif t.kind == 'app' then
        result.app = t.app
    elseif t.kind == 'xprofile' then
        result.xprofile = t.xprofile
    end

    DB.Save(cid, doc)

    if t.fromSrc then
        TriggerClientEvent('oph3z-phone:client:airdrop:status', t.fromSrc, { ok = true, accepted = true })
    end
    return result
end)

RegisterCallback('oph3z-phone:server:airdrop:decline', function(source, id)
    local cid = cidOf(source)
    if not cid then return false end
    local doc = ensureAirdrops(DB.EnsurePhone(cid, DB.LoadOrCreate(cid)))
    local t = takePending(doc, id)
    if not t then return false end
    DB.Save(cid, doc)
    if t.fromSrc then
        TriggerClientEvent('oph3z-phone:client:airdrop:status', t.fromSrc, { ok = true, accepted = false })
    end
    return true
end)

RegisterCallback('oph3z-phone:server:airdrop:pending', function(source)
    local cid = cidOf(source)
    if not cid then return {} end
    local doc = ensureAirdrops(DB.EnsurePhone(cid, DB.LoadOrCreate(cid)))
    return doc.airdrops.pending
end)
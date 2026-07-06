--[[
    oph3z-phone | Marketplace (classifieds) — SERVER callbacks

    A global board of ads. No login: the seller's identity (character name, the
    Settings profile avatar and phone number) is snapshotted onto each listing so
    cards render even when the seller is offline. Profiles group by citizenid.
--]]

-- store.lua defines the global `Market` table; the fxmanifest glob loads main.lua
-- BEFORE store.lua alphabetically, so guard the table (store.lua fills it in).
Market = Market or {}

local function cidOf(src) return DB.GetCitizenId(src) end

local function trim(s) return (tostring(s or ''):gsub('^%s+', ''):gsub('%s+$', '')) end

-- The calling player's identity snapshot (name + Settings avatar + phone number).
local function sellerCard(src)
    local player = exports.qbx_core:GetPlayer(src)
    if not player then return nil end
    local cid = player.PlayerData.citizenid
    local ci  = player.PlayerData.charinfo or {}
    local doc = DB.LoadOrCreate(cid)
    doc = DB.EnsurePhone(cid, doc)
    local name = trim(('%s %s'):format(ci.firstname or '', ci.lastname or ''))
    if name == '' then name = (doc.profile and doc.profile.name) or 'Unknown' end
    return {
        cid       = cid,
        name      = name,
        avatar    = doc.profile and doc.profile.avatar or nil,
        number    = doc.phone and doc.phone.number or nil,
        numberRaw = doc.phone and DB.Digits(doc.phone.numberRaw) or nil,
    }
end

-- ---- serialization --------------------------------------------------------
local function serialize(l, viewerCid)
    if not l then return nil end
    local seller = l.seller or {}
    return {
        id         = l.id,
        category   = l.category,
        title      = l.title or '',
        desc       = l.desc or '',
        price      = l.price or 0,
        media      = l.media or {},
        createdAt  = l.createdAt,
        allowCalls = l.allowCalls == true,
        allowMsg   = l.allowMsg == true,
        isMine     = tostring(l.sellerCid) == tostring(viewerCid),
        seller     = {
            cid    = l.sellerCid,
            name   = seller.name or 'Unknown',
            avatar = seller.avatar,
            number = seller.number,
        },
    }
end

-- ===========================================================================
-- READS
-- ===========================================================================

-- The main feed: newest-first, optionally filtered by category + search query.
lib.callback.register('oph3z-phone:server:market:feed', function(src, data)
    local viewerCid = cidOf(src)
    if not viewerCid then return { ok = false } end
    data = type(data) == 'table' and data or {}
    local cat = tostring(data.category or 'all'):lower()
    local q   = trim(tostring(data.q or '')):lower()

    local filter = function(l)
        if cat ~= 'all' and l.category ~= cat then return false end
        if q ~= '' then
            local hay = (('%s %s %s'):format(l.title or '', l.desc or '', (l.seller and l.seller.name) or '')):lower()
            if not hay:find(q, 1, true) then return false end
        end
        return true
    end

    local out = {}
    for _, l in ipairs(Market.List(filter)) do out[#out + 1] = serialize(l, viewerCid) end
    return { ok = true, listings = out }
end)

-- A single listing (for the detail screen).
lib.callback.register('oph3z-phone:server:market:listing', function(src, data)
    local viewerCid = cidOf(src)
    if not viewerCid or type(data) ~= 'table' then return { ok = false } end
    local l = Market.Get(data.id)
    if not l then return { ok = false, reason = 'notfound' } end
    return { ok = true, listing = serialize(l, viewerCid) }
end)

-- A seller's profile + their listings. No `cid` => the viewer's own profile.
lib.callback.register('oph3z-phone:server:market:profile', function(src, data)
    local viewerCid = cidOf(src)
    if not viewerCid then return { ok = false } end
    local cid = (type(data) == 'table' and data.cid) or viewerCid
    cid = tostring(cid)

    local mine = cid == tostring(viewerCid)
    local seller
    if mine then
        local card = sellerCard(src)
        seller = card and { cid = cid, name = card.name, avatar = card.avatar, number = card.number } or nil
    end

    local out = {}
    for _, l in ipairs(Market.List(function(l) return tostring(l.sellerCid) == cid end)) do
        out[#out + 1] = serialize(l, viewerCid)
        -- Fall back to the newest listing's snapshot for offline sellers.
        if not seller then
            local s = l.seller or {}
            seller = { cid = cid, name = s.name or 'Unknown', avatar = s.avatar, number = s.number }
        end
    end
    if not seller then return { ok = false, reason = 'notfound' } end
    seller.isMe = mine
    return { ok = true, seller = seller, listings = out }
end)

-- The viewer's own seller card (to prefill the composer's contact number).
lib.callback.register('oph3z-phone:server:market:me', function(src)
    local card = sellerCard(src)
    if not card then return { ok = false } end
    return { ok = true, me = { name = card.name, avatar = card.avatar, number = card.number } }
end)

-- ===========================================================================
-- WRITES
-- ===========================================================================

lib.callback.register('oph3z-phone:server:market:create', function(src, data)
    local viewerCid = cidOf(src)
    if not viewerCid or type(data) ~= 'table' then return { ok = false, reason = 'bad' } end
    local card = sellerCard(src)
    if not card then return { ok = false, reason = 'bad' } end
    local seller = { name = card.name, avatar = card.avatar, number = card.number, numberRaw = card.numberRaw }
    local l, err = Market.Create(viewerCid, seller, data)
    if not l then return { ok = false, reason = err } end
    return { ok = true, listing = serialize(l, viewerCid) }
end)

lib.callback.register('oph3z-phone:server:market:update', function(src, data)
    local viewerCid = cidOf(src)
    if not viewerCid or type(data) ~= 'table' then return { ok = false, reason = 'bad' } end
    local l = Market.Get(data.id)
    if not l then return { ok = false, reason = 'notfound' } end
    if tostring(l.sellerCid) ~= tostring(viewerCid) then return { ok = false, reason = 'denied' } end
    local card = sellerCard(src)
    local seller = card and { name = card.name, avatar = card.avatar, number = card.number, numberRaw = card.numberRaw } or nil
    local updated, err = Market.Update(l, seller, data)
    if not updated then return { ok = false, reason = err } end
    return { ok = true, listing = serialize(updated, viewerCid) }
end)

lib.callback.register('oph3z-phone:server:market:delete', function(src, data)
    local viewerCid = cidOf(src)
    if not viewerCid or type(data) ~= 'table' then return { ok = false } end
    local l = Market.Get(data.id)
    if not l then return { ok = true } end -- already gone
    if tostring(l.sellerCid) ~= tostring(viewerCid) then return { ok = false, reason = 'denied' } end
    Market.Delete(data.id)
    return { ok = true }
end)

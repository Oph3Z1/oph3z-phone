--[[
    oph3z-phone | Marketplace (classifieds) — SERVER store

    A GLOBAL board of ads (like X — shared, not per-citizenid). No accounts: a
    listing is tagged with the seller's citizenid and a SNAPSHOT of their identity
    (character name, Settings avatar, phone number) taken at post time so cards
    still render when the seller is offline.

        data/marketplace/listings.json   id(str) -> listing
        data/marketplace/_meta.json      { nextListingId }

    A listing:
        { id, sellerCid, category, title, desc, price(number),
          media = { {url, type('image'|'video'), thumb?}, ... },
          seller = { name, avatar, number, numberRaw },
          allowCalls(bool), allowMsg(bool), createdAt, updatedAt }
--]]

Market = Market or {}

local RESOURCE = GetCurrentResourceName()
local DIR      = (Config.DataFolder or 'data') .. '/marketplace'

-- Valid categories (must match the UI's CATEGORIES list). 'all' is a filter only.
Market.Categories = { ads = true, cars = true, items = true, houses = true, other = true }

-- ---- low-level json file cache -------------------------------------------
local cache = {}

local function readFile(name)
    if cache[name] then return cache[name] end
    local raw = LoadResourceFile(RESOURCE, ('%s/%s'):format(DIR, name))
    local decoded
    if raw and raw ~= '' then
        local ok, res = pcall(json.decode, raw)
        decoded = (ok and type(res) == 'table') and res or {}
    else
        decoded = {}
    end
    cache[name] = decoded
    return decoded
end

local function writeFile(name, tbl)
    cache[name] = tbl
    SaveResourceFile(RESOURCE, ('%s/%s'):format(DIR, name), json.encode(tbl), -1)
end

local function listings() return readFile('listings.json') end
local function meta()     return readFile('_meta.json')     end
local function saveListings() writeFile('listings.json', listings()) end
local function saveMeta()     writeFile('_meta.json', meta())        end

local function nextId(key)
    local m = meta()
    m[key] = (m[key] or 0) + 1
    saveMeta()
    return m[key]
end

-- ---- reads ----------------------------------------------------------------
function Market.Get(id)
    if id == nil then return nil end
    return listings()[tostring(id)]
end

function Market.All() return listings() end

-- Newest-first array of every listing (optionally filtered). filter(listing)->bool.
function Market.List(filter)
    local out = {}
    for _, l in pairs(listings()) do
        if not filter or filter(l) then out[#out + 1] = l end
    end
    table.sort(out, function(a, b) return (a.createdAt or 0) > (b.createdAt or 0) end)
    return out
end

-- ---- writes ---------------------------------------------------------------
-- Sanitize a media array to at most `max` {url,type,thumb} entries.
local function cleanMedia(media)
    local out = {}
    if type(media) ~= 'table' then return out end
    for _, m in ipairs(media) do
        if type(m) == 'table' and type(m.url) == 'string' and m.url:match('^https?://') then
            out[#out + 1] = {
                url   = m.url,
                type  = (m.type == 'video') and 'video' or 'image',
                thumb = (type(m.thumb) == 'string' and m.thumb:match('^https?://')) and m.thumb or nil,
            }
            if #out >= 10 then break end
        end
    end
    return out
end

local function normCategory(c)
    c = tostring(c or ''):lower()
    return Market.Categories[c] and c or 'other'
end

local function clampPrice(p)
    p = tonumber(p) or 0
    if p < 0 then p = 0 end
    if p > 9999999999 then p = 9999999999 end
    return math.floor(p)
end

-- Create a listing. `seller` = identity snapshot { name, avatar, number, numberRaw }.
-- Returns listing, err. Requires a title, at least one media item, and at least
-- one contact method enabled.
function Market.Create(sellerCid, seller, data)
    if not sellerCid or type(data) ~= 'table' then return nil, 'bad' end
    local title = tostring(data.title or ''):sub(1, 80)
    if title:gsub('%s', '') == '' then return nil, 'title' end
    local media = cleanMedia(data.media)
    if #media == 0 then return nil, 'media' end
    local allowCalls = data.allowCalls == true
    local allowMsg   = data.allowMsg == true
    if not allowCalls and not allowMsg then return nil, 'contact' end

    local id = nextId('nextListingId')
    local l = {
        id         = id,
        sellerCid  = sellerCid,
        category   = normCategory(data.category),
        title      = title,
        desc       = tostring(data.desc or ''):sub(1, 1200),
        price      = clampPrice(data.price),
        media      = media,
        seller     = seller,
        allowCalls = allowCalls,
        allowMsg   = allowMsg,
        createdAt  = os.time(),
        updatedAt  = os.time(),
    }
    listings()[tostring(id)] = l
    saveListings()
    return l, nil
end

-- Owner edit. Only the given fields are updated; identity snapshot refreshed.
function Market.Update(l, seller, data)
    if not l or type(data) ~= 'table' then return nil, 'bad' end
    if data.title ~= nil then
        local title = tostring(data.title):sub(1, 80)
        if title:gsub('%s', '') == '' then return nil, 'title' end
        l.title = title
    end
    if data.category ~= nil then l.category = normCategory(data.category) end
    if data.desc ~= nil then l.desc = tostring(data.desc):sub(1, 1200) end
    if data.price ~= nil then l.price = clampPrice(data.price) end
    if data.media ~= nil then
        local media = cleanMedia(data.media)
        if #media == 0 then return nil, 'media' end
        l.media = media
    end
    if data.allowCalls ~= nil then l.allowCalls = data.allowCalls == true end
    if data.allowMsg ~= nil then l.allowMsg = data.allowMsg == true end
    if not l.allowCalls and not l.allowMsg then return nil, 'contact' end
    if seller then l.seller = seller end
    l.updatedAt = os.time()
    Market.Save(l)
    return l, nil
end

function Market.Save(l)
    if not l or not l.id then return end
    listings()[tostring(l.id)] = l
    saveListings()
end

function Market.Delete(id)
    listings()[tostring(id)] = nil
    saveListings()
end

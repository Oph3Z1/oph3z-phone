--[[
    oph3z-phone | Photos app — SERVER

    Stores a player's photos/videos in their per-citizenid document under
    `doc.photos = { items = { {id,url,type,thumb,favorite,ts}, ... }, nextId }`.

    You can hand-add items to data/<citizenid>.json by appending an object to
    `photos.items` with just `{ "url": "...", "type": "image" }` — the missing
    fields (id / favorite / ts / type) are filled in automatically on next load.
--]]

---Ensure the photos table exists and normalise any hand-added entries.
---@param doc table
---@return table doc, boolean changed
local function ensurePhotos(doc)
    doc.photos = doc.photos or {}
    local p = doc.photos
    p.items  = p.items or {}
    p.nextId = p.nextId or 1

    local changed = false
    for _, item in ipairs(p.items) do
        if not item.id then item.id = p.nextId; p.nextId = p.nextId + 1; changed = true end
        if item.favorite == nil then item.favorite = false; changed = true end
        if not item.ts then item.ts = os.time(); changed = true end
        if item.type ~= 'video' then
            if item.type ~= 'image' then item.type = 'image'; changed = true end
        end
    end
    return doc, changed
end

---Load a player's document with a normalised photos table.
---@param citizenid string
---@return table doc
local function loadPhotos(citizenid)
    local doc = DB.LoadOrCreate(citizenid)
    local _, changed = ensurePhotos(doc)
    if changed then DB.Save(citizenid, doc) end
    return doc
end

-- Get the full photo library --------------------------------------------------
lib.callback.register('oph3z-phone:server:photos:get', function(source)
    local cid = DB.GetCitizenId(source)
    if not cid then return {} end
    return loadPhotos(cid).photos.items
end)

-- Core add-photo logic, reusable by other server scripts (e.g. the Camera app).
Photos = Photos or {}

---@param citizenid string|nil
---@param input table  { url, type?, thumb? }
---@return table|nil photo
function Photos.Add(citizenid, input)
    if not citizenid or type(input) ~= 'table' or not input.url then return nil end

    local doc = loadPhotos(citizenid)
    local photo = {
        id       = doc.photos.nextId,
        url      = tostring(input.url),
        type     = (input.type == 'video') and 'video' or 'image',
        thumb    = input.thumb and tostring(input.thumb) or nil,
        duration = tonumber(input.duration) or nil,
        favorite = false,
        ts       = os.time(),
    }
    doc.photos.nextId = doc.photos.nextId + 1
    doc.photos.items[#doc.photos.items + 1] = photo
    DB.Save(citizenid, doc)
    return photo
end

-- Add a photo/video (used by the Camera app, and the /addphoto dev cmd) --------
lib.callback.register('oph3z-phone:server:photos:add', function(source, input)
    return Photos.Add(DB.GetCitizenId(source), input)
end)

-- Toggle favorite -------------------------------------------------------------
lib.callback.register('oph3z-phone:server:photos:setFavorite', function(source, data)
    local cid = DB.GetCitizenId(source)
    if not cid or type(data) ~= 'table' then return false end

    local doc = loadPhotos(cid)
    for _, item in ipairs(doc.photos.items) do
        if item.id == data.id then
            item.favorite = data.favorite and true or false
            DB.Save(cid, doc)
            return true
        end
    end
    return false
end)

-- Delete one or many ----------------------------------------------------------
lib.callback.register('oph3z-phone:server:photos:delete', function(source, ids)
    local cid = DB.GetCitizenId(source)
    if not cid or type(ids) ~= 'table' then return false end

    local remove = {}
    for _, id in ipairs(ids) do remove[id] = true end

    local doc = loadPhotos(cid)
    for i = #doc.photos.items, 1, -1 do
        if remove[doc.photos.items[i].id] then
            table.remove(doc.photos.items, i)
        end
    end
    DB.Save(cid, doc)
    return true
end)

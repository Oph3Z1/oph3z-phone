--[[
    oph3z-phone | Maps app — SERVER

    Stores a player's custom blips (saved places) in their per-citizenid document
    under `doc.maps = { blips = { {id,label,x,y,ts}, ... }, nextId }`.
--]]

local function ensureMaps(doc)
    doc.maps = doc.maps or {}
    doc.maps.blips = doc.maps.blips or {}
    doc.maps.nextId = doc.maps.nextId or 1
    return doc
end

-- Get all saved blips ---------------------------------------------------------
lib.callback.register('oph3z-phone:server:maps:get', function(source)
    local cid = DB.GetCitizenId(source)
    if not cid then return {} end
    return ensureMaps(DB.LoadOrCreate(cid)).maps.blips
end)

-- Add a saved blip ------------------------------------------------------------
lib.callback.register('oph3z-phone:server:maps:add', function(source, input)
    local cid = DB.GetCitizenId(source)
    if not cid or type(input) ~= 'table' or not input.x or not input.y then return nil end

    local doc = ensureMaps(DB.LoadOrCreate(cid))
    local blip = {
        id    = doc.maps.nextId,
        label = tostring(input.label or 'Saved place'):sub(1, 40),
        x     = tonumber(input.x) + 0.0,
        y     = tonumber(input.y) + 0.0,
        ts    = os.time(),
    }
    doc.maps.nextId = doc.maps.nextId + 1
    doc.maps.blips[#doc.maps.blips + 1] = blip
    DB.Save(cid, doc)
    return blip
end)

-- Move a saved blip (drag to reposition) --------------------------------------
lib.callback.register('oph3z-phone:server:maps:move', function(source, input)
    local cid = DB.GetCitizenId(source)
    if not cid or type(input) ~= 'table' or not input.id then return false end

    local doc = ensureMaps(DB.LoadOrCreate(cid))
    for _, b in ipairs(doc.maps.blips) do
        if b.id == input.id then
            b.x = tonumber(input.x) + 0.0
            b.y = tonumber(input.y) + 0.0
            DB.Save(cid, doc)
            return true
        end
    end
    return false
end)

-- Delete a saved blip ---------------------------------------------------------
lib.callback.register('oph3z-phone:server:maps:delete', function(source, id)
    local cid = DB.GetCitizenId(source)
    if not cid or not id then return false end

    local doc = ensureMaps(DB.LoadOrCreate(cid))
    for i = #doc.maps.blips, 1, -1 do
        if doc.maps.blips[i].id == id then table.remove(doc.maps.blips, i) end
    end
    DB.Save(cid, doc)
    return true
end)

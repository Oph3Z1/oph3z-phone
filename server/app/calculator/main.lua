--[[
    oph3z-phone | Calculator — SERVER

    Persists the Calculator's history per-citizenid in `doc.calc`:
        doc.calc = {
            history = { { id, expr, value, ts }, ... },  -- newest first
            nextId  = 1,
        }
    `expr` is the display string ("12600 × 5") and `value` is the numeric result,
    so the UI can format it AND re-use the raw value.
--]]

local MAX_HISTORY = 50 -- how many calculations to keep per player

local function cidOf(src)
    local player = exports.qbx_core:GetPlayer(src)
    return player and player.PlayerData.citizenid or nil
end

local function ensureCalc(doc)
    doc.calc = doc.calc or {}
    doc.calc.history = doc.calc.history or {}
    doc.calc.nextId = doc.calc.nextId or 1
    return doc
end

-- Full history (loaded when the Calculator opens).
lib.callback.register('oph3z-phone:server:calc:get', function(src)
    local cid = cidOf(src)
    if not cid then return {} end
    return ensureCalc(DB.LoadOrCreate(cid)).calc.history
end)

-- Append a calculation { expr, value }. Returns the stored item (with its id).
lib.callback.register('oph3z-phone:server:calc:add', function(src, entry)
    local cid = cidOf(src)
    if not cid or type(entry) ~= 'table' then return nil end
    local expr = tostring(entry.expr or ''):sub(1, 120)
    local value = entry.value
    if expr == '' or type(value) ~= 'number' then return nil end

    local doc = ensureCalc(DB.LoadOrCreate(cid))
    local item = { id = doc.calc.nextId, expr = expr, value = value, ts = os.time() }
    doc.calc.nextId = doc.calc.nextId + 1
    table.insert(doc.calc.history, 1, item) -- newest first
    while #doc.calc.history > MAX_HISTORY do table.remove(doc.calc.history) end
    DB.Save(cid, doc)
    return item
end)

-- Delete one calculation by id.
lib.callback.register('oph3z-phone:server:calc:delete', function(src, id)
    local cid = cidOf(src)
    if not cid then return false end
    local doc = ensureCalc(DB.LoadOrCreate(cid))
    for i = #doc.calc.history, 1, -1 do
        if doc.calc.history[i].id == id then table.remove(doc.calc.history, i) end
    end
    DB.Save(cid, doc)
    return true
end)

-- Wipe the whole history.
lib.callback.register('oph3z-phone:server:calc:clear', function(src)
    local cid = cidOf(src)
    if not cid then return false end
    local doc = ensureCalc(DB.LoadOrCreate(cid))
    doc.calc.history = {}
    DB.Save(cid, doc)
    return true
end)

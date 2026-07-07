local MAX_HISTORY = 50

local function cidOf(src)
    return GetIdentifier(src)
end

local function ensureCalc(doc)
    doc.calc = doc.calc or {}
    doc.calc.history = doc.calc.history or {}
    doc.calc.nextId = doc.calc.nextId or 1
    return doc
end

RegisterCallback('oph3z-phone:server:calc:get', function(src)
    local cid = cidOf(src)
    if not cid then return {} end
    return ensureCalc(DB.LoadOrCreate(cid)).calc.history
end)

RegisterCallback('oph3z-phone:server:calc:add', function(src, entry)
    local cid = cidOf(src)
    if not cid or type(entry) ~= 'table' then return nil end
    local expr = tostring(entry.expr or ''):sub(1, 120)
    local value = entry.value
    if expr == '' or type(value) ~= 'number' then return nil end

    local doc = ensureCalc(DB.LoadOrCreate(cid))
    local item = { id = doc.calc.nextId, expr = expr, value = value, ts = os.time() }
    doc.calc.nextId = doc.calc.nextId + 1
    table.insert(doc.calc.history, 1, item)
    while #doc.calc.history > MAX_HISTORY do table.remove(doc.calc.history) end
    DB.Save(cid, doc)
    return item
end)

RegisterCallback('oph3z-phone:server:calc:delete', function(src, id)
    local cid = cidOf(src)
    if not cid then return false end
    local doc = ensureCalc(DB.LoadOrCreate(cid))
    for i = #doc.calc.history, 1, -1 do
        if doc.calc.history[i].id == id then table.remove(doc.calc.history, i) end
    end
    DB.Save(cid, doc)
    return true
end)

RegisterCallback('oph3z-phone:server:calc:clear', function(src)
    local cid = cidOf(src)
    if not cid then return false end
    local doc = ensureCalc(DB.LoadOrCreate(cid))
    doc.calc.history = {}
    DB.Save(cid, doc)
    return true
end)
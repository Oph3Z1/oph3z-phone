local function ensureRingtones(doc)
    doc.ringtones = doc.ringtones or {}
    doc.ringtones.items  = doc.ringtones.items or {} -- custom: { {id,name,url}, ... }
    doc.ringtones.nextId = doc.ringtones.nextId or 1
    return doc
end

local function clean(value, maxLen)
    if type(value) ~= 'string' then return '' end
    value = value:gsub('^%s+', ''):gsub('%s+$', '')
    if #value > maxLen then value = value:sub(1, maxLen) end
    return value
end

local function builtinRingtones()
    local res = GetCurrentResourceName()
    local out = {}
    for _, r in ipairs(Config.Ringtones or {}) do
        local url = r.url
        if (not url or url == '') and r.file then
            url = ('https://cfx-nui-%s/build/audio/%s'):format(res, r.file)
        end
        if url and url ~= '' then
            out[#out + 1] = { id = r.id or r.name, name = r.name, url = url, builtin = true }
        end
    end
    return out
end

Ringtones = Ringtones or {}
function Ringtones.UrlFor(citizenid)
    local doc = citizenid and DB.Load(citizenid) or nil
    local picked = doc and doc.settings and doc.settings.ringtone
    if type(picked) == 'string' and picked ~= '' then return picked end
    return Config.RingtoneUrl
end

RegisterCallback('oph3z-phone:server:ringtones:get', function(src)
    local cid = DB.GetCitizenId(src)
    if not cid then return { ringtones = {}, selected = '' } end

    local doc = ensureRingtones(DB.LoadOrCreate(cid))
    local list = builtinRingtones()
    for _, c in ipairs(doc.ringtones.items) do
        list[#list + 1] = { id = c.id, name = c.name, url = c.url, builtin = false }
    end
    return {
        ringtones = list,
        selected  = (doc.settings and doc.settings.ringtone) or '',
    }
end)

RegisterCallback('oph3z-phone:server:ringtones:add', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' then return nil end

    local name = clean(input.name, 40)
    local url  = clean(input.url, 512)
    if name == '' or url == '' then return nil end

    local doc = ensureRingtones(DB.LoadOrCreate(cid))
    local item = { id = 'c' .. doc.ringtones.nextId, name = name, url = url }
    doc.ringtones.nextId = doc.ringtones.nextId + 1
    doc.ringtones.items[#doc.ringtones.items + 1] = item
    DB.Save(cid, doc)
    return item
end)

RegisterCallback('oph3z-phone:server:ringtones:delete', function(src, id)
    local cid = DB.GetCitizenId(src)
    if not cid or type(id) ~= 'string' then return false end

    local doc = ensureRingtones(DB.LoadOrCreate(cid))
    local removedUrl
    for i = #doc.ringtones.items, 1, -1 do
        if doc.ringtones.items[i].id == id then
            removedUrl = doc.ringtones.items[i].url
            table.remove(doc.ringtones.items, i)
        end
    end
    if removedUrl and doc.settings and doc.settings.ringtone == removedUrl then
        doc.settings.ringtone = nil
    end
    DB.Save(cid, doc)
    return true
end)
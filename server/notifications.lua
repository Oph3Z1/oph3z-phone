local MAX_NOTIFS = 50

local function ensureNotifs(doc)
    doc.notifications = doc.notifications or {}
    doc.notifications.items = doc.notifications.items or {}
    doc.notifications.nextId = doc.notifications.nextId or 1
    return doc
end

Notif = Notif or {}

function Notif.Push(citizenid, data)
    if not citizenid or type(data) ~= 'table' then return end

    local doc = ensureNotifs(DB.LoadOrCreate(citizenid))
    local s = doc.settings or {}
    if s.notifMaster == false then return end
    local appId = data.app or 'system'
    if s.notifApps and s.notifApps[appId] == false then return end

    local lang = s.language or Config.DefaultLocale or 'en'
    local function loc(key, args)
        local str = Lang(key, lang)
        if args and #args > 0 then
            local ok, res = pcall(string.format, str, table.unpack(args))
            if ok then return res end
        end
        return str
    end
    local title = data.title or (data.titleKey and loc(data.titleKey, data.titleArgs)) or ''
    local body  = data.body or (data.bodyKey and loc(data.bodyKey, data.bodyArgs)) or ''

    local n = doc.notifications
    local item = {
        id    = n.nextId,
        app   = data.app or 'system',
        title = tostring(title),
        body  = tostring(body),
        icon  = data.icon,
        route = data.route,
        ts    = os.time(),
        read  = false,
        queued = (s.airplane == true) or nil,
    }
    n.nextId = n.nextId + 1
    n.items[#n.items + 1] = item
    while #n.items > MAX_NOTIFS do table.remove(n.items, 1) end
    DB.Save(citizenid, doc)

    if s.airplane == true then return end

    local player = GetPlayerByCitizenId(citizenid)
    if player then
        TriggerClientEvent('oph3z-phone:client:notify', player.PlayerData.source, item)
    end
end

function Notif.Release(citizenid)
    if not citizenid then return false end
    local doc = ensureNotifs(DB.LoadOrCreate(citizenid))
    local changed = false
    for _, it in ipairs(doc.notifications.items) do
        if it.queued then it.queued = nil; changed = true end
    end
    if changed then DB.Save(citizenid, doc) end
    return changed
end

RegisterCallback('oph3z-phone:server:notifications:get', function(src)
    local cid = DB.GetCitizenId(src)
    if not cid then return {} end
    local doc = ensureNotifs(DB.LoadOrCreate(cid))
    local out = {}
    for i = #doc.notifications.items, 1, -1 do
        if not doc.notifications.items[i].queued then
            out[#out + 1] = doc.notifications.items[i]
        end
    end
    return out
end)

RegisterCallback('oph3z-phone:server:notifications:read', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' then return false end
    local doc = ensureNotifs(DB.LoadOrCreate(cid))
    for _, it in ipairs(doc.notifications.items) do
        if input.all
            or (input.id and it.id == input.id)
            or (input.app and it.app == input.app)
            or (input.number and it.route and it.route.number == input.number)
            or (input.gid and it.route and it.route.gid == input.gid) then
            it.read = true
        end
    end
    DB.Save(cid, doc)
    return true
end)

RegisterCallback('oph3z-phone:server:notifications:clear', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid then return false end
    local doc = ensureNotifs(DB.LoadOrCreate(cid))
    local items = doc.notifications.items

    if input and input.id then
        for i = #items, 1, -1 do
            if items[i].id == input.id then table.remove(items, i) end
        end
    elseif input and (input.number or input.gid or input.app) then
        for i = #items, 1, -1 do
            local it = items[i]
            if (input.number and it.route and it.route.number == input.number)
                or (input.gid and it.route and it.route.gid == input.gid)
                or (input.app and it.app == input.app) then
                table.remove(items, i)
            end
        end
    else
        doc.notifications.items = {}
    end
    DB.Save(cid, doc)
    return true
end)
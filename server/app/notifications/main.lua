--[[
    oph3z-phone | Notifications — SERVER

    A generic, app-agnostic notification store persisted per citizenid
    (`doc.notifications = { items = {...}, nextId }`). Any server module pushes via
    the global `Notif.Push(citizenid, { app, title, body, icon?, route? })`. The
    notification is saved (so it survives relogs / offline) and, if the player is
    online, pushed live to their phone.
--]]

local MAX_NOTIFS = 50

local function ensureNotifs(doc)
    doc.notifications = doc.notifications or {}
    doc.notifications.items = doc.notifications.items or {}
    doc.notifications.nextId = doc.notifications.nextId or 1
    return doc
end

-- Global entry point used by the messages / call modules (and future apps).
Notif = Notif or {}

function Notif.Push(citizenid, data)
    if not citizenid or type(data) ~= 'table' then return end

    local doc = ensureNotifs(DB.LoadOrCreate(citizenid))
    local n = doc.notifications
    local item = {
        id    = n.nextId,
        app   = data.app or 'system',
        title = tostring(data.title or ''),
        body  = tostring(data.body or ''),
        icon  = data.icon,  -- optional icon override (key/url); NUI falls back to the app icon
        route = data.route, -- optional { app, number, tab } for tap-to-open
        ts    = os.time(),
        read  = false,
    }
    n.nextId = n.nextId + 1
    n.items[#n.items + 1] = item
    while #n.items > MAX_NOTIFS do table.remove(n.items, 1) end
    DB.Save(citizenid, doc)

    local player = exports.qbx_core:GetPlayerByCitizenId(citizenid)
    if player then
        TriggerClientEvent('oph3z-phone:client:notify', player.PlayerData.source, item)
    end
end

-- List all notifications (newest first).
lib.callback.register('oph3z-phone:server:notifications:get', function(src)
    local cid = DB.GetCitizenId(src)
    if not cid then return {} end
    local doc = ensureNotifs(DB.LoadOrCreate(cid))
    local out = {}
    for i = #doc.notifications.items, 1, -1 do
        out[#out + 1] = doc.notifications.items[i]
    end
    return out
end)

-- Mark notifications read: { all } | { id } | { app } | { number } (route.number).
lib.callback.register('oph3z-phone:server:notifications:read', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' then return false end
    local doc = ensureNotifs(DB.LoadOrCreate(cid))
    for _, it in ipairs(doc.notifications.items) do
        if input.all
            or (input.id and it.id == input.id)
            or (input.app and it.app == input.app)
            or (input.number and it.route and it.route.number == input.number) then
            it.read = true
        end
    end
    DB.Save(cid, doc)
    return true
end)

-- Clear notifications: { id } removes one, otherwise clears all.
lib.callback.register('oph3z-phone:server:notifications:clear', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid then return false end
    local doc = ensureNotifs(DB.LoadOrCreate(cid))
    if input and input.id then
        for i = #doc.notifications.items, 1, -1 do
            if doc.notifications.items[i].id == input.id then
                table.remove(doc.notifications.items, i)
            end
        end
    else
        doc.notifications.items = {}
    end
    DB.Save(cid, doc)
    return true
end)

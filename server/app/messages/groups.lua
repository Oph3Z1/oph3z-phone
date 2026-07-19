local GROUP_PREFIX = 'group_'
local MAX_ITEMS = 200

local function genId()
    return ('%d%04d'):format(os.time(), math.random(0, 9999))
end

local function groupPath(gid)
    return ('%s/%s%s.json'):format(Config.DataFolder, GROUP_PREFIX, gid)
end

local function validGid(gid)
    return type(gid) == 'string' and gid:match('^[%w_-]+$') ~= nil
end

local function loadGroup(gid)
    if not validGid(gid) then return nil end
    local raw = LoadResourceFile(GetCurrentResourceName(), groupPath(gid))
    if not raw or raw == '' then return nil end
    local ok, decoded = pcall(json.decode, raw)
    return (ok and type(decoded) == 'table') and decoded or nil
end

local function saveGroup(group)
    if not group or not validGid(group.gid) then return false end
    group.updatedAt = os.time()
    SaveResourceFile(GetCurrentResourceName(), groupPath(group.gid),
        json.encode(group, { indent = true }), -1)
    return true
end

local function deleteGroupFile(gid)
    if validGid(gid) then
        SaveResourceFile(GetCurrentResourceName(), groupPath(gid), '', -1)
    end
end

local function selfNumber(cid)
    return DB.Digits(DB.EnsurePhone(cid, DB.LoadOrCreate(cid)).phone.numberRaw)
end

local function memberEntry(group, number)
    for _, m in ipairs(group.members) do
        if m.number == number then return m end
    end
    return nil
end

local function isMember(group, number)
    return memberEntry(group, number) ~= nil
end

local function onlineSrc(number)
    local cid = DB.GetCitizenIdByNumber(number)
    if not cid then return nil, nil end
    local p = GetPlayerByCitizenId(cid)
    return p and p.PlayerData.source or nil, cid
end

local function addGidToPlayer(number, gid)
    local cid = DB.GetCitizenIdByNumber(number)
    if not cid then return end
    local doc = DB.LoadOrCreate(cid)
    doc.messages = doc.messages or {}
    doc.messages.groupIds = doc.messages.groupIds or {}
    for _, g in ipairs(doc.messages.groupIds) do
        if g == gid then return end
    end
    doc.messages.groupIds[#doc.messages.groupIds + 1] = gid
    DB.SaveNow(cid, doc)
end

local function removeGidFromPlayer(number, gid)
    local cid = DB.GetCitizenIdByNumber(number)
    if not cid then return end
    local doc = DB.LoadOrCreate(cid)
    if not doc.messages or not doc.messages.groupIds then return end
    local out = {}
    for _, g in ipairs(doc.messages.groupIds) do
        if g ~= gid then out[#out + 1] = g end
    end
    doc.messages.groupIds = out
    DB.SaveNow(cid, doc)
end

local function indexOfId(items, id)
    if not id then return 0 end
    for i, m in ipairs(items) do
        if m.id == id then return i end
    end
    return 0
end

local function resolvePerson(viewerCid, number, snapshotName)
    local contact = DB.ResolveContact(viewerCid, number)
    if contact then
        return contact.name, contact.img
    end
    return snapshotName or DB.FormatNumber(number), nil
end

local function broadcast(group, item)
    local preview = item.body or ''
    if item.type == 'image' then preview = '📷 Photo'
    elseif item.type == 'gif' then preview = '🎞️ GIF'
    elseif item.type == 'video' then preview = '📹 Video'
    elseif item.type == 'voice' then preview = '🎤 Voice message'
    elseif item.type == 'location' then preview = '📍 Location'
    elseif item.type == 'system' then preview = item.body end

    for _, m in ipairs(group.members) do
        if m.number ~= item.from then
            local src, cid = onlineSrc(m.number)
            local senderName = item.from ~= '' and select(1, resolvePerson(cid or '', item.from, nil)) or ''
            if src then
                TriggerClientEvent('oph3z-phone:client:groups:incoming', src, {
                    gid = group.gid,
                    name = group.name,
                    photo = group.photo,
                    msg = item,
                    senderName = senderName,
                })
            end

            if cid and Notif and item.type ~= 'system' then
                Notif.Push(cid, {
                    app = 'message',
                    title = group.name,
                    body = senderName ~= '' and (senderName .. ': ' .. preview) or preview,
                    route = { app = 'message', gid = group.gid },
                })
            end
        end
    end
end

local function appendItem(group, from, mtype, body, meta)
    local item = {
        id = genId(), from = from, type = mtype, body = body, meta = meta, ts = os.time(),
    }
    group.items[#group.items + 1] = item
    if #group.items > MAX_ITEMS then table.remove(group.items, 1) end
    if from ~= '' then group.reads[from] = item.id end
    saveGroup(group)
    broadcast(group, item)
    return item
end

local function pushSystem(group, text)
    return appendItem(group, '', 'system', text, nil)
end

local groupShares = {} -- [sid] = { gid, senderNumber, senderSrc, id, lastX, lastY, lastLabel }

local function applyGroupLive(items)
    for _, m in ipairs(items) do
        if m.type == 'location' and m.meta and m.meta.sid then
            local sh = groupShares[m.meta.sid]
            if sh then
                m.meta.x = sh.lastX
                m.meta.y = sh.lastY
                m.meta.label = sh.lastLabel or m.meta.label
                m.meta.live = true
            end
        end
    end
    return items
end

local function serializeMembers(group, viewerCid)
    local out = {}
    for _, m in ipairs(group.members) do
        local name, avatar = resolvePerson(viewerCid, m.number, m.name)
        out[#out + 1] = {
            number = m.number,
            name = name,
            avatar = avatar,
            isOwner = (group.owner == m.number),
            lastReadId = group.reads[m.number] or nil,
        }
    end
    return out
end

local function serializeItems(group, viewerCid, myNumber)
    applyGroupLive(group.items)
    local out = {}
    for _, m in ipairs(group.items) do
        local senderName, senderAvatar
        if m.type ~= 'system' and m.from ~= '' then
            senderName, senderAvatar = resolvePerson(viewerCid, m.from, nil)
        end
        out[#out + 1] = {
            id = m.id, from = m.from, mine = (m.from == myNumber),
            type = m.type, body = m.body, meta = m.meta, ts = m.ts,
            reactions = m.reactions, senderName = senderName, senderAvatar = senderAvatar,
        }
    end
    return out
end

Groups = Groups or {}

function Groups.ListForThreads(cid)
    local doc = DB.LoadOrCreate(cid)
    local ids = doc.messages and doc.messages.groupIds
    if not ids or #ids == 0 then return {} end

    local myNumber = selfNumber(cid)
    local rows = {}
    local stale = {}

    for _, gid in ipairs(ids) do
        local group = loadGroup(gid)
        if not group or not isMember(group, myNumber) then
            stale[#stale + 1] = gid
        else
            local last = group.items[#group.items]
            local lastSender
            if last and last.type ~= 'system' and last.from ~= '' and last.from ~= myNumber then
                lastSender = select(1, resolvePerson(cid, last.from, nil))
            end

            local fromIdx = indexOfId(group.items, group.reads[myNumber])
            local unread = 0
            for i = fromIdx + 1, #group.items do
                local it = group.items[i]
                if it.from ~= myNumber and it.type ~= 'system' then unread = unread + 1 end
            end

            rows[#rows + 1] = {
                isGroup = true,
                gid = group.gid,
                name = group.name,
                photo = group.photo,
                members = #group.members,
                lastType = last and last.type or 'text',
                lastBody = last and last.body or '',
                lastDir = (last and last.from == myNumber) and 'out' or 'in',
                lastSender = lastSender,
                lastTs = last and last.ts or group.createdAt or 0,
                unread = unread,
            }
        end
    end

    if #stale > 0 then
        for _, gid in ipairs(stale) do removeGidFromPlayer(myNumber, gid) end
    end
    return rows
end

RegisterCallback('oph3z-phone:server:groups:create', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' then return nil end

    local myNumber = selfNumber(cid)
    local name = tostring(input.name or ''):gsub('^%s+', ''):gsub('%s+$', '')
    if name == '' then name = 'New Group' end

    local seen = { [myNumber] = true }
    local members = { { number = myNumber, name = nil, joinedAt = os.time() } }
    if type(input.members) == 'table' then
        for _, raw in ipairs(input.members) do
            local d = DB.Digits(raw)
            if d ~= '' and not seen[d] then
                seen[d] = true
                members[#members + 1] = { number = d, name = nil, joinedAt = os.time() }
            end
        end
    end
    if #members < 2 then return nil end

    local group = {
        gid = 'g' .. genId(),
        name = name,
        photo = type(input.photo) == 'string' and input.photo ~= '' and input.photo or nil,
        owner = myNumber,
        createdAt = os.time(),
        members = members,
        items = {},
        reads = {},
    }
    saveGroup(group)

    for _, m in ipairs(members) do addGidToPlayer(m.number, group.gid) end

    pushSystem(group, 'Group created')
    for _, m in ipairs(members) do
        if m.number ~= myNumber then
            local _, mcid = onlineSrc(m.number)
            mcid = mcid or DB.GetCitizenIdByNumber(m.number)
            if mcid and Notif then
                Notif.Push(mcid, {
                    app = 'message',
                    title = group.name,
                    bodyKey = 'notify.addedToGroup',
                    route = { app = 'message', gid = group.gid },
                })
            end
        end
    end

    return { gid = group.gid }
end)

RegisterCallback('oph3z-phone:server:groups:open', function(src, input)
    local cid = DB.GetCitizenId(src)
    local gid = input and input.gid
    if not cid or not gid then return nil end

    local group = loadGroup(gid)
    if not group then return nil end
    local myNumber = selfNumber(cid)
    if not isMember(group, myNumber) then return nil end

    local last = group.items[#group.items]
    if last and group.reads[myNumber] ~= last.id then
        group.reads[myNumber] = last.id
        saveGroup(group)
        for _, m in ipairs(group.members) do
            if m.number ~= myNumber then
                local s = onlineSrc(m.number)
                if s then
                    TriggerClientEvent('oph3z-phone:client:groups:read', s,
                        { gid = gid, number = myNumber, lastReadId = last.id })
                end
            end
        end
    end

    return {
        gid = group.gid,
        name = group.name,
        photo = group.photo,
        owner = group.owner,
        isOwner = (group.owner == myNumber),
        selfNumber = myNumber,
        members = serializeMembers(group, cid),
        items = serializeItems(group, cid, myNumber),
    }
end)

RegisterCallback('oph3z-phone:server:groups:send', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' or not input.gid then return nil end

    local group = loadGroup(input.gid)
    if not group then return nil end
    local myNumber = selfNumber(cid)
    if not isMember(group, myNumber) then return nil end

    local mtype = tostring(input.type or 'text')
    local meta = type(input.meta) == 'table' and input.meta or nil
    local item = appendItem(group, myNumber, mtype, tostring(input.body or ''), meta)
    return {
        id = item.id, from = myNumber, mine = true, type = item.type,
        body = item.body, meta = item.meta, ts = item.ts,
    }
end)

RegisterCallback('oph3z-phone:server:groups:read', function(src, input)
    local cid = DB.GetCitizenId(src)
    local gid = input and input.gid
    if not cid or not gid then return false end
    local group = loadGroup(gid)
    if not group then return false end
    local myNumber = selfNumber(cid)
    local last = group.items[#group.items]
    if last and group.reads[myNumber] ~= last.id then
        group.reads[myNumber] = last.id
        saveGroup(group)
        for _, m in ipairs(group.members) do
            if m.number ~= myNumber then
                local s = onlineSrc(m.number)
                if s then
                    TriggerClientEvent('oph3z-phone:client:groups:read', s,
                        { gid = gid, number = myNumber, lastReadId = last.id })
                end
            end
        end
    end
    return true
end)

RegisterCallback('oph3z-phone:server:groups:react', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' or not input.gid or not input.id then return false end
    local group = loadGroup(input.gid)
    if not group then return false end
    local myNumber = selfNumber(cid)
    if not isMember(group, myNumber) then return false end

    local target
    for _, m in ipairs(group.items) do
        if m.id == input.id then target = m; break end
    end
    if not target then return false end
    target.reactions = target.reactions or {}
    local emoji = input.emoji
    if not emoji or emoji == '' or target.reactions[myNumber] == emoji then
        target.reactions[myNumber] = nil
    else
        target.reactions[myNumber] = emoji
    end
    saveGroup(group)

    for _, m in ipairs(group.members) do
        local s = onlineSrc(m.number)
        if s then
            TriggerClientEvent('oph3z-phone:client:groups:react', s, {
                gid = input.gid, id = input.id, number = myNumber,
                emoji = target.reactions[myNumber] or false,
            })
        end
    end
    return true
end)

RegisterCallback('oph3z-phone:server:groups:manage', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' or not input.gid then return { ok = false } end

    local group = loadGroup(input.gid)
    if not group then return { ok = false, reason = 'gone' } end
    local myNumber = selfNumber(cid)
    if not isMember(group, myNumber) then return { ok = false, reason = 'member' } end

    local myName = select(1, resolvePerson(cid, myNumber, nil))
    local action = input.action

    if action == 'add' and type(input.members) == 'table' then
        for _, raw in ipairs(input.members) do
            local d = DB.Digits(raw)
            if d ~= '' and not isMember(group, d) then
                group.members[#group.members + 1] = { number = d, name = nil, joinedAt = os.time() }
                addGidToPlayer(d, group.gid)
                local _, mcid = onlineSrc(d)
                mcid = mcid or DB.GetCitizenIdByNumber(d)
                if mcid and Notif then
                    Notif.Push(mcid, {
                        app = 'message', title = group.name,
                        bodyKey = 'notify.addedToGroup',
                        route = { app = 'message', gid = group.gid },
                    })
                end
            end
        end
        saveGroup(group)
        pushSystem(group, myName .. ' added new members')

    elseif action == 'remove' and input.number then
        local d = DB.Digits(input.number)
        if group.owner ~= myNumber then return { ok = false, reason = 'owner' } end
        if d == group.owner then return { ok = false, reason = 'owner' } end
        local removedName = select(1, resolvePerson(cid, d, memberEntry(group, d) and memberEntry(group, d).name))
        local out = {}
        for _, m in ipairs(group.members) do
            if m.number ~= d then out[#out + 1] = m end
        end
        group.members = out
        saveGroup(group)
        removeGidFromPlayer(d, group.gid)
        pushSystem(group, removedName .. ' was removed')
        local s = onlineSrc(d)
        if s then TriggerClientEvent('oph3z-phone:client:groups:removed', s, { gid = group.gid }) end

    elseif action == 'leave' then
        local out = {}
        for _, m in ipairs(group.members) do
            if m.number ~= myNumber then out[#out + 1] = m end
        end

        group.members = out
        removeGidFromPlayer(myNumber, group.gid)
        if #group.members == 0 then
            deleteGroupFile(group.gid)
            return { ok = true, left = true }
        end

        if group.owner == myNumber then group.owner = group.members[1].number end
        saveGroup(group)
        pushSystem(group, myName .. ' left the group')
        return { ok = true, left = true }

    elseif action == 'rename' then
        local name = tostring(input.name or ''):gsub('^%s+', ''):gsub('%s+$', '')
        if name == '' then return { ok = false, reason = 'name' } end
        group.name = name
        saveGroup(group)
        pushSystem(group, myName .. ' named the group "' .. name .. '"')

    elseif action == 'setphoto' then
        group.photo = type(input.photo) == 'string' and input.photo ~= '' and input.photo or nil
        saveGroup(group)
        pushSystem(group, myName .. ' changed the group photo')

    elseif action == 'delete' then
        if group.owner ~= myNumber then return { ok = false, reason = 'owner' } end
        for _, m in ipairs(group.members) do
            removeGidFromPlayer(m.number, group.gid)
            if m.number ~= myNumber then
                local s = onlineSrc(m.number)
                if s then TriggerClientEvent('oph3z-phone:client:groups:removed', s, { gid = group.gid }) end
            end
        end
        deleteGroupFile(group.gid)
        return { ok = true, deleted = true }

    else
        return { ok = false, reason = 'action' }
    end

    return {
        ok = true,
        group = {
            gid = group.gid, name = group.name, photo = group.photo, owner = group.owner,
            isOwner = (group.owner == myNumber), selfNumber = myNumber,
            members = serializeMembers(group, cid),
            items = serializeItems(group, cid, myNumber),
        },
    }
end)

local function pushGroupLoc(group, data)
    for _, m in ipairs(group.members) do
        local s = onlineSrc(m.number)
        if s then TriggerClientEvent('oph3z-phone:client:groups:locupdate', s, data) end
    end
end

local function findGroupItem(group, id)
    for _, m in ipairs(group.items) do
        if m.id == id then return m end
    end
    return nil
end

local function endGroupShare(sid, reason)
    local sh = groupShares[sid]
    if not sh then return end
    groupShares[sid] = nil
    local group = loadGroup(sh.gid)
    if not group then return end
    local item = findGroupItem(group, sh.id)
    if item then
        item.meta = item.meta or {}
        item.meta.x, item.meta.y, item.meta.label = sh.lastX, sh.lastY, sh.lastLabel
        item.meta.live = false
        item.meta.endReason = reason or 'expired'
        saveGroup(group)
    end
    pushGroupLoc(group, {
        gid = sh.gid, id = sh.id, x = sh.lastX, y = sh.lastY,
        label = sh.lastLabel, live = false, endReason = reason or 'expired',
    })
    local sSrc = onlineSrc(sh.senderNumber)
    if sSrc then TriggerClientEvent('oph3z-phone:client:loc:stop', sSrc, { sid = sid }) end
end

RegisterCallback('oph3z-phone:server:groups:location', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' or not input.gid then return false end
    local group = loadGroup(input.gid)
    if not group then return false end
    local myNumber = selfNumber(cid)
    if not isMember(group, myNumber) then return false end

    local x = tonumber(input.x) or 0.0
    local y = tonumber(input.y) or 0.0
    local label = tostring(input.label or 'Shared Location')
    local live = input.live and true or false
    local meta = { x = x, y = y, label = label, live = live }

    if live then meta.sid = 'g' .. genId() end
    local item = appendItem(group, myNumber, 'location', label, meta)

    if live then
        groupShares[meta.sid] = {
            gid = group.gid, senderNumber = myNumber, senderSrc = src,
            id = item.id, lastX = x, lastY = y, lastLabel = label,
        }
    end

    return {
        id = item.id, from = myNumber, mine = true, type = 'location',
        body = item.body, meta = item.meta, ts = item.ts,
    }
end)

RegisterNetEvent('oph3z-phone:server:groups:locupdate', function(sid, x, y, label)
    local src = source
    local sh = groupShares[sid]
    if not sh or sh.senderSrc ~= src then return end
    x, y = tonumber(x), tonumber(y)
    if not x or not y then return end
    sh.lastX, sh.lastY, sh.lastLabel = x, y, label or sh.lastLabel
    local group = loadGroup(sh.gid)
    if group then
        pushGroupLoc(group, { gid = sh.gid, id = sh.id, x = x, y = y, label = label })
    end
end)

RegisterCallback('oph3z-phone:server:groups:locstop', function(src, input)
    local cid = DB.GetCitizenId(src)
    local sid = input and input.sid
    if not sid then return { ok = false } end
    local sh = groupShares[sid]
    if sh and DB.GetCitizenIdByNumber(sh.senderNumber) ~= cid then return { ok = false } end
    endGroupShare(sid, (input and input.reason) or 'stopped')
    return { ok = true }
end)

AddEventHandler('playerDropped', function()
    local src = source
    for sid, sh in pairs(groupShares) do
        if sh.senderSrc == src then endGroupShare(sid, 'expired') end
    end
end)
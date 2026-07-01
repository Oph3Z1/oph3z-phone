--[[
    oph3z-phone | Messages app — SERVER

    1-on-1 text messaging by phone number. Each player stores their own copy of
    every thread (`doc.messages.threads[otherNumberDigits] = { number, items, unread }`).
    Sending writes the message to BOTH the sender's and recipient's documents and,
    if the recipient is online, pushes it live. Offline recipients get it on next
    load. Names/avatars are resolved from contacts at read time.
--]]

local function ensureMessages(doc)
    doc.messages = doc.messages or {}
    doc.messages.threads = doc.messages.threads or {}
    return doc
end

local function genId()
    return ('%d%04d'):format(os.time(), math.random(0, 9999))
end

-- Active live-location shares, keyed by share id (sid). Holds the latest streamed
-- position in memory; only persisted to disk when the share ends. Declared up here
-- so messages:open can overlay the current position onto a freshly opened thread.
local liveShares = {} -- [sid] = { senderCid, senderSrc, senderNumber, recipCid, recipNumber, id, lastX, lastY, lastLabel }

-- Overlay the latest live position onto any active live-location items (so a thread
-- opened after missing some live pushes still shows the current position).
local function applyLivePositions(items)
    for _, m in ipairs(items) do
        if m.type == 'location' and m.meta and m.meta.sid then
            local sh = liveShares[m.meta.sid]
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

-- Append a message to one document's thread, capped at 200.
local function appendToThread(doc, numberDigits, msg, incUnread)
    local threads = doc.messages.threads
    local t = threads[numberDigits]
    if not t then
        t = { number = numberDigits, items = {}, unread = 0 }
        threads[numberDigits] = t
    end
    t.items[#t.items + 1] = msg
    if incUnread then t.unread = (t.unread or 0) + 1 end
    if #t.items > 200 then table.remove(t.items, 1) end
end

-- List all threads (newest first) with resolved name/avatar + last-message preview.
lib.callback.register('oph3z-phone:server:messages:threads', function(src)
    local cid = DB.GetCitizenId(src)
    if not cid then return {} end

    local doc = ensureMessages(DB.LoadOrCreate(cid))
    local out = {}
    for number, t in pairs(doc.messages.threads) do
        local last = t.items[#t.items]
        local contact = DB.ResolveContact(cid, number)
        out[#out + 1] = {
            number   = number,
            name     = contact and contact.name or DB.FormatNumber(number),
            avatar   = contact and contact.img or nil,
            lastType = last and last.type or 'text',
            lastBody = last and last.body or '',
            lastDir  = last and last.dir or 'out',
            lastTs   = last and last.ts or 0,
            unread   = t.unread or 0,
        }
    end
    -- Merge in the player's group chats (they share the same thread list).
    if Groups then
        for _, row in ipairs(Groups.ListForThreads(cid)) do
            out[#out + 1] = row
        end
    end

    table.sort(out, function(a, b) return (a.lastTs or 0) > (b.lastTs or 0) end)
    return out
end)

-- Open one thread: return its messages (resolved meta) and mark it read.
lib.callback.register('oph3z-phone:server:messages:open', function(src, input)
    local cid = DB.GetCitizenId(src)
    local number = DB.Digits(input and input.number)
    if not cid or number == '' then return nil end

    local doc = ensureMessages(DB.LoadOrCreate(cid))
    local t = doc.messages.threads[number]
    local contact = DB.ResolveContact(cid, number)

    if t and (t.unread or 0) > 0 then
        t.unread = 0
        for _, m in ipairs(t.items) do m.read = true end
        DB.Save(cid, doc)
    end

    return {
        number = number,
        name   = contact and contact.name or DB.FormatNumber(number),
        avatar = contact and contact.img or nil,
        items  = applyLivePositions(t and t.items or {}),
    }
end)

-- Delete whole threads (Edit mode in the list).
lib.callback.register('oph3z-phone:server:messages:delete', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' or type(input.numbers) ~= 'table' then return false end

    local doc = ensureMessages(DB.LoadOrCreate(cid))
    for _, number in ipairs(input.numbers) do
        doc.messages.threads[DB.Digits(number)] = nil
    end
    DB.Save(cid, doc)
    return true
end)

-- Mark a thread read (used when a message arrives while it's already open).
lib.callback.register('oph3z-phone:server:messages:read', function(src, input)
    local cid = DB.GetCitizenId(src)
    local number = DB.Digits(input and input.number)
    if not cid or number == '' then return false end

    local doc = ensureMessages(DB.LoadOrCreate(cid))
    local t = doc.messages.threads[number]
    if t and (t.unread or 0) > 0 then
        t.unread = 0
        for _, m in ipairs(t.items) do m.read = true end
        DB.Save(cid, doc)
    end
    return true
end)

-- Short human-readable preview of a message for notifications / previews.
local function notifBody(mtype, body, meta)
    if mtype == 'image' then return '📷 Photo'
    elseif mtype == 'gif' then return '🎞️ GIF'
    elseif mtype == 'video' then return '📹 Video'
    elseif mtype == 'voice' then return '🎤 Voice message'
    elseif mtype == 'location' then return '📍 Location'
    elseif mtype == 'money' then return ('You received $%s'):format(meta and meta.amount or body)
    elseif mtype == 'request' then return ('Requested $%s'):format(meta and meta.amount or body)
    else return body end
end

-- Write a message to BOTH the sender's and recipient's docs, push live to an
-- online recipient, and return the sender's outgoing copy.
local function deliver(senderCid, toDigits, mtype, body, meta)
    local id = genId()
    local ts = os.time()

    local senderDoc = ensureMessages(DB.EnsurePhone(senderCid, DB.LoadOrCreate(senderCid)))
    local senderNumber = DB.Digits(senderDoc.phone.numberRaw)
    appendToThread(senderDoc, toDigits, { id = id, dir = 'out', type = mtype, body = body, meta = meta, ts = ts, read = true })
    DB.Save(senderCid, senderDoc)

    local recipCid = DB.GetCitizenIdByNumber(toDigits)
    if recipCid and recipCid ~= senderCid then
        local recipDoc = ensureMessages(DB.EnsurePhone(recipCid, DB.LoadOrCreate(recipCid)))
        if not DB.IsBlocked(recipDoc, senderNumber) then
            local inMsg = { id = id, dir = 'in', type = mtype, body = body, meta = meta, ts = ts, read = false }
            appendToThread(recipDoc, senderNumber, inMsg, true)
            DB.Save(recipCid, recipDoc)

            local contact = DB.ResolveContact(recipCid, senderNumber)
            local senderName = contact and contact.name or DB.FormatNumber(senderNumber)

            local recipPlayer = exports.qbx_core:GetPlayerByCitizenId(recipCid)
            if recipPlayer then
                TriggerClientEvent('oph3z-phone:client:messages:incoming', recipPlayer.PlayerData.source, {
                    from   = senderNumber,
                    name   = senderName,
                    avatar = contact and contact.img or nil,
                    msg    = inMsg,
                })
            end

            -- Notification (persisted; live-pushed if online). Status updates from
            -- negotiate (paid/declined) reuse deliver and shouldn't notify, but
            -- those are fresh 'request' messages so a notification is fine.
            if Notif then
                Notif.Push(recipCid, {
                    app   = 'message',
                    title = senderName,
                    body  = notifBody(mtype, body, meta),
                    route = { app = 'message', number = senderNumber },
                })
            end
        end
    end

    return { id = id, dir = 'out', type = mtype, body = body, meta = meta, ts = ts, read = true }
end

-- Expose 1-on-1 message sending to the export API (server/api.lua). Sends a
-- message FROM a citizen TO a number (digits), writing both sides + live push.
Messages = Messages or {}
function Messages.Send(senderCid, toNumber, mtype, body, meta)
    if not senderCid then return nil end
    local toDigits = DB.Digits(toNumber)
    if toDigits == '' then return nil end
    return deliver(senderCid, toDigits, tostring(mtype or 'text'), tostring(body or ''),
        type(meta) == 'table' and meta or nil)
end

-- Send a message (text or attachment). Writes both sides + live push.
lib.callback.register('oph3z-phone:server:messages:send', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' then return nil end
    local toDigits = DB.Digits(input.to)
    if toDigits == '' then return nil end
    return deliver(cid, toDigits, tostring(input.type or 'text'), tostring(input.body or ''),
        type(input.meta) == 'table' and input.meta or nil)
end)

-- Send money (bank transfer). Recipient must be online (qbx can only credit a
-- loaded player). Returns { ok, reason?, msg? }.
lib.callback.register('oph3z-phone:server:messages:money', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid then return { ok = false, reason = 'error' } end

    local amount = math.floor(tonumber(input and input.amount) or 0)
    if amount <= 0 then return { ok = false, reason = 'amount' } end

    local toDigits = DB.Digits(input and input.to)
    local recipCid = toDigits ~= '' and DB.GetCitizenIdByNumber(toDigits) or nil
    if not recipCid or recipCid == cid then return { ok = false, reason = 'recipient' } end

    local recipPlayer = exports.qbx_core:GetPlayerByCitizenId(recipCid)
    if not recipPlayer then return { ok = false, reason = 'offline' } end

    local sender = exports.qbx_core:GetPlayer(src)
    if not sender then return { ok = false, reason = 'error' } end
    if (sender.PlayerData.money.bank or 0) < amount then return { ok = false, reason = 'funds' } end
    if not sender.Functions.RemoveMoney('bank', amount, 'phone-transfer') then
        return { ok = false, reason = 'funds' }
    end
    recipPlayer.Functions.AddMoney('bank', amount, 'phone-transfer')

    local outMsg = deliver(cid, toDigits, 'money', tostring(amount), { amount = amount })
    return { ok = true, msg = outMsg }
end)

-- ---- Money requests ------------------------------------------------------
-- A request/offer always moves money from `meta.payer` -> `meta.payee`. The
-- recipient can accept (settle, pays payer->payee) or decline it.
-- status: pending|paid|declined.

local function findMsg(doc, numberDigits, id)
    local t = doc.messages and doc.messages.threads[numberDigits]
    if not t then return nil end
    for _, m in ipairs(t.items) do
        if m.id == id then return m end
    end
    return nil
end

local function setStatusBoth(myCid, otherNumber, otherCid, myNumber, id, status)
    local myDoc = ensureMessages(DB.LoadOrCreate(myCid))
    local m = findMsg(myDoc, otherNumber, id)
    if m then m.meta = m.meta or {}; m.meta.status = status; DB.Save(myCid, myDoc) end
    if otherCid then
        local oDoc = ensureMessages(DB.LoadOrCreate(otherCid))
        local om = findMsg(oDoc, myNumber, id)
        if om then om.meta = om.meta or {}; om.meta.status = status; DB.Save(otherCid, oDoc) end
    end
end

local function pushStatus(cid, number, id, status)
    if not cid then return end
    local player = exports.qbx_core:GetPlayerByCitizenId(cid)
    if player then
        TriggerClientEvent('oph3z-phone:client:messages:update', player.PlayerData.source,
            { number = number, id = id, status = status })
    end
end

-- Create a money REQUEST (the sender wants the recipient to pay them).
lib.callback.register('oph3z-phone:server:messages:request', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid then return nil end
    local toDigits = DB.Digits(input and input.to)
    local amount = math.floor(tonumber(input and input.amount) or 0)
    if toDigits == '' or amount <= 0 then return nil end

    local myNumber = DB.Digits(DB.EnsurePhone(cid, DB.LoadOrCreate(cid)).phone.numberRaw)
    return deliver(cid, toDigits, 'request', tostring(amount),
        { amount = amount, status = 'pending', payer = toDigits, payee = myNumber })
end)

-- Settle (pay/accept) or decline a pending request — acted on by its recipient.
lib.callback.register('oph3z-phone:server:messages:negotiate', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' then return { ok = false, reason = 'error' } end
    local otherNumber = DB.Digits(input.number)
    local id = input.id
    if otherNumber == '' or not id then return { ok = false, reason = 'error' } end

    local myDoc = ensureMessages(DB.EnsurePhone(cid, DB.LoadOrCreate(cid)))
    local myNumber = DB.Digits(myDoc.phone.numberRaw)
    local msg = findMsg(myDoc, otherNumber, id)
    if not msg or msg.type ~= 'request' or msg.dir ~= 'in' then return { ok = false, reason = 'gone' } end
    if not msg.meta or msg.meta.status ~= 'pending' then return { ok = false, reason = 'gone' } end

    local otherCid = DB.GetCitizenIdByNumber(otherNumber)
    local payer, payee = msg.meta.payer, msg.meta.payee

    if input.action == 'decline' then
        setStatusBoth(cid, otherNumber, otherCid, myNumber, id, 'declined')
        pushStatus(cid, otherNumber, id, 'declined')
        pushStatus(otherCid, myNumber, id, 'declined')
        return { ok = true }
    end

    -- settle: move money payer -> payee (both must be online).
    local amount = math.floor(tonumber(msg.meta.amount) or 0)
    if amount <= 0 then return { ok = false, reason = 'amount' } end
    local payerPlayer = exports.qbx_core:GetPlayerByCitizenId(DB.GetCitizenIdByNumber(payer))
    local payeePlayer = exports.qbx_core:GetPlayerByCitizenId(DB.GetCitizenIdByNumber(payee))
    if not payerPlayer or not payeePlayer then return { ok = false, reason = 'offline' } end
    if (payerPlayer.PlayerData.money.bank or 0) < amount then return { ok = false, reason = 'funds' } end
    if not payerPlayer.Functions.RemoveMoney('bank', amount, 'phone-transfer') then
        return { ok = false, reason = 'funds' }
    end
    payeePlayer.Functions.AddMoney('bank', amount, 'phone-transfer')

    setStatusBoth(cid, otherNumber, otherCid, myNumber, id, 'paid')
    pushStatus(cid, otherNumber, id, 'paid')
    pushStatus(otherCid, myNumber, id, 'paid')
    return { ok = true }
end)

-- ---- Location / live location -------------------------------------------
-- A 'location' message carries meta = { x, y, label, live, sid? }. Live shares
-- stream the sender's position to the recipient (and the sender's own copy) every
-- few seconds; positions are pushed live and only persisted when the share ends.

local function pushLoc(cid, number, id, x, y, label, live, reason)
    if not cid then return end
    local p = exports.qbx_core:GetPlayerByCitizenId(cid)
    if not p then return end
    local data = { number = number, id = id }
    if x ~= nil then data.x = x end
    if y ~= nil then data.y = y end
    if label ~= nil then data.label = label end
    if live ~= nil then data.live = live end
    if reason ~= nil then data.endReason = reason end
    TriggerClientEvent('oph3z-phone:client:messages:locupdate', p.PlayerData.source, data)
end

-- Persist a location message's final position + live flag in one doc.
local function saveLoc(cid, number, id, x, y, label, live, reason)
    if not cid then return end
    local doc = ensureMessages(DB.LoadOrCreate(cid))
    local m = findMsg(doc, number, id)
    if not m then return end
    m.meta = m.meta or {}
    if x ~= nil then m.meta.x = x end
    if y ~= nil then m.meta.y = y end
    if label ~= nil then m.meta.label = label end
    if live ~= nil then m.meta.live = live end
    if reason ~= nil then m.meta.endReason = reason end
    DB.Save(cid, doc)
end

-- End a live share. reason = 'stopped' (user) | 'expired' (timer / disconnect).
local function endShare(sid, reason)
    local share = liveShares[sid]
    if not share then return end
    liveShares[sid] = nil
    reason = reason or 'expired'
    saveLoc(share.senderCid, share.recipNumber, share.id, share.lastX, share.lastY, share.lastLabel, false, reason)
    saveLoc(share.recipCid, share.senderNumber, share.id, share.lastX, share.lastY, share.lastLabel, false, reason)
    pushLoc(share.senderCid, share.recipNumber, share.id, share.lastX, share.lastY, share.lastLabel, false, reason)
    pushLoc(share.recipCid, share.senderNumber, share.id, share.lastX, share.lastY, share.lastLabel, false, reason)
    local sp = exports.qbx_core:GetPlayerByCitizenId(share.senderCid)
    if sp then TriggerClientEvent('oph3z-phone:client:loc:stop', sp.PlayerData.source, { sid = sid }) end
end

-- Send a location message (static or live). Coords/label are resolved client-side.
lib.callback.register('oph3z-phone:server:messages:location', function(src, input)
    local cid = DB.GetCitizenId(src)
    if not cid or type(input) ~= 'table' then return false end
    local toDigits = DB.Digits(input.to)
    if toDigits == '' then return false end

    local x = tonumber(input.x) or 0.0
    local y = tonumber(input.y) or 0.0
    local label = tostring(input.label or 'Shared Location')
    local live = input.live and true or false
    local meta = { x = x, y = y, label = label, live = live }

    if not live then
        return deliver(cid, toDigits, 'location', label, meta)
    end

    local sid = genId()
    meta.sid = sid
    local out = deliver(cid, toDigits, 'location', label, meta)
    if not out then return false end

    local senderNumber = DB.Digits(DB.EnsurePhone(cid, DB.LoadOrCreate(cid)).phone.numberRaw)
    liveShares[sid] = {
        senderCid = cid,
        senderSrc = src,
        senderNumber = senderNumber,
        recipCid = DB.GetCitizenIdByNumber(toDigits),
        recipNumber = toDigits,
        id = out.id,
        lastX = x, lastY = y, lastLabel = label,
    }
    return out
end)

-- Sender streams its position while a live share is active.
RegisterNetEvent('oph3z-phone:server:loc:update', function(sid, x, y, label)
    local src = source
    local share = liveShares[sid]
    if not share or share.senderSrc ~= src then return end
    x, y = tonumber(x), tonumber(y)
    if not x or not y then return end
    share.lastX, share.lastY, share.lastLabel = x, y, label or share.lastLabel
    pushLoc(share.senderCid, share.recipNumber, share.id, x, y, label, nil)
    pushLoc(share.recipCid, share.senderNumber, share.id, x, y, label, nil)
end)

-- Stop a live share (user pressed Stop, or the client's timer expired).
lib.callback.register('oph3z-phone:server:messages:locstop', function(src, input)
    local cid = DB.GetCitizenId(src)
    local sid = input and input.sid
    if not sid then return { ok = false } end
    local share = liveShares[sid]
    if share and share.senderCid ~= cid then return { ok = false } end
    endShare(sid, (input and input.reason) or 'stopped')
    return { ok = true }
end)

-- End any live shares a dropping player was broadcasting.
AddEventHandler('playerDropped', function()
    local src = source
    for sid, share in pairs(liveShares) do
        if share.senderSrc == src then endShare(sid, 'expired') end
    end
end)

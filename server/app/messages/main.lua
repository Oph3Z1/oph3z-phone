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
        items  = t and t.items or {},
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

            local recipPlayer = exports.qbx_core:GetPlayerByCitizenId(recipCid)
            if recipPlayer then
                local contact = DB.ResolveContact(recipCid, senderNumber)
                TriggerClientEvent('oph3z-phone:client:messages:incoming', recipPlayer.PlayerData.source, {
                    from   = senderNumber,
                    name   = contact and contact.name or DB.FormatNumber(senderNumber),
                    avatar = contact and contact.img or nil,
                    msg    = inMsg,
                })
            end
        end
    end

    return { id = id, dir = 'out', type = mtype, body = body, meta = meta, ts = ts, read = true }
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

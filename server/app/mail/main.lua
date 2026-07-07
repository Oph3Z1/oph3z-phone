local MAX_MAILBOX = 100

local function cidOf(src)
    return GetIdentifier(src)
end

local function ensureMail(doc)
    doc.mail = doc.mail or {}
    local m = doc.mail
    m.inbox = m.inbox or {}
    m.sent = m.sent or {}
    m.nextId = m.nextId or 1
    return doc
end

local function clean(value, maxLen)
    if type(value) ~= 'string' then return '' end
    value = value:gsub('^%s+', ''):gsub('%s+$', '')
    if #value > maxLen then value = value:sub(1, maxLen) end
    return value
end

local function cleanAttachments(list)
    if type(list) ~= 'table' then return nil end
    local out = {}
    for _, a in ipairs(list) do
        if type(a) == 'table' and a.url then
            out[#out + 1] = {
                url = tostring(a.url):sub(1, 512),
                type = (a.type == 'video') and 'video' or 'image',
                thumb = a.thumb and tostring(a.thumb):sub(1, 512) or nil,
            }
            if #out >= 6 then break end
        end
    end
    if #out == 0 then return nil end
    return out
end

local function nameOf(cid)
    local doc = DB.LoadOrCreate(cid)
    return (doc.profile and doc.profile.name) or nil
end

local function deliverToInbox(recipCid, mail)
    local doc = ensureMail(DB.LoadOrCreate(recipCid))
    local item = {
        id          = doc.mail.nextId,
        from        = mail.from,
        fromName    = mail.fromName,
        subject     = mail.subject,
        body        = mail.body,
        attachments = mail.attachments,
        system      = mail.system or false,
        read        = false,
        ts          = os.time(),
    }
    doc.mail.nextId = doc.mail.nextId + 1
    table.insert(doc.mail.inbox, 1, item)
    while #doc.mail.inbox > MAX_MAILBOX do table.remove(doc.mail.inbox) end
    DB.Save(recipCid, doc)

    local player = GetPlayerByCitizenId(recipCid)
    if player then
        TriggerClientEvent('oph3z-phone:client:mail:incoming', player.PlayerData.source, item)
    end
    if Notif then
        Notif.Push(recipCid, {
            app   = 'mail',
            title = item.fromName or item.from or 'Mail',
            body  = (item.subject ~= '' and item.subject) or item.body or '',
            route = { app = 'mail', id = item.id },
        })
    end
    return item
end

RegisterCallback('oph3z-phone:server:mail:get', function(src)
    local cid = cidOf(src)
    if not cid then return {} end
    local doc = ensureMail(DB.EnsureMail(cid, DB.LoadOrCreate(cid)))
    return { address = doc.mail.address, inbox = doc.mail.inbox, sent = doc.mail.sent }
end)

RegisterCallback('oph3z-phone:server:mail:send', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false, reason = 'bad' } end

    local toAddr = clean(data.to, 120):lower()
    local subject = clean(data.subject, 140)
    local body = clean(data.body, 5000)
    local attachments = cleanAttachments(data.attachments)
    if toAddr == '' then return { ok = false, reason = 'noaddr' } end
    if subject == '' and body == '' and not attachments then return { ok = false, reason = 'empty' } end

    local recipCid = DB.GetCitizenIdByMail(toAddr)
    if not recipCid then return { ok = false, reason = 'notfound' } end

    local senderDoc = ensureMail(DB.EnsureMail(cid, DB.LoadOrCreate(cid)))
    local fromAddr = senderDoc.mail.address
    local fromName = (senderDoc.profile and senderDoc.profile.name) or fromAddr

    local sentItem = {
        id          = senderDoc.mail.nextId,
        to          = toAddr,
        toName      = nameOf(recipCid) or toAddr,
        subject     = subject,
        body        = body,
        attachments = attachments,
        ts          = os.time(),
    }
    senderDoc.mail.nextId = senderDoc.mail.nextId + 1
    table.insert(senderDoc.mail.sent, 1, sentItem)
    while #senderDoc.mail.sent > MAX_MAILBOX do table.remove(senderDoc.mail.sent) end
    DB.Save(cid, senderDoc)

    deliverToInbox(recipCid, {
        from = fromAddr, fromName = fromName,
        subject = subject, body = body, attachments = attachments, system = false,
    })

    return { ok = true, sent = sentItem }
end)

RegisterCallback('oph3z-phone:server:mail:read', function(src, id)
    local cid = cidOf(src)
    if not cid then return false end
    local doc = ensureMail(DB.LoadOrCreate(cid))
    for _, m in ipairs(doc.mail.inbox) do
        if m.id == id then m.read = true break end
    end
    DB.Save(cid, doc)
    return true
end)

RegisterCallback('oph3z-phone:server:mail:delete', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return false end
    local doc = ensureMail(DB.LoadOrCreate(cid))
    local folder = (data.folder == 'sent') and doc.mail.sent or doc.mail.inbox
    for i = #folder, 1, -1 do
        if folder[i].id == data.id then table.remove(folder, i) end
    end
    DB.Save(cid, doc)
    return true
end)

Mail = Mail or {}

function Mail.SendSystem(recipCid, opts)
    if not recipCid or type(opts) ~= 'table' then return nil end
    return deliverToInbox(recipCid, {
        from        = opts.fromAddress and clean(tostring(opts.fromAddress), 120) or 'system',
        fromName    = clean(opts.from or 'System', 60),
        subject     = clean(opts.subject or '', 140),
        body        = clean(opts.body or '', 5000),
        attachments = cleanAttachments(opts.attachments),
        system      = true,
    })
end
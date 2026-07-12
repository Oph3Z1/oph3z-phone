local function getCitizenId(src)
    return GetIdentifier(src)
end

RegisterCallback('oph3z-phone:server:getData', function(source)
    local citizenid = GetIdentifier(source)
    if not citizenid then return nil end

    local firstname, lastname = GetCharName(source)
    local ci = { firstname = firstname, lastname = lastname }
    local charName = (('%s %s'):format(firstname or '', lastname or '')):gsub('^%s+', ''):gsub('%s+$', '')
    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))

    DB.EnsureMail(citizenid, doc, ci.firstname, ci.lastname)
    DB.EnsureProfile(citizenid, doc, charName)

    return {
        citizenid = citizenid,
        name      = doc.profile.name,
        email     = doc.mail.address,
        avatar    = doc.profile.avatar,
        settings  = doc.settings,
        number    = doc.phone.number,
        numberRaw = DB.Digits(doc.phone.numberRaw),
        home      = doc.home,
    }
end)

RegisterCallback('oph3z-phone:server:home:save', function(source, layout)
    local citizenid = getCitizenId(source)
    if not citizenid or type(layout) ~= 'table' then return false end
    local doc = DB.LoadOrCreate(citizenid)
    doc.home = layout
    return DB.Save(citizenid, doc)
end)

RegisterCallback('oph3z-phone:server:saveSettings', function(source, patch)
    local citizenid = getCitizenId(source)
    if not citizenid or type(patch) ~= 'table' then return false end

    local doc = DB.LoadOrCreate(citizenid)
    doc.settings = doc.settings or {}
    for key, value in pairs(patch) do
        doc.settings[key] = value
    end

    return DB.Save(citizenid, doc)
end)

local function clean(value, maxLen)
    if type(value) ~= 'string' then return '' end
    value = value:gsub('^%s+', ''):gsub('%s+$', '')
    if #value > maxLen then value = value:sub(1, maxLen) end
    return value
end

local function sanitizeContact(input)
    if type(input) ~= 'table' then return nil end
    return {
        name   = clean(input.name, 40),
        number = clean(input.number, 24),
        notes  = clean(input.notes, 300),
        img    = clean(input.img, 300),
    }
end

local function findContact(contacts, id)
    for i = 1, #contacts do
        if contacts[i].id == id then return contacts[i], i end
    end
    return nil
end

RegisterCallback('oph3z-phone:server:phone:getState', function(source)
    local citizenid = getCitizenId(source)
    if not citizenid then return nil end

    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    return {
        number   = doc.phone.number,
        contacts = doc.phone.contacts,
        recents  = doc.phone.recents,
        blocked  = doc.phone.blocked,
        airplane = doc.settings and doc.settings.airplane or false,
    }
end)

RegisterCallback('oph3z-phone:server:phone:block', function(source, number)
    local citizenid = getCitizenId(source)
    if not citizenid then return nil end
    return DB.Block(citizenid, number)
end)

RegisterCallback('oph3z-phone:server:phone:unblock', function(source, number)
    local citizenid = getCitizenId(source)
    if not citizenid then return nil end
    return DB.Unblock(citizenid, number)
end)

RegisterCallback('oph3z-phone:server:phone:setAirplane', function(source, value)
    local citizenid = getCitizenId(source)
    if not citizenid then return false end
    local doc = DB.LoadOrCreate(citizenid)
    doc.settings = doc.settings or {}
    doc.settings.airplane = value and true or false
    DB.Save(citizenid, doc)

    if not doc.settings.airplane and Notif then
        Notif.Release(citizenid)
        TriggerClientEvent('oph3z-phone:client:notifRefresh', source)
    end

    return doc.settings.airplane
end)

RegisterCallback('oph3z-phone:server:phone:toggleAirplane', function(source)
    local citizenid = getCitizenId(source)
    if not citizenid then return false end
    local doc = DB.LoadOrCreate(citizenid)
    doc.settings = doc.settings or {}
    doc.settings.airplane = not doc.settings.airplane
    DB.Save(citizenid, doc)
    if not doc.settings.airplane and Notif then
        Notif.Release(citizenid)
        TriggerClientEvent('oph3z-phone:client:notifRefresh', source)
    end
    return doc.settings.airplane
end)

RegisterCallback('oph3z-phone:server:phone:addContact', function(source, input)
    local citizenid = getCitizenId(source)
    if not citizenid then return nil end

    local data = sanitizeContact(input)
    if not data or data.name == '' or data.number == '' then return nil end

    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    local contact = {
        id       = doc.phone.nextContactId,
        name     = data.name,
        number   = data.number,
        notes    = data.notes,
        img      = data.img,
        favorite = false,
    }
    doc.phone.nextContactId = doc.phone.nextContactId + 1
    doc.phone.contacts[#doc.phone.contacts + 1] = contact
    DB.Save(citizenid, doc)
    return contact
end)

RegisterCallback('oph3z-phone:server:phone:updateContact', function(source, input)
    local citizenid = getCitizenId(source)
    if not citizenid or type(input) ~= 'table' then return false end

    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    local contact = findContact(doc.phone.contacts, input.id)
    if not contact then return false end

    local data = sanitizeContact(input)
    if data.name == '' or data.number == '' then return false end
    contact.name, contact.number, contact.notes, contact.img =
        data.name, data.number, data.notes, data.img

    DB.Save(citizenid, doc)
    return true
end)

RegisterCallback('oph3z-phone:server:phone:deleteContact', function(source, id)
    local citizenid = getCitizenId(source)
    if not citizenid then return false end

    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    local _, index = findContact(doc.phone.contacts, id)
    if not index then return false end

    table.remove(doc.phone.contacts, index)
    DB.Save(citizenid, doc)
    return true
end)

RegisterCallback('oph3z-phone:server:phone:deleteRecent', function(source, id)
    local citizenid = getCitizenId(source)
    if not citizenid or not id then return false end

    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    for i = #doc.phone.recents, 1, -1 do
        if doc.phone.recents[i].id == id then
            table.remove(doc.phone.recents, i)
            DB.Save(citizenid, doc)
            return true
        end
    end
    return false
end)

RegisterCallback('oph3z-phone:server:phone:clearRecents', function(source, scope)
    local citizenid = getCitizenId(source)
    if not citizenid then return false end

    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    if scope == 'missed' then
        for i = #doc.phone.recents, 1, -1 do
            if doc.phone.recents[i].missed then
                table.remove(doc.phone.recents, i)
            end
        end
    else
        doc.phone.recents = {}
    end
    DB.Save(citizenid, doc)
    return true
end)

RegisterCallback('oph3z-phone:server:phone:setFavorite', function(source, data)
    local citizenid = getCitizenId(source)
    if not citizenid or type(data) ~= 'table' then return false end

    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    local contact = findContact(doc.phone.contacts, data.id)
    if not contact then return false end

    contact.favorite = data.favorite and true or false
    DB.Save(citizenid, doc)
    return true
end)

local activeCalls = {}
local playerCall  = {}
local nextCallId  = 1

local function otherParty(call, src)
    return src == call.caller and call.callee or call.caller
end

local function getPhone(citizenid)
    return DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid)).phone
end

local function displayFor(viewerCid, otherDigits, otherFormatted)
    local contact = DB.ResolveContact(viewerCid, otherDigits)
    return {
        number = otherFormatted,
        name   = contact and contact.name or nil,
        img    = contact and contact.img or nil,
    }
end

local function startRingtone(call)
    local ped = GetPlayerPed(call.callee)
    if not ped or ped == 0 then return end
    local url = (Ringtones and call.calleeCid and Ringtones.UrlFor(call.calleeCid)) or Config.RingtoneUrl
    if not url or url == '' then return end
    local coords = GetEntityCoords(ped)
    local name = 'oph3z_ring_' .. call.id
    call.ringName = name
    exports.xsound:PlayUrlPos(-1, name, url, 0.4, coords, true)
    exports.xsound:Distance(-1, name, 12.0)
end

local function stopRingtone(call)
    if call.ringName then
        exports.xsound:Destroy(-1, call.ringName)
        call.ringName = nil
    end
end

local function clearSpeakerListeners(call)
    if not call or not call.listeners then return end
    for l in pairs(call.listeners) do
        if GetPlayerPed(l) ~= 0 then
            exports['pma-voice']:setPlayerCall(l, 0)
        end
    end
    call.listeners = {}
end

local function collectSpeakerNearby(src, call, out, range)
    local ped = GetPlayerPed(src)
    if not ped or ped == 0 then return end
    local coords = GetEntityCoords(ped)
    for _, pid in ipairs(GetPlayers()) do
        local id = tonumber(pid)
        if id and id ~= call.caller and id ~= call.callee then
            local p = GetPlayerPed(id)
            if p and p ~= 0 and #(coords - GetEntityCoords(p)) <= range then
                local ch = Player(id).state.callChannel or 0
                if ch == 0 or ch == call.channel then
                    out[id] = true
                end
            end
        end
    end
end

local function ensureSpeakerScan(callId)
    local call = activeCalls[callId]
    if not call or call.speakerScan then return end
    if not (call.speakerCaller or call.speakerCallee) then return end
    call.speakerScan = true
    call.listeners = call.listeners or {}
    CreateThread(function()
        local range = (Config.CallSpeakerRange or 6.0) + 0.0
        while true do
            local c = activeCalls[callId]
            if not c or not (c.speakerCaller or c.speakerCallee) then break end
            local desired = {}
            if c.speakerCaller then collectSpeakerNearby(c.caller, c, desired, range) end
            if c.speakerCallee then collectSpeakerNearby(c.callee, c, desired, range) end
            for p in pairs(desired) do
                if not c.listeners[p] then
                    exports['pma-voice']:setPlayerCall(p, c.channel)
                    c.listeners[p] = true
                end
            end
            for p in pairs(c.listeners) do
                if not desired[p] then
                    if GetPlayerPed(p) ~= 0 then exports['pma-voice']:setPlayerCall(p, 0) end
                    c.listeners[p] = nil
                end
            end
            Wait(700)
        end
        local c = activeCalls[callId]
        if c then
            clearSpeakerListeners(c)
            c.speakerScan = false
        end
    end)
end

local function endCall(callId, reason)
    local call = activeCalls[callId]
    if not call then return end

    call.speakerCaller = false
    call.speakerCallee = false
    clearSpeakerListeners(call)
    stopRingtone(call)
    activeCalls[callId] = nil
    if playerCall[call.caller] == callId then playerCall[call.caller] = nil end
    if playerCall[call.callee] == callId then playerCall[call.callee] = nil end

    local connected = call.answeredAt ~= nil
    local ts = os.time()
    DB.LogRecent(call.callerCid, {
        number = call.calleeNumber, name = call.calleeNameSeen, img = call.calleeImgSeen,
        direction = 'out', missed = false, ts = ts, video = call.everVideo == true,
    })
    DB.LogRecent(call.calleeCid, {
        number = call.callerNumber, name = call.callerNameSeen, img = call.callerImgSeen,
        direction = 'in', missed = not connected, ts = ts, video = call.everVideo == true,
    })

    if not connected and Notif then
        Notif.Push(call.calleeCid, {
            app   = 'call',
            title = call.callerNameSeen or DB.FormatNumber(call.callerNumber),
            bodyKey = 'notify.missedCall',
            route = { app = 'call', tab = 'recents' },
        })
    end

    TriggerClientEvent('oph3z-phone:call:ended', call.caller, { callId = callId, reason = reason })
    TriggerClientEvent('oph3z-phone:call:ended', call.callee, { callId = callId, reason = reason })
end

local function startCall(src, rawNumber, isVideo)
    local callerCid = getCitizenId(src)
    if not callerCid or playerCall[src] then return end

    local calleeDigits = DB.Digits(rawNumber)
    local callerDoc = DB.EnsurePhone(callerCid, DB.LoadOrCreate(callerCid))
    local callerPhone = callerDoc.phone

    if callerDoc.settings and callerDoc.settings.airplane then
        TriggerClientEvent('oph3z-phone:call:failed', src, { reason = 'airplane' })
        return
    end
    if calleeDigits == '' or calleeDigits == callerPhone.numberRaw then
        TriggerClientEvent('oph3z-phone:call:failed', src, { reason = 'invalid' })
        return
    end

    local calleeCid = DB.GetCitizenIdByNumber(calleeDigits)
    local calleePlayer = calleeCid and GetPlayerByCitizenId(calleeCid) or nil
    local calleeSrc = calleePlayer and calleePlayer.PlayerData.source or nil
    if not calleeSrc then
        if calleeCid then
            local calleeDocOff = DB.EnsurePhone(calleeCid, DB.LoadOrCreate(calleeCid))
            if not DB.IsBlocked(calleeDocOff, callerPhone.numberRaw) then
                local ts = os.time()
                local callerSeesCallee = displayFor(callerCid, calleeDigits, calleeDocOff.phone.number)
                local calleeSeesCaller = displayFor(calleeCid, callerPhone.numberRaw, callerPhone.number)
                DB.LogRecent(callerCid, {
                    number = callerSeesCallee.number, name = callerSeesCallee.name, img = callerSeesCallee.img,
                    direction = 'out', missed = false, ts = ts, video = isVideo == true,
                })
                DB.LogRecent(calleeCid, {
                    number = calleeSeesCaller.number, name = calleeSeesCaller.name, img = calleeSeesCaller.img,
                    direction = 'in', missed = true, ts = ts, video = isVideo == true,
                })
                if Notif then
                    Notif.Push(calleeCid, {
                        app   = 'call',
                        title = calleeSeesCaller.name or DB.FormatNumber(callerPhone.numberRaw),
                        bodyKey = 'notify.missedCall',
                        route = { app = 'call', tab = 'recents' },
                    })
                end
            end
        end
        TriggerClientEvent('oph3z-phone:call:failed', src, { reason = 'unavailable' })
        return
    end
    if playerCall[calleeSrc] then
        TriggerClientEvent('oph3z-phone:call:failed', src, { reason = 'busy' })
        return
    end

    local calleeDoc = DB.EnsurePhone(calleeCid, DB.LoadOrCreate(calleeCid))
    local calleePhone = calleeDoc.phone

    if (calleeDoc.settings and calleeDoc.settings.airplane)
        or DB.IsBlocked(calleeDoc, callerPhone.numberRaw) then
        TriggerClientEvent('oph3z-phone:call:failed', src, { reason = 'unavailable' })
        return
    end

    local callId = nextCallId
    nextCallId = nextCallId + 1

    local callerSeesCallee = displayFor(callerCid, calleeDigits, calleePhone.number)
    local calleeSeesCaller = displayFor(calleeCid, callerPhone.numberRaw, callerPhone.number)

    activeCalls[callId] = {
        id = callId, channel = callId,
        caller = src, callee = calleeSrc,
        callerCid = callerCid, calleeCid = calleeCid,
        callerNumber = callerPhone.number, calleeNumber = calleePhone.number,
        callerNameSeen = calleeSeesCaller.name, callerImgSeen = calleeSeesCaller.img,
        calleeNameSeen = callerSeesCallee.name, calleeImgSeen = callerSeesCallee.img,
        state = 'ringing', startedAt = os.time(), video = isVideo == true, everVideo = isVideo == true,
    }
    playerCall[src] = callId
    playerCall[calleeSrc] = callId

    TriggerClientEvent('oph3z-phone:call:outgoing', src, {
        callId = callId, number = callerSeesCallee.number,
        name = callerSeesCallee.name, img = callerSeesCallee.img, video = isVideo == true,
    })
    TriggerClientEvent('oph3z-phone:call:incoming', calleeSrc, {
        callId = callId, number = calleeSeesCaller.number,
        name = calleeSeesCaller.name, img = calleeSeesCaller.img, video = isVideo == true,
    })

    startRingtone(activeCalls[callId])

    SetTimeout(Config.RingTimeout * 1000, function()
        local c = activeCalls[callId]
        if c and c.state == 'ringing' then endCall(callId, 'noanswer') end
    end)
    return callId
end

RegisterNetEvent('oph3z-phone:call:start', function(rawNumber, video)
    startCall(source, rawNumber, video)
end)

PhoneCall = PhoneCall or {}
PhoneCall.Start = startCall

RegisterNetEvent('oph3z-phone:call:accept', function(callId)
    local src = source
    local call = activeCalls[callId]
    if not call or call.callee ~= src or call.state ~= 'ringing' then return end
    stopRingtone(call)
    call.state = 'active'
    call.answeredAt = os.time()
    TriggerClientEvent('oph3z-phone:call:connected', call.caller, { callId = callId, channel = call.channel })
    TriggerClientEvent('oph3z-phone:call:connected', call.callee, { callId = callId, channel = call.channel })
    if call.video then
        TriggerClientEvent('oph3z-phone:video:start', call.caller, { callId = callId, role = 'offer' })
        TriggerClientEvent('oph3z-phone:video:start', call.callee, { callId = callId, role = 'answer' })
    end
end)

RegisterNetEvent('oph3z-phone:video:signal', function(callId, blob)
    local src = source
    local call = activeCalls[callId]
    if not call or (src ~= call.caller and src ~= call.callee) then return end
    TriggerClientEvent('oph3z-phone:video:signal', otherParty(call, src), callId, blob)
end)

RegisterNetEvent('oph3z-phone:video:request', function(callId)
    local src = source
    local call = activeCalls[callId]
    if not call or (src ~= call.caller and src ~= call.callee) then return end
    call.videoRequestedBy = src
    TriggerClientEvent('oph3z-phone:video:request', otherParty(call, src), { callId = callId })
end)

RegisterNetEvent('oph3z-phone:video:accept', function(callId)
    local src = source
    local call = activeCalls[callId]
    if not call or (src ~= call.caller and src ~= call.callee) then return end
    local requester = call.videoRequestedBy
    if not requester then return end
    call.video = true
    call.everVideo = true
    call.videoRequestedBy = nil
    TriggerClientEvent('oph3z-phone:video:start', requester, { callId = callId, role = 'offer' })
    TriggerClientEvent('oph3z-phone:video:start', otherParty(call, requester), { callId = callId, role = 'answer' })
end)

RegisterNetEvent('oph3z-phone:video:decline', function(callId)
    local src = source
    local call = activeCalls[callId]
    if not call or (src ~= call.caller and src ~= call.callee) then return end
    call.videoRequestedBy = nil
    TriggerClientEvent('oph3z-phone:video:declined', otherParty(call, src), { callId = callId })
end)

RegisterNetEvent('oph3z-phone:video:stop', function(callId)
    local src = source
    local call = activeCalls[callId]
    if not call or (src ~= call.caller and src ~= call.callee) then return end
    call.video = false
    TriggerClientEvent('oph3z-phone:video:stop', call.caller, { callId = callId })
    TriggerClientEvent('oph3z-phone:video:stop', call.callee, { callId = callId })
end)

RegisterNetEvent('oph3z-phone:call:decline', function(callId)
    local src = source
    local call = activeCalls[callId]
    if not call or call.callee ~= src or call.state ~= 'ringing' then return end
    endCall(callId, 'declined')
end)

RegisterNetEvent('oph3z-phone:call:hangup', function(callId)
    local src = source
    local call = activeCalls[callId]
    if not call or (src ~= call.caller and src ~= call.callee) then return end
    endCall(callId, 'hangup')
end)

RegisterNetEvent('oph3z-phone:call:mute', function(callId, muted)
    local src = source
    local call = activeCalls[callId]
    if not call or (src ~= call.caller and src ~= call.callee) then return end
    TriggerClientEvent('oph3z-phone:call:remoteMute', otherParty(call, src), src, muted and true or false)
end)

RegisterNetEvent('oph3z-phone:call:speaker', function(callId, on)
    local src = source
    local call = activeCalls[callId]
    if not call or (src ~= call.caller and src ~= call.callee) then return end
    on = on and true or false
    if src == call.caller then
        call.speakerCaller = on
    else
        call.speakerCallee = on
    end
    if on then ensureSpeakerScan(callId) end
end)

AddEventHandler('playerDropped', function()
    local callId = playerCall[source]
    if callId then endCall(callId, 'hangup') end
end)

if Config.Debug then
    print('[oph3z-phone] server ready.')
end
--[[
    oph3z-phone | Server entry point

    Exposes ox_lib callbacks the NUI (via client) uses to load/save phone data.
    Player identity is the QBox citizenid, resolved from the calling source.
--]]

---Resolve a connected player's citizenid from their server id.
---@param src number
---@return string|nil
local function getCitizenId(src)
    local player = exports.qbx_core:GetPlayer(src)
    if not player then return nil end
    return player.PlayerData.citizenid
end

-- Load (or create) the caller's phone document ------------------------------
lib.callback.register('oph3z-phone:server:getData', function(source)
    local citizenid = getCitizenId(source)
    if not citizenid then return nil end

    -- Ensure a phone number is generated/registered on first open so the player
    -- is reachable even before they open the Phone app.
    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    return {
        citizenid = citizenid,
        settings  = doc.settings,
    }
end)

-- Persist a partial settings update -----------------------------------------
lib.callback.register('oph3z-phone:server:saveSettings', function(source, patch)
    local citizenid = getCitizenId(source)
    if not citizenid or type(patch) ~= 'table' then return false end

    local doc = DB.LoadOrCreate(citizenid)
    doc.settings = doc.settings or {}
    for key, value in pairs(patch) do
        doc.settings[key] = value
    end

    return DB.Save(citizenid, doc)
end)

-- ===========================================================================
-- Phone app (contacts / favorites / recents)
-- ===========================================================================

---Trim and cap a string field.
local function clean(value, maxLen)
    if type(value) ~= 'string' then return '' end
    value = value:gsub('^%s+', ''):gsub('%s+$', '')
    if #value > maxLen then value = value:sub(1, maxLen) end
    return value
end

---Build the sanitized public contact payload from raw input.
local function sanitizeContact(input)
    if type(input) ~= 'table' then return nil end
    return {
        name   = clean(input.name, 40),
        number = clean(input.number, 24),
        notes  = clean(input.notes, 300),
        img    = clean(input.img, 300),
    }
end

---Find a contact (and its index) by id.
local function findContact(contacts, id)
    for i = 1, #contacts do
        if contacts[i].id == id then return contacts[i], i end
    end
    return nil
end

-- Load the phone state (number, contacts, recents) -------------------------
lib.callback.register('oph3z-phone:server:phone:getState', function(source)
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

-- Block / unblock a number --------------------------------------------------
lib.callback.register('oph3z-phone:server:phone:block', function(source, number)
    local citizenid = getCitizenId(source)
    if not citizenid then return nil end
    return DB.Block(citizenid, number)
end)

lib.callback.register('oph3z-phone:server:phone:unblock', function(source, number)
    local citizenid = getCitizenId(source)
    if not citizenid then return nil end
    return DB.Unblock(citizenid, number)
end)

-- Airplane mode -------------------------------------------------------------
-- Explicit set (used by the future Settings toggle).
lib.callback.register('oph3z-phone:server:phone:setAirplane', function(source, value)
    local citizenid = getCitizenId(source)
    if not citizenid then return false end
    local doc = DB.LoadOrCreate(citizenid)
    doc.settings = doc.settings or {}
    doc.settings.airplane = value and true or false
    DB.Save(citizenid, doc)
    return doc.settings.airplane
end)

-- Toggle (used by the /airplane dev command); returns the new state.
lib.callback.register('oph3z-phone:server:phone:toggleAirplane', function(source)
    local citizenid = getCitizenId(source)
    if not citizenid then return false end
    local doc = DB.LoadOrCreate(citizenid)
    doc.settings = doc.settings or {}
    doc.settings.airplane = not doc.settings.airplane
    DB.Save(citizenid, doc)
    return doc.settings.airplane
end)

-- Add a contact -------------------------------------------------------------
lib.callback.register('oph3z-phone:server:phone:addContact', function(source, input)
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

-- Update a contact ----------------------------------------------------------
lib.callback.register('oph3z-phone:server:phone:updateContact', function(source, input)
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

-- Delete a contact ----------------------------------------------------------
lib.callback.register('oph3z-phone:server:phone:deleteContact', function(source, id)
    local citizenid = getCitizenId(source)
    if not citizenid then return false end

    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    local _, index = findContact(doc.phone.contacts, id)
    if not index then return false end

    table.remove(doc.phone.contacts, index)
    DB.Save(citizenid, doc)
    return true
end)

-- Toggle favorite -----------------------------------------------------------
lib.callback.register('oph3z-phone:server:phone:setFavorite', function(source, data)
    local citizenid = getCitizenId(source)
    if not citizenid or type(data) ~= 'table' then return false end

    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    local contact = findContact(doc.phone.contacts, data.id)
    if not contact then return false end

    contact.favorite = data.favorite and true or false
    DB.Save(citizenid, doc)
    return true
end)

-- ===========================================================================
-- Call manager
--   - resolves phone numbers -> online players (cached registry + QBox)
--   - assigns a pma-voice call channel (both sides join the same id)
--   - state machine: ringing -> active -> ended; plus busy/unavailable/timeout
--   - logs every call to both parties' Recents
-- ===========================================================================
local activeCalls = {}   -- callId -> call table
local playerCall  = {}   -- src    -> callId (busy check)
local nextCallId  = 1

local function otherParty(call, src)
    return src == call.caller and call.callee or call.caller
end

---@return table phoneDoc.phone  (ensures number/contacts exist)
local function getPhone(citizenid)
    return DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid)).phone
end

---What `viewerCid` should see when the other party's number is `otherDigits`.
local function displayFor(viewerCid, otherDigits, otherFormatted)
    local contact = DB.ResolveContact(viewerCid, otherDigits)
    return {
        number = otherFormatted,
        name   = contact and contact.name or nil,
        img    = contact and contact.img or nil,
    }
end

---Start the 3D ringtone at the callee's position (heard by callee + nearby).
local function startRingtone(call)
    if not Config.RingtoneUrl or Config.RingtoneUrl == '' then return end
    local ped = GetPlayerPed(call.callee)
    if not ped or ped == 0 then return end
    local coords = GetEntityCoords(ped)
    local name = 'oph3z_ring_' .. call.id
    call.ringName = name
    exports.xsound:PlayUrlPos(-1, name, Config.RingtoneUrl, 0.4, coords, true)
    exports.xsound:Distance(-1, name, 12.0)
end

local function stopRingtone(call)
    if call.ringName then
        exports.xsound:Destroy(-1, call.ringName)
        call.ringName = nil
    end
end

---Tear down a call, notify both sides, and write Recents.
local function endCall(callId, reason)
    local call = activeCalls[callId]
    if not call then return end

    stopRingtone(call)
    activeCalls[callId] = nil
    if playerCall[call.caller] == callId then playerCall[call.caller] = nil end
    if playerCall[call.callee] == callId then playerCall[call.callee] = nil end

    -- Log Recents BEFORE notifying so a client refresh sees the new entry.
    local connected = call.answeredAt ~= nil
    local ts = os.time()
    DB.LogRecent(call.callerCid, {  -- caller (outgoing) — never "missed"
        number = call.calleeNumber, name = call.calleeNameSeen, img = call.calleeImgSeen,
        direction = 'out', missed = false, ts = ts,
    })
    DB.LogRecent(call.calleeCid, {  -- callee (incoming) — missed if never answered
        number = call.callerNumber, name = call.callerNameSeen, img = call.callerImgSeen,
        direction = 'in', missed = not connected, ts = ts,
    })

    if not connected and Notif then
        Notif.Push(call.calleeCid, {
            app   = 'call',
            title = call.callerNameSeen or DB.FormatNumber(call.callerNumber),
            body  = 'Missed Call',
            route = { app = 'call', tab = 'recents' },
        })
    end

    TriggerClientEvent('oph3z-phone:call:ended', call.caller, { callId = callId, reason = reason })
    TriggerClientEvent('oph3z-phone:call:ended', call.callee, { callId = callId, reason = reason })
end

RegisterNetEvent('oph3z-phone:call:start', function(rawNumber)
    local src = source
    local callerCid = getCitizenId(src)
    if not callerCid or playerCall[src] then return end

    local calleeDigits = DB.Digits(rawNumber)
    local callerDoc = DB.EnsurePhone(callerCid, DB.LoadOrCreate(callerCid))
    local callerPhone = callerDoc.phone
    -- Airplane mode: you can't place calls (no signal).
    if callerDoc.settings and callerDoc.settings.airplane then
        TriggerClientEvent('oph3z-phone:call:failed', src, { reason = 'airplane' })
        return
    end
    if calleeDigits == '' or calleeDigits == callerPhone.numberRaw then
        TriggerClientEvent('oph3z-phone:call:failed', src, { reason = 'invalid' })
        return
    end

    local calleeCid = DB.GetCitizenIdByNumber(calleeDigits)
    local calleePlayer = calleeCid and exports.qbx_core:GetPlayerByCitizenId(calleeCid) or nil
    local calleeSrc = calleePlayer and calleePlayer.PlayerData.source or nil
    if not calleeSrc then
        -- Callee is offline: still record a missed call for them (and an outgoing
        -- for the caller), unless they've blocked the caller. They'll see it on
        -- their next phone load.
        if calleeCid then
            local calleeDocOff = DB.EnsurePhone(calleeCid, DB.LoadOrCreate(calleeCid))
            if not DB.IsBlocked(calleeDocOff, callerPhone.numberRaw) then
                local ts = os.time()
                local callerSeesCallee = displayFor(callerCid, calleeDigits, calleeDocOff.phone.number)
                local calleeSeesCaller = displayFor(calleeCid, callerPhone.numberRaw, callerPhone.number)
                DB.LogRecent(callerCid, {
                    number = callerSeesCallee.number, name = callerSeesCallee.name, img = callerSeesCallee.img,
                    direction = 'out', missed = false, ts = ts,
                })
                DB.LogRecent(calleeCid, {
                    number = calleeSeesCaller.number, name = calleeSeesCaller.name, img = calleeSeesCaller.img,
                    direction = 'in', missed = true, ts = ts,
                })
                if Notif then
                    Notif.Push(calleeCid, {
                        app   = 'call',
                        title = calleeSeesCaller.name or DB.FormatNumber(callerPhone.numberRaw),
                        body  = 'Missed Call',
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
    -- Callee unreachable: airplane mode on, or they've blocked the caller.
    if (calleeDoc.settings and calleeDoc.settings.airplane)
        or DB.IsBlocked(calleeDoc, callerPhone.numberRaw) then
        TriggerClientEvent('oph3z-phone:call:failed', src, { reason = 'unavailable' })
        return
    end

    local callId = nextCallId
    nextCallId = nextCallId + 1

    -- What each side sees of the other (name resolved from their own contacts).
    local callerSeesCallee = displayFor(callerCid, calleeDigits, calleePhone.number)
    local calleeSeesCaller = displayFor(calleeCid, callerPhone.numberRaw, callerPhone.number)

    activeCalls[callId] = {
        id = callId, channel = callId,
        caller = src, callee = calleeSrc,
        callerCid = callerCid, calleeCid = calleeCid,
        callerNumber = callerPhone.number, calleeNumber = calleePhone.number,
        callerNameSeen = calleeSeesCaller.name, callerImgSeen = calleeSeesCaller.img,
        calleeNameSeen = callerSeesCallee.name, calleeImgSeen = callerSeesCallee.img,
        state = 'ringing', startedAt = os.time(),
    }
    playerCall[src] = callId
    playerCall[calleeSrc] = callId

    TriggerClientEvent('oph3z-phone:call:outgoing', src, {
        callId = callId, number = callerSeesCallee.number,
        name = callerSeesCallee.name, img = callerSeesCallee.img,
    })
    TriggerClientEvent('oph3z-phone:call:incoming', calleeSrc, {
        callId = callId, number = calleeSeesCaller.number,
        name = calleeSeesCaller.name, img = calleeSeesCaller.img,
    })

    startRingtone(activeCalls[callId])

    SetTimeout(Config.RingTimeout * 1000, function()
        local c = activeCalls[callId]
        if c and c.state == 'ringing' then endCall(callId, 'noanswer') end
    end)
end)

RegisterNetEvent('oph3z-phone:call:accept', function(callId)
    local src = source
    local call = activeCalls[callId]
    if not call or call.callee ~= src or call.state ~= 'ringing' then return end
    stopRingtone(call)
    call.state = 'active'
    call.answeredAt = os.time()
    TriggerClientEvent('oph3z-phone:call:connected', call.caller, { callId = callId, channel = call.channel })
    TriggerClientEvent('oph3z-phone:call:connected', call.callee, { callId = callId, channel = call.channel })
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

AddEventHandler('playerDropped', function()
    local callId = playerCall[source]
    if callId then endCall(callId, 'hangup') end
end)

if Config.Debug then
    print('[oph3z-phone] server ready.')
end

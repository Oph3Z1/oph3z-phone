--[[
    oph3z-phone | Messages app — CLIENT (NUI bridge)

    Relays Messages UI actions to the server and pushes live incoming messages
    into the NUI (works whether or not the Messages app is currently open).
--]]

-- Upload provider config (for client-side voice-note uploads — same as camera).
RegisterNUICallback('phone:media:config', function(_, cb)
    cb(Config.Camera or {})
end)

-- GIF provider config (Tenor key) for the Messages GIF picker.
RegisterNUICallback('phone:gif:config', function(_, cb)
    cb(Config.Gif or {})
end)

RegisterNUICallback('phone:messages:threads', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:messages:threads', false) or {})
end)

RegisterNUICallback('phone:messages:open', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:messages:open', false, data) or nil)
end)

RegisterNUICallback('phone:messages:send', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:messages:send', false, data) or false)
end)

RegisterNUICallback('phone:messages:read', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:messages:read', false, data) or false)
end)

RegisterNUICallback('phone:messages:delete', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:messages:delete', false, data) or false)
end)

RegisterNUICallback('phone:messages:money', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:messages:money', false, data) or { ok = false, reason = 'error' })
end)

RegisterNUICallback('phone:messages:request', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:messages:request', false, data) or false)
end)

RegisterNUICallback('phone:messages:negotiate', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:messages:negotiate', false, data) or { ok = false, reason = 'error' })
end)

-- ---- Location sharing ----------------------------------------------------

-- Resolve the player's current world position + a human-readable place name.
local function getLoc()
    local ped = PlayerPedId()
    local c = GetEntityCoords(ped)
    local streetHash = GetStreetNameAtCoord(c.x, c.y, c.z)
    local street = GetStreetNameFromHashKey(streetHash)
    local zone = GetLabelText(GetNameOfZone(c.x, c.y, c.z))
    local label = zone
    if street and street ~= '' then
        label = (zone ~= '' and zone ~= street) and (street .. ', ' .. zone) or street
    end
    if not label or label == '' then label = 'Unknown area' end
    return { x = c.x, y = c.y, label = label }
end

local liveLoops = {} -- [sid] = true while actively streaming

local function startLive(sid, duration)
    if not sid or liveLoops[sid] then return end
    liveLoops[sid] = true
    local endTime = (duration and duration > 0) and (GetGameTimer() + duration * 1000) or nil
    CreateThread(function()
        while liveLoops[sid] do
            local loc = getLoc()
            TriggerServerEvent('oph3z-phone:server:loc:update', sid, loc.x, loc.y, loc.label)
            if endTime and GetGameTimer() >= endTime then
                liveLoops[sid] = nil
                lib.callback.await('oph3z-phone:server:messages:locstop', false, { sid = sid, reason = 'expired' })
                break
            end
            Wait(3000)
        end
    end)
end

-- Send a location (static or live). The client resolves coords/label first.
RegisterNUICallback('phone:messages:location', function(data, cb)
    local loc = getLoc()
    local msg = lib.callback.await('oph3z-phone:server:messages:location', false, {
        to = data and data.to,
        live = data and data.live,
        duration = data and data.duration,
        x = loc.x, y = loc.y, label = loc.label,
    })
    if msg and data and data.live and msg.meta and msg.meta.sid then
        startLive(msg.meta.sid, data.duration)
    end
    cb(msg or false)
end)

-- Stop a live share (user pressed Stop).
RegisterNUICallback('phone:messages:locstop', function(data, cb)
    local sid = data and data.sid
    if sid then liveLoops[sid] = nil end
    cb(lib.callback.await('oph3z-phone:server:messages:locstop', false,
        { sid = sid, reason = 'stopped' }) or { ok = false })
end)

-- Server -> stop a live loop (expired / ended elsewhere).
RegisterNetEvent('oph3z-phone:client:loc:stop', function(data)
    if data and data.sid then liveLoops[data.sid] = nil end
end)

-- Server -> a live location moved or ended. Push to the UI.
RegisterNetEvent('oph3z-phone:client:messages:locupdate', function(payload)
    if payload then
        SendNUIMessage({ action = 'phone:messages:locupdate', data = payload })
    end
end)

-- Server -> a request's status changed (paid / declined). Update the UI.
RegisterNetEvent('oph3z-phone:client:messages:update', function(payload)
    if payload then
        SendNUIMessage({ action = 'phone:messages:update', data = payload })
    end
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        for sid in pairs(liveLoops) do liveLoops[sid] = nil end
    end
end)

-- Server -> a message arrived for us. Push it to the UI.
RegisterNetEvent('oph3z-phone:client:messages:incoming', function(payload)
    if payload then
        SendNUIMessage({ action = 'phone:messages:incoming', data = payload })
    end
end)

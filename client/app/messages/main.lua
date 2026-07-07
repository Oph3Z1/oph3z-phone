RegisterNUICallback('phone:media:config', function(_, cb)
    cb(Config.Camera or {})
end)

RegisterNUICallback('phone:gif:config', function(_, cb)
    cb(Config.Gif or {})
end)

RegisterNUICallback('phone:messages:threads', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:messages:threads') or {})
end)

RegisterNUICallback('phone:messages:open', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:messages:open', data) or nil)
end)

RegisterNUICallback('phone:messages:send', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:messages:send', data) or false)
end)

RegisterNUICallback('phone:messages:read', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:messages:read', data) or false)
end)

RegisterNUICallback('phone:messages:delete', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:messages:delete', data) or false)
end)

RegisterNUICallback('phone:messages:money', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:messages:money', data) or { ok = false, reason = 'error' })
end)

RegisterNUICallback('phone:messages:request', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:messages:request', data) or false)
end)

RegisterNUICallback('phone:messages:negotiate', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:messages:negotiate', data) or { ok = false, reason = 'error' })
end)

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

local liveLoops = {}

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
                TriggerCallback('oph3z-phone:server:messages:locstop', { sid = sid, reason = 'expired' })
                break
            end
            Wait(3000)
        end
    end)
end

RegisterNUICallback('phone:messages:location', function(data, cb)
    local loc = getLoc()
    local msg = TriggerCallback('oph3z-phone:server:messages:location', {
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

RegisterNUICallback('phone:messages:locstop', function(data, cb)
    local sid = data and data.sid
    if sid then liveLoops[sid] = nil end
    cb(TriggerCallback('oph3z-phone:server:messages:locstop', { sid = sid, reason = 'stopped' }) or { ok = false })
end)

RegisterNetEvent('oph3z-phone:client:loc:stop', function(data)
    if data and data.sid then liveLoops[data.sid] = nil end
end)

RegisterNetEvent('oph3z-phone:client:messages:locupdate', function(payload)
    if payload then
        SendNUIMessage({ action = 'phone:messages:locupdate', data = payload })
    end
end)

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

RegisterNetEvent('oph3z-phone:client:messages:incoming', function(payload)
    if payload then
        SendNUIMessage({ action = 'phone:messages:incoming', data = payload })
    end
end)
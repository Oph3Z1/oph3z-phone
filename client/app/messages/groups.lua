RegisterNUICallback('phone:groups:create', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:groups:create', data) or false)
end)

RegisterNUICallback('phone:groups:open', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:groups:open', data) or false)
end)

RegisterNUICallback('phone:groups:send', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:groups:send', data) or false)
end)

RegisterNUICallback('phone:groups:read', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:groups:read', data) or false)
end)

RegisterNUICallback('phone:groups:react', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:groups:react', data) or false)
end)

RegisterNUICallback('phone:groups:manage', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:groups:manage', data) or { ok = false })
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

local groupLoops = {}

local function startGroupLive(sid, duration)
    if not sid or groupLoops[sid] then return end
    groupLoops[sid] = true
    local endTime = (duration and duration > 0) and (GetGameTimer() + duration * 1000) or nil
    CreateThread(function()
        while groupLoops[sid] do
            local loc = getLoc()
            TriggerServerEvent('oph3z-phone:server:groups:locupdate', sid, loc.x, loc.y, loc.label)
            if endTime and GetGameTimer() >= endTime then
                groupLoops[sid] = nil
                TriggerCallback('oph3z-phone:server:groups:locstop', { sid = sid, reason = 'expired' })
                break
            end
            Wait(3000)
        end
    end)
end

RegisterNUICallback('phone:groups:location', function(data, cb)
    local loc = getLoc()
    local msg = TriggerCallback('oph3z-phone:server:groups:location', {
        gid = data and data.gid,
        live = data and data.live,
        duration = data and data.duration,
        x = loc.x, y = loc.y, label = loc.label,
    })
    if msg and data and data.live and msg.meta and msg.meta.sid then
        startGroupLive(msg.meta.sid, data.duration)
    end
    cb(msg or false)
end)

RegisterNUICallback('phone:groups:locstop', function(data, cb)
    local sid = data and data.sid
    if sid then groupLoops[sid] = nil end
    cb(TriggerCallback('oph3z-phone:server:groups:locstop', { sid = sid, reason = 'stopped' }) or { ok = false })
end)

RegisterNetEvent('oph3z-phone:client:loc:stop', function(data)
    if data and data.sid then groupLoops[data.sid] = nil end
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        for sid in pairs(groupLoops) do groupLoops[sid] = nil end
    end
end)

RegisterNetEvent('oph3z-phone:client:groups:incoming', function(payload)
    if payload then SendNUIMessage({ action = 'phone:groups:incoming', data = payload }) end
end)

RegisterNetEvent('oph3z-phone:client:groups:read', function(payload)
    if payload then SendNUIMessage({ action = 'phone:groups:read', data = payload }) end
end)

RegisterNetEvent('oph3z-phone:client:groups:react', function(payload)
    if payload then SendNUIMessage({ action = 'phone:groups:react', data = payload }) end
end)

RegisterNetEvent('oph3z-phone:client:groups:removed', function(payload)
    if payload then SendNUIMessage({ action = 'phone:groups:removed', data = payload }) end
end)

RegisterNetEvent('oph3z-phone:client:groups:locupdate', function(payload)
    if payload then SendNUIMessage({ action = 'phone:groups:locupdate', data = payload }) end
end)
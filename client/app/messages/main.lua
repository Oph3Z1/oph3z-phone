--[[
    oph3z-phone | Messages app — CLIENT (NUI bridge)

    Relays Messages UI actions to the server and pushes live incoming messages
    into the NUI (works whether or not the Messages app is currently open).
--]]

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

-- Server -> a message arrived for us. Push it to the UI.
RegisterNetEvent('oph3z-phone:client:messages:incoming', function(payload)
    if payload then
        SendNUIMessage({ action = 'phone:messages:incoming', data = payload })
    end
end)

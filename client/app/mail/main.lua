--[[
    oph3z-phone | Mail — CLIENT bridge

    Plumbs the Mail UI's requests to the server callbacks and pushes live incoming
    mail into the NUI.
--]]

RegisterNUICallback('phone:mail:get', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:mail:get', false) or {})
end)

RegisterNUICallback('phone:mail:send', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:mail:send', false, data) or { ok = false })
end)

RegisterNUICallback('phone:mail:read', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:mail:read', false, data and data.id))
end)

RegisterNUICallback('phone:mail:delete', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:mail:delete', false, data))
end)

-- server -> UI: a new mail arrived.
RegisterNetEvent('oph3z-phone:client:mail:incoming', function(item)
    SendNUIMessage({ action = 'phone:mail:incoming', data = item })
end)

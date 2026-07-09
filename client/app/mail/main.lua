RegisterNUICallback('phone:mail:get', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:mail:get') or {})
end)

RegisterNUICallback('phone:mail:send', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:mail:send', data) or { ok = false })
end)

RegisterNUICallback('phone:mail:read', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:mail:read', data and data.id))
end)

RegisterNUICallback('phone:mail:delete', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:mail:delete', data))
end)

RegisterNetEvent('oph3z-phone:client:mail:incoming', function(item)
    SendNUIMessage({ action = 'phone:mail:incoming', data = item })
end)
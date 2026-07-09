RegisterNUICallback('phone:notifications:get', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:notifications:get') or {})
end)

RegisterNUICallback('phone:notifications:read', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:notifications:read', data) or false)
end)

RegisterNUICallback('phone:notifications:clear', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:notifications:clear', data) or false)
end)

RegisterNetEvent('oph3z-phone:client:notify', function(item)
    if item then
        SendNUIMessage({ action = 'phone:notify', data = item })
    end
end)

RegisterNetEvent('oph3z-phone:client:notifRefresh', function()
    SendNUIMessage({ action = 'phone:notifRefresh' })
end)
--[[
    oph3z-phone | Notifications — CLIENT (NUI bridge)

    Relays the notification list/read/clear actions to the server and pushes live
    notifications into the NUI. The NUI decides how to present each one (lock-screen
    list, in-phone banner, or a closed-phone "peek").
--]]

RegisterNUICallback('phone:notifications:get', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:notifications:get', false) or {})
end)

RegisterNUICallback('phone:notifications:read', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:notifications:read', false, data) or false)
end)

RegisterNUICallback('phone:notifications:clear', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:notifications:clear', false, data) or false)
end)

-- Server -> a new notification arrived. Push it to the NUI (works whether or not
-- the phone is open — when closed the UI shows a brief "peek").
RegisterNetEvent('oph3z-phone:client:notify', function(item)
    if item then
        SendNUIMessage({ action = 'phone:notify', data = item })
    end
end)

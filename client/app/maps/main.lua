local streaming = false

RegisterNUICallback('phone:maps:enter', function(_, cb)
    if not streaming then
        streaming = true
        CreateThread(function()
            while streaming do
                local coords = GetEntityCoords(PlayerPedId())
                local heading = GetEntityHeading(PlayerPedId())
                SendNUIMessage({
                    action = 'phone:maps:pos',
                    data = { x = coords.x, y = coords.y, h = heading },
                })
                Wait(500)
            end
        end)
    end
    cb('ok')
end)

RegisterNUICallback('phone:maps:exit', function(_, cb)
    streaming = false
    cb('ok')
end)

RegisterNUICallback('phone:maps:waypoint', function(data, cb)
    if data and data.x and data.y then
        SetNewWaypoint(data.x + 0.0, data.y + 0.0)
    end
    cb('ok')
end)

RegisterNUICallback('phone:maps:get', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:maps:get') or {})
end)

RegisterNUICallback('phone:maps:add', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:maps:add', data) or false)
end)

RegisterNUICallback('phone:maps:move', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:maps:move', data) or false)
end)

RegisterNUICallback('phone:maps:delete', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:maps:delete', data and data.id) or false)
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then streaming = false end
end)
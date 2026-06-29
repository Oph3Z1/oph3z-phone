--[[
    oph3z-phone | Maps app — CLIENT (NUI bridge)

    While the Maps app is open, streams the player's world position to the UI so
    the live marker can follow them. Also sets the in-game GPS waypoint and
    forwards blip CRUD to the server.
--]]

local streaming = false

-- Start streaming the player position to the UI (every 500ms while open).
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

-- Set the real in-game GPS waypoint.
RegisterNUICallback('phone:maps:waypoint', function(data, cb)
    if data and data.x and data.y then
        SetNewWaypoint(data.x + 0.0, data.y + 0.0)
    end
    cb('ok')
end)

-- Blips (saved places) — relayed to the server.
RegisterNUICallback('phone:maps:get', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:maps:get', false) or {})
end)

RegisterNUICallback('phone:maps:add', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:maps:add', false, data) or false)
end)

RegisterNUICallback('phone:maps:move', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:maps:move', false, data) or false)
end)

RegisterNUICallback('phone:maps:delete', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:maps:delete', false, data and data.id) or false)
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then streaming = false end
end)

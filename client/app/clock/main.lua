--[[
    oph3z-phone | Clock — CLIENT bridge

    Forwards the Clock UI's requests to the server callbacks, and pushes the
    server's live timer/alarm events into the NUI. The alarm / timer-finished
    sound is a 3D world sound owned by xsound (started server-side); this client
    just keeps it glued to the local ped while it plays — exactly like the
    incoming-call ringtone (see client/main.lua).
--]]

-- UI -> server plumbing -----------------------------------------------------

RegisterNUICallback('phone:clock:get', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:get', false) or {})
end)

RegisterNUICallback('phone:clock:addAlarm', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:addAlarm', false, data))
end)

RegisterNUICallback('phone:clock:toggleAlarm', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:toggleAlarm', false, data and data.id))
end)

RegisterNUICallback('phone:clock:deleteAlarm', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:deleteAlarm', false, data and data.id))
end)

RegisterNUICallback('phone:clock:startTimer', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:startTimer', false, data))
end)

RegisterNUICallback('phone:clock:pauseTimer', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:pauseTimer', false))
end)

RegisterNUICallback('phone:clock:resumeTimer', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:resumeTimer', false))
end)

RegisterNUICallback('phone:clock:cancelTimer', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:cancelTimer', false))
end)

RegisterNUICallback('phone:clock:deleteRecent', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:deleteRecent', false, data and data.index))
end)

RegisterNUICallback('phone:clock:stopRing', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:stopRing', false))
end)

RegisterNUICallback('phone:clock:setAlarmTone', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:setAlarmTone', false, data and data.url))
end)

RegisterNUICallback('phone:clock:addAlarmTone', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:addAlarmTone', false, data))
end)

RegisterNUICallback('phone:clock:deleteAlarmTone', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:clock:deleteAlarmTone', false, data and data.id))
end)

-- server -> UI: a timer finished (banked recents come back so the UI updates).
RegisterNetEvent('oph3z-phone:client:clock:timerDone', function(data)
    SendNUIMessage({ action = 'phone:clock:timerDone', data = data })
end)

-- server -> UI: an alarm fired.
RegisterNetEvent('oph3z-phone:client:clock:alarmFire', function(data)
    SendNUIMessage({ action = 'phone:clock:alarmFire', data = data })
end)

-- server -> client: the 3D ring started — follow it to the local ped, and tell
-- the UI to show the ringing overlay.
RegisterNetEvent('oph3z-phone:client:clock:ring', function(data)
    if not data or not data.name then return end
    SendNUIMessage({ action = 'phone:clock:ring', data = data })

    CreateThread(function()
        local name = data.name
        -- Keep the sound glued to us while it exists (mirrors the call ringtone).
        while exports.xsound:soundExists(name) do
            exports.xsound:Position(name, GetEntityCoords(PlayerPedId()))
            Wait(400)
        end
    end)
end)

-- server -> UI: the ring stopped (auto-timeout or Stop pressed).
RegisterNetEvent('oph3z-phone:client:clock:ringStop', function()
    SendNUIMessage({ action = 'phone:clock:ringStop' })
end)

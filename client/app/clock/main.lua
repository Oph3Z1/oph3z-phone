RegisterNUICallback('phone:clock:get', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:get') or {})
end)

RegisterNUICallback('phone:clock:addAlarm', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:addAlarm', data))
end)

RegisterNUICallback('phone:clock:toggleAlarm', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:toggleAlarm', data and data.id))
end)

RegisterNUICallback('phone:clock:deleteAlarm', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:deleteAlarm', data and data.id))
end)

RegisterNUICallback('phone:clock:startTimer', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:startTimer', data))
end)

RegisterNUICallback('phone:clock:pauseTimer', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:pauseTimer'))
end)

RegisterNUICallback('phone:clock:resumeTimer', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:resumeTimer'))
end)

RegisterNUICallback('phone:clock:cancelTimer', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:cancelTimer'))
end)

RegisterNUICallback('phone:clock:deleteRecent', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:deleteRecent', data and data.index))
end)

RegisterNUICallback('phone:clock:stopRing', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:stopRing'))
end)

RegisterNUICallback('phone:clock:setAlarmTone', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:setAlarmTone', data and data.url))
end)

RegisterNUICallback('phone:clock:addAlarmTone', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:addAlarmTone', data))
end)

RegisterNUICallback('phone:clock:deleteAlarmTone', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:clock:deleteAlarmTone', data and data.id))
end)

RegisterNetEvent('oph3z-phone:client:clock:timerDone', function(data)
    SendNUIMessage({ action = 'phone:clock:timerDone', data = data })
end)

RegisterNetEvent('oph3z-phone:client:clock:alarmFire', function(data)
    SendNUIMessage({ action = 'phone:clock:alarmFire', data = data })
end)

RegisterNetEvent('oph3z-phone:client:clock:ring', function(data)
    if not data or not data.name then return end
    SendNUIMessage({ action = 'phone:clock:ring', data = data })

    CreateThread(function()
        local name = data.name
        while exports.xsound:soundExists(name) do
            exports.xsound:Position(name, GetEntityCoords(PlayerPedId()))
            Wait(400)
        end
    end)
end)

RegisterNetEvent('oph3z-phone:client:clock:ringStop', function()
    SendNUIMessage({ action = 'phone:clock:ringStop' })
end)
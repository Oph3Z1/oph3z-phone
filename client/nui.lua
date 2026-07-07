RegisterNUICallback('phone:close', function(_, cb)
    Phone.close()
    cb('ok')
end)

RegisterNUICallback('phone:saveSettings', function(patch, cb)
    if type(patch) == 'table' and patch.language then Phone.setLanguage(patch.language) end
    local ok = TriggerCallback('oph3z-phone:server:saveSettings', patch)
    cb({ ok = ok })
end)

RegisterNUICallback('phone:home:save', function(layout, cb)
    cb(TriggerCallback('oph3z-phone:server:home:save', layout) or false)
end)

RegisterNUICallback('phone:flashlight', function(data, cb)
    Phone.setFlashlight(data and data.on)
    cb('ok')
end)

RegisterNUICallback('phone:ready', function(_, cb)
    Phone.dbg('NUI ready')
    cb('ok')
end)

RegisterNUICallback('phone:phone:getState', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:phone:getState') or {})
end)

RegisterNUICallback('phone:phone:addContact', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:phone:addContact', data) or false)
end)

RegisterNUICallback('phone:phone:updateContact', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:phone:updateContact', data) or false)
end)

RegisterNUICallback('phone:phone:deleteContact', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:phone:deleteContact', data and data.id) or false)
end)

RegisterNUICallback('phone:phone:setFavorite', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:phone:setFavorite', data) or false)
end)

RegisterNUICallback('phone:phone:block', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:phone:block', data and data.number) or {})
end)

RegisterNUICallback('phone:phone:unblock', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:phone:unblock', data and data.number) or {})
end)

RegisterNUICallback('phone:phone:setAirplane', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:phone:setAirplane', data and data.value))
end)

RegisterNUICallback('phone:call:start', function(data, cb)
    TriggerServerEvent('oph3z-phone:call:start', data and data.number)
    cb('ok')
end)

RegisterNUICallback('phone:call:accept', function(data, cb)
    TriggerServerEvent('oph3z-phone:call:accept', data and data.callId)
    cb('ok')
end)

RegisterNUICallback('phone:call:decline', function(data, cb)
    TriggerServerEvent('oph3z-phone:call:decline', data and data.callId)
    cb('ok')
end)

RegisterNUICallback('phone:call:hangup', function(data, cb)
    TriggerServerEvent('oph3z-phone:call:hangup', data and data.callId)
    cb('ok')
end)

RegisterNUICallback('phone:call:mute', function(data, cb)
    if data then TriggerServerEvent('oph3z-phone:call:mute', data.callId, data.muted) end
    cb('ok')
end)
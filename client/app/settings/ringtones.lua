RegisterNUICallback('phone:ringtones:get', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:ringtones:get') or { ringtones = {}, selected = '' })
end)

RegisterNUICallback('phone:ringtones:add', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:ringtones:add', data) or false)
end)

RegisterNUICallback('phone:ringtones:delete', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:ringtones:delete', data and data.id) or false)
end)
RegisterNUICallback('phone:profile:setName', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:profile:setName', data and data.name) or false)
end)

RegisterNUICallback('phone:profile:setAvatar', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:profile:setAvatar', data and data.url) or false)
end)
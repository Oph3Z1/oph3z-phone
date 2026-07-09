RegisterNUICallback('phone:calc:get', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:calc:get') or {})
end)

RegisterNUICallback('phone:calc:add', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:calc:add', data))
end)

RegisterNUICallback('phone:calc:delete', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:calc:delete', data and data.id))
end)

RegisterNUICallback('phone:calc:clear', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:calc:clear'))
end)
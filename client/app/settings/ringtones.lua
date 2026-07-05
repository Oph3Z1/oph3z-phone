--[[
    oph3z-phone | Ringtones — CLIENT (NUI proxies)
--]]

RegisterNUICallback('phone:ringtones:get', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:ringtones:get', false) or { ringtones = {}, selected = '' })
end)

RegisterNUICallback('phone:ringtones:add', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:ringtones:add', false, data) or false)
end)

RegisterNUICallback('phone:ringtones:delete', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:ringtones:delete', false, data and data.id) or false)
end)

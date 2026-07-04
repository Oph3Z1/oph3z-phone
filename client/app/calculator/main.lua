--[[
    oph3z-phone | Calculator — CLIENT bridge

    Plumbs the Calculator UI's history requests to the server callbacks.
--]]

RegisterNUICallback('phone:calc:get', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:calc:get', false) or {})
end)

RegisterNUICallback('phone:calc:add', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:calc:add', false, data))
end)

RegisterNUICallback('phone:calc:delete', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:calc:delete', false, data and data.id))
end)

RegisterNUICallback('phone:calc:clear', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:calc:clear', false))
end)

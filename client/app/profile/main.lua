--[[
    oph3z-phone | Profile app — CLIENT (NUI proxies)

    Bridges the React Profile/Settings screens to the server profile callbacks.
--]]

-- Rename the phone ID (display name).
RegisterNUICallback('phone:profile:setName', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:profile:setName', false, data and data.name) or false)
end)

-- Set / clear the profile photo URL.
RegisterNUICallback('phone:profile:setAvatar', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:profile:setAvatar', false, data and data.url) or false)
end)

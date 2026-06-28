--[[
    oph3z-phone | NUI callbacks (messages coming FROM the React app)
--]]

-- The React app asks to close (Escape, swipe-down-to-close, etc.)
RegisterNUICallback('phone:close', function(_, cb)
    Phone.close()
    cb('ok')
end)

-- Persist a partial settings patch to the JSON database via the server.
RegisterNUICallback('phone:saveSettings', function(patch, cb)
    local ok = lib.callback.await('oph3z-phone:server:saveSettings', false, patch)
    cb({ ok = ok })
end)

-- Toggle the in-game flashlight beam.
RegisterNUICallback('phone:flashlight', function(data, cb)
    Phone.setFlashlight(data and data.on)
    cb('ok')
end)

-- The app finished mounting; useful if we ever want a readiness handshake.
RegisterNUICallback('phone:ready', function(_, cb)
    Phone.dbg('NUI ready')
    cb('ok')
end)

-- ---------------------------------------------------------------------------
-- Phone app (contacts / favorites / recents) — proxy to server callbacks
-- ---------------------------------------------------------------------------
RegisterNUICallback('phone:phone:getState', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:phone:getState', false) or {})
end)

RegisterNUICallback('phone:phone:addContact', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:phone:addContact', false, data) or false)
end)

RegisterNUICallback('phone:phone:updateContact', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:phone:updateContact', false, data) or false)
end)

RegisterNUICallback('phone:phone:deleteContact', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:phone:deleteContact', false, data and data.id) or false)
end)

RegisterNUICallback('phone:phone:setFavorite', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:phone:setFavorite', false, data) or false)
end)

RegisterNUICallback('phone:phone:block', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:phone:block', false, data and data.number) or {})
end)

RegisterNUICallback('phone:phone:unblock', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:phone:unblock', false, data and data.number) or {})
end)

RegisterNUICallback('phone:phone:setAirplane', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:phone:setAirplane', false, data and data.value))
end)

-- ---------------------------------------------------------------------------
-- Calls — forward UI actions to the server call manager
-- ---------------------------------------------------------------------------
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

--[[
    oph3z-phone | Photos app — CLIENT (NUI bridge)

    Forwards Photos UI actions to the server, and provides a dev command to add
    a photo by URL until the Camera app can do it for real.
--]]

RegisterNUICallback('phone:photos:get', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:photos:get', false) or {})
end)

RegisterNUICallback('phone:photos:add', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:photos:add', false, data) or false)
end)

RegisterNUICallback('phone:photos:setFavorite', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:photos:setFavorite', false, data) or false)
end)

RegisterNUICallback('phone:photos:delete', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:photos:delete', false, data and data.ids) or false)
end)

-- Server -> a photo/video was added for us (e.g. Camera video finalised). Push
-- it to the UI so the gallery/thumbnail updates live.
RegisterNetEvent('oph3z-phone:client:photoAdded', function(photo)
    if photo then
        SendNUIMessage({ action = 'phone:photos:added', data = photo })
    end
end)

-- Dev: /addphoto <url> [image|video]  (Camera app will replace this later)
RegisterCommand('addphoto', function(_, args)
    local url = args[1]
    if not url then
        exports.qbx_core:Notify('Usage: /addphoto <url> [image|video]', 'error')
        return
    end
    local ptype = args[2] == 'video' and 'video' or 'image'
    local photo = lib.callback.await('oph3z-phone:server:photos:add', false, { url = url, type = ptype })
    if photo then
        -- Live-update the UI (works whether the Photos app is open or not).
        SendNUIMessage({ action = 'phone:photos:added', data = photo })
    end
    exports.qbx_core:Notify(photo and 'Photo added' or 'Failed to add photo', photo and 'success' or 'error')
end, false)

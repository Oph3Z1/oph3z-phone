RegisterNUICallback('phone:photos:get', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:photos:get') or {})
end)

RegisterNUICallback('phone:photos:add', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:photos:add', data) or false)
end)

RegisterNUICallback('phone:photos:setFavorite', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:photos:setFavorite', data) or false)
end)

RegisterNUICallback('phone:photos:delete', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:photos:delete', data and data.ids) or false)
end)

RegisterNetEvent('oph3z-phone:client:photoAdded', function(photo)
    if photo then
        SendNUIMessage({ action = 'phone:photos:added', data = photo })
    end
end)

RegisterCommand('addphoto', function(_, args)
    local url = args[1]
    if not url then
        Notify('Usage: /addphoto <url> [image|video]', 'error')
        return
    end
    local ptype = args[2] == 'video' and 'video' or 'image'
    local photo = TriggerCallback('oph3z-phone:server:photos:add', { url = url, type = ptype })
    if photo then
        SendNUIMessage({ action = 'phone:photos:added', data = photo })
    end
    Notify(photo and 'Photo added' or 'Failed to add photo', photo and 'success' or 'error')
end, false)
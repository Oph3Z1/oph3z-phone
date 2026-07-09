RegisterNUICallback('phone:airdrop:nearby', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:airdrop:nearby') or {})
end)

RegisterNUICallback('phone:airdrop:send', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:airdrop:send', data) or { ok = false })
end)

RegisterNUICallback('phone:airdrop:accept', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:airdrop:accept', data and data.id) or { ok = false })
end)
RegisterNUICallback('phone:airdrop:decline', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:airdrop:decline', data and data.id) or false)
end)

RegisterNUICallback('phone:airdrop:pending', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:airdrop:pending') or {})
end)

RegisterNetEvent('oph3z-phone:client:airdrop:incoming', function(transfer)
    SendNUIMessage({ action = 'phone:airdrop:incoming', data = transfer })
end)

RegisterNetEvent('oph3z-phone:client:airdrop:status', function(status)
    SendNUIMessage({ action = 'phone:airdrop:status', data = status })
end)
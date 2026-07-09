RegisterNUICallback('phone:wallet:get', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:wallet:get') or {})
end)

RegisterNUICallback('phone:wallet:send', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:wallet:send', data) or { ok = false })
end)

RegisterNUICallback('phone:wallet:bills', function(_, cb)
    cb(TriggerCallback('oph3z-phone:server:wallet:bills') or {})
end)

RegisterNUICallback('phone:wallet:pay', function(data, cb)
    cb(TriggerCallback('oph3z-phone:server:wallet:pay', data and data.id) or { ok = false })
end)

RegisterNetEvent('oph3z-phone:client:wallet:incoming', function(payload)
    SendNUIMessage({ action = 'phone:wallet:incoming', data = payload })
end)

RegisterNetEvent('oph3z-phone:client:wallet:bill', function(bill)
    SendNUIMessage({ action = 'phone:wallet:bill', data = bill })
end)
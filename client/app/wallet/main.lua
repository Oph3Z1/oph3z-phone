--[[
    oph3z-phone | Wallet (Bank) — CLIENT bridge

    Plumbs the Wallet UI to the server callbacks and pushes live money/bill events
    into the NUI.
--]]

RegisterNUICallback('phone:wallet:get', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:wallet:get', false) or {})
end)

RegisterNUICallback('phone:wallet:send', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:wallet:send', false, data) or { ok = false })
end)

RegisterNUICallback('phone:wallet:bills', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:wallet:bills', false) or {})
end)

RegisterNUICallback('phone:wallet:pay', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:wallet:pay', false, data and data.id) or { ok = false })
end)

-- server -> UI: money was received (balance + the received transaction).
RegisterNetEvent('oph3z-phone:client:wallet:incoming', function(payload)
    SendNUIMessage({ action = 'phone:wallet:incoming', data = payload })
end)

-- server -> UI: a new bill arrived.
RegisterNetEvent('oph3z-phone:client:wallet:bill', function(bill)
    SendNUIMessage({ action = 'phone:wallet:bill', data = bill })
end)

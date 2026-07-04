--[[
    oph3z-phone | AirDrop — CLIENT bridge

    Forwards the UI's AirDrop requests to the server callbacks, and pushes the
    server's live incoming/status events into the NUI. All proximity / validation
    lives on the server; this is just plumbing.
--]]

-- UI -> server: list nearby people who can receive.
RegisterNUICallback('phone:airdrop:nearby', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:airdrop:nearby', false) or {})
end)

-- UI -> server: send a transfer to a chosen nearby player.
RegisterNUICallback('phone:airdrop:send', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:airdrop:send', false, data) or { ok = false })
end)

-- UI -> server: accept / decline a pending transfer.
RegisterNUICallback('phone:airdrop:accept', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:airdrop:accept', false, data and data.id) or { ok = false })
end)
RegisterNUICallback('phone:airdrop:decline', function(data, cb)
    cb(lib.callback.await('oph3z-phone:server:airdrop:decline', false, data and data.id) or false)
end)

-- UI -> server: fetch all still-pending transfers (on phone open).
RegisterNUICallback('phone:airdrop:pending', function(_, cb)
    cb(lib.callback.await('oph3z-phone:server:airdrop:pending', false) or {})
end)

-- server -> UI: a transfer arrived (the UI decides island vs. Notification Center).
RegisterNetEvent('oph3z-phone:client:airdrop:incoming', function(transfer)
    SendNUIMessage({ action = 'phone:airdrop:incoming', data = transfer })
end)

-- server -> UI: the person you sent to accepted / declined.
RegisterNetEvent('oph3z-phone:client:airdrop:status', function(status)
    SendNUIMessage({ action = 'phone:airdrop:status', data = status })
end)

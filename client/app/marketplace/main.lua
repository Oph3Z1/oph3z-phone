--[[
    oph3z-phone | Marketplace (classifieds) — CLIENT bridge

    Plumbs the Marketplace UI to the server callbacks (feed, listings, profiles,
    create/update/delete).
--]]

local function bridge(nuiEvent, serverEvent, wrap)
    RegisterNUICallback(nuiEvent, function(data, cb)
        cb(lib.callback.await(serverEvent, false, wrap and wrap(data) or data) or { ok = false })
    end)
end

bridge('phone:market:feed',    'oph3z-phone:server:market:feed')
bridge('phone:market:listing', 'oph3z-phone:server:market:listing')
bridge('phone:market:profile', 'oph3z-phone:server:market:profile')
bridge('phone:market:me',      'oph3z-phone:server:market:me')
bridge('phone:market:create',  'oph3z-phone:server:market:create')
bridge('phone:market:update',  'oph3z-phone:server:market:update')
bridge('phone:market:delete',  'oph3z-phone:server:market:delete')

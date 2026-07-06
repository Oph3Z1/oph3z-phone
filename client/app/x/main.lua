--[[
    oph3z-phone | X (social) — CLIENT bridge

    Plumbs the X UI to the server callbacks and relays live events (new bell
    notification) into the NUI.
--]]

local function bridge(nuiEvent, serverEvent, wrap)
    RegisterNUICallback(nuiEvent, function(data, cb)
        cb(lib.callback.await(serverEvent, false, wrap and wrap(data) or data) or { ok = false })
    end)
end

-- Auth
bridge('phone:x:session',        'oph3z-phone:server:x:session')
bridge('phone:x:register',       'oph3z-phone:server:x:register')
bridge('phone:x:verifyRegister', 'oph3z-phone:server:x:verifyRegister')
bridge('phone:x:login',          'oph3z-phone:server:x:login')
bridge('phone:x:logout',         'oph3z-phone:server:x:logout')
bridge('phone:x:recoverStart',   'oph3z-phone:server:x:recoverStart')
bridge('phone:x:recoverVerify',  'oph3z-phone:server:x:recoverVerify')
bridge('phone:x:emailStart',     'oph3z-phone:server:x:emailStart')
bridge('phone:x:emailVerify',    'oph3z-phone:server:x:emailVerify')
bridge('phone:x:resendCode',     'oph3z-phone:server:x:resendCode')
bridge('phone:x:cancelPending',  'oph3z-phone:server:x:cancelPending')
bridge('phone:x:deleteAccount',  'oph3z-phone:server:x:deleteAccount')

-- Feed / posts
bridge('phone:x:feed',    'oph3z-phone:server:x:feed')
bridge('phone:x:post',    'oph3z-phone:server:x:post')
bridge('phone:x:like',    'oph3z-phone:server:x:like')
bridge('phone:x:repost',  'oph3z-phone:server:x:repost')
bridge('phone:x:delete',  'oph3z-phone:server:x:delete')
bridge('phone:x:thread',  'oph3z-phone:server:x:thread')

-- Profiles / follow
bridge('phone:x:profile',     'oph3z-phone:server:x:profile')
bridge('phone:x:follow',      'oph3z-phone:server:x:follow')
bridge('phone:x:followList',  'oph3z-phone:server:x:followList')
bridge('phone:x:postEngagers', 'oph3z-phone:server:x:postEngagers')
bridge('phone:x:removeFollower', 'oph3z-phone:server:x:removeFollower')
bridge('phone:x:editProfile', 'oph3z-phone:server:x:editProfile')
bridge('phone:x:changePassword', 'oph3z-phone:server:x:changePassword')

-- Search / topics / notifications
bridge('phone:x:search', 'oph3z-phone:server:x:search')
bridge('phone:x:topics', 'oph3z-phone:server:x:topics')
bridge('phone:x:topic',  'oph3z-phone:server:x:topic')
bridge('phone:x:notifs', 'oph3z-phone:server:x:notifs')

-- server -> UI: a live event (new notification -> refresh the bell badge).
RegisterNetEvent('oph3z-phone:client:x:live', function(payload)
    SendNUIMessage({ action = 'phone:x:live', data = payload })
end)

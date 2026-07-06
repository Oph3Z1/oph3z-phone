--[[
    oph3z-phone | Spotify (music) — CLIENT

    Search is done on the SERVER (PerformHttpRequest is server-only) and bridged.
    Playback runs on xsound so it keeps going while the phone is closed and — in
    "speaker" mode — is heard by nearby players (3D at our ped). The NUI is just
    the controller: it sends commands and receives position ticks.
--]]

local CFG   = Config.Spotify or {}
local LOCAL = 'oph3zlocalmusic'   -- xsound name for private (2D) playback

local myId
local function serverId() myId = myId or GetPlayerServerId(PlayerId()); return myId end
local function nearbyName() return ('oph3zmusic_%s'):format(serverId()) end

-- ---- playback engine ------------------------------------------------------
local M = { track = nil, queue = {}, index = 0, playing = false, nearby = false, volume = 70 }

local function activeName() return M.nearby and nearbyName() or LOCAL end
local function posNow()
    local n = activeName()
    if exports.xsound:soundExists(n) then return exports.xsound:getTimeStamp(n) or 0 end
    return 0
end

local function pushTrack()
    SendNUIMessage({ action = 'phone:spotify:track', data = {
        track = M.track, index = M.index, count = #M.queue, playing = M.playing,
        nearby = M.nearby, volume = M.volume, hasNext = M.index < #M.queue, hasPrev = M.index > 1,
    } })
end

local function stopAudio()
    if exports.xsound:soundExists(LOCAL) then exports.xsound:Destroy(LOCAL) end
    if M.nearby then TriggerServerEvent('oph3z-phone:server:spotify:nearbyStop') end
end

-- Seek only once THIS client's YouTube player is fully ready. getTimeStamp can't
-- be trusted (xsound syncs it across clients, so it may report a peer's value
-- before our own player exists). We wait for BOTH signals that mean our local
-- player is up: isPlaying() (it's actually playing) AND getMaxDuration() > 0 (it
-- has loaded metadata — which only happens once seekTo is bound), then settle a
-- beat before seeking. Otherwise setTimeStamp throws "yPlayer.seekTo is not a
-- function".
local function seekWhenReady(name, position)
    if not position or position <= 0 then return end
    CreateThread(function()
        local playingFor = 0
        for _ = 1, 75 do          -- up to ~15s to spin up
            Wait(200)
            if not exports.xsound:soundExists(name) then return end
            local playing = exports.xsound:isPlaying(name)
            local dur = exports.xsound:getMaxDuration(name) or -1
            playingFor = playing and (playingFor + 1) or 0
            -- Ready = actually playing AND metadata loaded (seekTo is bound by then);
            -- fallback: steadily playing for ~1s (safe even if no duration reported).
            if playing and (dur > 0 or playingFor >= 5) then
                Wait(150)         -- final settle before seeking
                if exports.xsound:soundExists(name) then
                    exports.xsound:setTimeStamp(name, math.floor(position))
                end
                return
            end
        end
    end)
end

local function startAudio(position)
    local url = M.track and M.track.url
    if not url then return end
    if M.nearby then
        -- Server broadcasts + tells EVERYONE in range (incl. us) to seek to the
        -- current spot when their player is ready — so nearby players hear it from
        -- the same position, not from 0:00.
        TriggerServerEvent('oph3z-phone:server:spotify:nearbyPlay', { url = url, volume = M.volume, position = position or 0 })
    else
        exports.xsound:PlayUrl(LOCAL, url, M.volume / 100, false)
        seekWhenReady(LOCAL, position)
    end
    M.playing = true
end

local function playIndex(i)
    stopAudio()
    if i < 1 or i > #M.queue then
        M.playing, M.track, M.index = false, nil, 0
        SendNUIMessage({ action = 'phone:spotify:stopped' })
        return
    end
    M.index = i
    M.track = M.queue[i]
    startAudio(0)
    pushTrack()
end

-- server -> owner: the 3D broadcast is live; keep it glued to our ped.
RegisterNetEvent('oph3z-phone:client:spotify:nearbyLive', function(data)
    if not data or not data.name then return end
    CreateThread(function()
        while exports.xsound:soundExists(data.name) do
            exports.xsound:Position(data.name, GetEntityCoords(PlayerPedId()))
            Wait(400)
        end
    end)
end)

-- server -> everyone in range: seek this broadcast to the given spot once our own
-- player is ready (so switching to speaker mid-song doesn't restart it at 0:00).
RegisterNetEvent('oph3z-phone:client:spotify:nearbySeek', function(data)
    if not data or not data.name then return end
    seekWhenReady(data.name, data.position)
end)

-- Position ticks + auto-advance at end of track.
CreateThread(function()
    while true do
        Wait(1000)
        if M.track and M.playing then
            local dur = M.track.duration or 0
            local pos = posNow()
            SendNUIMessage({ action = 'phone:spotify:tick', data = { position = pos, duration = dur, playing = M.playing } })
            if dur > 0 and pos >= dur - 0.5 and pos > 0 then playIndex(M.index + 1) end
        end
    end
end)

-- ---- NUI commands ---------------------------------------------------------
RegisterNUICallback('phone:spotify:play', function(data, cb)
    if type(data) ~= 'table' or type(data.track) ~= 'table' then cb({ ok = false }); return end
    M.queue = (type(data.queue) == 'table' and #data.queue > 0) and data.queue or { data.track }
    M.index = tonumber(data.index) or 1
    if not M.queue[M.index] then M.index = 1 end
    M.track = M.queue[M.index] or data.track
    stopAudio()
    startAudio(0)
    pushTrack()
    cb({ ok = true })
end)

RegisterNUICallback('phone:spotify:toggle', function(_, cb)
    if not M.track then cb({ ok = false }); return end
    M.playing = not M.playing
    local act = M.playing and 'resume' or 'pause'
    if M.nearby then
        TriggerServerEvent('oph3z-phone:server:spotify:nearbyControl', { action = act })
    elseif exports.xsound:soundExists(LOCAL) then
        if M.playing then exports.xsound:Resume(LOCAL) else exports.xsound:Pause(LOCAL) end
    end
    SendNUIMessage({ action = 'phone:spotify:playing', data = { playing = M.playing } })
    cb({ ok = true, playing = M.playing })
end)

-- Auto-pause for an incoming call (idempotent), remembering we did it so we can
-- auto-resume when the call ends.
RegisterNUICallback('phone:spotify:pauseFor', function(_, cb)
    if M.track and M.playing then
        M.playing = false
        M.autoPaused = true
        if M.nearby then TriggerServerEvent('oph3z-phone:server:spotify:nearbyControl', { action = 'pause' })
        elseif exports.xsound:soundExists(LOCAL) then exports.xsound:Pause(LOCAL) end
        SendNUIMessage({ action = 'phone:spotify:playing', data = { playing = false } })
    end
    cb({ ok = true })
end)

RegisterNUICallback('phone:spotify:resumeAuto', function(_, cb)
    if M.track and not M.playing and M.autoPaused then
        M.playing = true
        if M.nearby then TriggerServerEvent('oph3z-phone:server:spotify:nearbyControl', { action = 'resume' })
        elseif exports.xsound:soundExists(LOCAL) then exports.xsound:Resume(LOCAL) end
        SendNUIMessage({ action = 'phone:spotify:playing', data = { playing = true } })
    end
    M.autoPaused = false
    cb({ ok = true })
end)

RegisterNUICallback('phone:spotify:next', function(_, cb) playIndex(M.index + 1); cb({ ok = true }) end)

RegisterNUICallback('phone:spotify:prev', function(_, cb)
    if posNow() > 3 then stopAudio(); startAudio(0) else playIndex(M.index - 1) end
    cb({ ok = true })
end)

RegisterNUICallback('phone:spotify:seek', function(data, cb)
    local t = math.floor((data and data.position) or 0)
    if M.nearby then TriggerServerEvent('oph3z-phone:server:spotify:nearbyControl', { action = 'seek', value = t })
    elseif exports.xsound:soundExists(LOCAL) then exports.xsound:setTimeStamp(LOCAL, t) end
    cb({ ok = true })
end)

RegisterNUICallback('phone:spotify:setVolume', function(data, cb)
    M.volume = math.max(0, math.min(100, tonumber(data and data.volume) or M.volume))
    if M.nearby then TriggerServerEvent('oph3z-phone:server:spotify:nearbyControl', { action = 'volume', value = M.volume })
    elseif exports.xsound:soundExists(LOCAL) then exports.xsound:setVolume(LOCAL, M.volume / 100) end
    cb({ ok = true })
end)

RegisterNUICallback('phone:spotify:setNearby', function(data, cb)
    if not CFG.AllowNearby then cb({ ok = false, reason = 'disabled' }); return end
    local on = data and data.on == true
    if on == M.nearby then cb({ ok = true, nearby = M.nearby }); return end
    local pos, wasPlaying = posNow(), M.playing
    stopAudio()
    M.nearby = on
    if M.track then
        startAudio(pos)
        if not wasPlaying then
            M.playing = false
            CreateThread(function()
                Wait(400)
                if M.nearby then TriggerServerEvent('oph3z-phone:server:spotify:nearbyControl', { action = 'pause' })
                elseif exports.xsound:soundExists(LOCAL) then exports.xsound:Pause(LOCAL) end
            end)
        end
    end
    pushTrack()
    cb({ ok = true, nearby = M.nearby })
end)

RegisterNUICallback('phone:spotify:stop', function(_, cb) playIndex(0); cb({ ok = true }) end)

-- Full snapshot so the NUI can restore its UI when the phone is (re)opened.
RegisterNUICallback('phone:spotify:state', function(_, cb)
    cb({
        ok = true, track = M.track, index = M.index, count = #M.queue, playing = M.playing,
        nearby = M.nearby, volume = M.volume, position = posNow(),
        hasNext = M.index < #M.queue, hasPrev = M.index > 1, allowNearby = CFG.AllowNearby == true,
    })
end)

-- ---- server bridges (search + library) ------------------------------------
local function bridge(nui, srv)
    RegisterNUICallback(nui, function(data, cb)
        cb(lib.callback.await(srv, false, data) or { ok = false })
    end)
end
bridge('phone:spotify:search',         'oph3z-phone:server:spotify:search')
bridge('phone:spotify:library',        'oph3z-phone:server:spotify:library')
bridge('phone:spotify:createPlaylist', 'oph3z-phone:server:spotify:createPlaylist')
bridge('phone:spotify:renamePlaylist', 'oph3z-phone:server:spotify:renamePlaylist')
bridge('phone:spotify:deletePlaylist', 'oph3z-phone:server:spotify:deletePlaylist')
bridge('phone:spotify:addTrack',       'oph3z-phone:server:spotify:addTrack')
bridge('phone:spotify:removeTrack',    'oph3z-phone:server:spotify:removeTrack')
bridge('phone:spotify:toggleLike',     'oph3z-phone:server:spotify:toggleLike')

-- Stop the music if the phone resource restarts.
AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() then stopAudio() end
end)

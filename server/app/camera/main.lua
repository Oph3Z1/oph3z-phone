local sessions = {}
local seq = 0

local function newId()
    seq = seq + 1
    return tostring(os.time()) .. '-' .. tostring(seq) .. '-' .. tostring(math.random(1000, 9999))
end

local function nearbyPlayers(src, range)
    local ped = GetPlayerPed(src)
    if not ped or ped == 0 then return { src } end
    local coords = GetEntityCoords(ped)
    local out = { src }
    for _, pid in ipairs(GetPlayers()) do
        local id = tonumber(pid)
        if id and id ~= src then
            local p = GetPlayerPed(id)
            if p and p ~= 0 then
                if #(coords - GetEntityCoords(p)) <= range then
                    out[#out + 1] = id
                end
            end
        end
    end
    return out
end

local function addParticipant(s, sid, id)
    if s.participants[id] then return end
    local offset = GetGameTimer() - s.startTimer
    if offset < 0 then offset = 0 end
    s.participants[id] = { offset = offset }
    s.order[#s.order + 1] = id
    TriggerClientEvent('oph3z-phone:client:camera:capStart', id, {
        sessionId = sid,
        recorder = s.recorder,
        range = s.range,
        gate = s.gate,
    })
    if Config.Debug then
        print(('^3[oph3z-phone] vrec %s: capturing player %s (offset %dms)^0'):format(sid, tostring(id), offset))
    end
end

local function complete(sessionId, url)
    local s = sessions[sessionId]
    if not s or s.finished then return end
    s.finished = true

    local finalUrl = (url and url ~= '') and url or s.videoUrl
    local cid = DB.GetCitizenId(s.recorder)
    local photo = cid and finalUrl and Photos.Add(cid, { url = finalUrl, type = 'video', duration = s.duration })
    TriggerClientEvent('oph3z-phone:client:camera:videoDone', s.recorder, { photo = photo or false, url = finalUrl })
    sessions[sessionId] = nil
end

local function finalize(sessionId)
    local s = sessions[sessionId]
    if not s or s.done then return end
    s.done = true
    if not s.videoUrl then sessions[sessionId] = nil; return end

    if Config.Debug then
        print(('^3[oph3z-phone] vrec %s: %d participant(s), %d voice clip(s) to mix^0'):format(sessionId, s.expected, #s.clips))
    end

    if #s.clips == 0 or Config.VideoAudio ~= 'nearby' then
        complete(sessionId, s.videoUrl)
        return
    end

    TriggerEvent('oph3z-phone:mux:run', sessionId, {
        ffmpeg = Config.FFmpegPath or 'ffmpeg',
        videoUrl = s.videoUrl,
        clips = s.clips,
        provider = Config.Camera,
    })

    CreateThread(function()
        Wait(30000)
        complete(sessionId, nil)
    end)
end

local function finalizeWhenReady(sessionId)
    CreateThread(function()
        local deadline = GetGameTimer() + 12000
        while true do
            local s = sessions[sessionId]
            if not s or s.done or s.reported >= s.expected or GetGameTimer() >= deadline then break end
            Wait(100)
        end
        finalize(sessionId)
    end)
end

RegisterCallback('oph3z-phone:server:camera:videoStart', function(source)
    if Config.VideoAudio ~= 'nearby' then return {} end
    local sid = newId()
    local range = (Config.VideoAudioRange or 12.0) + 0.0
    local s = {
        recorder = source,
        startTimer = GetGameTimer(),
        range = range,
        captureRange = range + 10.0,
        gate = Config.VideoAudioGate == true,
        participants = {},
        order = {},
        clips = {},
        reported = 0,
        reportedBy = {},
        expected = 0,
        scanning = true,
        done = false,
        finished = false,
    }
    sessions[sid] = s

    for _, id in ipairs(nearbyPlayers(source, s.captureRange)) do
        addParticipant(s, sid, id)
    end

    CreateThread(function()
        while true do
            local sess = sessions[sid]
            if not sess or not sess.scanning then break end
            for _, id in ipairs(nearbyPlayers(sess.recorder, sess.captureRange)) do
                addParticipant(sess, sid, id)
            end
            Wait(500)
        end
    end)

    return { sessionId = sid }
end)

RegisterNetEvent('oph3z-phone:server:camera:videoStop', function(sessionId, url, duration)
    local src = source
    local s = sessions[sessionId]
    if not s or s.recorder ~= src then return end
    s.scanning = false
    s.videoUrl = url
    s.duration = tonumber(duration) or 0

    local n = 0
    for _ in pairs(s.participants) do n = n + 1 end
    s.expected = n

    for _, id in ipairs(s.order) do
        TriggerClientEvent('oph3z-phone:client:camera:capStop', id, { sessionId = sessionId })
    end
    finalizeWhenReady(sessionId)
end)

RegisterNetEvent('oph3z-phone:server:camera:clip', function(sessionId, url)
    local src = source
    local s = sessions[sessionId]
    if not s or s.reportedBy[src] or not s.participants[src] then return end
    s.reportedBy[src] = true
    s.reported = s.reported + 1
    if url and url ~= '' then
        s.clips[#s.clips + 1] = { url = url, offset = s.participants[src].offset or 0 }
    end
end)

AddEventHandler('oph3z-phone:mux:done', function(sessionId, finalUrl)
    complete(sessionId, (finalUrl and finalUrl ~= false and finalUrl ~= '') and finalUrl or nil)
end)

AddEventHandler('playerDropped', function()
    local src = source
    for id, s in pairs(sessions) do
        if s.recorder == src then
            sessions[id] = nil
        end
    end
end)

Phone = Phone or {}
Phone.cameraActive = false

local HEAD_BONE = 31086
local frontCam = false
local photoMode = true
local selfTalkActive = false
local partTalkActive = false
local videoCam = nil
local videoFov = 52.0
local VIDEO_FOV_MIN, VIDEO_FOV_MAX = 22.0, 75.0
local VIDEO_REAR_DIST, VIDEO_SELFIE_DIST = 0.45, 0.5
local SELFIE_YAW, SELFIE_PITCH = 32.0, 20.0

local function setNativeFrontCam(on)
    Citizen.InvokeNative(0x2491A93618B7D838, on)
end

local function playPhonePose()
    local ped = PlayerPedId()
    RequestAnimDict('cellphone@')
    local t = 0
    while not HasAnimDictLoaded('cellphone@') and t < 1000 do Wait(10); t = t + 10 end
    if HasAnimDictLoaded('cellphone@') then
        TaskPlayAnim(ped, 'cellphone@', 'cellphone_photo_idle', 3.0, -1.0, -1, 49, 0, false, false, false)
    end
end

local function stopPhonePose()
    ClearPedSecondaryTask(PlayerPedId())
end

local function startVideoCam()
    if videoCam then return end
    videoFov = 52.0
    videoCam = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
    SetCamFov(videoCam, videoFov)
    RenderScriptCams(true, false, 0, true, true)
end

local function stopVideoCam()
    if not videoCam then return end
    RenderScriptCams(false, false, 0, true, true)
    DestroyCam(videoCam, false)
    videoCam = nil
end

local function dirFromRot(rot)
    local rz, rx = math.rad(rot.z), math.rad(rot.x)
    local cx = math.cos(rx)
    return -math.sin(rz) * cx, math.cos(rz) * cx, math.sin(rx)
end

local function updateVideoCam()
    if not videoCam then return end
    local ped = PlayerPedId()
    local head = GetPedBoneCoords(ped, HEAD_BONE, 0.0, 0.0, 0.0)

    if frontCam then
        local relH = math.max(-SELFIE_YAW, math.min(SELFIE_YAW, GetGameplayCamRelativeHeading()))
        local relP = math.max(-SELFIE_PITCH, math.min(SELFIE_PITCH, GetGameplayCamRelativePitch()))
        SetGameplayCamRelativeHeading(relH)
        SetGameplayCamRelativePitch(relP)

        local rot = GetGameplayCamRot(2)
        local fx, fy, fz = dirFromRot(rot)
        local d = VIDEO_SELFIE_DIST
        SetCamCoord(videoCam, head.x + fx * d, head.y + fy * d, head.z + fz * d + 0.03)
        PointCamAtCoord(videoCam, head.x, head.y, head.z)
    else
        StopCamPointing(videoCam)
        local rot = GetGameplayCamRot(2)
        local fx, fy, fz = dirFromRot(rot)
        local d = VIDEO_REAR_DIST
        SetCamCoord(videoCam, head.x + fx * d, head.y + fy * d, head.z + fz * d + 0.05)
        SetCamRot(videoCam, rot.x, rot.y, rot.z, 2)
    end
    SetCamFov(videoCam, videoFov)
end

local function applyCameraForMode()
    frontCam = false
    stopPhonePose()
    if photoMode then
        stopVideoCam()
        CreateMobilePhone(1)
        CellCamActivate(true, true)
        setNativeFrontCam(false)
    else
        CellCamActivate(false, false)
        DestroyMobilePhone()
        startVideoCam()
        playPhonePose()
    end
end

local function startControlBlocker()
    CreateThread(function()
        local plyId = PlayerId()
        while Phone.cameraActive do
            DisablePlayerFiring(plyId, true)
            DisableControlAction(0, 24, true)  
            DisableControlAction(0, 25, true)
            DisableControlAction(0, 257, true) 
            DisableControlAction(0, 263, true) 
            DisableControlAction(0, 140, true) 
            DisableControlAction(0, 142, true) 
            DisableControlAction(0, 14, true)  
            DisableControlAction(0, 15, true)  

            if not IsDisabledControlPressed(0, 25) then
                DisableControlAction(0, 1, true)
                DisableControlAction(0, 2, true)
            end

            if photoMode then
                DisableControlAction(0, 30, true)
                DisableControlAction(0, 31, true)
                DisableControlAction(0, 21, true)
                DisableControlAction(0, 22, true)
                DisableControlAction(0, 32, true)
                DisableControlAction(0, 33, true)
                DisableControlAction(0, 34, true)
                DisableControlAction(0, 35, true)
            else
                DisableControlAction(0, 241, true)
                DisableControlAction(0, 242, true)
                if IsDisabledControlPressed(0, 241) then
                    videoFov = math.max(videoFov - 1.5, VIDEO_FOV_MIN)
                elseif IsDisabledControlPressed(0, 242) then
                    videoFov = math.min(videoFov + 1.5, VIDEO_FOV_MAX)
                end
                updateVideoCam()
            end
            Wait(0)
        end
    end)
end

local function enterCamera()
    if Phone.cameraActive then return end
    Phone.cameraActive = true

    photoMode = true
    frontCam = false
    applyCameraForMode()

    SetNuiFocusKeepInput(true)
    startControlBlocker()
end

local function exitCamera()
    if not Phone.cameraActive then return end
    Phone.cameraActive = false

    stopVideoCam()
    stopPhonePose()
    CellCamActivate(false, false)
    DestroyMobilePhone()
    SetNuiFocusKeepInput(false)

    if Phone.isOpen and Phone.startAnim then
        Phone.startAnim()
    end
end

RegisterNUICallback('phone:camera:enter', function(_, cb)
    enterCamera()
    cb({
        camera = Config.Camera,
        video = { mode = Config.VideoAudio or 'off', gate = Config.VideoAudioGate == true },
    })
end)

RegisterNUICallback('phone:camera:exit', function(_, cb)
    exitCamera()
    cb('ok')
end)

RegisterNUICallback('phone:camera:mode', function(data, cb)
    photoMode = not (data and data.mode == 'video')
    if Phone.cameraActive then applyCameraForMode() end
    cb('ok')
end)

RegisterNUICallback('phone:camera:framing', function(data, cb)
    if Phone.cameraActive then
        SetNuiFocusKeepInput(data and data.active == true)
    end
    cb('ok')
end)

RegisterNUICallback('phone:camera:flip', function(_, cb)
    frontCam = not frontCam
    if photoMode then
        setNativeFrontCam(frontCam)
    elseif frontCam then
        SetGameplayCamRelativeHeading(0.0)
        SetGameplayCamRelativePitch(0.0)
    end

    cb({ front = frontCam })
end)

RegisterNUICallback('phone:camera:save', function(data, cb)
    if not data or not data.url then cb(false); return end
    local photo = TriggerCallback('oph3z-phone:server:photos:add', {
        url = data.url,
        type = data.type,
        duration = data.duration,
    })
    cb(photo or false)
end)

local function isTalking()
    local v = NetworkIsPlayerTalking(PlayerId())
    return v == true or v == 1
end

local function startSelfTalk()
    if selfTalkActive then return end
    selfTalkActive = true
    CreateThread(function()
        local last = nil
        while selfTalkActive do
            local talking = isTalking()
            if talking ~= last then
                last = talking
                SendNUIMessage({ action = 'phone:camera:talk', data = { talking = talking } })
            end
            Wait(150)
        end
    end)
end

RegisterNUICallback('phone:camera:videoStart', function(data, cb)
    local mode = data and data.mode or 'off'
    if mode == 'self' then
        if data and data.gate then startSelfTalk() end
        cb({})
    elseif mode == 'nearby' then
        local res = TriggerCallback('oph3z-phone:server:camera:videoStart')
        cb(res or {})
    else
        cb({})
    end
end)

RegisterNUICallback('phone:camera:videoStop', function(data, cb)
    selfTalkActive = false
    local sid = data and data.sessionId
    if sid then
        TriggerServerEvent('oph3z-phone:server:camera:videoStop', sid, data and data.url, data and data.duration)
    end
    cb('ok')
end)

RegisterNUICallback('phone:camera:clipReady', function(data, cb)
    local sid = data and data.sessionId
    if sid then
        TriggerServerEvent('oph3z-phone:server:camera:clip', sid, data and data.url)
    end
    cb('ok')
end)

RegisterNetEvent('oph3z-phone:client:camera:capStart', function(payload)
    if not payload or not payload.sessionId then return end
    SendNUIMessage({ action = 'phone:vrec:capture', data = {
        sessionId = payload.sessionId,
        gate = true,
        cfg = Config.Camera,
    } })

    partTalkActive = true
    local recorderSrc = payload.recorder
    local range = (payload.range or 12.0) + 0.0
    local useTalk = payload.gate == true
    CreateThread(function()
        local last = nil
        while partTalkActive do
            local open = false
            local rIdx = recorderSrc and GetPlayerFromServerId(recorderSrc) or -1
            if rIdx ~= -1 then
                local rPed = GetPlayerPed(rIdx)
                local myPed = PlayerPedId()
                if rPed and rPed ~= 0 and myPed and myPed ~= 0 then
                    if #(GetEntityCoords(myPed) - GetEntityCoords(rPed)) <= range then
                        open = (not useTalk) or isTalking()
                    end
                end
            end
            if open ~= last then
                last = open
                SendNUIMessage({ action = 'phone:vrec:gate', data = { open = open } })
            end
            Wait(120)
        end
    end)
end)

RegisterNetEvent('oph3z-phone:client:camera:capStop', function(payload)
    partTalkActive = false
    SendNUIMessage({ action = 'phone:vrec:stop', data = { sessionId = payload and payload.sessionId } })
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        selfTalkActive = false
        partTalkActive = false
        exitCamera()
    end
end)
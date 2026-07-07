Phone = Phone or {}
Phone.cameraActive = false

local HEAD_BONE = 31086
local frontCam = false
local photoMode = true
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
    cb({ camera = Config.Camera })
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

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        exitCamera()
    end
end)
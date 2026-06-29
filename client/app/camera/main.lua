Phone = Phone or {}
Phone.cameraActive = false

local HEAD_BONE = 31086
local frontCam = false   -- false = rear (POV), true = selfie (faces the player)
local photoMode = true   -- true = photo, false = video
local videoCam = nil     -- scripted camera used in video mode
local videoFov = 52.0    -- current video zoom (FOV); scroll changes it
local VIDEO_FOV_MIN, VIDEO_FOV_MAX = 22.0, 75.0
-- How far the video cam sits from the head (metres). Rear must be PAST the raised
-- phone so the held phone model doesn't block the forward view.
local VIDEO_REAR_DIST, VIDEO_SELFIE_DIST = 0.45, 0.5
-- Selfie can only swing this far (degrees) from straight-in-front (not 360°).
local SELFIE_YAW, SELFIE_PITCH = 32.0, 20.0

-- Native: toggle the phone's front (selfie) camera. 0x2491A93618B7D838.
local function setNativeFrontCam(on)
    Citizen.InvokeNative(0x2491A93618B7D838, on)
end

-- Phone-up pose (arm raised holding the phone), used the whole time in video mode
-- so others see you filming. Upper-body + movement-allowed flag (49) so you can
-- still walk while posing. Cleared with stopPhonePose.
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

-- Scripted first-person-ish camera for video (lets the player move while filming).
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

-- Each frame in video mode: place the cam just ahead of the head, looking where
-- the player aims (the gameplay cam still tracks the mouse under the script cam).
-- Forward direction (x,y,z) from a camera rotation.
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
        -- Selfie: clamp the cam to a small swing around the FRONT of the character
        -- (relative to the body), so right-click can only turn it a little, not 360°.
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
        -- Rear: cam at the raised phone (past it so it doesn't block), looking forward.
        -- StopCamPointing first, or the selfie's PointCamAtCoord stays locked on.
        StopCamPointing(videoCam)
        local rot = GetGameplayCamRot(2)
        local fx, fy, fz = dirFromRot(rot)
        local d = VIDEO_REAR_DIST
        SetCamCoord(videoCam, head.x + fx * d, head.y + fy * d, head.z + fz * d + 0.05)
        SetCamRot(videoCam, rot.x, rot.y, rot.z, 2)
    end
    SetCamFov(videoCam, videoFov)
end

-- Apply the right camera for the current mode.
local function applyCameraForMode()
    frontCam = false -- each mode starts on the rear camera
    stopPhonePose()  -- clear any pose from the previous mode
    if photoMode then
        -- Photo: native phone camera (framed POV; player rooted; RMB-rotate+zoom).
        stopVideoCam()
        CreateMobilePhone(1)
        CellCamActivate(true, true)
        setNativeFrontCam(false)
    else
        -- Video: scripted cam so the player can walk + look while filming, with a
        -- phone-up pose the whole time so others see you recording.
        CellCamActivate(false, false)
        DestroyMobilePhone() -- remove the held phone model so it can't block the view
        startVideoCam()
        playPhonePose()
    end
end

-- While the camera is open: never fire a weapon. In BOTH modes the view only
-- rotates while holding RIGHT MOUSE (so plain mouse movement just drives the
-- cursor — no twitchy auto-rotate). PHOTO = no walking; VIDEO = walk/run allowed.
local function startControlBlocker()
    CreateThread(function()
        local plyId = PlayerId()
        while Phone.cameraActive do
            DisablePlayerFiring(plyId, true)
            DisableControlAction(0, 24, true)  -- attack (LMB)
            DisableControlAction(0, 25, true)  -- aim (RMB) — used as the rotate gate
            DisableControlAction(0, 257, true) -- attack2
            DisableControlAction(0, 263, true) -- melee
            DisableControlAction(0, 140, true) -- melee light
            DisableControlAction(0, 142, true) -- melee alt
            DisableControlAction(0, 14, true)  -- weapon wheel up (scroll)
            DisableControlAction(0, 15, true)  -- weapon wheel down (scroll)

            -- Rotate only while holding right mouse; otherwise lock the look.
            if not IsDisabledControlPressed(0, 25) then
                DisableControlAction(0, 1, true) -- look LR
                DisableControlAction(0, 2, true) -- look UD
            end

            if photoMode then
                DisableControlAction(0, 30, true) -- move LR
                DisableControlAction(0, 31, true) -- move UD
                DisableControlAction(0, 21, true) -- sprint
                DisableControlAction(0, 22, true) -- jump
                DisableControlAction(0, 32, true) -- W
                DisableControlAction(0, 33, true) -- S
                DisableControlAction(0, 34, true) -- A
                DisableControlAction(0, 35, true) -- D
            else
                -- Scroll wheel zooms the video camera (FOV).
                DisableControlAction(0, 241, true) -- cursor scroll up
                DisableControlAction(0, 242, true) -- cursor scroll down
                if IsDisabledControlPressed(0, 241) then
                    videoFov = math.max(videoFov - 1.5, VIDEO_FOV_MIN)
                elseif IsDisabledControlPressed(0, 242) then
                    videoFov = math.min(videoFov + 1.5, VIDEO_FOV_MAX)
                end
                updateVideoCam() -- keep the scripted cam at the head, facing the look dir
            end
            Wait(0)
        end
    end)
end

-- Camera mode lifecycle -------------------------------------------------------
local function enterCamera()
    if Phone.cameraActive then return end
    Phone.cameraActive = true

    photoMode = true
    frontCam = false
    applyCameraForMode() -- open on the rear photo camera

    SetNuiFocusKeepInput(true) -- so zoom + rotate + movement input reach the game
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

    -- The native cam cleared the ped's task, so re-raise the phone hold pose if
    -- the phone is still open (otherwise the character drops it on close).
    if Phone.isOpen and Phone.startAnim then
        Phone.startAnim()
    end
end

-- NUI bridge ------------------------------------------------------------------
RegisterNUICallback('phone:camera:enter', function(_, cb)
    enterCamera()
    -- Hand the NUI the upload provider config (it uploads client-side; FiveM's
    -- server PerformHttpRequest mangles binary, so we can't upload server-side).
    cb({ camera = Config.Camera })
end)

RegisterNUICallback('phone:camera:exit', function(_, cb)
    exitCamera()
    cb('ok')
end)

-- PHOTO = native cam (rooted, RMB-rotate); VIDEO = scripted cam (free move + look).
RegisterNUICallback('phone:camera:mode', function(data, cb)
    photoMode = not (data and data.mode == 'video')
    if Phone.cameraActive then applyCameraForMode() end
    cb('ok')
end)

-- Flip rear/front (selfie). Photo uses the native selfie; video repositions the
-- scripted cam to face the player (handled in updateVideoCam via `frontCam`).
RegisterNUICallback('phone:camera:flip', function(_, cb)
    frontCam = not frontCam
    if photoMode then
        setNativeFrontCam(frontCam)
    elseif frontCam then
        -- Entering video selfie: snap the angle to straight in front of the player.
        SetGameplayCamRelativeHeading(0.0)
        SetGameplayCamRelativePitch(0.0)
    end
    -- Video keeps the phone-up pose in both rear and selfie; only the cam moves.
    cb({ front = frontCam })
end)

-- Save an already-uploaded photo/video URL into the Photos library.
RegisterNUICallback('phone:camera:save', function(data, cb)
    if not data or not data.url then cb(false); return end
    local photo = lib.callback.await('oph3z-phone:server:photos:add', false, {
        url = data.url,
        type = data.type,
        duration = data.duration,
    })
    cb(photo or false)
end)

-- Safety cleanup.
AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        exitCamera()
    end
end)

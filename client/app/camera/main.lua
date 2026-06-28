--[[
    oph3z-phone | Camera app — CLIENT

    Uses GTA's NATIVE phone camera (CreateMobilePhone + CellCamActivate). Rear =
    the character's forward POV, front = the native selfie (flip). The live frame
    is rendered into the phone screen by the NUI (gamerender.js / CfxTexture), and
    photo/video CAPTURE is done from that canvas in the NUI (so it saves exactly
    the phone view) — this file just toggles the camera and saves the final URL.

    PHOTO mode uses the native phone camera (framed POV, but it ROOTS the player),
    with RMB-to-rotate + scroll-to-zoom. VIDEO mode switches to a first-person
    gameplay camera so the player can WALK/RUN and look around 360° while filming
    (the native phone cam can't move). keep-input is on so game input gets through.
--]]

Phone = Phone or {}
Phone.cameraActive = false

local frontCam = false      -- false = rear (POV), true = native selfie (photo only)
local photoMode = true      -- true = photo, false = video
local prevViewMode = nil    -- player's view mode before we forced first-person (video)

-- Native: toggle the phone's front (selfie) camera. 0x2491A93618B7D838.
local function setNativeFrontCam(on)
    Citizen.InvokeNative(0x2491A93618B7D838, on)
end

-- Apply the right camera for the current mode.
local function applyCameraForMode()
    if photoMode then
        -- Photo: native phone camera (framed POV; player rooted; RMB-rotate+zoom).
        if prevViewMode ~= nil then
            SetFollowPedCamViewMode(prevViewMode)
            prevViewMode = nil
        end
        CellCamActivate(true, true)
        setNativeFrontCam(frontCam)
    else
        -- Video: first-person gameplay camera so the player can walk + look 360°.
        CellCamActivate(false, false)
        if prevViewMode == nil then prevViewMode = GetFollowPedCamViewMode() end
        SetFollowPedCamViewMode(4) -- first person
    end
end

-- While the camera is open: never fire a weapon. PHOTO mode = rotate only while
-- holding right mouse, and no movement. VIDEO mode = normal look + movement.
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

            if photoMode then
                -- Rotate only while holding right mouse; otherwise lock the view.
                if not IsDisabledControlPressed(0, 25) then
                    DisableControlAction(0, 1, true) -- look LR
                    DisableControlAction(0, 2, true) -- look UD
                end
                -- No walking in photo mode.
                DisableControlAction(0, 30, true) -- move LR
                DisableControlAction(0, 31, true) -- move UD
                DisableControlAction(0, 21, true) -- sprint
                DisableControlAction(0, 22, true) -- jump
                DisableControlAction(0, 32, true) -- W
                DisableControlAction(0, 33, true) -- S
                DisableControlAction(0, 34, true) -- A
                DisableControlAction(0, 35, true) -- D
            end
            Wait(0)
        end
    end)
end

-- Camera mode lifecycle -------------------------------------------------------
local function enterCamera()
    if Phone.cameraActive then return end
    Phone.cameraActive = true

    CreateMobilePhone(1)
    photoMode = true
    frontCam = false
    applyCameraForMode() -- open on the rear photo camera

    SetNuiFocusKeepInput(true) -- so zoom + rotate + movement input reach the game
    startControlBlocker()
end

local function exitCamera()
    if not Phone.cameraActive then return end
    Phone.cameraActive = false

    CellCamActivate(false, false)
    DestroyMobilePhone()
    if prevViewMode ~= nil then
        SetFollowPedCamViewMode(prevViewMode)
        prevViewMode = nil
    end
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

-- PHOTO = native cam (rooted, RMB-rotate); VIDEO = first-person (free move + look).
RegisterNUICallback('phone:camera:mode', function(data, cb)
    photoMode = not (data and data.mode == 'video')
    if Phone.cameraActive then applyCameraForMode() end
    cb('ok')
end)

-- Selfie flip is photo-only (the native selfie needs the native phone camera).
RegisterNUICallback('phone:camera:flip', function(_, cb)
    if not photoMode then cb({ front = false }); return end
    frontCam = not frontCam
    setNativeFrontCam(frontCam)
    cb({ front = frontCam })
end)

-- Save an already-uploaded photo/video URL into the Photos library.
RegisterNUICallback('phone:camera:save', function(data, cb)
    if not data or not data.url then cb(false); return end
    local photo = lib.callback.await('oph3z-phone:server:photos:add', false, {
        url = data.url,
        type = data.type,
    })
    cb(photo or false)
end)

-- Safety cleanup.
AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        exitCamera()
    end
end)

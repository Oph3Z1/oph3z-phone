Phone = Phone or {}
Phone.videoCall = nil

local HEAD_BONE = 31086
local vcCam = nil
local vcFront = true
local vcFov = 50.0
local VC_REAR_DIST, VC_SELFIE_DIST = 0.45, 0.5
local SELFIE_YAW, SELFIE_PITCH = 32.0, 20.0

local function dirFromRot(rot)
    local rz, rx = math.rad(rot.z), math.rad(rot.x)
    local cx = math.cos(rx)
    return -math.sin(rz) * cx, math.cos(rz) * cx, math.sin(rx)
end

local function vcUpdate()
    if not vcCam then return end
    local ped = PlayerPedId()
    local head = GetPedBoneCoords(ped, HEAD_BONE, 0.0, 0.0, 0.0)
    if vcFront then
        local relH = math.max(-SELFIE_YAW, math.min(SELFIE_YAW, GetGameplayCamRelativeHeading()))
        local relP = math.max(-SELFIE_PITCH, math.min(SELFIE_PITCH, GetGameplayCamRelativePitch()))
        SetGameplayCamRelativeHeading(relH)
        SetGameplayCamRelativePitch(relP)
        local rot = GetGameplayCamRot(2)
        local fx, fy, fz = dirFromRot(rot)
        local d = VC_SELFIE_DIST
        SetCamCoord(vcCam, head.x + fx * d, head.y + fy * d, head.z + fz * d + 0.03)
        PointCamAtCoord(vcCam, head.x, head.y, head.z)
    else
        StopCamPointing(vcCam)
        local rot = GetGameplayCamRot(2)
        local fx, fy, fz = dirFromRot(rot)
        local d = VC_REAR_DIST
        SetCamCoord(vcCam, head.x + fx * d, head.y + fy * d, head.z + fz * d + 0.05)
        SetCamRot(vcCam, rot.x, rot.y, rot.z, 2)
    end
    SetCamFov(vcCam, vcFov)
end

local function vcBlocker()
    CreateThread(function()
        local plyId = PlayerId()
        while Phone.videoCall and Phone.videoCall.active do
            DisablePlayerFiring(plyId, true)
            DisableControlAction(0, 24, true)
            DisableControlAction(0, 25, true)
            DisableControlAction(0, 257, true)
            DisableControlAction(0, 263, true)
            DisableControlAction(0, 140, true)
            DisableControlAction(0, 141, true)
            DisableControlAction(0, 142, true)
            if not IsDisabledControlPressed(0, 25) then
                DisableControlAction(0, 1, true)
                DisableControlAction(0, 2, true)
            end
            vcUpdate()
            Wait(0)
        end
    end)
end

local function vcStartCam()
    if vcCam then return end
    vcFront = true
    vcCam = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
    SetCamFov(vcCam, vcFov)
    RenderScriptCams(true, false, 0, true, true)
    RequestAnimDict('cellphone@')
    local t = 0
    while not HasAnimDictLoaded('cellphone@') and t < 1000 do Wait(10); t = t + 10 end
    if HasAnimDictLoaded('cellphone@') then
        TaskPlayAnim(PlayerPedId(), 'cellphone@', 'cellphone_photo_idle', 3.0, -1.0, -1, 49, 0, false, false, false)
    end
    vcBlocker()
end

local function vcStopCam()
    if vcCam then
        RenderScriptCams(false, false, 0, true, true)
        DestroyCam(vcCam, false)
        vcCam = nil
    end
    ClearPedSecondaryTask(PlayerPedId())
end

local function startVideoCall(callId, role)
    if Phone.videoCall and Phone.videoCall.active then return end
    Phone.videoCall = { callId = callId, active = true }
    Phone.inCallAnim = false
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(true)
    vcStartCam()
    SendNUIMessage({ action = 'phone:video:start', data = {
        callId = callId,
        role = role,
        ice = (Config.VideoCall and Config.VideoCall.IceServers) or {},
    } })
end

local function stopVideoCall(notifyNui)
    if not Phone.videoCall then return end
    Phone.videoCall = nil
    vcStopCam()
    SetNuiFocusKeepInput(false)
    local onActiveCall = Phone.call ~= nil and Phone.call.state == 'active'
    if Phone.isOpen then
        SetNuiFocus(true, true)
        if onActiveCall and Phone.startCallAnim then
            Phone.startCallAnim()
        elseif Phone.startAnim then
            Phone.startAnim()
        end
    else
        SetNuiFocus(false, false)
        if onActiveCall and Phone.startCallAnim then
            Phone.startCallAnim()
        end
    end
    if notifyNui ~= false then
        SendNUIMessage({ action = 'phone:video:stop', data = {} })
    end
end

RegisterNetEvent('oph3z-phone:video:start', function(data)
    if not data or not data.callId then return end
    startVideoCall(data.callId, data.role)
end)

RegisterNetEvent('oph3z-phone:video:stop', function()
    stopVideoCall(true)
end)

RegisterNetEvent('oph3z-phone:video:signal', function(callId, blob)
    SendNUIMessage({ action = 'phone:video:signal', data = { callId = callId, blob = blob } })
end)

RegisterNetEvent('oph3z-phone:video:request', function(data)
    SendNUIMessage({ action = 'phone:video:request', data = { callId = data and data.callId } })
end)

RegisterNetEvent('oph3z-phone:video:declined', function()
    SendNUIMessage({ action = 'phone:video:declined', data = {} })
end)

RegisterNetEvent('oph3z-phone:call:ended', function()
    stopVideoCall(true)
end)

RegisterNetEvent('oph3z-phone:call:failed', function()
    stopVideoCall(true)
end)

RegisterNUICallback('phone:video:signal', function(data, cb)
    if data and data.callId then
        TriggerServerEvent('oph3z-phone:video:signal', data.callId, data.blob)
    end
    cb('ok')
end)

RegisterNUICallback('phone:video:request', function(data, cb)
    if data and data.callId then
        TriggerServerEvent('oph3z-phone:video:request', data.callId)
    end
    cb('ok')
end)

RegisterNUICallback('phone:video:accept', function(data, cb)
    if data and data.callId then
        TriggerServerEvent('oph3z-phone:video:accept', data.callId)
    end
    cb('ok')
end)

RegisterNUICallback('phone:video:decline', function(data, cb)
    if data and data.callId then
        TriggerServerEvent('oph3z-phone:video:decline', data.callId)
    end
    cb('ok')
end)

RegisterNUICallback('phone:video:stop', function(data, cb)
    if data and data.callId then
        TriggerServerEvent('oph3z-phone:video:stop', data.callId)
    end
    cb('ok')
end)

RegisterNUICallback('phone:video:flip', function(_, cb)
    vcFront = not vcFront
    if vcFront then
        SetGameplayCamRelativeHeading(0.0)
        SetGameplayCamRelativePitch(0.0)
    end
    cb({ front = vcFront })
end)

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() then
        stopVideoCall(false)
    end
end)
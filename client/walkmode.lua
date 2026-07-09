local walkMode = false
local suppressPauseUntil = 0

local function setWalk(on)
    walkMode = on and true or false
    SetNuiFocusKeepInput(walkMode)
    if not walkMode then
        suppressPauseUntil = GetGameTimer() + 400
    end
end

RegisterNUICallback('phone:walk:toggle', function(_, cb)
    if Phone and Phone.isOpen and not Phone.cameraActive and not (Phone.videoCall and Phone.videoCall.active) then
        setWalk(not walkMode)
    end
    cb('ok')
end)

local function blockPauseMenu()
    DisableControlAction(0, 199, true)
    DisableControlAction(0, 200, true)
    if IsPauseMenuActive() then
        SetPauseMenuActive(false)
    end
end

CreateThread(function()
    local plyId = PlayerId()
    while true do
        if walkMode and Phone and Phone.isOpen then
            DisablePlayerFiring(plyId, true)
            DisableControlAction(0, 24, true)
            DisableControlAction(0, 25, true)
            DisableControlAction(0, 257, true)
            DisableControlAction(0, 263, true)
            DisableControlAction(0, 264, true)
            DisableControlAction(0, 140, true)
            DisableControlAction(0, 141, true)
            DisableControlAction(0, 142, true)
            DisableControlAction(0, 143, true)
            blockPauseMenu()
            Wait(0)
        elseif walkMode then
            setWalk(false)
            Wait(0)
        elseif GetGameTimer() < suppressPauseUntil then
            blockPauseMenu()
            Wait(0)
        else
            Wait(200)
        end
    end
end)

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() and walkMode then
        SetNuiFocusKeepInput(false)
    end
end)
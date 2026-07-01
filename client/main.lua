--[[
    oph3z-phone | Client entry point

    Owns the open/close lifecycle: NUI focus, telling the React app to show/hide,
    streaming the in-game clock while open, and the keybind / command / item hooks.
--]]

Phone = Phone or {}
Phone.isOpen = false

local timeThread = nil

---Push the current time/weather to the NUI.
local function sendTime()
    SendNUIMessage({ action = 'phone:time', data = Phone.getTimeData() })
end

---Start a lightweight loop that streams the clock while the phone is open.
local function startTimeLoop()
    if timeThread then return end
    timeThread = true
    CreateThread(function()
        while Phone.isOpen do
            sendTime()
            Wait(1000)
        end
        timeThread = nil
    end)
end

-- ===========================================================================
-- Phone prop + character animation
-- (kept in main.lua so it always loads with the lifecycle that calls it)
-- ===========================================================================
local propEntity = nil

-- Fixed tunables (kept out of config to keep it lean).
local PROP_BONE = 28422 -- SKEL_R_Hand
local ANIM = {
    dict = 'cellphone@',
    enter = 'cellphone_text_in',
    idle = 'cellphone_text_read_base',
    exit = 'cellphone_text_out',
}
local FLASHLIGHT = {
    color = { r = 255, g = 250, b = 235 },
    forward = -0.4, distance = 25.0, brightness = 3.0, radius = 11.0, falloff = 28.0, tilt = -0.10,
}
local SCREEN_GLOW = { color = { r = 150, g = 180, b = 255 }, range = 0.7, intensity = 2.0 }

local function loadAnimDict(dict)
    if HasAnimDictLoaded(dict) then return true end
    RequestAnimDict(dict)
    local timeout = 0
    while not HasAnimDictLoaded(dict) and timeout < 1000 do
        Wait(10)
        timeout = timeout + 10
    end
    return HasAnimDictLoaded(dict)
end

local function loadModel(model)
    local hash = type(model) == 'number' and model or joaat(model)
    if HasModelLoaded(hash) then return hash end
    RequestModel(hash)
    local timeout = 0
    while not HasModelLoaded(hash) and timeout < 1000 do
        Wait(10)
        timeout = timeout + 10
    end
    return HasModelLoaded(hash) and hash or nil
end

local function attachProp(ped)
    if propEntity then return end
    local hash = loadModel(Config.PropModel)
    if not hash then return end

    local coords = GetEntityCoords(ped)
    propEntity = CreateObject(hash, coords.x, coords.y, coords.z, true, true, false)

    AttachEntityToEntity(
        propEntity, ped, GetPedBoneIndex(ped, PROP_BONE),
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        true, true, false, true, 1, true
    )
    SetModelAsNoLongerNeeded(hash)
end

local function removeProp()
    if propEntity and DoesEntityExist(propEntity) then
        DeleteEntity(propEntity)
    end
    propEntity = nil
end

---Raise the phone and hold the idle pose.
function Phone.startAnim()
    if not Config.UseProp then return end
    local ped = PlayerPedId()
    CreateThread(function()
        if loadAnimDict(ANIM.dict) then
            TaskPlayAnim(ped, ANIM.dict, ANIM.enter, 3.0, -1.0, -1, 50, 0, false, false, false)
            Wait(400)
            if Phone.isOpen then
                TaskPlayAnim(ped, ANIM.dict, ANIM.idle, 3.0, -1.0, -1, 49, 0, false, false, false)
            end
        end
        attachProp(ped)
    end)
end

---Lower the phone and clean up the prop.
function Phone.stopAnim()
    if not Config.UseProp then return end
    local ped = PlayerPedId()
    CreateThread(function()
        if loadAnimDict(ANIM.dict) then
            TaskPlayAnim(ped, ANIM.dict, ANIM.exit, 3.0, -1.0, -1, 50, 0, false, false, false)
            Wait(550)
        end
        removeProp()
        StopAnimTask(ped, ANIM.dict, ANIM.exit, 3.0)
        ClearPedSecondaryTask(ped)
    end)
end

-- ===========================================================================
-- Flashlight (real spotlight beam from the phone, while the phone is open)
-- ===========================================================================
Phone.flashlightOn = false
local flashThread = false

---Toggle the flashlight on/off. The beam only renders while the phone is open.
function Phone.setFlashlight(on)
    Phone.flashlightOn = on and true or false

    if Phone.flashlightOn and not flashThread then
        flashThread = true
        local c = FLASHLIGHT.color
        CreateThread(function()
            while Phone.flashlightOn and Phone.isOpen do
                local ped = PlayerPedId()
                -- Base point = the phone prop (or hand if the prop isn't spawned).
                local base
                if propEntity and DoesEntityExist(propEntity) then
                    base = GetEntityCoords(propEntity)
                else
                    base = GetPedBoneCoords(ped, PROP_BONE, 0.0, 0.0, 0.0)
                end
                -- Direction = where the phone/body faces (static, not the camera).
                local fwd = GetEntityForwardVector(ped)
                -- Start the beam slightly in front of the body so it never
                -- lights the player's face, and the pool reads as "from the phone".
                local ox = base.x + fwd.x * FLASHLIGHT.forward
                local oy = base.y + fwd.y * FLASHLIGHT.forward
                local oz = base.z
                local dir = vec3(fwd.x, fwd.y, fwd.z + FLASHLIGHT.tilt)
                DrawSpotLight(
                    ox, oy, oz,
                    dir.x, dir.y, dir.z,
                    c.r, c.g, c.b,
                    FLASHLIGHT.distance, FLASHLIGHT.brightness,
                    0.0, FLASHLIGHT.radius, FLASHLIGHT.falloff
                )
                Wait(0)
            end
            flashThread = false
        end)
    end
end

-- ===========================================================================
-- Screen glow (soft light on the player's face while the phone is open)
-- ===========================================================================
local glowThread = false

local function startScreenGlow()
    if glowThread then return end
    glowThread = true
    local c = SCREEN_GLOW.color
    CreateThread(function()
        while Phone.isOpen do
            local ped = PlayerPedId()
            -- Slightly above the hand, toward the face.
            local pos = GetPedBoneCoords(ped, PROP_BONE, 0.0, 0.05, 0.12)
            DrawLightWithRange(
                pos.x, pos.y, pos.z,
                c.r, c.g, c.b,
                SCREEN_GLOW.range, SCREEN_GLOW.intensity
            )
            Wait(0)
        end
        glowThread = false
    end)
end

---Open the phone: fetch the player's data once, focus NUI, show the app.
function Phone.open()
    if Phone.isOpen then return end
    if not Phone.hasItem() then
        exports.qbx_core:Notify('You don\'t have a phone.', 'error')
        return
    end

    local data = lib.callback.await('oph3z-phone:server:getData', false)
    if not data then
        Phone.dbg('failed to load phone data')
        return
    end

    Phone.isOpen = true
    Phone.identity = {
        number    = data.number,
        numberRaw = data.numberRaw,
        citizenid = data.citizenid,
    }
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'phone:setVisible',
        data = {
            visible  = true,
            settings = data.settings,
            time     = Phone.getTimeData(),
            apps     = Config.Apps,     -- built-in app layout (config-driven)
            identity = Phone.identity,  -- shared with third-party app iframes
        },
    })
    if PhoneApps then PhoneApps.sync() end -- hand the NUI any registered third-party apps
    startTimeLoop()
    Phone.startAnim()
    startScreenGlow()
    Phone.dbg('opened')
end

---Close the phone: release NUI focus and hide the app.
function Phone.close()
    if not Phone.isOpen then return end
    Phone.isOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'phone:setVisible', data = { visible = false } })
    Phone.setFlashlight(false)
    Phone.stopAnim()
    Phone.dbg('closed')
end

function Phone.toggle()
    if Phone.isOpen then Phone.close() else Phone.open() end
end

-- Keybind -------------------------------------------------------------------
RegisterCommand('+oph3z_phone', function() Phone.toggle() end, false)
RegisterCommand('-oph3z_phone', function() end, false)
RegisterKeyMapping('+oph3z_phone', 'Open / close phone', 'keyboard', Config.Keybind)

-- Chat command (QoL / dev) --------------------------------------------------
RegisterCommand(Config.Command, function() Phone.toggle() end, false)

-- Dev command to toggle airplane mode (will become a Settings toggle later).
RegisterCommand('airplane', function()
    local on = lib.callback.await('oph3z-phone:server:phone:toggleAirplane', false)
    SendNUIMessage({ action = 'phone:settings', data = { airplane = on } })
    exports.qbx_core:Notify('Airplane mode: ' .. (on and 'ON' or 'OFF'), on and 'error' or 'success')
end, false)

-- ox_inventory item hook ----------------------------------------------------
-- Add an item named Config.ItemName to ox_inventory with:
--   client = { export = 'oph3z-phone.usePhone' }
exports('usePhone', function()
    Phone.open()
end)

-- ===========================================================================
-- Calls (client)
-- ===========================================================================
Phone.call = nil
local mutedRemote = {}      -- serverId -> true (players we locally muted for this call)

local function callMsg(payload)
    SendNUIMessage({ action = 'phone:call', data = payload })
end

-- Open the phone UI specifically to present an incoming call (when closed).
local function showPhoneForCall()
    if Phone.isOpen then return false end
    Phone.isOpen = true
    Phone.openedByCall = true
    SetNuiFocus(true, true)
    local data = lib.callback.await('oph3z-phone:server:getData', false)
    if data then
        Phone.identity = { number = data.number, numberRaw = data.numberRaw, citizenid = data.citizenid }
    end
    SendNUIMessage({
        action = 'phone:setVisible',
        data = {
            visible  = true,
            settings = data and data.settings,
            time     = Phone.getTimeData(),
            apps     = Config.Apps,
            identity = Phone.identity,
        },
    })
    if PhoneApps then PhoneApps.sync() end
    startTimeLoop()
    Phone.startAnim()
    startScreenGlow()
    return true
end

-- Undo any local mutes we applied for the remote party.
local function clearRemoteMutes()
    for tgt in pairs(mutedRemote) do
        if exports['pma-voice']:isPlayerMuted(tgt) then
            exports['pma-voice']:toggleMutePlayer(tgt)
        end
    end
    mutedRemote = {}
end

local function localCallCleanup()
    clearRemoteMutes()
    if Phone.call and Phone.call.channel then
        exports['pma-voice']:setCallChannel(0)
    end
    local openedByCall = Phone.openedByCall
    Phone.call = nil
    Phone.openedByCall = nil
    -- If the phone only opened to show this call, close it again afterwards.
    if openedByCall then
        SetTimeout(1600, function()
            if not Phone.call then Phone.close() end
        end)
    end
end

RegisterNetEvent('oph3z-phone:call:incoming', function(data)
    if not data then return end
    local wasOpen = Phone.isOpen
    if not wasOpen then showPhoneForCall() end
    Phone.call = { callId = data.callId, role = 'callee', state = 'incoming' }
    callMsg({
        type = 'incoming', island = wasOpen,
        callId = data.callId, number = data.number, name = data.name, img = data.img,
    })

    CreateThread(function()
        local name = 'oph3z_ring_' .. data.callId
        while Phone.call and Phone.call.callId == data.callId and Phone.call.state == 'incoming' do
            if exports.xsound:soundExists(name) then
                exports.xsound:Position(name, GetEntityCoords(PlayerPedId()))
            end
            Wait(500)
        end
    end)
end)

RegisterNetEvent('oph3z-phone:call:outgoing', function(data)
    if not data then return end
    Phone.call = { callId = data.callId, role = 'caller', state = 'outgoing' }
    callMsg({ type = 'outgoing', callId = data.callId, number = data.number, name = data.name, img = data.img })
end)

RegisterNetEvent('oph3z-phone:call:connected', function(data)
    if not data or not Phone.call or Phone.call.callId ~= data.callId then return end
    Phone.call.state = 'active'
    Phone.call.channel = data.channel
    exports['pma-voice']:setCallChannel(data.channel)
    callMsg({ type = 'active', callId = data.callId })
end)

RegisterNetEvent('oph3z-phone:call:ended', function(data)
    callMsg({ type = 'ended', reason = data and data.reason })
    localCallCleanup()
end)

RegisterNetEvent('oph3z-phone:call:failed', function(data)
    callMsg({ type = 'failed', reason = data and data.reason })
    Phone.call = nil
end)

RegisterNetEvent('oph3z-phone:call:remoteMute', function(otherSrc, muted)
    Phone.dbg(('remoteMute received: other=%s muted=%s'):format(tostring(otherSrc), tostring(muted)))
    local isMuted = exports['pma-voice']:isPlayerMuted(otherSrc)
    if muted and not isMuted then
        exports['pma-voice']:toggleMutePlayer(otherSrc)
        mutedRemote[otherSrc] = true
    elseif (not muted) and isMuted then
        exports['pma-voice']:toggleMutePlayer(otherSrc)
        mutedRemote[otherSrc] = nil
    end
end)

-- Cleanup on resource stop --------------------------------------------------
AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    if Phone.isOpen then SetNuiFocus(false, false) end
    removeProp()
    if Phone.call and Phone.call.channel then
        exports['pma-voice']:setCallChannel(0)
    end
end)

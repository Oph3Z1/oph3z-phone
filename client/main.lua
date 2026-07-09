Phone = Phone or {}
Phone.isOpen = false
Phone.language = nil

function Phone.setLanguage(lang)
    if type(lang) ~= 'string' or lang == '' or lang == Phone.language then return end
    Phone.language = lang
    TriggerEvent('oph3z-phone:languageChanged', lang)
end

local timeThread = nil

local function sendTime()
    SendNUIMessage({ action = 'phone:time', data = Phone.getTimeData() })
end

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

local propEntity = nil
local PROP_BONE = 28422
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

Phone.flashlightOn = false
local flashThread = false

function Phone.setFlashlight(on)
    Phone.flashlightOn = on and true or false

    if Phone.flashlightOn and not flashThread then
        flashThread = true
        local c = FLASHLIGHT.color
        CreateThread(function()
            while Phone.flashlightOn and Phone.isOpen do
                local ped = PlayerPedId()
                local base
                if propEntity and DoesEntityExist(propEntity) then
                    base = GetEntityCoords(propEntity)
                else
                    base = GetPedBoneCoords(ped, PROP_BONE, 0.0, 0.0, 0.0)
                end
                local fwd = GetEntityForwardVector(ped)
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

local glowThread = false

local function startScreenGlow()
    if glowThread then return end
    glowThread = true
    local c = SCREEN_GLOW.color
    CreateThread(function()
        while Phone.isOpen do
            local ped = PlayerPedId()
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

function Phone.open()
    if Phone.isOpen then return end
    if not Phone.hasItem() then
        Notify(Lang('notify.noPhone', Phone.language), 'error')
        return
    end

    local data = TriggerCallback('oph3z-phone:server:getData')
    if not data then
        Phone.dbg('failed to load phone data')
        return
    end

    Phone.isOpen = true
    Phone.identity = {
        number    = data.number,
        numberRaw = data.numberRaw,
        citizenid = data.citizenid,
        name      = data.name,
        email     = data.email,
        avatar    = data.avatar,
    }
    Phone.setLanguage((data.settings and data.settings.language) or Config.DefaultLocale)
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'phone:setVisible',
        data = {
            visible  = true,
            settings = data.settings,
            time     = Phone.getTimeData(),
            apps     = Config.Apps,
            identity = Phone.identity,
            home     = data.home,
            appstore = Config.AppStore,
            i18n     = { languages = GetLanguages(), translations = GetFrontendLocales() },
        },
    })

    if PhoneApps then PhoneApps.sync() end

    startTimeLoop()
    Phone.startAnim()
    startScreenGlow()
    TriggerServerEvent('oph3z-phone:server:airdrop:presence', true)
    Phone.dbg('opened')
end

function Phone.close()
    if not Phone.isOpen then return end

    Phone.isOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'phone:setVisible', data = { visible = false } })
    Phone.setFlashlight(false)
    Phone.stopAnim()
    TriggerServerEvent('oph3z-phone:server:airdrop:presence', false)
    Phone.dbg('closed')
end

function Phone.toggle()
    if Phone.isOpen then Phone.close() else Phone.open() end
end

RegisterCommand('+oph3z_phone', function() Phone.toggle() end, false)
RegisterCommand('-oph3z_phone', function() end, false)
RegisterKeyMapping('+oph3z_phone', 'Open / close phone', 'keyboard', Config.Keybind)

exports('usePhone', function()
    Phone.open()
end)

Phone.call = nil
local mutedRemote = {}

local function callMsg(payload)
    SendNUIMessage({ action = 'phone:call', data = payload })
end

local function showPhoneForCall()
    if Phone.isOpen then return false end
    Phone.isOpen = true
    Phone.openedByCall = true
    SetNuiFocus(true, true)
    local data = TriggerCallback('oph3z-phone:server:getData')
    if data then
        Phone.identity = { number = data.number, numberRaw = data.numberRaw, citizenid = data.citizenid, name = data.name, email = data.email, avatar = data.avatar }
        Phone.setLanguage((data.settings and data.settings.language) or Config.DefaultLocale)
    end
    SendNUIMessage({
        action = 'phone:setVisible',
        data = {
            visible  = true,
            settings = data and data.settings,
            time     = Phone.getTimeData(),
            apps     = Config.Apps,
            identity = Phone.identity,
            home     = data and data.home,
            i18n     = { languages = GetLanguages(), translations = GetFrontendLocales() },
        },
    })
    if PhoneApps then PhoneApps.sync() end
    startTimeLoop()
    Phone.startAnim()
    startScreenGlow()
    return true
end

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
    local answered = Phone.call ~= nil and Phone.call.state == 'active'
    Phone.call = nil
    Phone.openedByCall = nil
    if openedByCall and not answered then
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
        video = data.video,
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
    callMsg({ type = 'outgoing', callId = data.callId, number = data.number, name = data.name, img = data.img, video = data.video })
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

AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    if Phone.isOpen then SetNuiFocus(false, false) end
    removeProp()
    if Phone.call and Phone.call.channel then
        exports['pma-voice']:setCallChannel(0)
    end
end)
--[[
    oph3z-phone | Public CLIENT export API

    Third-party resources register their app with the phone here. The app then
    appears on the home screen and renders inside the phone as an iframe.

        exports['oph3z-phone']:RegisterApp({
            id    = 'myapp',
            label = 'My App',
            icon  = ('nui://%s/ui/icon.svg'):format(GetCurrentResourceName()),
            ui    = ('nui://%s/ui/index.html'):format(GetCurrentResourceName()),
            place = 'grid', -- 'grid' | 'dock'
        })

    See docs/THIRD_PARTY_APPS.md and the oph3z-phone-app-template resource.
--]]

local registered = {} -- id -> { id, label, icon, url, place, owner }

local function listApps()
    local out = {}
    for _, a in pairs(registered) do
        out[#out + 1] = {
            id = a.id, label = a.label, developer = a.developer, icon = a.icon,
            url = a.url, place = a.place,
            -- App Store metadata (used later by the App Store app).
            addAppStore = a.addAppStore, headerImage = a.headerImage, swiperItems = a.swiperItems,
        }
    end
    return out
end

-- Push the current external-app set to the NUI (used by main.lua on open too).
PhoneApps = PhoneApps or {}
function PhoneApps.sync()
    SendNUIMessage({ action = 'phone:apps:external', data = listApps() })
end

-- ---- Registration --------------------------------------------------------

exports('RegisterApp', function(def)
    if type(def) ~= 'table' or type(def.id) ~= 'string' or def.id == '' then
        print('[oph3z-phone] RegisterApp: a definition with at least { id, ui } is required.')
        return false
    end
    local page = def.ui or def.url -- `ui` is the current key; `url` kept for back-compat
    if type(page) ~= 'string' or page == '' then
        print(('[oph3z-phone] RegisterApp(%s): a `ui` (the iframe page) is required.'):format(def.id))
        return false
    end
    registered[def.id] = {
        id        = def.id,
        label     = def.label or def.id,
        developer = def.developer,
        icon      = def.icon,
        url       = page,
        place     = def.place or 'grid',
        owner     = GetInvokingResource() or 'unknown',
        -- App Store metadata (surfaced later by the App Store app).
        addAppStore = def.addAppStore and true or false,
        headerImage = def.headerImage,
        swiperItems = def.swiperItems,
    }
    PhoneApps.sync()
    return true
end)

exports('UnregisterApp', function(id)
    if registered[id] then
        registered[id] = nil
        PhoneApps.sync()
        return true
    end
    return false
end)

-- ---- Lifecycle / helpers -------------------------------------------------

-- Open the phone (if closed) and jump straight to an app (built-in or third-party).
exports('OpenApp', function(id)
    if type(id) ~= 'string' or id == '' then return false end
    CreateThread(function()
        if not Phone.isOpen then Phone.open() end
        if Phone.isOpen then SendNUIMessage({ action = 'phone:openApp', data = { id = id } }) end
    end)
    return true
end)

exports('IsOpen', function()
    return Phone.isOpen == true
end)

-- The player's formatted number (cached when the phone is first opened; may be nil
-- before then — use the server export GetPhoneNumber for a guaranteed value).
exports('GetNumber', function()
    return Phone.identity and Phone.identity.number or nil
end)

exports('GetIdentity', function()
    return Phone.identity
end)

-- ---- Housekeeping --------------------------------------------------------

-- When an app's resource stops, drop its apps from the phone.
AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() then return end
    local changed = false
    for id, a in pairs(registered) do
        if a.owner == res then
            registered[id] = nil
            changed = true
        end
    end
    if changed then PhoneApps.sync() end
end)

-- When the phone (re)starts, ask already-running app resources to re-register.
CreateThread(function()
    Wait(500)
    TriggerEvent('oph3z-phone:requestApps')
    PhoneApps.sync()
end)

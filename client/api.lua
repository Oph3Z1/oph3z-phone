local registered = {} -- id -> { id, label, icon, url, place, owner }

local function listApps()
    local out = {}
    for _, a in pairs(registered) do
        out[#out + 1] = {
            id = a.id, label = a.label, developer = a.developer, description = a.description,
            icon = a.icon, url = a.url, place = a.place, deletable = a.deletable,
            share = a.share,
            headerImage = a.headerImage, swiperItems = a.swiperItems,
        }
    end
    return out
end

PhoneApps = PhoneApps or {}
function PhoneApps.sync()
    SendNUIMessage({ action = 'phone:apps:external', data = listApps() })
end

exports('RegisterApp', function(def)
    if type(def) ~= 'table' or type(def.id) ~= 'string' or def.id == '' then
        print('[oph3z-phone] RegisterApp: a definition with at least { id, ui } is required.')
        return false
    end
    local page = def.ui or def.url
    if type(page) ~= 'string' or page == '' then
        print(('[oph3z-phone] RegisterApp(%s): a `ui` (the iframe page) is required.'):format(def.id))
        return false
    end
    registered[def.id] = {
        id          = def.id,
        label       = def.label or def.id,
        developer   = def.developer,
        description = def.description,
        icon        = def.icon,
        url         = page,
        place       = def.place or 'grid',
        deletable   = def.deletable ~= false,
        share       = def.share and true or nil,
        owner       = GetInvokingResource() or 'unknown',
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

exports('Toast', function(kind, title, body, app)
    if not Phone.isOpen then return false end
    SendNUIMessage({
        action = 'phone:toast',
        data = { type = kind or 'info', title = title, body = body, app = app },
    })
    return true
end)

exports('GetNumber', function()
    return Phone.identity and Phone.identity.number or nil
end)

exports('GetIdentity', function()
    return Phone.identity
end)

exports('GetLanguage', function()
    return Phone.language or Config.DefaultLocale or 'en'
end)

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

CreateThread(function()
    Wait(500)
    TriggerEvent('oph3z-phone:requestApps')
    PhoneApps.sync()
end)
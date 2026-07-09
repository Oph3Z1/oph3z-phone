frameworkObject = nil
frameworkResolved = false

Citizen.CreateThread(function()
    frameworkObject, Config.Framework = GetCore()
    frameworkResolved = true
    if frameworkObject and Config.Debug then
        print('^2[oph3z-phone] client framework bridge ready ('..tostring(Config.Framework)..').^0')
    end
end)

local function waitForFramework()
    while not frameworkObject and not frameworkResolved do Citizen.Wait(0) end
    return frameworkObject ~= nil
end

function TriggerCallback(name, data)
    if not waitForFramework() then
        print('^1[oph3z-phone] framework not available for callback "'..name..'".^0')
        return nil
    end

    local result, done = nil, false
    if frameworkObject.Functions and frameworkObject.Functions.TriggerCallback then
        frameworkObject.Functions.TriggerCallback(name, function(cbResult) result = cbResult; done = true end, data)
    elseif frameworkObject.TriggerServerCallback then
        frameworkObject.TriggerServerCallback(name, function(cbResult) result = cbResult; done = true end, data)
    else
        print('^1[oph3z-phone] Framework has no client-callback system for "'..name..'".^0')
        return nil
    end

    local deadline = GetGameTimer() + 10000
    while not done and GetGameTimer() < deadline do Citizen.Wait(0) end
    return result
end

function Notify(msg, kind)
    kind = kind or 'inform'
    if Config.Framework == 'qbox' then
        exports.qbx_core:Notify(msg, kind)
    elseif Config.Framework == 'qb' or Config.Framework == 'oldqb' then
        frameworkObject.Functions.Notify(msg, kind)
    else
        if frameworkObject.ShowNotification then
            frameworkObject.ShowNotification(msg)
        else
            TriggerEvent('esx:showNotification', msg)
        end
    end
end

function HasPhoneItem()
    if not Config.RequireItem then return true end
    if Config.Inventory == 'ox_inventory' then
        return (exports.ox_inventory:Search('count', Config.ItemName) or 0) > 0
    end
    return TriggerCallback('oph3z-phone:server:hasItem') == true
end
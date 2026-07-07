function GetCore()
    local object = nil
    local Framework = Config.Framework

    if Framework == 'oldesx' then
        local counter = 0
        while not object do
            TriggerEvent('esx:getSharedObject', function(obj) object = obj end)
            counter = counter + 1
            if counter == 3 then break end
            Citizen.Wait(1000)
        end

    elseif Framework == 'esx' then
        local counter = 0
        local status = pcall(function() exports['es_extended']:getSharedObject() end)
        if status then
            while not object do
                object = exports['es_extended']:getSharedObject()
                counter = counter + 1
                if counter == 3 then break end
                Citizen.Wait(1000)
            end
        end

    elseif Framework == 'qb' then
        local counter = 0
        local status = pcall(function() exports['qb-core']:GetCoreObject() end)
        if status then
            while not object do
                object = exports['qb-core']:GetCoreObject()
                counter = counter + 1
                if counter == 3 then break end
                Citizen.Wait(1000)
            end
        end

    elseif Framework == 'oldqb' then
        local counter = 0
        while not object do
            counter = counter + 1
            TriggerEvent('QBCore:GetObject', function(obj) object = obj end)
            if counter == 3 then break end
            Citizen.Wait(1000)
        end

    elseif Framework == 'qbox' then
        local ok, obj = pcall(function() return exports.qbx_core:GetCoreObject() end)
        if ok and obj then
            object = obj
        else
            local ok2, obj2 = pcall(function() return exports['qb-core']:GetCoreObject() end)
            if ok2 and obj2 then object = obj2 end
        end
        if not object then object = exports.qbx_core end
    end

    if not object then
        print('^1[oph3z-phone] Config.Framework ("' .. tostring(Framework) .. '") could not be resolved. Check the value and that the framework is started.^0')
    end

    return object, Framework
end
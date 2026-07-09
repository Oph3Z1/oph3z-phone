frameworkObject = nil
frameworkResolved = false

Citizen.CreateThread(function()
    frameworkObject, Config.Framework = GetCore()
    frameworkResolved = true
    if frameworkObject and Config.Debug then
        print('^2[oph3z-phone] framework bridge ready ('..tostring(Config.Framework)..').^0')
    end
end)

local warned = false
local function waitForFramework()
    while not frameworkObject and not frameworkResolved do Citizen.Wait(0) end
    if not frameworkObject then
        if not warned then
            warned = true
            print('^1[oph3z-phone] framework not available — is Config.Framework correct and the core started?^0')
        end
        return false
    end
    return true
end

local function isQB()  local f = Config.Framework return f == 'qb' or f == 'oldqb' end
local function isESX() local f = Config.Framework return f == 'esx' or f == 'oldesx' end
local function isQbox() return Config.Framework == 'qbox' end

function RegisterCallback(name, fn)
    if not waitForFramework() then return end
    if frameworkObject.Functions and frameworkObject.Functions.CreateCallback then
        frameworkObject.Functions.CreateCallback(name, function(source, cb, data) cb(fn(source, data)) end)
    elseif frameworkObject.RegisterServerCallback then
        frameworkObject.RegisterServerCallback(name, function(source, cb, data) cb(fn(source, data)) end)
    else
        print('^1[oph3z-phone] Framework has no server-callback system for "'..name..'".^0')
    end
end

function ExecuteSql(query, params)
    local done, result = false, nil
    if Config.MySQL == 'mysql-async' then
        MySQL.Async.fetchAll(query, params or {}, function(data)
            result = data
            done = true
        end)
    else
        local provider = Config.MySQL == 'ghmattimysql' and 'ghmattimysql' or 'oxmysql'
        exports[provider]:execute(query, params or {}, function(data)
            result = data
            done = true
        end)
    end
    while not done do Citizen.Wait(0) end
    return result
end

function GetIdentifier(src)
    if isQbox() then
        local p = exports.qbx_core:GetPlayer(src)
        return p and p.PlayerData.citizenid or nil
    elseif isQB() then
        local p = frameworkObject.Functions.GetPlayer(tonumber(src))
        return p and p.PlayerData.citizenid or nil
    else -- esx / oldesx
        local xp = frameworkObject.GetPlayerFromId(tonumber(src))
        return xp and xp.getIdentifier() or nil
    end
end

function GetCharName(src)
    if isESX() then
        local xp = frameworkObject.GetPlayerFromId(tonumber(src))
        if not xp then return nil, nil end
        local full = (xp.getName and xp.getName()) or ''
        local first, last = full:match('^(%S+)%s+(.+)$')
        if not first then return (full ~= '' and full or nil), '' end
        return first, last
    end
    local p = isQbox() and exports.qbx_core:GetPlayer(src)
        or frameworkObject.Functions.GetPlayer(tonumber(src))
    local ci = p and p.PlayerData and p.PlayerData.charinfo
    if not ci then return nil, nil end
    return ci.firstname, ci.lastname
end

function GetSourceById(id)
    if not id then return nil end
    if isQbox() then
        local p = exports.qbx_core:GetPlayerByCitizenId(id)
        return p and p.PlayerData.source or nil
    elseif isQB() then
        local p = frameworkObject.Functions.GetPlayerByCitizenId(id)
        return p and p.PlayerData.source or nil
    else -- esx / oldesx
        local xp = frameworkObject.GetPlayerFromIdentifier and frameworkObject.GetPlayerFromIdentifier(id)
        return xp and xp.source or nil
    end
end

function GetPlayerByCitizenId(id)
    local src = GetSourceById(id)
    if not src then return nil end
    return { PlayerData = { source = src } }
end

Bank = {}

local function onlineBank(src)
    if isQB() then
        local p = frameworkObject.Functions.GetPlayer(tonumber(src))
        return p and (p.PlayerData.money.bank or 0) or nil
    else
        local xp = frameworkObject.GetPlayerFromId(tonumber(src))
        local acc = xp and xp.getAccount and xp.getAccount('bank')
        return acc and (acc.money or 0) or nil
    end
end

function Bank.Get(id)
    if not id then return 0 end
    if isQbox() then return tonumber(exports.qbx_core:GetMoney(id, 'bank')) or 0 end

    local src = GetSourceById(id)
    if src then
        local b = onlineBank(src)
        if b ~= nil then return b end
    end
    if isESX() then
        local r = ExecuteSql('SELECT accounts FROM users WHERE identifier = ?', { id })
        if r and r[1] and r[1].accounts then return tonumber(json.decode(r[1].accounts).bank) or 0 end
    else
        local r = ExecuteSql('SELECT money FROM players WHERE citizenid = ?', { id })
        if r and r[1] and r[1].money then return tonumber(json.decode(r[1].money).bank) or 0 end
    end
    return 0
end

function Bank.Add(id, amount, reason)
    amount = math.floor(tonumber(amount) or 0)
    if not id or amount <= 0 then return false end
    if isQbox() then return exports.qbx_core:AddMoney(id, 'bank', amount, reason) and true or false end

    local src = GetSourceById(id)
    if src then
        if isQB() then
            local p = frameworkObject.Functions.GetPlayer(tonumber(src))
            if p then p.Functions.AddMoney('bank', amount, reason); return true end
        else
            local xp = frameworkObject.GetPlayerFromId(tonumber(src))
            if xp then xp.addAccountMoney('bank', amount); return true end
        end
        return false
    end

    if isESX() then
        local r = ExecuteSql('SELECT accounts FROM users WHERE identifier = ?', { id })
        if not (r and r[1] and r[1].accounts) then return false end
        local a = json.decode(r[1].accounts); a.bank = (tonumber(a.bank) or 0) + amount
        ExecuteSql('UPDATE users SET accounts = ? WHERE identifier = ?', { json.encode(a), id })
        return true
    else
        local r = ExecuteSql('SELECT money FROM players WHERE citizenid = ?', { id })
        if not (r and r[1] and r[1].money) then return false end
        local m = json.decode(r[1].money); m.bank = (tonumber(m.bank) or 0) + amount
        ExecuteSql('UPDATE players SET money = ? WHERE citizenid = ?', { json.encode(m), id })
        return true
    end
end

function Bank.Remove(id, amount, reason)
    amount = math.floor(tonumber(amount) or 0)
    if not id or amount <= 0 then return false end
    if Bank.Get(id) < amount then return false end
    if isQbox() then return exports.qbx_core:RemoveMoney(id, 'bank', amount, reason) and true or false end

    local src = GetSourceById(id)
    if src then
        if isQB() then
            local p = frameworkObject.Functions.GetPlayer(tonumber(src))
            if p then return p.Functions.RemoveMoney('bank', amount, reason) and true or false end
        else
            local xp = frameworkObject.GetPlayerFromId(tonumber(src))
            if xp then xp.removeAccountMoney('bank', amount); return true end
        end
        return false
    end

    if isESX() then
        local r = ExecuteSql('SELECT accounts FROM users WHERE identifier = ?', { id })
        if not (r and r[1] and r[1].accounts) then return false end
        local a = json.decode(r[1].accounts)
        if (tonumber(a.bank) or 0) < amount then return false end
        a.bank = a.bank - amount
        ExecuteSql('UPDATE users SET accounts = ? WHERE identifier = ?', { json.encode(a), id })
        return true
    else
        local r = ExecuteSql('SELECT money FROM players WHERE citizenid = ?', { id })
        if not (r and r[1] and r[1].money) then return false end
        local m = json.decode(r[1].money)
        if (tonumber(m.bank) or 0) < amount then return false end
        m.bank = m.bank - amount
        ExecuteSql('UPDATE players SET money = ? WHERE citizenid = ?', { json.encode(m), id })
        return true
    end
end

function HasPhoneItem(src)
    local item = Config.ItemName
    local inv = Config.Inventory
    if inv == 'ox_inventory' then
        return (exports.ox_inventory:GetItemCount(src, item) or 0) > 0
    elseif inv == 'qs-inventory' then
        return (exports['qs-inventory']:GetItemTotalAmount(src, item) or 0) > 0
    elseif inv == 'codem-inventory' then
        return exports['codem-inventory']:CheckItemValid(src, item, 1) and true or false
    elseif isESX() then
        local xp = frameworkObject.GetPlayerFromId(tonumber(src))
        if not xp then return false end
        local it = xp.getInventoryItem and xp.getInventoryItem(item)
        return it and ((it.count or it.amount or 0) > 0) or false
    else
        local p = isQbox() and exports.qbx_core:GetPlayer(src)
            or frameworkObject.Functions.GetPlayer(tonumber(src))
        return p and p.Functions.GetItemByName(item) ~= nil or false
    end
end

RegisterCallback('oph3z-phone:server:hasItem', function(source)
    return HasPhoneItem(source)
end)
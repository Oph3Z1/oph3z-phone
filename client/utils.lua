--[[
    oph3z-phone | Client utilities
--]]

Phone = Phone or {}

---Print only when Config.Debug is enabled.
function Phone.dbg(...)
    if Config.Debug then
        print('[oph3z-phone]', ...)
    end
end

---Whether the local player owns the phone item in ox_inventory.
---@return boolean
function Phone.hasItem()
    if not Config.RequireItem then return true end
    local count = exports.ox_inventory:Search('count', Config.ItemName)
    return (count or 0) > 0
end

---Read the current in-game clock for the UI. (The UI shows real device time on
---the lock screen / status bar; this remains available for anything that wants
---the in-game clock.)
---@return table
function Phone.getTimeData()
    return {
        hours   = GetClockHours(),
        minutes = GetClockMinutes(),
        day     = GetClockDayOfMonth(),
        month   = GetClockMonth() + 1,        -- native is 0-indexed
        weekday = GetClockDayOfWeek(),        -- 0 = Sunday
        year    = GetClockYear(),
    }
end

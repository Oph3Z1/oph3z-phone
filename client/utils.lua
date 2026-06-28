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

-- Map GTA weather name hashes to a simple category the UI turns into an icon.
local WEATHER_CATEGORY = {
    [`CLEAR`]      = 'clear',
    [`EXTRASUNNY`] = 'clear',
    [`NEUTRAL`]    = 'clear',
    [`CLEARING`]   = 'cloudy',
    [`CLOUDS`]     = 'cloudy',
    [`OVERCAST`]   = 'cloudy',
    [`SMOG`]       = 'fog',
    [`FOGGY`]      = 'fog',
    [`RAIN`]       = 'rain',
    [`THUNDER`]    = 'thunder',
    [`SNOW`]       = 'snow',
    [`SNOWLIGHT`]  = 'snow',
    [`BLIZZARD`]   = 'snow',
    [`XMAS`]       = 'snow',
}

---Resolve the current weather to a UI category string.
---@return string
local function getWeatherCategory()
    if not GetPrevWeatherTypeHashName then return 'clear' end
    return WEATHER_CATEGORY[GetPrevWeatherTypeHashName()] or 'clear'
end

---Read the current in-game clock + a coarse weather descriptor for the UI.
---@return table
function Phone.getTimeData()
    return {
        useGameTime = Config.UseGameTime,
        hours       = GetClockHours(),
        minutes     = GetClockMinutes(),
        day         = GetClockDayOfMonth(),
        month       = GetClockMonth() + 1,        -- native is 0-indexed
        weekday     = GetClockDayOfWeek(),        -- 0 = Sunday
        year        = GetClockYear(),
        weather     = getWeatherCategory(),       -- 'clear' | 'cloudy' | 'rain' | ...
        temperature = Config.Temperature,
        tempUnit    = Config.TempUnit,
    }
end

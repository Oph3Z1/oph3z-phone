Phone = Phone or {}

function Phone.dbg(...)
    if Config.Debug then
        print('[oph3z-phone]', ...)
    end
end

function Phone.hasItem()
    return HasPhoneItem()
end

function Phone.getTimeData()
    return {
        hours   = GetClockHours(),
        minutes = GetClockMinutes(),
        day     = GetClockDayOfMonth(),
        month   = GetClockMonth() + 1,
        weekday = GetClockDayOfWeek(),
        year    = GetClockYear(),
    }
end
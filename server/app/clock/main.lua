local ClockCfg   = Config.Clock or {}
local RANGE      = ClockCfg.Range or 12.0
local VOLUME     = ClockCfg.Volume or 0.5
local RING_SECS  = ClockCfg.RingSeconds or 45
local MAX_ALARMS = 30
local MAX_RECENT = 12

local DEFAULT_ALARM_URL = ('https://cfx-nui-%s/build/audio/alarm.mp3'):format(GetCurrentResourceName())

Clock = Clock or {}
Clock.state = {}

local function cidOf(src)
    return GetIdentifier(src)
end

local function pedCoords(src)
    local ped = GetPlayerPed(src)
    if not ped or ped == 0 then return nil end
    return GetEntityCoords(ped)
end

local function ensureClock(doc)
    doc.clock = doc.clock or {}
    local c = doc.clock
    c.alarms        = c.alarms or {}
    c.nextAlarmId   = c.nextAlarmId or 1
    c.recents       = c.recents or {}
    c.alarmRingtone = c.alarmRingtone or ''
    c.alarmTones    = c.alarmTones or {}
    c.alarmTones.items  = c.alarmTones.items or {}
    c.alarmTones.nextId = c.alarmTones.nextId or 1
    return doc
end

local function saveState(src)
    local st = Clock.state[src]
    if not st then return end
    local doc = ensureClock(DB.LoadOrCreate(st.cid))
    doc.clock.alarms        = st.alarms
    doc.clock.nextAlarmId   = st.nextAlarmId
    doc.clock.recents       = st.recents
    doc.clock.timer         = st.timer
    doc.clock.alarmRingtone = st.alarmRingtone
    doc.clock.alarmTones    = st.alarmTones
    DB.Save(st.cid, doc)
end

local function alarmUrl(st)
    if st.alarmRingtone and st.alarmRingtone ~= '' then return st.alarmRingtone end
    return DEFAULT_ALARM_URL
end

local function alarmToneList(st)
    local out = { { id = 'default', name = 'Alarm', url = DEFAULT_ALARM_URL, builtin = true } }
    for _, c in ipairs(st.alarmTones.items) do
        out[#out + 1] = { id = c.id, name = c.name, url = c.url, builtin = false }
    end
    return out
end

function Clock.Ensure(src)
    local existing = Clock.state[src]
    if existing then return existing end

    local cid = cidOf(src)
    if not cid then return nil end
    local doc = ensureClock(DB.LoadOrCreate(cid))
    local c = doc.clock

    local st = {
        cid           = cid,
        alarms        = c.alarms,
        nextAlarmId   = c.nextAlarmId,
        recents       = c.recents,
        timer         = c.timer,
        alarmRingtone = c.alarmRingtone,
        alarmTones    = c.alarmTones,
        alarmLast     = {},
        ring          = nil,
    }
    Clock.state[src] = st

    local tm = st.timer

    if tm and not tm.paused and tm.endsAt and tm.endsAt <= os.time() then
        if not tm.fromRecent then Clock.AddRecent(st, tm.total) end
        st.timer = nil
        saveState(src)
    end

    return st
end

-- ---- recents --------------------------------------------------------------

function Clock.AddRecent(st, totalSecs)
    totalSecs = tonumber(totalSecs) or 0
    if totalSecs <= 0 then return end
    local h = math.floor(totalSecs / 3600)
    local m = math.floor((totalSecs % 3600) / 60)
    local s = totalSecs % 60

    for i = #st.recents, 1, -1 do
        local r = st.recents[i]
        if r.h == h and r.m == m and r.s == s then table.remove(st.recents, i) end
    end

    table.insert(st.recents, 1, { h = h, m = m, s = s })

    while #st.recents > MAX_RECENT do table.remove(st.recents) end
end

local function startRing(src, st, kind, meta)
    local coords = pedCoords(src)
    if not coords then return end
    if st.ring then exports.xsound:Destroy(-1, st.ring.name) end
    local name = ('oph3z_clock_%d'):format(src)
    st.ring = { name = name, expires = os.time() + RING_SECS, kind = kind }
    exports.xsound:PlayUrlPos(-1, name, alarmUrl(st), VOLUME, coords, true)
    exports.xsound:Distance(-1, name, RANGE)
    TriggerClientEvent('oph3z-phone:client:clock:ring', src, {
        name = name, kind = kind, meta = meta,
    })
end

function Clock.StopRing(src)
    local st = Clock.state[src]
    if not st or not st.ring then return end
    exports.xsound:Destroy(-1, st.ring.name)
    st.ring = nil
    TriggerClientEvent('oph3z-phone:client:clock:ringStop', src)
end

CreateThread(function()
    while true do
        local now = os.time()
        local nowT = os.date('*t')
        local minuteKey = ('%04d%02d%02d%02d%02d'):format(nowT.year, nowT.month, nowT.day, nowT.hour, nowT.min)

        for src, st in pairs(Clock.state) do
            local tm = st.timer
            if tm and not tm.paused and tm.endsAt and now >= tm.endsAt then
                if not tm.fromRecent then Clock.AddRecent(st, tm.total) end
                st.timer = nil
                saveState(src)
                startRing(src, st, 'timer', { total = tm.total, label = tm.label })
                TriggerClientEvent('oph3z-phone:client:clock:timerDone', src, {
                    recents = st.recents,
                })
            end

            for _, a in ipairs(st.alarms) do
                if a.enabled and a.hour == nowT.hour and a.min == nowT.min then
                    if st.alarmLast[a.id] ~= minuteKey then
                        st.alarmLast[a.id] = minuteKey
                        a.enabled = false
                        saveState(src)
                        startRing(src, st, 'alarm', { id = a.id, label = a.label, hour = a.hour, min = a.min })
                        TriggerClientEvent('oph3z-phone:client:clock:alarmFire', src, {
                            id = a.id, label = a.label, hour = a.hour, min = a.min,
                        })
                    end
                end
            end

            if st.ring and now >= st.ring.expires then
                Clock.StopRing(src)
            end
        end
        Wait(1000)
    end
end)

AddEventHandler('playerDropped', function()
    local src = source
    Clock.StopRing(src)
    Clock.state[src] = nil
end)

RegisterCallback('oph3z-phone:server:clock:get', function(src)
    local st = Clock.Ensure(src)
    if not st then return nil end
    return {
        alarms        = st.alarms,
        timer         = st.timer,
        recents       = st.recents,
        alarmRingtone = st.alarmRingtone,
        alarmTones    = alarmToneList(st),
        now           = os.time(),
    }
end)

RegisterCallback('oph3z-phone:server:clock:addAlarm', function(src, data)
    local st = Clock.Ensure(src)
    if not st or type(data) ~= 'table' then return nil end
    if #st.alarms >= MAX_ALARMS then return nil end
    local hour = math.max(0, math.min(23, math.floor(tonumber(data.hour) or 0)))
    local min  = math.max(0, math.min(59, math.floor(tonumber(data.min) or 0)))
    local label = tostring(data.label or ''):sub(1, 40)
    local alarm = { id = st.nextAlarmId, hour = hour, min = min, label = label, enabled = true }
    st.nextAlarmId = st.nextAlarmId + 1
    st.alarms[#st.alarms + 1] = alarm
    saveState(src)
    return alarm
end)

RegisterCallback('oph3z-phone:server:clock:toggleAlarm', function(src, id)
    local st = Clock.Ensure(src)
    if not st then return nil end
    for _, a in ipairs(st.alarms) do
        if a.id == id then
            a.enabled = not a.enabled
            if not a.enabled then st.alarmLast[a.id] = nil end
            saveState(src)
            return a.enabled
        end
    end
    return nil
end)

RegisterCallback('oph3z-phone:server:clock:deleteAlarm', function(src, id)
    local st = Clock.Ensure(src)
    if not st then return false end
    for i = #st.alarms, 1, -1 do
        if st.alarms[i].id == id then
            table.remove(st.alarms, i)
            st.alarmLast[id] = nil
            saveState(src)
            return true
        end
    end
    return false
end)

RegisterCallback('oph3z-phone:server:clock:startTimer', function(src, data)
    local st = Clock.Ensure(src)
    if not st or type(data) ~= 'table' then return nil end
    local total = math.max(1, math.min(24 * 3600, math.floor(tonumber(data.total) or 0)))
    st.timer = {
        endsAt     = os.time() + total,
        total      = total,
        paused     = false,
        remaining  = total,
        label      = tostring(data.label or ''):sub(1, 40),
        fromRecent = data.fromRecent and true or false,
    }
    saveState(src)
    return st.timer
end)

RegisterCallback('oph3z-phone:server:clock:pauseTimer', function(src)
    local st = Clock.Ensure(src)
    if not st or not st.timer or st.timer.paused then return st and st.timer or nil end
    local tm = st.timer
    tm.remaining = math.max(0, (tm.endsAt or os.time()) - os.time())
    tm.paused = true
    tm.endsAt = nil
    saveState(src)
    return tm
end)

RegisterCallback('oph3z-phone:server:clock:resumeTimer', function(src)
    local st = Clock.Ensure(src)
    if not st or not st.timer or not st.timer.paused then return st and st.timer or nil end
    local tm = st.timer
    tm.endsAt = os.time() + math.max(1, tm.remaining or 1)
    tm.paused = false
    saveState(src)
    return tm
end)

RegisterCallback('oph3z-phone:server:clock:cancelTimer', function(src)
    local st = Clock.Ensure(src)
    if not st then return false end
    st.timer = nil
    saveState(src)
    return true
end)

RegisterCallback('oph3z-phone:server:clock:deleteRecent', function(src, index)
    local st = Clock.Ensure(src)
    if not st then return false end
    index = tonumber(index)
    if index and st.recents[index] then
        table.remove(st.recents, index)
        saveState(src)
        return true
    end
    return false
end)

RegisterCallback('oph3z-phone:server:clock:stopRing', function(src)
    Clock.StopRing(src)
    return true
end)

RegisterCallback('oph3z-phone:server:clock:setAlarmTone', function(src, url)
    local st = Clock.Ensure(src)
    if not st then return false end
    st.alarmRingtone = (type(url) == 'string') and url or ''
    saveState(src)
    return true
end)

RegisterCallback('oph3z-phone:server:clock:addAlarmTone', function(src, input)
    local st = Clock.Ensure(src)
    if not st or type(input) ~= 'table' then return nil end
    local name = tostring(input.name or ''):gsub('^%s+', ''):gsub('%s+$', ''):sub(1, 40)
    local url  = tostring(input.url or ''):gsub('^%s+', ''):gsub('%s+$', ''):sub(1, 512)
    if name == '' or url == '' then return nil end
    local item = { id = 'a' .. st.alarmTones.nextId, name = name, url = url }
    st.alarmTones.nextId = st.alarmTones.nextId + 1
    st.alarmTones.items[#st.alarmTones.items + 1] = item
    saveState(src)
    return item
end)

RegisterCallback('oph3z-phone:server:clock:deleteAlarmTone', function(src, id)
    local st = Clock.Ensure(src)
    if not st or type(id) ~= 'string' then return false end
    local removedUrl
    for i = #st.alarmTones.items, 1, -1 do
        if st.alarmTones.items[i].id == id then
            removedUrl = st.alarmTones.items[i].url
            table.remove(st.alarmTones.items, i)
        end
    end
    if removedUrl and st.alarmRingtone == removedUrl then st.alarmRingtone = '' end
    saveState(src)
    return true
end)
local function cidOf(src) return DB.GetCitizenId(src) end
local CFG    = Config.Music or {}
local YT_KEY = CFG.apiKey or ''
local LIMIT  = 25

local function urlencode(str)
    return (tostring(str or ''):gsub('([^%w%-%.%_%~])', function(c) return ('%%%02X'):format(c:byte()) end))
end

local function unescape(s)
    if not s then return '' end
    s = s:gsub('&amp;', '&'):gsub('&quot;', '"'):gsub('&#39;', "'"):gsub('&lt;', '<'):gsub('&gt;', '>')
    s = s:gsub('&#(%d+);', function(n) return (utf8 and utf8.char and utf8.char(tonumber(n))) or '' end)
    return s
end

local function isoToSeconds(iso)
    if not iso then return 0 end
    local h = tonumber(iso:match('(%d+)H')) or 0
    local m = tonumber(iso:match('(%d+)M')) or 0
    local s = tonumber(iso:match('(%d+)S')) or 0
    return h * 3600 + m * 60 + s
end

local function http(url, headers)
    local p = promise.new()
    PerformHttpRequest(url, function(status, text) p:resolve({ status = status, text = text }) end, 'GET', '', headers or {})
    return Citizen.Await(p)
end

local function searchYouTube(q)
    if YT_KEY == '' then return { ok = false, reason = 'nokey', tracks = {} } end
    local r = http(('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=%d&q=%s&key=%s')
        :format(LIMIT, urlencode(q), YT_KEY), { ['Accept'] = 'application/json' })
    if r.status ~= 200 or not r.text then return { ok = false, tracks = {} } end
    local ok, parsed = pcall(json.decode, r.text)
    if not ok or type(parsed.items) ~= 'table' then return { ok = false, tracks = {} } end
    local tracks, ids = {}, {}
    for _, it in ipairs(parsed.items) do
        local vid = it.id and it.id.videoId
        local sn = it.snippet
        if vid and sn then
            local th = sn.thumbnails or {}
            tracks[#tracks + 1] = {
                id = vid, title = unescape(sn.title), artist = unescape(sn.channelTitle) or '',
                artwork = ((th.high or th.medium or th['default']) or {}).url, duration = 0,
                url = 'https://www.youtube.com/watch?v=' .. vid,
            }
            ids[#ids + 1] = vid
        end
    end

    if #ids > 0 then
        local d = http(('https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=%s&key=%s')
            :format(table.concat(ids, ','), YT_KEY), { ['Accept'] = 'application/json' })
        if d.status == 200 and d.text then
            local ok2, p2 = pcall(json.decode, d.text)
            if ok2 and type(p2.items) == 'table' then
                local map = {}
                for _, v in ipairs(p2.items) do map[v.id] = isoToSeconds(v.contentDetails and v.contentDetails.duration) end
                for _, t in ipairs(tracks) do t.duration = map[t.id] or 0 end
            end
        end
    end
    return { ok = true, tracks = tracks }
end

RegisterCallback('oph3z-phone:server:spotify:search', function(src, data)
    local q = data and data.q or ''
    if q == '' then return { ok = true, tracks = {} } end
    return searchYouTube(q)
end)

local function libOf(cid)
    local doc = DB.LoadOrCreate(cid)
    doc.spotify = doc.spotify or {}
    doc.spotify.liked = doc.spotify.liked or {}
    doc.spotify.playlists = doc.spotify.playlists or {}
    return doc, doc.spotify
end

local function cleanTrack(t)
    if type(t) ~= 'table' or type(t.url) ~= 'string' or t.url == '' then return nil end
    return {
        id       = tostring(t.id or t.url),
        title    = tostring(t.title or 'Unknown'):sub(1, 120),
        artist   = tostring(t.artist or ''):sub(1, 120),
        artwork  = type(t.artwork) == 'string' and t.artwork or nil,
        url      = t.url,
        duration = tonumber(t.duration) or 0,
    }
end

local function nextPlaylistId(sp)
    local n = 0
    for _, p in ipairs(sp.playlists) do
        local num = tonumber((tostring(p.id):gsub('pl', ''))) or 0
        if num > n then n = num end
    end
    return ('pl%d'):format(n + 1)
end

RegisterCallback('oph3z-phone:server:spotify:library', function(src)
    local cid = cidOf(src)
    if not cid then return { ok = false } end
    local _, sp = libOf(cid)
    return { ok = true, playlists = sp.playlists, liked = sp.liked }
end)

RegisterCallback('oph3z-phone:server:spotify:createPlaylist', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false } end
    local name = tostring(data.name or ''):sub(1, 60)
    if name:gsub('%s', '') == '' then return { ok = false, reason = 'name' } end
    local doc, sp = libOf(cid)
    local pl = { id = nextPlaylistId(sp), name = name, tracks = {}, createdAt = os.time() }
    sp.playlists[#sp.playlists + 1] = pl
    DB.Save(cid, doc)
    return { ok = true, playlist = pl }
end)

RegisterCallback('oph3z-phone:server:spotify:renamePlaylist', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false } end
    local name = tostring(data.name or ''):sub(1, 60)
    if name:gsub('%s', '') == '' then return { ok = false, reason = 'name' } end
    local doc, sp = libOf(cid)
    for _, p in ipairs(sp.playlists) do
        if p.id == data.id then p.name = name; DB.Save(cid, doc); return { ok = true } end
    end
    return { ok = false, reason = 'notfound' }
end)

RegisterCallback('oph3z-phone:server:spotify:deletePlaylist', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false } end
    local doc, sp = libOf(cid)
    for i, p in ipairs(sp.playlists) do
        if p.id == data.id then table.remove(sp.playlists, i); DB.Save(cid, doc); return { ok = true } end
    end
    return { ok = true }
end)

RegisterCallback('oph3z-phone:server:spotify:addTrack', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false } end
    local track = cleanTrack(data.track)
    if not track then return { ok = false, reason = 'track' } end
    local doc, sp = libOf(cid)

    local list
    if data.playlistId == 'liked' then list = sp.liked
    else
        for _, p in ipairs(sp.playlists) do if p.id == data.playlistId then list = p.tracks break end end
    end
    if not list then return { ok = false, reason = 'notfound' } end
    for _, t in ipairs(list) do if t.id == track.id then return { ok = true, already = true } end end
    list[#list + 1] = track
    DB.Save(cid, doc)
    return { ok = true }
end)

RegisterCallback('oph3z-phone:server:spotify:removeTrack', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false } end
    local doc, sp = libOf(cid)
    local list
    if data.playlistId == 'liked' then list = sp.liked
    else for _, p in ipairs(sp.playlists) do if p.id == data.playlistId then list = p.tracks break end end end
    if not list then return { ok = false } end
    for i, t in ipairs(list) do if t.id == tostring(data.trackId) then table.remove(list, i); break end end
    DB.Save(cid, doc)
    return { ok = true }
end)

RegisterCallback('oph3z-phone:server:spotify:toggleLike', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false } end
    local track = cleanTrack(data.track)
    if not track then return { ok = false, reason = 'track' } end
    local doc, sp = libOf(cid)
    for i, t in ipairs(sp.liked) do
        if t.id == track.id then table.remove(sp.liked, i); DB.Save(cid, doc); return { ok = true, liked = false } end
    end
    table.insert(sp.liked, 1, track)
    DB.Save(cid, doc)
    return { ok = true, liked = true }
end)

local nearby = {}
local moving = {}

local function soundName(src) return ('oph3zmusic_%s'):format(src) end

local function stopNearby(src)
    local name = nearby[src]
    if name then
        exports.xsound:Destroy(-1, name)
        nearby[src] = nil
    end
end

local function followPed(src)
    if moving[src] then return end
    moving[src] = true
    CreateThread(function()
        while nearby[src] do
            local ped = GetPlayerPed(src)
            if ped and ped ~= 0 then
                exports.xsound:Position(-1, nearby[src], GetEntityCoords(ped))
            end
            Wait(400)
        end
        moving[src] = nil
    end)
end

RegisterNetEvent('oph3z-phone:server:spotify:nearbyPlay', function(data)
    local src = source
    if not Config.Music.AllowNearby or type(data) ~= 'table' or type(data.url) ~= 'string' then return end
    stopNearby(src)
    local ped = GetPlayerPed(src)
    if ped == 0 then return end
    local coords = GetEntityCoords(ped)
    local name = soundName(src)
    local vol = math.max(0, math.min(1, (tonumber(data.volume) or 70) / 100))
    exports.xsound:PlayUrlPos(-1, name, data.url, vol, coords, false)
    exports.xsound:Distance(-1, name, Config.Music.NearbyRange or 12.0)
    nearby[src] = name
    followPed(src)
    local position = tonumber(data.position) or 0
    if position > 0 then
        TriggerClientEvent('oph3z-phone:client:spotify:nearbySeek', -1, { name = name, position = math.floor(position) })
    end
end)

RegisterNetEvent('oph3z-phone:server:spotify:nearbyControl', function(data)
    local src = source
    local name = nearby[src]
    if not name or type(data) ~= 'table' then return end
    if data.action == 'pause' then exports.xsound:Pause(-1, name)
    elseif data.action == 'resume' then exports.xsound:Resume(-1, name)
    elseif data.action == 'seek' then exports.xsound:setTimeStamp(-1, name, math.floor(tonumber(data.value) or 0))
    elseif data.action == 'volume' then exports.xsound:setVolume(-1, name, math.max(0, math.min(1, (tonumber(data.value) or 0) / 100))) end
end)

RegisterNetEvent('oph3z-phone:server:spotify:nearbyStop', function()
    stopNearby(source)
end)

AddEventHandler('playerDropped', function()
    stopNearby(source)
end)
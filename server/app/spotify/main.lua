--[[
    oph3z-phone | Spotify (music) — SERVER

    Two jobs:
      1. Per-character library: playlists + Liked Songs, stored in the player's
         phone doc (doc.spotify). Tracks are stored as snapshots
         { id, title, artist, artwork, url, duration }.
      2. Nearby audio: when a player broadcasts, the track is played in 3D via
         xsound at their ped so nearby players hear it too (gated by Config).
--]]

local function cidOf(src) return DB.GetCitizenId(src) end

-- ===========================================================================
-- SEARCH  (HTTP lives here — PerformHttpRequest is server-only)
-- ===========================================================================
local CFG      = Config.Spotify or {}
local PROVIDER = (CFG.Provider or 'youtube'):lower()
local YT_KEY   = (CFG.YouTube and CFG.YouTube.apiKey) or ''
local SP_ID    = (CFG.Spotify and CFG.Spotify.clientId) or ''
local SP_SECRET= (CFG.Spotify and CFG.Spotify.clientSecret) or ''
local LIMIT    = CFG.SearchLimit or 25

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

local B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
local function base64(data)
    return ((data:gsub('.', function(x)
        local r, byte = '', x:byte()
        for i = 8, 1, -1 do r = r .. (byte % 2 ^ i - byte % 2 ^ (i - 1) > 0 and '1' or '0') end
        return r
    end) .. '0000'):gsub('%d%d%d?%d?%d?%d?', function(x)
        if #x < 6 then return '' end
        local c = 0
        for i = 1, 6 do c = c + (x:sub(i, i) == '1' and 2 ^ (6 - i) or 0) end
        return B64:sub(c + 1, c + 1)
    end) .. ({ '', '==', '=' })[#data % 3 + 1])
end

-- Blocking GET/POST via PerformHttpRequest, awaited on the callback's thread.
local function http(method, url, body, headers)
    local p = promise.new()
    PerformHttpRequest(url, function(status, text) p:resolve({ status = status, text = text }) end, method, body or '', headers or {})
    return Citizen.Await(p)
end

local function searchYouTube(q)
    if YT_KEY == '' then return { ok = false, reason = 'nokey', tracks = {} } end
    local r = http('GET', ('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=%d&q=%s&key=%s')
        :format(LIMIT, urlencode(q), YT_KEY), '', { ['Accept'] = 'application/json' })
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
    -- One extra call to fill in real durations.
    if #ids > 0 then
        local d = http('GET', ('https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=%s&key=%s')
            :format(table.concat(ids, ','), YT_KEY), '', { ['Accept'] = 'application/json' })
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

local spToken, spTokenExp = nil, 0
local function spotifyToken()
    if spToken and os.time() < spTokenExp then return spToken end
    if SP_ID == '' or SP_SECRET == '' then return nil end
    local r = http('POST', 'https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
        ['Authorization'] = 'Basic ' .. base64(SP_ID .. ':' .. SP_SECRET),
        ['Content-Type'] = 'application/x-www-form-urlencoded',
    })
    if r.status ~= 200 or not r.text then return nil end
    local ok, p = pcall(json.decode, r.text)
    if ok and p.access_token then
        spToken = p.access_token
        spTokenExp = os.time() + (p.expires_in or 3600) - 60
        return spToken
    end
    return nil
end

local function searchSpotify(q)
    local token = spotifyToken()
    if not token then return { ok = false, reason = 'nokey', tracks = {} } end
    local r = http('GET', ('https://api.spotify.com/v1/search?type=track&limit=%d&q=%s'):format(LIMIT, urlencode(q)),
        '', { ['Authorization'] = 'Bearer ' .. token })
    if r.status ~= 200 or not r.text then return { ok = false, tracks = {} } end
    local ok, p = pcall(json.decode, r.text)
    if not ok or not p.tracks or type(p.tracks.items) ~= 'table' then return { ok = false, tracks = {} } end
    local tracks = {}
    for _, t in ipairs(p.tracks.items) do
        if t.preview_url then  -- only tracks with a playable 30s clip
            local art = t.album and t.album.images and t.album.images[1] and t.album.images[1].url
            tracks[#tracks + 1] = {
                id = t.id, title = t.name or 'Unknown',
                artist = (t.artists and t.artists[1] and t.artists[1].name) or '',
                artwork = art, duration = 30, url = t.preview_url,
            }
        end
    end
    return { ok = true, tracks = tracks }
end

lib.callback.register('oph3z-phone:server:spotify:search', function(src, data)
    local q = data and data.q or ''
    if q == '' then return { ok = true, tracks = {} } end
    if PROVIDER == 'spotify' then return searchSpotify(q) else return searchYouTube(q) end
end)

-- ---- library --------------------------------------------------------------
local function libOf(cid)
    local doc = DB.LoadOrCreate(cid)
    doc.spotify = doc.spotify or {}
    doc.spotify.liked = doc.spotify.liked or {}       -- array of tracks
    doc.spotify.playlists = doc.spotify.playlists or {} -- array of { id, name, tracks }
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

lib.callback.register('oph3z-phone:server:spotify:library', function(src)
    local cid = cidOf(src)
    if not cid then return { ok = false } end
    local _, sp = libOf(cid)
    return { ok = true, playlists = sp.playlists, liked = sp.liked }
end)

lib.callback.register('oph3z-phone:server:spotify:createPlaylist', function(src, data)
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

lib.callback.register('oph3z-phone:server:spotify:renamePlaylist', function(src, data)
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

lib.callback.register('oph3z-phone:server:spotify:deletePlaylist', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false } end
    local doc, sp = libOf(cid)
    for i, p in ipairs(sp.playlists) do
        if p.id == data.id then table.remove(sp.playlists, i); DB.Save(cid, doc); return { ok = true } end
    end
    return { ok = true }
end)

-- Add a track to a playlist ('liked' targets Liked Songs). No duplicates.
lib.callback.register('oph3z-phone:server:spotify:addTrack', function(src, data)
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

lib.callback.register('oph3z-phone:server:spotify:removeTrack', function(src, data)
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

-- Toggle a track in Liked Songs. Returns the new liked state.
lib.callback.register('oph3z-phone:server:spotify:toggleLike', function(src, data)
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

-- ===========================================================================
-- NEARBY AUDIO (3D via xsound at the broadcaster's ped)
-- ===========================================================================
local nearby = {}  -- src -> sound name

local function soundName(src) return ('oph3zmusic_%s'):format(src) end

local function stopNearby(src)
    local name = nearby[src]
    if name then
        exports.xsound:Destroy(-1, name)  -- no-op if it's already gone
        nearby[src] = nil
    end
end

-- Start / switch the broadcast track for this player.
RegisterNetEvent('oph3z-phone:server:spotify:nearbyPlay', function(data)
    local src = source
    if not Config.Spotify.AllowNearby or type(data) ~= 'table' or type(data.url) ~= 'string' then return end
    stopNearby(src)
    local ped = GetPlayerPed(src)
    if ped == 0 then return end
    local coords = GetEntityCoords(ped)
    local name = soundName(src)
    local vol = math.max(0, math.min(1, (tonumber(data.volume) or 70) / 100))
    exports.xsound:PlayUrlPos(-1, name, data.url, vol, coords, false)
    exports.xsound:Distance(-1, name, Config.Spotify.NearbyRange or 12.0)
    nearby[src] = name
    -- Tell the owner the sound is live so their client keeps it glued to their ped.
    TriggerClientEvent('oph3z-phone:client:spotify:nearbyLive', src, { name = name })
    -- If we started mid-song, tell EVERYONE in range to seek to that spot (each
    -- client seeks its own instance once ready, so nearby players stay in sync).
    local position = tonumber(data.position) or 0
    if position > 0 then
        TriggerClientEvent('oph3z-phone:client:spotify:nearbySeek', -1, { name = name, position = math.floor(position) })
    end
end)

-- Control the live broadcast (pause / resume / seek / volume).
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

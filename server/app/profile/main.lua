--[[
    oph3z-phone | Profile app — SERVER

    The phone "ID": a display name and avatar stored per-citizenid under
    `doc.profile = { name = "...", avatar = "url" }`. This is the name shown on the
    Settings profile card and Profile screen. It is independent of the character's
    OOC name — renaming the ID never touches QBox charinfo.

    Mail addresses are generated in database.lua (DB.EnsureMail) and are read-only
    here (a future Mail app will own the inbox).
--]]

---Trim and cap a string value.
local function clean(value, maxLen)
    if type(value) ~= 'string' then return '' end
    value = value:gsub('^%s+', ''):gsub('%s+$', '')
    if #value > maxLen then value = value:sub(1, maxLen) end
    return value
end

-- Rename the phone ID (display name). Returns the saved name, or false. ---------
lib.callback.register('oph3z-phone:server:profile:setName', function(source, name)
    local cid = DB.GetCitizenId(source)
    if not cid then return false end

    local clean_name = clean(name, 40)
    if clean_name == '' then return false end

    local doc = DB.LoadOrCreate(cid)
    doc.profile = doc.profile or {}
    doc.profile.name = clean_name
    DB.Save(cid, doc)
    return clean_name
end)

-- Set (or clear) the profile photo URL. Returns the saved URL (or ''). ----------
lib.callback.register('oph3z-phone:server:profile:setAvatar', function(source, url)
    local cid = DB.GetCitizenId(source)
    if not cid then return false end

    local clean_url = clean(url, 512)   -- '' clears the avatar (falls back to initial)

    local doc = DB.LoadOrCreate(cid)
    doc.profile = doc.profile or {}
    doc.profile.avatar = clean_url ~= '' and clean_url or nil
    DB.Save(cid, doc)
    return clean_url
end)

local function clean(value, maxLen)
    if type(value) ~= 'string' then return '' end
    value = value:gsub('^%s+', ''):gsub('%s+$', '')
    if #value > maxLen then value = value:sub(1, maxLen) end
    return value
end

RegisterCallback('oph3z-phone:server:profile:setName', function(source, name)
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

RegisterCallback('oph3z-phone:server:profile:setAvatar', function(source, url)
    local cid = DB.GetCitizenId(source)
    if not cid then return false end

    local clean_url = clean(url, 512)
    local doc = DB.LoadOrCreate(cid)
    doc.profile = doc.profile or {}
    doc.profile.avatar = clean_url ~= '' and clean_url or nil
    DB.Save(cid, doc)

    return clean_url
end)
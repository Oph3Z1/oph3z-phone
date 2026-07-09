X = X or {}

local RESOURCE = GetCurrentResourceName()
local DIR = (Config.DataFolder or 'data') .. '/x'
local cache = {}

local function readFile(name)
    if cache[name] then return cache[name] end
    local raw = LoadResourceFile(RESOURCE, ('%s/%s'):format(DIR, name))
    local decoded
    if raw and raw ~= '' then
        local ok, res = pcall(json.decode, raw)
        decoded = (ok and type(res) == 'table') and res or {}
    else
        decoded = {}
    end
    cache[name] = decoded
    return decoded
end

local function writeFile(name, tbl)
    cache[name] = tbl
    SaveResourceFile(RESOURCE, ('%s/%s'):format(DIR, name), json.encode(tbl), -1)
end

local function accounts() return readFile('accounts.json') end
local function handles()  return readFile('_handles.json')  end
local function posts()    return readFile('posts.json')     end
local function notifs()   return readFile('notifs.json')    end
local function meta()     return readFile('_meta.json')     end

local function saveAccounts() writeFile('accounts.json', accounts()) end
local function saveHandles()  writeFile('_handles.json', handles())  end
local function savePosts()    writeFile('posts.json', posts())       end
local function saveNotifs()   writeFile('notifs.json', notifs())     end
local function saveMeta()     writeFile('_meta.json', meta())        end

local function nextId(key)
    local m = meta()
    m[key] = (m[key] or 0) + 1
    saveMeta()
    return m[key]
end

local function countKeys(t)
    local n = 0
    if type(t) == 'table' then for _ in pairs(t) do n = n + 1 end end
    return n
end

X.countKeys = countKeys

local function hashPassword(salt, password)
    local data = tostring(salt) .. ':' .. tostring(password)
    local h = 0xcbf29ce484222325
    for round = 1, 1200 do
        for i = 1, #data do
            h = h ~ data:byte(i)
            h = (h * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
        end
        h = h ~ (round * 0x9E3779B97F4A7C15)
        h = (h * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
    end
    return ('%016x'):format(h)
end

local function randomSalt()
    local hex = '0123456789abcdef'
    local out = {}
    for i = 1, 16 do
        local n = math.random(1, 16)
        out[i] = hex:sub(n, n)
    end
    return table.concat(out)
end

function X.NormalizeHandle(raw)
    local h = tostring(raw or ''):gsub('^@', ''):gsub('[^%w_]', '')
    return h
end

function X.HandleAvailable(handle, exceptId)
    local lower = X.NormalizeHandle(handle):lower()
    if lower == '' then return false end
    local owner = handles()[lower]
    return owner == nil or tostring(owner) == tostring(exceptId)
end

function X.AccountIdByHandle(handle)
    local lower = X.NormalizeHandle(handle):lower()
    if lower == '' then return nil end
    return handles()[lower]
end

function X.EmailInUse(email, exceptId)
    local want = tostring(email or ''):lower()
    if want == '' then return false end
    for id, acc in pairs(accounts()) do
        if acc.email and acc.email:lower() == want and tostring(id) ~= tostring(exceptId) then
            return true
        end
    end
    return false
end

function X.GetAccount(id)
    if id == nil then return nil end
    return accounts()[tostring(id)]
end

function X.SaveAccount(acc)
    if not acc or not acc.id then return end
    accounts()[tostring(acc.id)] = acc
    saveAccounts()
end

function X.CreateAccount(handle, name, password, cid, email)
    local norm = X.NormalizeHandle(handle)
    if #norm < 3 or #norm > 15 then return nil, 'handle' end
    if not X.HandleAvailable(norm) then return nil, 'taken' end
    name = tostring(name or ''):sub(1, 40)
    if name == '' then name = norm end
    if type(password) ~= 'string' or #password < 4 then return nil, 'password' end

    local id = nextId('nextAccountId')
    local salt = randomSalt()
    local acc = {
        id        = id,
        handle    = norm,
        name      = name,
        email     = email and tostring(email):lower() or nil,
        passSalt  = salt,
        passHash  = hashPassword(salt, password),
        bio       = '',
        avatar    = nil,
        banner    = nil,
        verified  = false,
        createdAt = os.time(),
        following = {},
        followers = {},
        lastCid   = cid,
    }
    accounts()[tostring(id)] = acc
    saveAccounts()

    handles()[norm:lower()] = id
    saveHandles()

    return acc, nil
end

function X.CheckPassword(acc, password)
    if not acc then return false end
    return acc.passHash == hashPassword(acc.passSalt, password)
end

function X.SetEmail(acc, email)
    if not acc or type(email) ~= 'string' or email == '' then return false end
    acc.email = email:lower()
    X.SaveAccount(acc)
    return true
end

function X.SetPassword(acc, password)
    if not acc or type(password) ~= 'string' or #password < 4 then return false end
    acc.passSalt = randomSalt()
    acc.passHash = hashPassword(acc.passSalt, password)
    X.SaveAccount(acc)
    return true
end

function X.SetHandle(acc, newHandle)
    local norm = X.NormalizeHandle(newHandle)
    if #norm < 3 or #norm > 15 then return false, 'handle' end
    if not X.HandleAvailable(norm, acc.id) then return false, 'taken' end
    local h = handles()
    if acc.handle then h[acc.handle:lower()] = nil end
    h[norm:lower()] = acc.id
    saveHandles()
    acc.handle = norm
    X.SaveAccount(acc)
    return true
end

function X.BadgeOf(acc)
    return (acc and acc.badge == 'gold') and 'gold' or 'blue'
end

function X.SetBadge(acc, tier)
    if not acc then return false end
    acc.badge = (tier == 'gold') and 'gold' or nil
    X.SaveAccount(acc)
    return true
end

function X.Summary(acc)
    if not acc then return nil end
    return {
        id       = acc.id,
        handle   = acc.handle,
        name     = acc.name,
        avatar   = acc.avatar,
        verified = true,
        badge    = X.BadgeOf(acc),
    }
end

function X.SetFollow(meId, targetId, on)
    local me = X.GetAccount(meId)
    local target = X.GetAccount(targetId)
    if not me or not target or tostring(meId) == tostring(targetId) then return nil end
    me.following = me.following or {}
    target.followers = target.followers or {}
    if on then
        me.following[tostring(targetId)] = true
        target.followers[tostring(meId)] = true
    else
        me.following[tostring(targetId)] = nil
        target.followers[tostring(meId)] = nil
    end
    X.SaveAccount(me)
    X.SaveAccount(target)
    return on == true
end

function X.IsFollowing(meId, targetId)
    local me = X.GetAccount(meId)
    return me and me.following and me.following[tostring(targetId)] == true or false
end

function X.GetPost(id)
    if id == nil then return nil end
    return posts()[tostring(id)]
end

function X.SavePost(p)
    if not p or not p.id then return end
    posts()[tostring(p.id)] = p
    savePosts()
end

-- media = { {url,type('image'|'video'|'gif'),thumb?}, ... }
function X.CreatePost(authorId, text, media, parentId)
    local id = nextId('nextPostId')
    local parent = parentId and X.GetPost(parentId) or nil
    local rootId
    if parent then rootId = parent.rootId or parent.id end
    local p = {
        id         = id,
        author     = authorId,
        text       = tostring(text or ''):sub(1, 800),
        media      = media or {},
        createdAt  = os.time(),
        likes      = {},
        reposts    = {},
        parentId   = parentId,
        rootId     = rootId,
        replyCount = 0,
    }
    posts()[tostring(id)] = p

    if parent then
        parent.replyCount = (parent.replyCount or 0) + 1
    end
    savePosts()
    return p
end

function X.DeletePost(id)
    local p = X.GetPost(id)
    if not p then return end
    if p.parentId then
        local parent = X.GetPost(p.parentId)
        if parent and parent.replyCount then parent.replyCount = math.max(0, parent.replyCount - 1) end
    end
    posts()[tostring(id)] = nil
    savePosts()
end

function X.DeleteAccount(acc)
    if not acc then return false end
    local id = tostring(acc.id)
    local P = posts()

    for pid, p in pairs(P) do
        if tostring(p.author) == id then
            if p.parentId then
                local parent = P[tostring(p.parentId)]
                if parent and parent.replyCount then parent.replyCount = math.max(0, parent.replyCount - 1) end
            end
            P[pid] = nil
        end
    end

    for _, p in pairs(P) do
        if p.likes then p.likes[id] = nil end
        if p.reposts then p.reposts[id] = nil end
    end
    savePosts()

    local A = accounts()
    for _, other in pairs(A) do
        if other.following then other.following[id] = nil end
        if other.followers then other.followers[id] = nil end
    end

    notifs()[id] = nil
    saveNotifs()

    if acc.handle then handles()[acc.handle:lower()] = nil; saveHandles() end
    A[id] = nil
    saveAccounts()
    return true
end

local MAX_NOTIFS = 60

function X.PushNotif(accountId, notif)
    if not accountId then return end
    local n = notifs()
    local key = tostring(accountId)
    n[key] = n[key] or {}
    notif.id = (os.time() * 1000) + math.random(0, 999)
    notif.ts = os.time()
    notif.read = false
    table.insert(n[key], 1, notif)
    while #n[key] > MAX_NOTIFS do table.remove(n[key]) end
    saveNotifs()
end

function X.GetNotifs(accountId)
    return notifs()[tostring(accountId)] or {}
end

function X.MarkNotifsRead(accountId)
    local list = notifs()[tostring(accountId)]
    if not list then return end
    for _, it in ipairs(list) do it.read = true end
    saveNotifs()
end

function X.UnreadNotifCount(accountId)
    local list = notifs()[tostring(accountId)]
    if not list then return 0 end
    local n = 0
    for _, it in ipairs(list) do if not it.read then n = n + 1 end end
    return n
end

function X.AllPosts() return posts() end
function X.AllAccounts() return accounts() end
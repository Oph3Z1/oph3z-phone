--[[
    oph3z-phone | X (social) — SERVER callbacks

    Auth (register / login / logout, session kept per character in doc.x), the
    global feed (For You / Following), posts + replies, likes, reposts, profiles,
    follow, edit-profile, search, trending topics and notifications.

    Alerts are delivered two ways (see notifyAccount): the X in-app "bell"
    (X.PushNotif) AND the phone's global notification center (Notif.Push), so you
    see them even when X is closed.
--]]

-- store.lua defines the global `X` table, but the fxmanifest glob loads files
-- alphabetically (main.lua BEFORE store.lua), so guard the table here — store.lua
-- also does `X = X or {}` and just fills in the functions (all used at runtime).
X = X or {}

-- ---- session (which account a character is logged into) -------------------
-- Stored in the citizen's own phone doc so it survives relogs. In-memory maps
-- track ONLINE sessions for live push.
local online   = {} -- accountId(str) -> src
local srcAcc   = {} -- src           -> accountId

local function cidOf(src)
    return DB.GetCitizenId(src)
end

local function currentAccountId(src)
    local cid = cidOf(src)
    if not cid then return nil end
    local doc = DB.LoadOrCreate(cid)
    return doc.x and doc.x.accountId or nil
end

-- Bind a character to an account for this session (login / register / restore).
local function bindSession(src, acc)
    local cid = cidOf(src)
    if not cid or not acc then return end
    local doc = DB.LoadOrCreate(cid)
    doc.x = doc.x or {}
    doc.x.accountId = acc.id
    DB.Save(cid, doc)

    online[tostring(acc.id)] = src
    srcAcc[src] = tostring(acc.id)

    acc.lastCid = cid -- so offline alerts route to this character
    X.SaveAccount(acc)
end

local function unbindSession(src)
    local cid = cidOf(src)
    if cid then
        local doc = DB.LoadOrCreate(cid)
        if doc.x then doc.x.accountId = nil; DB.Save(cid, doc) end
    end
    local accId = srcAcc[src]
    if accId then online[accId] = nil end
    srcAcc[src] = nil
end

AddEventHandler('playerDropped', function()
    local src = source
    local accId = srcAcc[src]
    if accId and online[accId] == src then online[accId] = nil end
    srcAcc[src] = nil
end)

-- ---- serialization --------------------------------------------------------
local function serializePost(p, viewerId)
    if not p then return nil end
    local author = X.GetAccount(p.author)
    local v = tostring(viewerId or '')
    return {
        id         = p.id,
        text       = p.text or '',
        media      = p.media or {},
        createdAt  = p.createdAt,
        author     = X.Summary(author),
        likeCount  = X.countKeys(p.likes),
        liked      = p.likes and p.likes[v] == true or false,
        repostCount= X.countKeys(p.reposts),
        reposted   = p.reposts and p.reposts[v] ~= nil or false,
        replyCount = p.replyCount or 0,
        parentId   = p.parentId,
        rootId     = p.rootId,
    }
end

-- ---- alerts ---------------------------------------------------------------
-- Deliver an alert to an account both in-app (bell) and to the phone center.
local function notifyAccount(targetAccId, opts)
    if not targetAccId then return end
    X.PushNotif(targetAccId, { type = opts.type, actor = opts.actorId, postId = opts.postId })

    -- Phone notification center: route to whoever is (or last was) on this account.
    local target = X.GetAccount(targetAccId)
    local targetCid
    local liveSrc = online[tostring(targetAccId)]
    if liveSrc then targetCid = cidOf(liveSrc) else targetCid = target and target.lastCid or nil end
    if targetCid and Notif then
        Notif.Push(targetCid, { app = 'x', title = opts.title or 'X', body = opts.body or '', route = { app = 'x' } })
    end

    -- Live badge refresh if they're online with X.
    if liveSrc then
        TriggerClientEvent('oph3z-phone:client:x:live', liveSrc, { kind = 'notif' })
    end
end

-- Parse @mentions from text and notify each (except author + already-notified).
local function notifyMentions(text, actorAcc, postId, skip)
    if type(text) ~= 'string' then return end
    local seen = {}
    for handle in text:gmatch('@([%w_]+)') do
        local tid = X.AccountIdByHandle(handle)
        local key = tid and tostring(tid) or nil
        if key and key ~= tostring(actorAcc.id) and not seen[key] and not (skip and skip[key]) then
            seen[key] = true
            notifyAccount(tid, {
                type = 'mention', actorId = actorAcc.id, postId = postId,
                title = actorAcc.name, body = ('@%s mentioned you'):format(actorAcc.handle),
            })
        end
    end
end

-- ---- email verification / recovery (codes delivered via the Mail app) -----
-- One pending op per character (keyed by citizenid). Modes: register|recover|email.
local pendingAuth = {}
local CODE_TTL = 600 -- 10 minutes

local function genCode() return ('%06d'):format(math.random(0, 999999)) end

local function maskEmail(e)
    local user, domain = tostring(e or ''):match('^([^@]+)@(.+)$')
    if not user then return e end
    return user:sub(1, 1) .. ('*'):rep(math.max(1, #user - 1)) .. '@' .. domain
end

local PURPOSE = { register = 'registration', recover = 'password recovery', email = 'email change' }

-- Deliver a code to the mailbox that owns `email` (an in-game Mail address).
local function sendCode(email, code, purpose)
    local targetCid = DB.GetCitizenIdByMail(email)
    if not targetCid or not Mail then return false end
    Mail.SendSystem(targetCid, {
        from        = 'X',
        fromAddress = 'no-reply@x.com',
        subject     = 'Your X verification code',
        body        = ('Your X %s code is %s.\n\nIt expires in 10 minutes. If this wasn\'t you, ignore this email.'):format(purpose, code),
    })
    return true
end

-- The character's own Mail address (ensured) — used to pre-fill registration.
local function myMailAddress(src)
    local cid = cidOf(src)
    if not cid then return nil end
    local player = exports.qbx_core:GetPlayer(src)
    local ci = player and player.PlayerData and player.PlayerData.charinfo
    local doc = DB.EnsureMail(cid, DB.LoadOrCreate(cid), ci and ci.firstname, ci and ci.lastname)
    return doc.mail and doc.mail.address or nil
end

-- ===========================================================================
-- AUTH
-- ===========================================================================

-- Current session for this phone (used on open — "stay logged in").
lib.callback.register('oph3z-phone:server:x:session', function(src)
    local accId = currentAccountId(src)
    local acc = accId and X.GetAccount(accId) or nil
    if acc then bindSession(src, acc) end -- refresh online map + lastCid
    return { me = acc and X.Summary(acc) or nil, mailAddress = myMailAddress(src) }
end)

-- Registration is TWO steps: this validates + emails a code (account not created
-- until the code is verified). Returns { ok, pending, email }.
lib.callback.register('oph3z-phone:server:x:register', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false, reason = 'bad' } end
    local norm = X.NormalizeHandle(data.handle)
    if #norm < 3 or #norm > 15 then return { ok = false, reason = 'handle' } end
    if not X.HandleAvailable(norm) then return { ok = false, reason = 'taken' } end
    if type(data.password) ~= 'string' or #data.password < 4 then return { ok = false, reason = 'password' } end
    local email = tostring(data.email or ''):lower()
    if email == '' or not DB.GetCitizenIdByMail(email) then return { ok = false, reason = 'email' } end
    if X.EmailInUse(email) then return { ok = false, reason = 'emailtaken' } end
    local name = tostring(data.name or ''):sub(1, 40)
    if name == '' then name = norm end

    local code = genCode()
    pendingAuth[cid] = { mode = 'register', code = code, expiresAt = os.time() + CODE_TTL,
        handle = norm, name = name, password = data.password, email = email }
    if not sendCode(email, code, PURPOSE.register) then
        pendingAuth[cid] = nil
        return { ok = false, reason = 'email' }
    end
    return { ok = true, pending = true, email = email }
end)

-- Verify the registration code, then actually create + log into the account.
lib.callback.register('oph3z-phone:server:x:verifyRegister', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false } end
    local p = pendingAuth[cid]
    if not p or p.mode ~= 'register' then return { ok = false, reason = 'expired' } end
    if os.time() > p.expiresAt then pendingAuth[cid] = nil; return { ok = false, reason = 'expired' } end
    if tostring(data.code) ~= p.code then return { ok = false, reason = 'code' } end
    if not X.HandleAvailable(p.handle) then pendingAuth[cid] = nil; return { ok = false, reason = 'taken' } end
    local acc = X.CreateAccount(p.handle, p.name, p.password, cid, p.email)
    pendingAuth[cid] = nil
    if not acc then return { ok = false, reason = 'bad' } end
    bindSession(src, acc)
    return { ok = true, me = X.Summary(acc) }
end)

lib.callback.register('oph3z-phone:server:x:login', function(src, data)
    if type(data) ~= 'table' then return { ok = false, reason = 'bad' } end
    local accId = X.AccountIdByHandle(data.handle)
    local acc = accId and X.GetAccount(accId) or nil
    if not acc then return { ok = false, reason = 'notfound' } end
    if not X.CheckPassword(acc, data.password) then return { ok = false, reason = 'password' } end
    bindSession(src, acc)
    return { ok = true, me = X.Summary(acc) }
end)

lib.callback.register('oph3z-phone:server:x:logout', function(src)
    unbindSession(src)
    return { ok = true }
end)

-- Start password recovery: email a code to the account's linked address.
lib.callback.register('oph3z-phone:server:x:recoverStart', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false } end
    local acc = X.GetAccount(X.AccountIdByHandle(data.handle))
    if not acc then return { ok = false, reason = 'notfound' } end
    if not acc.email or not DB.GetCitizenIdByMail(acc.email) then return { ok = false, reason = 'noemail' } end
    local code = genCode()
    pendingAuth[cid] = { mode = 'recover', code = code, expiresAt = os.time() + CODE_TTL, accountId = acc.id, email = acc.email }
    sendCode(acc.email, code, PURPOSE.recover)
    return { ok = true, pending = true, email = maskEmail(acc.email) }
end)

-- Verify the recovery code + set a new password (auto-logs in).
lib.callback.register('oph3z-phone:server:x:recoverVerify', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false } end
    local p = pendingAuth[cid]
    if not p or p.mode ~= 'recover' then return { ok = false, reason = 'expired' } end
    if os.time() > p.expiresAt then pendingAuth[cid] = nil; return { ok = false, reason = 'expired' } end
    if tostring(data.code) ~= p.code then return { ok = false, reason = 'code' } end
    if type(data.newPassword) ~= 'string' or #data.newPassword < 4 then return { ok = false, reason = 'weak' } end
    local acc = X.GetAccount(p.accountId)
    if not acc then pendingAuth[cid] = nil; return { ok = false } end
    X.SetPassword(acc, data.newPassword)
    pendingAuth[cid] = nil
    bindSession(src, acc)
    return { ok = true, me = X.Summary(acc) }
end)

-- Start an email change for the logged-in account (code to the NEW address).
lib.callback.register('oph3z-phone:server:x:emailStart', function(src, data)
    local cid = cidOf(src)
    local viewerId = currentAccountId(src)
    if not viewerId or not cid or type(data) ~= 'table' then return { ok = false } end
    local email = tostring(data.email or ''):lower()
    if email == '' or not DB.GetCitizenIdByMail(email) then return { ok = false, reason = 'email' } end
    if X.EmailInUse(email, viewerId) then return { ok = false, reason = 'emailtaken' } end
    local code = genCode()
    pendingAuth[cid] = { mode = 'email', code = code, expiresAt = os.time() + CODE_TTL, accountId = viewerId, email = email }
    sendCode(email, code, PURPOSE.email)
    return { ok = true, pending = true, email = email }
end)

lib.callback.register('oph3z-phone:server:x:emailVerify', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false } end
    local p = pendingAuth[cid]
    if not p or p.mode ~= 'email' then return { ok = false, reason = 'expired' } end
    if os.time() > p.expiresAt then pendingAuth[cid] = nil; return { ok = false, reason = 'expired' } end
    if tostring(data.code) ~= p.code then return { ok = false, reason = 'code' } end
    local acc = X.GetAccount(p.accountId)
    if not acc then pendingAuth[cid] = nil; return { ok = false } end
    X.SetEmail(acc, p.email)
    pendingAuth[cid] = nil
    return { ok = true }
end)

-- Resend the current pending code, and cancel it.
lib.callback.register('oph3z-phone:server:x:resendCode', function(src)
    local cid = cidOf(src)
    local p = cid and pendingAuth[cid]
    if not p then return { ok = false, reason = 'expired' } end
    p.code = genCode()
    p.expiresAt = os.time() + CODE_TTL
    sendCode(p.email, p.code, PURPOSE[p.mode] or 'verification')
    return { ok = true }
end)

lib.callback.register('oph3z-phone:server:x:cancelPending', function(src)
    local cid = cidOf(src)
    if cid then pendingAuth[cid] = nil end
    return { ok = true }
end)

-- Permanently delete the logged-in account (requires the current password). Wipes
-- posts, likes/reposts, follows, notifications and frees the @handle.
lib.callback.register('oph3z-phone:server:x:deleteAccount', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local acc = X.GetAccount(viewerId)
    if not acc then return { ok = false } end
    if not X.CheckPassword(acc, data.password) then return { ok = false, reason = 'password' } end
    unbindSession(src)          -- clear the session first (online map + doc.x)
    X.DeleteAccount(acc)
    return { ok = true }
end)

-- Admin: grant/revoke the GOLD (company) badge. Blue is automatic for everyone.
--   /xverify <@handle> [gold|blue]     (defaults to gold)
-- Works for any qbx/txAdmin admin out of the box — gated on the same `group.admin`
-- ACE every built-in qbx admin command uses, so no server.cfg changes are needed.
RegisterCommand('xverify', function(src, args)
    if src ~= 0 and not IsPlayerAceAllowed(src, 'group.admin') then
        TriggerClientEvent('ox_lib:notify', src, { type = 'error', description = 'No permission.' })
        return
    end
    local handle = args[1]
    if not handle then print('[x] usage: xverify <@handle> [gold|blue]'); return end
    local acc = X.GetAccount(X.AccountIdByHandle(handle))
    if not acc then print(('[x] no account @%s'):format(tostring(handle))); return end
    X.SetBadge(acc, (args[2] or 'gold'):lower())
    print(('[x] @%s badge -> %s'):format(acc.handle, X.BadgeOf(acc)))
    local liveSrc = online[tostring(acc.id)]
    if liveSrc then TriggerClientEvent('oph3z-phone:client:x:live', liveSrc, { kind = 'badge' }) end
end, false)

-- ===========================================================================
-- FEED
-- ===========================================================================

-- Build feed entries (top-level posts + repost surfacing), newest first.
-- filter(entry) decides inclusion; entry = { post, ts, repostById? }.
local function buildFeed(viewerId, filter)
    local entries = {}
    for _, p in pairs(X.AllPosts()) do
        if not p.parentId then
            local base = { post = p, ts = p.createdAt }
            if not filter or filter(base) then entries[#entries + 1] = base end
            if p.reposts then
                for accId, ts in pairs(p.reposts) do
                    local e = { post = p, ts = ts, repostBy = accId }
                    if not filter or filter(e) then entries[#entries + 1] = e end
                end
            end
        end
    end
    table.sort(entries, function(a, b) return (a.ts or 0) > (b.ts or 0) end)

    local out = {}
    for i = 1, math.min(#entries, 80) do
        local e = entries[i]
        local sp = serializePost(e.post, viewerId)
        if sp then
            if e.repostBy then sp.repostBy = X.Summary(X.GetAccount(e.repostBy)) end
            sp.feedTs = e.ts
            out[#out + 1] = sp
        end
    end
    return out
end

lib.callback.register('oph3z-phone:server:x:feed', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId then return { ok = false, reason = 'auth' } end
    local tab = (type(data) == 'table' and data.tab) or 'foryou'

    if tab == 'following' then
        local me = X.GetAccount(viewerId)
        local following = (me and me.following) or {}
        local vid = tostring(viewerId)
        return {
            ok = true,
            items = buildFeed(viewerId, function(e)
                if e.repostBy then return following[tostring(e.repostBy)] == true or tostring(e.repostBy) == vid end
                return following[tostring(e.post.author)] == true or tostring(e.post.author) == vid
            end),
        }
    end
    return { ok = true, items = buildFeed(viewerId, nil) }
end)

-- ===========================================================================
-- POSTS
-- ===========================================================================
local function sanitizeMedia(media)
    if type(media) ~= 'table' then return {} end
    local out = {}
    for _, m in ipairs(media) do
        if type(m) == 'table' and type(m.url) == 'string' and m.url:match('^https?://') then
            local t = (m.type == 'video' and 'video') or (m.type == 'gif' and 'gif') or 'image'
            out[#out + 1] = { url = m.url, type = t, thumb = (type(m.thumb) == 'string' and m.thumb) or nil }
            if #out >= 4 then break end
        end
    end
    return out
end

lib.callback.register('oph3z-phone:server:x:post', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false, reason = 'auth' } end
    local acc = X.GetAccount(viewerId)

    local text = tostring(data.text or ''):sub(1, 800)
    local media = sanitizeMedia(data.media)
    if text == '' and #media == 0 then return { ok = false, reason = 'empty' } end

    local parentId = tonumber(data.parentId)
    if parentId and not X.GetPost(parentId) then parentId = nil end

    local p = X.CreatePost(viewerId, text, media, parentId)

    -- Notify: reply target + mentions.
    local skip = {}
    if parentId then
        local parent = X.GetPost(parentId)
        if parent and tostring(parent.author) ~= tostring(viewerId) then
            skip[tostring(parent.author)] = true
            notifyAccount(parent.author, {
                type = 'reply', actorId = viewerId, postId = p.id,
                title = acc.name, body = ('@%s replied to you'):format(acc.handle),
            })
        end
    end
    notifyMentions(text, acc, p.id, skip)

    return { ok = true, post = serializePost(p, viewerId) }
end)

lib.callback.register('oph3z-phone:server:x:like', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local p = X.GetPost(tonumber(data.id))
    if not p then return { ok = false } end
    p.likes = p.likes or {}
    local v = tostring(viewerId)
    local liked
    if p.likes[v] then p.likes[v] = nil; liked = false
    else p.likes[v] = true; liked = true end
    X.SavePost(p)

    if liked and tostring(p.author) ~= v then
        local acc = X.GetAccount(viewerId)
        notifyAccount(p.author, {
            type = 'like', actorId = viewerId, postId = p.id,
            title = acc.name, body = ('@%s liked your post'):format(acc.handle),
        })
    end
    return { ok = true, liked = liked, likeCount = X.countKeys(p.likes) }
end)

lib.callback.register('oph3z-phone:server:x:repost', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local p = X.GetPost(tonumber(data.id))
    if not p then return { ok = false } end
    p.reposts = p.reposts or {}
    local v = tostring(viewerId)
    local reposted
    if p.reposts[v] then p.reposts[v] = nil; reposted = false
    else p.reposts[v] = os.time(); reposted = true end
    X.SavePost(p)

    if reposted and tostring(p.author) ~= v then
        local acc = X.GetAccount(viewerId)
        notifyAccount(p.author, {
            type = 'repost', actorId = viewerId, postId = p.id,
            title = acc.name, body = ('@%s reposted your post'):format(acc.handle),
        })
    end
    return { ok = true, reposted = reposted, repostCount = X.countKeys(p.reposts) }
end)

lib.callback.register('oph3z-phone:server:x:delete', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local p = X.GetPost(tonumber(data.id))
    if not p then return { ok = false } end
    if tostring(p.author) ~= tostring(viewerId) then return { ok = false, reason = 'owner' } end
    X.DeletePost(p.id)
    return { ok = true }
end)

-- A post + its replies (the Post detail screen).
lib.callback.register('oph3z-phone:server:x:thread', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local p = X.GetPost(tonumber(data.id))
    if not p then return { ok = false, reason = 'gone' } end

    -- Ancestor chain (so a reply shows what it's replying to).
    local ancestors = {}
    local cur = p.parentId and X.GetPost(p.parentId) or nil
    local guard = 0
    while cur and guard < 20 do
        table.insert(ancestors, 1, serializePost(cur, viewerId))
        cur = cur.parentId and X.GetPost(cur.parentId) or nil
        guard = guard + 1
    end

    -- Direct replies, oldest first.
    local replies = {}
    for _, r in pairs(X.AllPosts()) do
        if r.parentId and tostring(r.parentId) == tostring(p.id) then
            replies[#replies + 1] = serializePost(r, viewerId)
        end
    end
    table.sort(replies, function(a, b) return (a.createdAt or 0) < (b.createdAt or 0) end)

    return { ok = true, post = serializePost(p, viewerId), ancestors = ancestors, replies = replies }
end)

-- ===========================================================================
-- PROFILES / FOLLOW
-- ===========================================================================
local function fullProfile(acc, viewerId)
    if not acc then return nil end
    -- Authored top-level posts + reposts (newest first), and replies.
    local postsList, repliesList = {}, {}
    for _, p in pairs(X.AllPosts()) do
        if tostring(p.author) == tostring(acc.id) then
            if p.parentId then repliesList[#repliesList + 1] = { post = p, ts = p.createdAt }
            else postsList[#postsList + 1] = { post = p, ts = p.createdAt } end
        elseif not p.parentId and p.reposts and p.reposts[tostring(acc.id)] then
            postsList[#postsList + 1] = { post = p, ts = p.reposts[tostring(acc.id)], repost = true }
        end
    end
    table.sort(postsList, function(a, b) return (a.ts or 0) > (b.ts or 0) end)
    table.sort(repliesList, function(a, b) return (a.ts or 0) > (b.ts or 0) end)

    local function ser(list)
        local out = {}
        for _, e in ipairs(list) do
            local sp = serializePost(e.post, viewerId)
            if sp then
                if e.repost then sp.repostBy = X.Summary(acc) end
                out[#out + 1] = sp
            end
        end
        return out
    end

    return {
        id        = acc.id,
        handle    = acc.handle,
        name      = acc.name,
        bio       = acc.bio or '',
        avatar    = acc.avatar,
        banner    = acc.banner,
        verified  = true,             -- blue check is automatic for everyone
        badge     = X.BadgeOf(acc),   -- 'blue' | 'gold' (gold = admin-granted company)
        createdAt = acc.createdAt,
        followersCount = X.countKeys(acc.followers),
        followingCount = X.countKeys(acc.following),
        isMe        = tostring(acc.id) == tostring(viewerId),
        isFollowing = X.IsFollowing(viewerId, acc.id),
        -- Only expose the recovery email to the owner (for the editor).
        email       = (tostring(acc.id) == tostring(viewerId)) and acc.email or nil,
        posts       = ser(postsList),
        replies     = ser(repliesList),
    }
end
X.FullProfile = fullProfile

lib.callback.register('oph3z-phone:server:x:profile', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId then return { ok = false, reason = 'auth' } end
    local acc
    if type(data) == 'table' and data.handle then acc = X.GetAccount(X.AccountIdByHandle(data.handle))
    elseif type(data) == 'table' and data.id then acc = X.GetAccount(data.id)
    else acc = X.GetAccount(viewerId) end
    if not acc then return { ok = false, reason = 'notfound' } end
    return { ok = true, profile = fullProfile(acc, viewerId) }
end)

lib.callback.register('oph3z-phone:server:x:follow', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local targetId = tonumber(data.id)
    local res = X.SetFollow(viewerId, targetId, data.on == true)
    if res == nil then return { ok = false } end
    if res and data.on then
        local acc = X.GetAccount(viewerId)
        notifyAccount(targetId, {
            type = 'follow', actorId = viewerId,
            title = acc.name, body = ('@%s followed you'):format(acc.handle),
        })
    end
    local target = X.GetAccount(targetId)
    return { ok = true, following = res, followersCount = X.countKeys(target and target.followers) }
end)

-- Followers / following list for an account (each row carries the viewer's
-- follow state so you can follow/unfollow straight from the list).
lib.callback.register('oph3z-phone:server:x:followList', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local acc
    if data.handle then acc = X.GetAccount(X.AccountIdByHandle(data.handle))
    elseif data.id then acc = X.GetAccount(data.id) end
    if not acc then return { ok = false, reason = 'notfound' } end

    local map = (data.type == 'following') and acc.following or acc.followers
    local out = {}
    if type(map) == 'table' then
        for idStr in pairs(map) do
            local a = X.GetAccount(idStr)
            if a then
                local s = X.Summary(a)
                s.bio         = a.bio or ''
                s.isFollowing = X.IsFollowing(viewerId, a.id)
                s.isMe        = tostring(a.id) == tostring(viewerId)
                out[#out + 1] = s
            end
        end
    end
    return { ok = true, accounts = out }
end)

-- Remove a follower: the given account stops following ME (mutual maps updated).
lib.callback.register('oph3z-phone:server:x:removeFollower', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local followerId = tonumber(data.id)
    if not followerId then return { ok = false } end
    -- SetFollow(follower, me, false): follower.following[me]=nil, me.followers[follower]=nil.
    local res = X.SetFollow(followerId, viewerId, false)
    if res == nil then return { ok = false } end
    local me = X.GetAccount(viewerId)
    return { ok = true, followersCount = X.countKeys(me and me.followers) }
end)

-- Who liked / reposted a post. type = 'likes' | 'reposts'. Each row carries the
-- viewer's follow state (same shape as followList) so you can follow from here.
-- Reposts are ordered newest-first (the reposts map stores a timestamp).
lib.callback.register('oph3z-phone:server:x:postEngagers', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local post = X.GetPost(data.id)
    if not post then return { ok = false, reason = 'notfound' } end

    local isReposts = data.type == 'reposts'
    local map = isReposts and post.reposts or post.likes
    local rows = {}
    if type(map) == 'table' then
        for idStr, val in pairs(map) do
            local a = X.GetAccount(idStr)
            if a then
                local s = X.Summary(a)
                s.bio         = a.bio or ''
                s.isFollowing = X.IsFollowing(viewerId, a.id)
                s.isMe        = tostring(a.id) == tostring(viewerId)
                s._ts         = isReposts and (type(val) == 'number' and val or 0) or nil
                rows[#rows + 1] = s
            end
        end
    end
    if isReposts then
        table.sort(rows, function(x, y) return (x._ts or 0) > (y._ts or 0) end)
        for _, s in ipairs(rows) do s._ts = nil end
    end
    return { ok = true, accounts = rows }
end)

lib.callback.register('oph3z-phone:server:x:editProfile', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local acc = X.GetAccount(viewerId)
    if not acc then return { ok = false } end

    if type(data.handle) == 'string' and X.NormalizeHandle(data.handle):lower() ~= (acc.handle or ''):lower() then
        local ok, err = X.SetHandle(acc, data.handle)
        if not ok then return { ok = false, reason = err } end
    end
    if type(data.name) == 'string' and data.name ~= '' then acc.name = data.name:sub(1, 40) end
    if type(data.bio) == 'string' then acc.bio = data.bio:sub(1, 160) end
    if data.avatar == false then acc.avatar = nil
    elseif type(data.avatar) == 'string' and data.avatar:match('^https?://') then acc.avatar = data.avatar end
    if data.banner == false then acc.banner = nil
    elseif type(data.banner) == 'string' and data.banner:match('^https?://') then acc.banner = data.banner end
    X.SaveAccount(acc)

    return { ok = true, profile = fullProfile(acc, viewerId), me = X.Summary(acc) }
end)

-- Change the logged-in account's password (verifies the current one first).
lib.callback.register('oph3z-phone:server:x:changePassword', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local acc = X.GetAccount(viewerId)
    if not acc then return { ok = false } end
    if not X.CheckPassword(acc, tostring(data.current or '')) then return { ok = false, reason = 'password' } end
    if type(data.new) ~= 'string' or #data.new < 4 then return { ok = false, reason = 'weak' } end
    X.SetPassword(acc, data.new)
    return { ok = true }
end)

-- ===========================================================================
-- SEARCH / TOPICS
-- ===========================================================================
lib.callback.register('oph3z-phone:server:x:search', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId then return { ok = false } end
    local q = tostring((type(data) == 'table' and data.q) or ''):lower()
    q = q:gsub('^@', '')
    local accountsOut = {}
    if q ~= '' then
        for _, acc in pairs(X.AllAccounts()) do
            if (acc.handle or ''):lower():find(q, 1, true) or (acc.name or ''):lower():find(q, 1, true) then
                local s = X.Summary(acc)
                s.followersCount = X.countKeys(acc.followers)
                s.bio = acc.bio or ''
                accountsOut[#accountsOut + 1] = s
                if #accountsOut >= 30 then break end
            end
        end
    end
    return { ok = true, accounts = accountsOut }
end)

-- Trending hashtags (scan all posts).
lib.callback.register('oph3z-phone:server:x:topics', function(src)
    local viewerId = currentAccountId(src)
    if not viewerId then return { ok = false } end
    local counts, display = {}, {}
    for _, p in pairs(X.AllPosts()) do
        if type(p.text) == 'string' then
            local seen = {}
            for tag in p.text:gmatch('#(%w+)') do
                local low = tag:lower()
                if not seen[low] then
                    seen[low] = true
                    counts[low] = (counts[low] or 0) + 1
                    display[low] = display[low] or tag
                end
            end
        end
    end
    local list = {}
    for low, n in pairs(counts) do list[#list + 1] = { tag = display[low], count = n } end
    table.sort(list, function(a, b) return a.count > b.count end)
    local out = {}
    for i = 1, math.min(#list, 20) do out[i] = list[i] end
    return { ok = true, topics = out }
end)

-- Posts for one hashtag.
lib.callback.register('oph3z-phone:server:x:topic', function(src, data)
    local viewerId = currentAccountId(src)
    if not viewerId or type(data) ~= 'table' then return { ok = false } end
    local tag = tostring(data.tag or ''):gsub('^#', ''):lower()
    if tag == '' then return { ok = true, items = {} } end
    local entries = {}
    for _, p in pairs(X.AllPosts()) do
        if type(p.text) == 'string' and p.text:lower():find('#' .. tag, 1, true) then
            entries[#entries + 1] = p
        end
    end
    table.sort(entries, function(a, b) return (a.createdAt or 0) > (b.createdAt or 0) end)
    local out = {}
    for i = 1, math.min(#entries, 60) do out[#out + 1] = serializePost(entries[i], viewerId) end
    return { ok = true, items = out }
end)

-- ===========================================================================
-- NOTIFICATIONS (in-app bell)
-- ===========================================================================
local NOTIF_VERB = {
    like = 'liked your post', reply = 'replied to you', repost = 'reposted your post',
    follow = 'followed you', mention = 'mentioned you',
}

lib.callback.register('oph3z-phone:server:x:notifs', function(src)
    local viewerId = currentAccountId(src)
    if not viewerId then return { ok = false } end
    local raw = X.GetNotifs(viewerId)
    local out = {}
    for _, n in ipairs(raw) do
        out[#out + 1] = {
            id    = n.id,
            type  = n.type,
            actor = X.Summary(X.GetAccount(n.actor)),
            verb  = NOTIF_VERB[n.type] or 'did something',
            postId= n.postId,
            ts    = n.ts,
            read  = n.read == true,
        }
    end
    X.MarkNotifsRead(viewerId)
    return { ok = true, items = out }
end)
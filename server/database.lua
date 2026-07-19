DB = {}

math.randomseed(os.time())

function DB.GetCitizenId(src)
    return GetIdentifier(src)
end

local RESOURCE = GetCurrentResourceName()
local FOLDER   = Config.DataFolder

local function safeKey(citizenid)
    return (citizenid:gsub('[^%w%-_]', '_'))
end

local function filePath(citizenid)
    return ('%s/%s.json'):format(FOLDER, safeKey(citizenid))
end

local function isValidId(citizenid)
    return type(citizenid) == 'string' and #citizenid > 0
        and not citizenid:find('%.%.')
        and citizenid:match('^[%w:_%-]+$') ~= nil
end

local docCache  = {}
local docDirty  = {}
local docAccess = {}

local FLUSH_INTERVAL = 10000
local EVICT_AFTER    = 600

function DB.Load(citizenid)
    if not isValidId(citizenid) then return nil end

    local cached = docCache[citizenid]
    if cached then
        docAccess[citizenid] = os.time()
        return cached
    end

    local raw = LoadResourceFile(RESOURCE, filePath(citizenid))
    if not raw or raw == '' then return nil end

    local ok, decoded = pcall(json.decode, raw)
    if not ok or type(decoded) ~= 'table' then
        print(('[oph3z-phone] WARNING: corrupt data file for %s, ignoring.'):format(citizenid))
        return nil
    end

    docCache[citizenid]  = decoded
    docAccess[citizenid] = os.time()
    return decoded
end

local function writeDoc(citizenid)
    local doc = docCache[citizenid]
    if not doc then return false end

    doc.updatedAt = os.time()

    local encoded = json.encode(doc)
    local success = SaveResourceFile(RESOURCE, filePath(citizenid), encoded, -1)

    if Config.Debug then
        print(('[oph3z-phone] DB flush(%s) -> %s'):format(citizenid, tostring(success)))
    end

    return success == true or success == 1
end

function DB.Save(citizenid, document)
    if not isValidId(citizenid) or type(document) ~= 'table' then return false end

    docCache[citizenid]  = document
    docAccess[citizenid] = os.time()
    docDirty[citizenid]  = true
    return true
end

function DB.SaveNow(citizenid, document)
    if not isValidId(citizenid) or type(document) ~= 'table' then return false end

    docCache[citizenid]  = document
    docAccess[citizenid] = os.time()
    docDirty[citizenid]  = nil
    return writeDoc(citizenid)
end

function DB.FlushAll()
    for cid in pairs(docDirty) do
        docDirty[cid] = nil
        writeDoc(cid)
    end
end

CreateThread(function()
    while true do
        Wait(FLUSH_INTERVAL)
        DB.FlushAll()

        local now = os.time()
        for cid, ts in pairs(docAccess) do
            if not docDirty[cid] and (now - ts) > EVICT_AFTER then
                docCache[cid]  = nil
                docAccess[cid] = nil
            end
        end
    end
end)

AddEventHandler('playerDropped', function()
    DB.FlushAll()
end)

AddEventHandler('onResourceStop', function(res)
    if res == RESOURCE then DB.FlushAll() end
end)

function DB.LoadOrCreate(citizenid)
    local doc = DB.Load(citizenid)
    if doc then return doc end

    doc = {
        citizenid = citizenid,
        settings  = table.clone and table.clone(Config.DefaultSettings) or json.decode(json.encode(Config.DefaultSettings)),
        createdAt = os.time(),
    }
    DB.Save(citizenid, doc)
    return doc
end

local REGISTRY_PATH = ('%s/_numbers.json'):format(FOLDER)
local registryCache = nil

function DB.LoadRegistry()
    if registryCache then return registryCache end
    local raw = LoadResourceFile(RESOURCE, REGISTRY_PATH)
    if not raw or raw == '' then
        registryCache = {}
        return registryCache
    end
    local ok, decoded = pcall(json.decode, raw)
    registryCache = (ok and type(decoded) == 'table') and decoded or {}
    return registryCache
end

function DB.SaveRegistry(registry)
    registryCache = registry
    SaveResourceFile(RESOURCE, REGISTRY_PATH, json.encode(registry), -1)
end

function DB.GetCitizenIdByNumber(digits)
    return DB.LoadRegistry()[digits]
end

function DB.FormatNumber(digits)
    if #digits == 7 then
        return digits:sub(1, 3) .. '-' .. digits:sub(4)
    end
    return digits
end

local function generateNumber(registry)
    local prefix = Config.PhoneNumberPrefix or '555'
    for _ = 1, 50 do
        local suffix = ('%04d'):format(math.random(0, 9999))
        local digits = prefix .. suffix
        if not registry[digits] then return digits end
    end
    -- Extremely unlikely fallback: timestamp-based.
    return prefix .. tostring(os.time()):sub(-4)
end

function DB.EnsurePhone(citizenid, doc)
    doc.phone = doc.phone or {}
    local p = doc.phone
    p.contacts = p.contacts or {}
    p.recents  = p.recents or {}
    p.blocked  = p.blocked or {} -- map: numberDigits -> { number, name, ts }
    p.nextContactId = p.nextContactId or 1
    p.nextRecentId  = p.nextRecentId or 1

    if not p.number then
        local registry = DB.LoadRegistry()
        local digits = generateNumber(registry)
        registry[digits] = citizenid
        DB.SaveRegistry(registry)

        p.numberRaw = digits
        p.number = DB.FormatNumber(digits)
        DB.Save(citizenid, doc)
    end

    return doc
end

local MAIL_REGISTRY_PATH = ('%s/_mails.json'):format(FOLDER)
local mailRegistryCache = nil

local function loadMailRegistry()
    if mailRegistryCache then return mailRegistryCache end
    local raw = LoadResourceFile(RESOURCE, MAIL_REGISTRY_PATH)
    if not raw or raw == '' then
        mailRegistryCache = {}
        return mailRegistryCache
    end
    local ok, decoded = pcall(json.decode, raw)
    mailRegistryCache = (ok and type(decoded) == 'table') and decoded or {}
    return mailRegistryCache
end

local function saveMailRegistry(registry)
    mailRegistryCache = registry
    SaveResourceFile(RESOURCE, MAIL_REGISTRY_PATH, json.encode(registry), -1)
end

local function mailSlug(s)
    return (tostring(s or ''):lower()):gsub('[^a-z0-9]', '')
end

function DB.EnsureMail(citizenid, doc, firstname, lastname)
    doc.mail = doc.mail or {}
    local m = doc.mail
    m.inbox  = m.inbox or {}
    m.sent   = m.sent or {}
    m.nextId = m.nextId or 1

    if not m.address then
        local domain = Config.MailDomain or 'lsmail.com'
        local first  = mailSlug(firstname)
        local last   = mailSlug(lastname)

        local base
        if first ~= '' and last ~= '' then base = first .. '.' .. last
        elseif first ~= '' then base = first
        elseif last ~= '' then base = last
        else base = 'user' .. (mailSlug(citizenid):sub(1, 6)) end

        local registry = loadMailRegistry()
        local address = base .. '@' .. domain
        local n = 1
        while registry[address] and registry[address] ~= citizenid do
            n = n + 1
            address = base .. tostring(n) .. '@' .. domain
        end
        registry[address] = citizenid
        saveMailRegistry(registry)

        m.address = address
        DB.Save(citizenid, doc)
    end

    return doc
end

function DB.GetCitizenIdByMail(address)
    if type(address) ~= 'string' or address == '' then return nil end
    return loadMailRegistry()[address:lower()]
end

function DB.EnsureProfile(citizenid, doc, defaultName)
    doc.profile = doc.profile or {}
    if not doc.profile.name and defaultName and defaultName ~= '' then
        doc.profile.name = defaultName
        DB.Save(citizenid, doc)
    end
    return doc
end

function DB.Digits(s)
    return (tostring(s or '')):gsub('%D', '')
end

function DB.ResolveContact(citizenid, numberDigits)
    local doc = DB.Load(citizenid)
    if not doc or not doc.phone or not doc.phone.contacts then return nil end
    for _, c in ipairs(doc.phone.contacts) do
        if DB.Digits(c.number) == numberDigits then return c end
    end
    return nil
end

function DB.IsBlocked(doc, numberDigits)
    return doc and doc.phone and doc.phone.blocked and doc.phone.blocked[numberDigits] ~= nil
end

function DB.Block(citizenid, rawNumber)
    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    local digits = DB.Digits(rawNumber)
    if digits ~= '' then
        local contact = DB.ResolveContact(citizenid, digits)
        doc.phone.blocked[digits] = {
            number = rawNumber,
            name   = contact and contact.name or nil,
            ts     = os.time(),
        }
        DB.Save(citizenid, doc)
    end
    return doc.phone.blocked
end

function DB.Unblock(citizenid, rawNumber)
    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    doc.phone.blocked[DB.Digits(rawNumber)] = nil
    DB.Save(citizenid, doc)
    return doc.phone.blocked
end

function DB.LogRecent(citizenid, entry)
    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    entry.id = doc.phone.nextRecentId
    doc.phone.nextRecentId = doc.phone.nextRecentId + 1
    table.insert(doc.phone.recents, 1, entry)
    while #doc.phone.recents > (Config.MaxRecents or 50) do
        table.remove(doc.phone.recents)
    end
    DB.Save(citizenid, doc)
end
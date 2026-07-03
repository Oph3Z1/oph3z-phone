--[[
    oph3z-phone | JSON "database" layer (server-side)

    Stores one JSON file per player, keyed by their QBox citizenid, under:
        <resource>/data/<citizenid>.json

    Uses CitizenFX's LoadResourceFile / SaveResourceFile so no external DB
    (MySQL/oxmysql) is required. All public functions live on the `DB` table.
--]]

DB = {}

math.randomseed(os.time())

---Resolve a connected player's QBox citizenid (shared by all app servers).
---@param src number
---@return string|nil
function DB.GetCitizenId(src)
    local player = exports.qbx_core:GetPlayer(src)
    return player and player.PlayerData.citizenid or nil
end

local RESOURCE = GetCurrentResourceName()
local FOLDER   = Config.DataFolder

---Build the relative path to a citizen's data file.
---@param citizenid string
---@return string
local function filePath(citizenid)
    return ('%s/%s.json'):format(FOLDER, citizenid)
end

---Validate a citizenid so we never read/write outside the data folder.
---@param citizenid string
---@return boolean
local function isValidId(citizenid)
    return type(citizenid) == 'string' and citizenid:match('^[%w_-]+$') ~= nil
end

---Read and decode a citizen's phone document. Returns nil if it doesn't exist.
---@param citizenid string
---@return table|nil
function DB.Load(citizenid)
    if not isValidId(citizenid) then return nil end

    local raw = LoadResourceFile(RESOURCE, filePath(citizenid))
    if not raw or raw == '' then return nil end

    local ok, decoded = pcall(json.decode, raw)
    if not ok or type(decoded) ~= 'table' then
        print(('[oph3z-phone] WARNING: corrupt data file for %s, ignoring.'):format(citizenid))
        return nil
    end

    return decoded
end

---Encode and persist a citizen's phone document.
---@param citizenid string
---@param document table
---@return boolean success
function DB.Save(citizenid, document)
    if not isValidId(citizenid) or type(document) ~= 'table' then return false end

    document.updatedAt = os.time()

    local encoded = json.encode(document, { indent = true })
    -- SaveResourceFile returns true on success.
    local success = SaveResourceFile(RESOURCE, filePath(citizenid), encoded, -1)

    if Config.Debug then
        print(('[oph3z-phone] DB.Save(%s) -> %s'):format(citizenid, tostring(success)))
    end

    return success == true or success == 1
end

---Load a citizen's document, creating it with defaults if it doesn't exist yet.
---@param citizenid string
---@return table document
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

-- ===========================================================================
-- Phone numbers (generated & owned by this resource, framework-agnostic)
--   Registry file maps a normalised number -> citizenid for uniqueness and
--   future reverse lookups (e.g. real calls).
-- ===========================================================================
local REGISTRY_PATH = ('%s/_numbers.json'):format(FOLDER)
local registryCache = nil

---@return table<string, string> registry  map of number(digits) -> citizenid
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

---Look up which citizenid owns a number (digits). Uses the in-memory cache.
---@param digits string
---@return string|nil citizenid
function DB.GetCitizenIdByNumber(digits)
    return DB.LoadRegistry()[digits]
end

---Format raw digits for display, e.g. "5550142" -> "555-0142".
---@param digits string
---@return string
function DB.FormatNumber(digits)
    if #digits == 7 then
        return digits:sub(1, 3) .. '-' .. digits:sub(4)
    end
    return digits
end

---Generate a unique phone number (digits) not already in the registry.
---@param registry table
---@return string digits
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

---Ensure a document has the phone sub-table (number, contacts, recents).
---Generates & registers a unique number on first call. Returns the document.
---@param citizenid string
---@param doc table
---@return table doc
function DB.EnsurePhone(citizenid, doc)
    doc.phone = doc.phone or {}
    local p = doc.phone
    p.contacts = p.contacts or {}
    p.recents  = p.recents or {}
    p.blocked  = p.blocked or {}      -- map: numberDigits -> { number, name, ts }
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

-- ===========================================================================
-- Mail (auto-generated address per player; inbox used by the Mail app later)
--   Registry file maps an address -> citizenid to keep addresses unique.
-- ===========================================================================
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

---Turn a name part into a mail-safe slug ("Böb O'Brien" -> "boborien").
---@param s any
---@return string
local function mailSlug(s)
    return (tostring(s or ''):lower()):gsub('[^a-z0-9]', '')
end

---Ensure the document has a mail sub-table with a unique address + inbox.
---Builds "firstname.lastname@<Config.MailDomain>" on first call, suffixing a
---number on collision (barbara.orton@ -> barbara.orton2@).
---@param citizenid string
---@param doc table
---@param firstname string|nil
---@param lastname string|nil
---@return table doc
function DB.EnsureMail(citizenid, doc, firstname, lastname)
    doc.mail = doc.mail or {}
    local m = doc.mail
    m.inbox  = m.inbox or {}          -- { {id, from, subject, body, read, ts}, ... }
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

-- ===========================================================================
-- Profile (phone "ID": display name + avatar; independent of the OOC char name)
-- ===========================================================================
---Ensure the document has a profile sub-table. `defaultName` seeds the display
---name on first call (usually the character's full name).
---@param citizenid string
---@param doc table
---@param defaultName string|nil
---@return table doc
function DB.EnsureProfile(citizenid, doc, defaultName)
    doc.profile = doc.profile or {}
    if not doc.profile.name and defaultName and defaultName ~= '' then
        doc.profile.name = defaultName
        DB.Save(citizenid, doc)
    end
    return doc
end

---Strip everything but digits from a number string.
---@param s any
---@return string
function DB.Digits(s)
    return (tostring(s or '')):gsub('%D', '')
end

---Find a saved contact (by number) in a citizen's phone book.
---@param citizenid string
---@param numberDigits string
---@return table|nil contact
function DB.ResolveContact(citizenid, numberDigits)
    local doc = DB.Load(citizenid)
    if not doc or not doc.phone or not doc.phone.contacts then return nil end
    for _, c in ipairs(doc.phone.contacts) do
        if DB.Digits(c.number) == numberDigits then return c end
    end
    return nil
end

---Is `numberDigits` on the citizen's block list?
---@param doc table the citizen's document (already loaded)
---@param numberDigits string
---@return boolean
function DB.IsBlocked(doc, numberDigits)
    return doc and doc.phone and doc.phone.blocked and doc.phone.blocked[numberDigits] ~= nil
end

---Block a number for a citizen (name resolved from their contacts if known).
---@param citizenid string
---@param rawNumber string
---@return table blocked  the updated blocked map
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

---Unblock a number for a citizen.
---@param citizenid string
---@param rawNumber string
---@return table blocked  the updated blocked map
function DB.Unblock(citizenid, rawNumber)
    local doc = DB.EnsurePhone(citizenid, DB.LoadOrCreate(citizenid))
    doc.phone.blocked[DB.Digits(rawNumber)] = nil
    DB.Save(citizenid, doc)
    return doc.phone.blocked
end

---Prepend a call-history entry for a citizen (capped to Config.MaxRecents).
---@param citizenid string
---@param entry table
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

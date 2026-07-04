--[[
    oph3z-phone | Locale helper (shared)

    Loaded after the locale files (locales/*.lua) so the `Locales` table is
    populated. Use it anywhere (client or server) to fetch translated text:

        Lang('systemNotification.minutes')          -- default locale
        Lang('frontend.settings.title', 'tr')       -- a specific locale

    Missing keys fall back to the default locale, then to the key path itself.
--]]

Locales = Locales or {}

---Resolve a dotted key path within a table.
local function resolve(node, path)
    for part in string.gmatch(path, '[^%.]+') do
        if type(node) ~= 'table' then return nil end
        node = node[part]
    end
    return node
end

---@param path string dotted key, e.g. 'systemNotification.minutes'
---@param code? string locale code (defaults to Config.DefaultLocale, else 'en')
---@return string
function Lang(path, code)
    code = code or (Config and Config.DefaultLocale) or 'en'
    local value = resolve(Locales[code], path)
    if value == nil and code ~= 'en' then value = resolve(Locales['en'], path) end
    if type(value) ~= 'string' then return path end
    return value
end

---The list of available languages: { { code, name }, ... } (from loaded files).
---@return table[]
function GetLanguages()
    local out = {}
    for code, tbl in pairs(Locales) do
        out[#out + 1] = { code = code, name = (type(tbl) == 'table' and tbl._name) or code }
    end
    table.sort(out, function(a, b) return a.name < b.name end)
    return out
end

---The `frontend` string tables for every loaded locale (handed to the NUI).
---@return table<string, table>
function GetFrontendLocales()
    local out = {}
    for code, tbl in pairs(Locales) do
        if type(tbl) == 'table' then out[code] = tbl.frontend or {} end
    end
    return out
end

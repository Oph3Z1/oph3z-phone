Locales = Locales or {}

local function resolve(node, path)
    for part in string.gmatch(path, '[^%.]+') do
        if type(node) ~= 'table' then return nil end
        node = node[part]
    end
    
    return node
end

function Lang(path, code)
    code = code or (Config and Config.DefaultLocale) or 'en'
    local value = resolve(Locales[code], path)
    
    if value == nil and code ~= 'en' then 
        value = resolve(Locales['en'], path) 
    end
    
    if type(value) ~= 'string' then
        return path 
    end

    return value
end

function GetLanguages()
    local out = {}

    for code, tbl in pairs(Locales) do
        out[#out + 1] = { code = code, name = (type(tbl) == 'table' and tbl._name) or code }
    end

    table.sort(out, function(a, b) return a.name < b.name end)
    return out
end

function GetFrontendLocales()
    local out = {}
    for code, tbl in pairs(Locales) do
        if type(tbl) == 'table' then out[code] = tbl.frontend or {} end
    end
    return out
end
local checked = {}

function BillingTableExists(name)
    if checked[name] ~= nil then return checked[name] end
    local r = ExecuteSql('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1', { name })
    local exists = (r and r[1] ~= nil) or false
    checked[name] = exists
    if not exists and Config.Debug then
        print(('^3[oph3z-phone] billing: table `%s` not found (Config.BillingScript = "%s") — the Wallet will show no bills until it exists.^0'):format(name, tostring(Config.BillingScript)))
    end
    return exists
end
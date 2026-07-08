if Config.BillingScript == 'esx_billing' then
    BillsProvider = BillsProvider or {}

    function BillsProvider.Get(cid, src)
        if not BillingTableExists('billing') then return {} end
        local identifier = GetIdentifier(src)
        if not identifier then return {} end
        local rows = ExecuteSql('SELECT * FROM `billing` WHERE `identifier` = ?', { identifier })
        local out = {}
        if rows then
            for i = 1, #rows do
                local r = rows[i]
                out[#out + 1] = {
                    id = r.id,
                    issuer = r.target or r.sendername or r.name or 'Unknown',
                    label = r.label or 'Bill',
                    amount = math.floor(tonumber(r.amount) or 0),
                    ts = os.time(),
                    paid = false,
                }
            end
        end
        return out
    end

    function BillsProvider.Pay(cid, src, billId)
        if not BillingTableExists('billing') then return { ok = false, reason = 'gone' } end
        local rows = ExecuteSql('SELECT * FROM `billing` WHERE `id` = ?', { billId })
        local bill = rows and rows[1]
        if not bill then return { ok = false, reason = 'gone' } end
        local amount = math.floor(tonumber(bill.amount) or 0)
        if (Bank.Get(cid) or 0) < amount then return { ok = false, reason = 'funds' } end
        TriggerEvent('esx_billing:payBill', src, billId)
        return { ok = true, amount = amount, issuer = bill.target or bill.sendername or bill.name or 'Unknown', label = bill.label or 'Bill' }
    end
end
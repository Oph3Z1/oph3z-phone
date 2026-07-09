if Config.BillingScript == 'codem-billing' then
    BillsProvider = BillsProvider or {}

    function BillsProvider.Get(cid, src)
        if not BillingTableExists('codem_billing') then return {} end
        local identifier = GetIdentifier(src)
        if not identifier then return {} end
        local rows = ExecuteSql("SELECT * FROM `codem_billing` WHERE `targetidentifier` = ? AND `status` = 'unpaid'", { identifier })
        local out = {}
        if rows then
            for i = 1, #rows do
                local r = rows[i]
                out[#out + 1] = {
                    id = r.id,
                    issuer = r.societyname or r.targetname or 'Unknown',
                    label = r.invoicelabel or 'Bill',
                    amount = math.floor(tonumber(r.amount) or 0),
                    ts = os.time(),
                    paid = false,
                }
            end
        end
        return out
    end

    function BillsProvider.Pay(cid, src, billId)
        if not BillingTableExists('codem_billing') then return { ok = false, reason = 'gone' } end
        local rows = ExecuteSql('SELECT * FROM `codem_billing` WHERE `id` = ?', { billId })
        local bill = rows and rows[1]
        if not bill then return { ok = false, reason = 'gone' } end
        local amount = math.floor(tonumber(bill.amount) or 0)
        if (Bank.Get(cid) or 0) < amount then return { ok = false, reason = 'funds' } end
        TriggerEvent('codem-billing:server:PayBillBankV2', src, tonumber(billId))
        return { ok = true, amount = amount, issuer = bill.societyname or 'Unknown', label = bill.invoicelabel or 'Bill' }
    end
end
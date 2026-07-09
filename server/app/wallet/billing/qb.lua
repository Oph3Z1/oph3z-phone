if Config.BillingScript == 'qb' then
    BillsProvider = BillsProvider or {}

    function BillsProvider.Get(cid, src)
        if not BillingTableExists('phone_invoices') then return {} end
        local identifier = GetIdentifier(src)
        if not identifier then return {} end
        local rows = ExecuteSql('SELECT * FROM `phone_invoices` WHERE `citizenid` = ?', { identifier })
        local out = {}
        if rows then
            for i = 1, #rows do
                local r = rows[i]
                out[#out + 1] = {
                    id = r.id,
                    issuer = r.society or r.sender or 'Unknown',
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
        if not BillingTableExists('phone_invoices') then return { ok = false, reason = 'gone' } end
        local rows = ExecuteSql('SELECT * FROM `phone_invoices` WHERE `id` = ?', { billId })
        local bill = rows and rows[1]
        if not bill then return { ok = false, reason = 'gone' } end
        local amount = math.floor(tonumber(bill.amount) or 0)
        if (Bank.Get(cid) or 0) < amount then return { ok = false, reason = 'funds' } end
        if not Bank.Remove(cid, amount, 'phone-bill') then return { ok = false, reason = 'funds' } end

        local society = bill.society
        if society and society ~= '' then
            if Config.QBBanking then
                local acc = exports['qb-banking']:GetAccount(society)
                if acc and acc.account_balance then
                    exports['qb-banking']:AddMoney(society, amount)
                elseif Config.QBCreateJobAccount then
                    exports['qb-banking']:CreateJobAccount(society, 0)
                    Wait(350)
                    exports['qb-banking']:AddMoney(society, amount)
                end
            else
                exports['qb-management']:AddMoney(society, amount)
            end
        end

        ExecuteSql('DELETE FROM `phone_invoices` WHERE `id` = ?', { billId })
        return { ok = true, amount = amount, issuer = society ~= '' and society or (bill.sender or 'Unknown'), label = bill.invoicelabel or 'Bill' }
    end
end
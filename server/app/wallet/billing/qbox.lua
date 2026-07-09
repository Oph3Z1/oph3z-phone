if Config.BillingScript == 'qbox' then
    BillsProvider = BillsProvider or {}

    local function paySociety(society, amount)
        if not society or society == '' then return end
        if GetResourceState('Renewed-Banking'):find('started') then
            exports['Renewed-Banking']:addAccountMoney(society, amount)
        end
    end

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

        paySociety(bill.society, amount)
        ExecuteSql('DELETE FROM `phone_invoices` WHERE `id` = ?', { billId })
        return { ok = true, amount = amount, issuer = (bill.society and bill.society ~= '' and bill.society) or (bill.sender or 'Unknown'), label = bill.invoicelabel or 'Bill' }
    end
end
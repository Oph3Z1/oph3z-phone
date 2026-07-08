local MAX_TX = 100

local function cidOf(src)
    return GetIdentifier(src)
end

local function ensureTx(doc)
    doc.wallet = doc.wallet or {}
    doc.wallet.transactions = doc.wallet.transactions or {}
    doc.wallet.nextTxId = doc.wallet.nextTxId or 1
    return doc
end

local function bankOf(src)
    return Bank.Get(cidOf(src))
end

local function comma(n)
    local s = tostring(math.floor(tonumber(n) or 0))
    return (s:reverse():gsub('(%d%d%d)', '%1,'):reverse():gsub('^,', ''))
end

local function logTx(citizenid, tx)
    local doc = ensureTx(DB.LoadOrCreate(citizenid))
    tx.id = doc.wallet.nextTxId
    tx.ts = tx.ts or os.time()
    doc.wallet.nextTxId = doc.wallet.nextTxId + 1
    table.insert(doc.wallet.transactions, 1, tx)
    while #doc.wallet.transactions > MAX_TX do table.remove(doc.wallet.transactions) end
    DB.Save(citizenid, doc)
    return tx
end

RegisterCallback('oph3z-phone:server:wallet:get', function(src)
    local cid = cidOf(src)
    if not cid then return {} end
    local doc = ensureTx(DB.LoadOrCreate(cid))
    return {
        balance      = bankOf(src),
        transactions = doc.wallet.transactions,
        bills        = (BillsProvider.Get and BillsProvider.Get(cid, src)) or {},
        serverId     = src,
    }
end)

RegisterCallback('oph3z-phone:server:wallet:send', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false, reason = 'bad' } end

    local amount = math.floor(tonumber(data.amount) or 0)
    if amount <= 0 then return { ok = false, reason = 'amount' } end

    local recipCid
    if data.toId ~= nil and tostring(data.toId) ~= '' then
        local tid = tonumber(data.toId)
        recipCid = tid and cidOf(tid) or nil
    else
        local digits = DB.Digits(data.to or '')
        if digits == '' then return { ok = false, reason = 'bad' } end
        recipCid = DB.GetCitizenIdByNumber(digits)
    end
    if not recipCid then return { ok = false, reason = 'notfound' } end
    if recipCid == cid then return { ok = false, reason = 'self' } end

    local recipDoc = DB.EnsurePhone(recipCid, DB.LoadOrCreate(recipCid))
    local recipDigits = DB.Digits(recipDoc.phone.numberRaw)

    local note = tostring(data.note or ''):sub(1, 80)

    if bankOf(src) < amount then return { ok = false, reason = 'funds' } end
    if not Bank.Remove(cid, amount, 'phone-transfer') then
        return { ok = false, reason = 'funds' }
    end
    if not Bank.Add(recipCid, amount, 'phone-transfer') then
        Bank.Add(cid, amount, 'phone-transfer-refund')
        return { ok = false, reason = 'failed' }
    end

    local myDoc = DB.EnsurePhone(cid, DB.LoadOrCreate(cid))
    local myNumber = DB.Digits(myDoc.phone.numberRaw)
    local myContactForRecip = DB.ResolveContact(cid, recipDigits)
    local recipName = (myContactForRecip and myContactForRecip.name) or DB.FormatNumber(recipDigits)

    local theirContactForMe = DB.ResolveContact(recipCid, myNumber)
    local senderName = (theirContactForMe and theirContactForMe.name) or DB.FormatNumber(myNumber)

    local myTx = logTx(cid, { kind = 'sent', amount = amount, party = recipName, number = recipDigits, note = note })
    logTx(recipCid, { kind = 'received', amount = amount, party = senderName, number = myNumber, note = note })

    if Notif then
        Notif.Push(recipCid, {
            app = 'wallet',
            title = senderName,
            bodyKey = 'notify.received',
            bodyArgs = { comma(amount) },
            route = { app = 'wallet' },
        })
    end
    local recipSrc = GetSourceById(recipCid)
    if recipSrc then
        TriggerClientEvent('oph3z-phone:client:wallet:incoming', recipSrc, {
            balance = Bank.Get(recipCid),
            tx = { kind = 'received', amount = amount, party = senderName, number = myNumber, note = note, ts = os.time() },
        })
    end

    return { ok = true, balance = bankOf(src), tx = myTx }
end)

RegisterCallback('oph3z-phone:server:wallet:bills', function(src)
    local cid = cidOf(src)
    if not cid then return {} end
    return (BillsProvider.Get and BillsProvider.Get(cid, src)) or {}
end)

RegisterCallback('oph3z-phone:server:wallet:pay', function(src, billId)
    local cid = cidOf(src)
    if not cid then return { ok = false } end

    local res = BillsProvider.Pay and BillsProvider.Pay(cid, src, billId) or { ok = false, reason = 'gone' }
    if not res or not res.ok then return res or { ok = false } end

    local tx = logTx(cid, { kind = 'bill', amount = res.amount, party = res.issuer, note = res.label })
    return { ok = true, balance = bankOf(src), tx = tx, bills = (BillsProvider.Get and BillsProvider.Get(cid, src)) or {} }
end)
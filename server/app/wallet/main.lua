--[[
    oph3z-phone | Wallet (Bank) — SERVER

    Bank-account money for the phone: send to other players (ONLINE or OFFLINE),
    a per-player transaction log, and bills (via the swappable BillsProvider).

    Money is qbx_core's BANK account. Transfers use the citizenid-based exports
    (RemoveMoney/AddMoney/GetMoney) which persist for offline players too
    (SaveOffline). NOTE: `bank` is not in qbx's dontAllowMinus, so we check funds
    ourselves before removing.

        doc.wallet = {
            transactions = { { id, kind('sent'|'received'|'bill'), amount, party, number?, note?, ts }, ... },
            bills        = { ... },   -- owned by BillsProvider (default store)
            nextTxId, nextBillId,
        }
--]]

local MAX_TX = 100

local function cidOf(src)
    local player = exports.qbx_core:GetPlayer(src)
    return player and player.PlayerData.citizenid or nil
end

local function ensureTx(doc)
    doc.wallet = doc.wallet or {}
    doc.wallet.transactions = doc.wallet.transactions or {}
    doc.wallet.nextTxId = doc.wallet.nextTxId or 1
    return doc
end

local function bankOf(src)
    local p = exports.qbx_core:GetPlayer(src)
    return p and (p.PlayerData.money.bank or 0) or 0
end

-- "$1,234" style grouping for notification bodies.
local function comma(n)
    local s = tostring(math.floor(tonumber(n) or 0))
    return (s:reverse():gsub('(%d%d%d)', '%1,'):reverse():gsub('^,', ''))
end

-- Append a transaction to a citizen's wallet log (offline-safe). Returns it.
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

-- ---- callbacks ------------------------------------------------------------

-- Balance + transactions + bills (loaded when the Wallet opens).
lib.callback.register('oph3z-phone:server:wallet:get', function(src)
    local cid = cidOf(src)
    if not cid then return {} end
    local doc = ensureTx(DB.LoadOrCreate(cid))
    return {
        balance      = bankOf(src),
        transactions = doc.wallet.transactions,
        bills        = BillsProvider.Get(cid),
        serverId     = src, -- shown on the card
    }
end)

-- Send money (BANK) to a phone number — the recipient may be OFFLINE.
lib.callback.register('oph3z-phone:server:wallet:send', function(src, data)
    local cid = cidOf(src)
    if not cid or type(data) ~= 'table' then return { ok = false, reason = 'bad' } end

    local amount = math.floor(tonumber(data.amount) or 0)
    if amount <= 0 then return { ok = false, reason = 'amount' } end

    -- Resolve the recipient by SERVER ID (online only) or by PHONE NUMBER (online/offline).
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

    -- The recipient's phone number (for name resolution + the transaction record).
    local recipDoc = DB.EnsurePhone(recipCid, DB.LoadOrCreate(recipCid))
    local recipDigits = DB.Digits(recipDoc.phone.numberRaw)

    local note = tostring(data.note or ''):sub(1, 80)

    -- Funds check (bank can go negative in qbx, so guard here), then move money.
    if bankOf(src) < amount then return { ok = false, reason = 'funds' } end
    if not exports.qbx_core:RemoveMoney(cid, 'bank', amount, 'phone-transfer') then
        return { ok = false, reason = 'funds' }
    end
    if not exports.qbx_core:AddMoney(recipCid, 'bank', amount, 'phone-transfer') then
        exports.qbx_core:AddMoney(cid, 'bank', amount, 'phone-transfer-refund') -- refund on failure
        return { ok = false, reason = 'failed' }
    end

    -- Resolve display names from each side's own contacts.
    local myDoc = DB.EnsurePhone(cid, DB.LoadOrCreate(cid))
    local myNumber = DB.Digits(myDoc.phone.numberRaw)
    local myContactForRecip = DB.ResolveContact(cid, recipDigits)
    local recipName = (myContactForRecip and myContactForRecip.name) or DB.FormatNumber(recipDigits)

    local theirContactForMe = DB.ResolveContact(recipCid, myNumber)
    local senderName = (theirContactForMe and theirContactForMe.name) or DB.FormatNumber(myNumber)

    -- Log for BOTH players.
    local myTx = logTx(cid, { kind = 'sent', amount = amount, party = recipName, number = recipDigits, note = note })
    logTx(recipCid, { kind = 'received', amount = amount, party = senderName, number = myNumber, note = note })

    -- Notify the recipient (persisted for offline) + live-refresh if online.
    if Notif then
        Notif.Push(recipCid, {
            app = 'wallet',
            title = senderName,
            body = ('Received $%s'):format(comma(amount)),
            route = { app = 'wallet' },
        })
    end
    local recipPlayer = exports.qbx_core:GetPlayerByCitizenId(recipCid)
    if recipPlayer then
        TriggerClientEvent('oph3z-phone:client:wallet:incoming', recipPlayer.PlayerData.source, {
            balance = exports.qbx_core:GetMoney(recipCid, 'bank'),
            tx = { kind = 'received', amount = amount, party = senderName, number = myNumber, note = note, ts = os.time() },
        })
    end

    return { ok = true, balance = bankOf(src), tx = myTx }
end)

-- Refresh bills.
lib.callback.register('oph3z-phone:server:wallet:bills', function(src)
    local cid = cidOf(src)
    if not cid then return {} end
    return BillsProvider.Get(cid)
end)

-- Pay a bill through the provider, then log the transaction.
lib.callback.register('oph3z-phone:server:wallet:pay', function(src, billId)
    local cid = cidOf(src)
    if not cid then return { ok = false } end

    local res = BillsProvider.Pay(cid, billId)
    if not res or not res.ok then return res or { ok = false } end

    local tx = logTx(cid, { kind = 'bill', amount = res.amount, party = res.issuer, note = res.label })
    return { ok = true, balance = bankOf(src), tx = tx, bills = BillsProvider.Get(cid) }
end)

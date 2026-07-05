--[[
    oph3z-phone | Wallet — BILLS PROVIDER  (⇦ SWAP THIS FILE for your own billing)

    Every server runs a different billing/invoice system, so the Wallet app talks
    to bills ONLY through this small provider. To integrate your own system, keep
    the three function names + return shapes below and call your resource instead.

    Interface expected by the Wallet (server/app/wallet/main.lua):

      BillsProvider.Get(citizenid) -> bills[]
          each bill = { id, issuer, label, amount, ts, paid }

      BillsProvider.Pay(citizenid, billId) -> result
          success = { ok = true,  amount = <charged>, issuer = <string>, label = <string> }
          failure = { ok = false, reason = 'gone' | 'funds' | ... }
          The PROVIDER owns the charge (so a third-party biller can charge however
          it likes). The Wallet only logs the transaction from the returned info.

      BillsProvider.CreateBill(citizenid, data) -> bill | nil   (optional)
          Used by the default store + exports['oph3z-phone']:CreateBill(...).
          A third-party provider can drop this (bills come from its own resource).

    DEFAULT IMPLEMENTATION: bills live in the phone DB (doc.wallet.bills) and are
    paid from the player's BANK via qbx_core.
--]]

BillsProvider = BillsProvider or {}

local MAX_BILLS = 100

local function ensureBills(doc)
    doc.wallet = doc.wallet or {}
    doc.wallet.bills = doc.wallet.bills or {}
    doc.wallet.nextBillId = doc.wallet.nextBillId or 1
    return doc
end

-- List a player's bills (newest first).
function BillsProvider.Get(citizenid)
    if not citizenid then return {} end
    return ensureBills(DB.LoadOrCreate(citizenid)).wallet.bills
end

-- Add a bill to a player (used by the CreateBill export + other resources).
function BillsProvider.CreateBill(citizenid, data)
    if not citizenid or type(data) ~= 'table' then return nil end
    local amount = math.floor(tonumber(data.amount) or 0)
    if amount <= 0 then return nil end

    local doc = ensureBills(DB.LoadOrCreate(citizenid))
    local bill = {
        id     = doc.wallet.nextBillId,
        issuer = tostring(data.issuer or data.from or 'Unknown'):sub(1, 60),
        label  = tostring(data.label or data.subject or 'Bill'):sub(1, 80),
        amount = amount,
        ts     = os.time(),
        paid   = false,
    }
    doc.wallet.nextBillId = doc.wallet.nextBillId + 1
    table.insert(doc.wallet.bills, 1, bill)
    while #doc.wallet.bills > MAX_BILLS do table.remove(doc.wallet.bills) end
    DB.Save(citizenid, doc)

    -- Notify the recipient (persists for offline players) + refresh an open wallet.
    if Notif then
        Notif.Push(citizenid, {
            app = 'wallet',
            title = bill.issuer,
            body = ('New bill • $%d — %s'):format(bill.amount, bill.label),
            route = { app = 'wallet' },
        })
    end
    local player = exports.qbx_core:GetPlayerByCitizenId(citizenid)
    if player then
        TriggerClientEvent('oph3z-phone:client:wallet:bill', player.PlayerData.source, bill)
    end
    return bill
end

-- Pay a bill from the player's BANK. Charges here so third-party providers can
-- override the charge logic entirely.
function BillsProvider.Pay(citizenid, billId)
    if not citizenid then return { ok = false, reason = 'bad' } end
    local doc = ensureBills(DB.LoadOrCreate(citizenid))

    local bill
    for _, b in ipairs(doc.wallet.bills) do
        if b.id == billId and not b.paid then bill = b break end
    end
    if not bill then return { ok = false, reason = 'gone' } end

    -- `bank` is NOT in qbx's dontAllowMinus, so check funds ourselves.
    local bank = exports.qbx_core:GetMoney(citizenid, 'bank') or 0
    if bank < bill.amount then return { ok = false, reason = 'funds' } end
    if not exports.qbx_core:RemoveMoney(citizenid, 'bank', bill.amount, 'phone-bill') then
        return { ok = false, reason = 'funds' }
    end

    bill.paid = true
    bill.paidTs = os.time()
    DB.Save(citizenid, doc)
    return { ok = true, amount = bill.amount, issuer = bill.issuer, label = bill.label }
end

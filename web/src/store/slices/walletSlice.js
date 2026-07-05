import { createSlice } from '@reduxjs/toolkit';
import { fetchNui } from '../../utils/fetchNui';

// Browser-dev mock.
const now = Math.floor(Date.now() / 1000);
const MOCK = {
  serverId: 12,
  balance: 24580,
  transactions: [
    { id: 6, kind: 'received', amount: 1500, party: 'Mike Reyes', number: '5550142', note: 'rent', ts: now - 3600 },
    { id: 5, kind: 'sent', amount: 300, party: 'Lena Cruz', number: '5550199', note: '', ts: now - 20000 },
    { id: 4, kind: 'bill', amount: 250, party: 'LS Water', note: 'Water bill', ts: now - 90000 },
    { id: 3, kind: 'received', amount: 5000, party: 'Paycheck', ts: now - 180000 },
  ],
  bills: [
    { id: 2, issuer: 'LS Electric', label: 'Monthly power', amount: 420, ts: now - 4000, paid: false },
    { id: 1, issuer: 'DMV', label: 'Speeding fine', amount: 750, ts: now - 260000, paid: false },
  ],
};

const initialState = {
  loaded: false,
  serverId: null,
  balance: 0,
  transactions: [],
  bills: [],
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    hydrateWallet(state, action) {
      const p = action.payload || {};
      state.serverId = p.serverId ?? null;
      state.balance = p.balance || 0;
      state.transactions = p.transactions || [];
      state.bills = p.bills || [];
      state.loaded = true;
    },
    setBalance(state, action) {
      if (typeof action.payload === 'number') state.balance = action.payload;
    },
    addTxLocal(state, action) {
      if (action.payload) state.transactions.unshift(action.payload);
    },
    setBills(state, action) {
      state.bills = action.payload || [];
    },
    addBillLocal(state, action) {
      if (action.payload) state.bills.unshift(action.payload);
    },
  },
});

export const { hydrateWallet, setBalance, addTxLocal, setBills, addBillLocal } = walletSlice.actions;

// ---- selectors ----
export const selectUnpaidCount = (s) => s.wallet.bills.reduce((a, b) => a + (b.paid ? 0 : 1), 0);

// ---- thunks ----
export const loadWallet = () => async (dispatch) => {
  const res = await fetchNui('phone:wallet:get', {}, MOCK);
  dispatch(hydrateWallet(res || {}));
};

export const sendMoney = (data) => async (dispatch) => {
  const res = await fetchNui('phone:wallet:send', data, {
    ok: true,
    balance: MOCK.balance - Number(data.amount || 0),
    tx: { id: Date.now(), kind: 'sent', amount: Number(data.amount || 0), party: data.to, ts: Math.floor(Date.now() / 1000), note: data.note || '' },
  });
  if (res && res.ok) {
    if (typeof res.balance === 'number') dispatch(setBalance(res.balance));
    if (res.tx) dispatch(addTxLocal(res.tx));
  }
  return res || { ok: false };
};

export const payBill = (id) => async (dispatch) => {
  const res = await fetchNui('phone:wallet:pay', { id }, { ok: false, reason: 'dev' });
  if (res && res.ok) {
    if (typeof res.balance === 'number') dispatch(setBalance(res.balance));
    if (res.tx) dispatch(addTxLocal(res.tx));
    if (res.bills) dispatch(setBills(res.bills));
  }
  return res || { ok: false };
};

export const refreshBills = () => async (dispatch) => {
  const bills = await fetchNui('phone:wallet:bills', {}, MOCK.bills);
  dispatch(setBills(bills || []));
};

// ---- live events ----
export const receiveIncoming = (payload) => (dispatch) => {
  if (!payload) return;
  if (typeof payload.balance === 'number') dispatch(setBalance(payload.balance));
  if (payload.tx) dispatch(addTxLocal(payload.tx));
};

export const receiveBill = (bill) => (dispatch) => {
  if (bill) dispatch(addBillLocal(bill));
};

export default walletSlice.reducer;

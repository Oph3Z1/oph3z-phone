import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import { payBill } from '../../store/slices/walletSlice';
import { openDialog } from '../../store/slices/dialogSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { fmtMoney, txDate, initialOf } from './walletUtil';
import { ChevronLeft } from './icons';

function BillRow({ bill, onPay, paying }) {
  const t = useT();
  return (
    <div className={`wl-bill${bill.paid ? ' is-paid' : ''}`}>
      <span className="wl-bill__ico">{initialOf(bill.issuer)}</span>
      <div className="wl-bill__mid">
        <span className="wl-bill__issuer">{bill.issuer}</span>
        <span className="wl-bill__label">{bill.label} · {txDate(bill.ts)}</span>
      </div>
      <div className="wl-bill__right">
        <span className="wl-bill__amt">{fmtMoney(bill.amount)}</span>
        {bill.paid ? (
          <span className="wl-bill__paid">{t('wallet.paid')}</span>
        ) : (
          <button className="wl-bill__pay" onClick={() => onPay(bill)} disabled={paying}>
            {t('wallet.pay')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Bills({ onClose }) {
  const dispatch = useDispatch();
  const t = useT();
  const bills = useSelector((s) => s.wallet.bills);
  const balance = useSelector((s) => s.wallet.balance);
  const [paying, setPaying] = useState(false);

  const unpaid = bills.filter((b) => !b.paid);
  const paid = bills.filter((b) => b.paid);

  const onPay = async (bill) => {
    const ok = await dispatch(
      openDialog({
        title: t('wallet.payTitle'),
        message: t('wallet.payMsg', { amount: fmtMoney(bill.amount), issuer: bill.issuer }),
        buttons: [
          { text: t('common.cancel'), style: 'cancel', value: false },
          { text: t('wallet.pay'), style: 'default', value: true },
        ],
      })
    );
    if (!ok) return;
    if (bill.amount > balance) {
      dispatch(pushToast({ app: 'wallet', type: 'error', title: t('wallet.insufficient') }));
      return;
    }
    setPaying(true);
    const res = await dispatch(payBill(bill.id));
    setPaying(false);
    if (res && res.ok) {
      dispatch(pushToast({ app: 'wallet', title: t('wallet.billPaid') }));
    } else {
      const reason = res && res.reason === 'funds' ? t('wallet.insufficient') : t('wallet.payFailed');
      dispatch(pushToast({ app: 'wallet', type: 'error', title: reason }));
    }
  };

  return (
    <div className="walletapp">
      <div className="wl-bar">
        <button className="wl-bar__back" onClick={onClose}>
          <ChevronLeft />
          <span>{t('wallet.title')}</span>
        </button>
        <span className="wl-bar__title">{t('wallet.bills')}</span>
        <span className="wl-bar__spacer" />
      </div>

      <div className="wl-scroll">
        {bills.length === 0 ? (
          <div className="wl-empty">{t('wallet.noBills')}</div>
        ) : (
          <>
            {unpaid.length > 0 && (
              <>
                <div className="wl-section">{t('wallet.due')}</div>
                <div className="wl-list">
                  {unpaid.map((b) => (
                    <BillRow key={b.id} bill={b} onPay={onPay} paying={paying} />
                  ))}
                </div>
              </>
            )}
            {paid.length > 0 && (
              <>
                <div className="wl-section">{t('wallet.paidBills')}</div>
                <div className="wl-list">
                  {paid.map((b) => (
                    <BillRow key={b.id} bill={b} onPay={onPay} paying={paying} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { signedMoney, isCredit, txDate } from './walletUtil';
import { ArrowUpRight, ArrowDownLeft, BillIcon } from './icons';

export default function TxRow({ tx, animateIn = false, index = 0 }) {
    const credit = isCredit(tx.kind);
    const Icon = tx.kind === 'bill' ? BillIcon : credit ? ArrowUpRight : ArrowDownLeft;
    const subtitle = tx.note || (tx.kind === 'bill' ? 'Bill' : credit ? 'Received' : 'Sent');

    return (
        <div
            className={`wl-tx${animateIn ? ' wl-row--in' : ''}`}
            style={animateIn ? { animationDelay: `${Math.min(index, 12) * 0.04}s` } : undefined}
        >
            <span className={`wl-tx__ico wl-tx__ico--${tx.kind}`}>
                <Icon />
            </span>
            <div className="wl-tx__mid">
                <span className="wl-tx__party">{tx.party || '—'}</span>
                <span className="wl-tx__sub">
                    {subtitle} · {txDate(tx.ts)}
                </span>
            </div>
            <span className={`wl-tx__amt${credit ? ' is-credit' : ''}`}>
                {signedMoney(tx.kind, tx.amount)}
            </span>
        </div>
    );
}

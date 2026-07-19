import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './WalletApp.css';

import { useT } from '../../i18n/useT';
import { loadWallet, selectUnpaidCount } from '../../store/slices/walletSlice';
import { clearNotifsFor } from '../../store/slices/notificationsSlice';
import { fmtMoney } from './walletUtil';
import TxRow from './TxRow';
import SendMoney from './SendMoney';
import Transactions from './Transactions';
import Bills from './Bills';
import { SendIcon, BillIcon, ChevronRight } from './icons';

export default function WalletApp() {
    const dispatch = useDispatch();
    const t = useT();
    const loaded = useSelector((s) => s.wallet.loaded);
    const balance = useSelector((s) => s.wallet.balance);
    const serverId = useSelector((s) => s.wallet.serverId);
    const transactions = useSelector((s) => s.wallet.transactions);
    const unpaid = useSelector(selectUnpaidCount);

    const [layers, setLayers] = useState([{ id: 0, v: 'home' }]);
    const nextId = useRef(1);
    const go = (v) => {
        setLayers((cur) => {
            const base = cur[cur.length - 1];
            if (base.v === v) return cur;
            return [
                { id: base.id, v: base.v },
                { id: nextId.current++, v, entering: true },
            ];
        });
    };
    const pruneLayers = () => setLayers((cur) => (cur.length > 1 ? cur.slice(-1) : cur));

    useEffect(() => {
        if (!loaded) dispatch(loadWallet());
        dispatch(clearNotifsFor({ app: 'wallet' }));
    }, [loaded, dispatch]);

    const recent = transactions.slice(0, 4);

    const renderView = (v) => {
        if (v === 'send') return <SendMoney onClose={() => go('home')} onSent={() => go('home')} />;
        if (v === 'tx') return <Transactions onClose={() => go('home')} />;
        if (v === 'bills') return <Bills onClose={() => go('home')} />;
        return (
            <div className="walletapp">
                <div className="wl-head">
                    <h1 className="wl-head__title">{t('wallet.title')}</h1>
                </div>

                <div className="wl-scroll">
                    <div className="wl-card">
                        <div className="wl-card__glow" />
                        <span className="wl-card__label">{t('wallet.bankBalance')}</span>
                        <span className="wl-card__amt">{fmtMoney(balance)}</span>
                        <div className="wl-card__row">
                            <span className="wl-card__dots">ID · {serverId ?? '—'}</span>
                            <span className="wl-card__brand">BANK</span>
                        </div>
                    </div>

                    <div className="wl-actions">
                        <button className="wl-act wl-act--primary" onClick={() => go('send')}>
                            <span className="wl-act__ic">
                                <SendIcon />
                            </span>
                            <span>{t('wallet.send')}</span>
                        </button>
                        <button className="wl-act" onClick={() => go('bills')}>
                            <span className="wl-act__ic">
                                <BillIcon />
                                {unpaid > 0 && <span className="wl-act__badge">{unpaid}</span>}
                            </span>
                            <span>{t('wallet.bills')}</span>
                        </button>
                    </div>

                    <div className="wl-recenthead">
                        <span>{t('wallet.recent')}</span>
                        {transactions.length > 0 && (
                            <button className="wl-seeall" onClick={() => go('tx')}>
                                {t('wallet.seeAll')} <ChevronRight />
                            </button>
                        )}
                    </div>
                    {recent.length === 0 ? (
                        <div className="wl-empty">{t('wallet.noTransactions')}</div>
                    ) : (
                        <div className="wl-list">
                            {recent.map((tx, i) => (
                                <TxRow key={tx.id} tx={tx} animateIn index={i} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="wl-stack">
            {layers.map((l) => (
                <div
                    key={l.id}
                    className={`wl-layer${l.entering ? ' wl-layer--in' : ''}`}
                    onAnimationEnd={l.entering ? pruneLayers : undefined}
                >
                    {renderView(l.v)}
                </div>
            ))}
        </div>
    );
}

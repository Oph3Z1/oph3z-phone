import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useT } from '../../i18n/useT';
import { openDialog } from '../../store/slices/dialogSlice';
import { deleteHistory, clearHistory } from '../../store/slices/calcSlice';
import { formatNumber } from './calc';
import { ChevronLeft, TrashIcon } from './icons';

// Full history screen. Tap a row to drop its result into the current calc;
// long-press a row to delete it; the trash button clears everything.
export default function HistoryScreen({ onBack, onPick }) {
  const dispatch = useDispatch();
  const t = useT();
  const history = useSelector((s) => s.calc.history);

  const pressTimer = useRef(null);
  const longFired = useRef(false);

  const confirmClear = async () => {
    const ok = await dispatch(
      openDialog({
        title: t('calculator.clearTitle'),
        message: t('calculator.clearMsg'),
        buttons: [
          { text: t('common.cancel'), style: 'cancel', value: false },
          { text: t('calculator.clear'), style: 'destructive', value: true },
        ],
      })
    );
    if (ok) dispatch(clearHistory());
  };

  const confirmDelete = async (item) => {
    const ok = await dispatch(
      openDialog({
        title: t('calculator.deleteTitle'),
        message: t('calculator.deleteMsg'),
        buttons: [
          { text: t('common.cancel'), style: 'cancel', value: false },
          { text: t('common.delete'), style: 'destructive', value: true },
        ],
      })
    );
    if (ok) dispatch(deleteHistory(item.id));
  };

  const startPress = (item) => {
    longFired.current = false;
    pressTimer.current = setTimeout(() => {
      longFired.current = true;
      confirmDelete(item);
    }, 500);
  };
  const endPress = () => clearTimeout(pressTimer.current);
  const rowClick = (item) => {
    if (longFired.current) {
      longFired.current = false;
      return;
    }
    onPick(item.value);
  };

  return (
    <div className="calc-hist">
      <div className="calc-hist__bar">
        <button className="calc-hist__back" onClick={onBack} aria-label={t('common.done')}>
          <ChevronLeft />
        </button>
        <span className="calc-hist__title">{t('calculator.history')}</span>
        <button
          className="calc-hist__clear"
          onClick={confirmClear}
          disabled={!history.length}
          aria-label={t('calculator.clear')}
        >
          <TrashIcon />
        </button>
      </div>

      {history.length === 0 ? (
        <div className="calc-hist__empty">{t('calculator.noHistory')}</div>
      ) : (
        <div className="calc-hist__list">
          {history.map((h) => (
            <button
              key={h.id}
              className="calc-hist__row"
              onClick={() => rowClick(h)}
              onPointerDown={() => startPress(h)}
              onPointerUp={endPress}
              onPointerLeave={endPress}
            >
              <span className="calc-hist__expr">{h.expr}</span>
              <span className="calc-hist__eq">= {formatNumber(h.value)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

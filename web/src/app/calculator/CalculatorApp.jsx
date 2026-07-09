import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './CalculatorApp.css';

import { loadCalc, addHistory } from '../../store/slices/calcSlice';
import { operate, stripNum, formatNumber, formatDisplay } from './calc';
import { HistoryIcon } from './icons';
import HistoryScreen from './HistoryScreen';

function Key({ cls, onClick, children, active }) {
    return (
        <button className={`calc__key ${cls}${active ? ' is-active' : ''}`} onClick={onClick}>
            {children}
        </button>
    );
}

const INIT = {
    current: '0',
    previous: null,
    op: null,
    overwrite: false,
    lastExpr: '',
    error: false,
};

function reducer(state, action) {
    switch (action.type) {
        case 'digit': {
            const d = action.d;
            if (state.error) return { ...INIT, current: d };
            let cur;
            if (state.overwrite) cur = d;
            else cur = state.current === '0' ? d : state.current + d;
            if (cur.replace('-', '').replace('.', '').length > 12) return state;
            return { ...state, current: cur, overwrite: false, lastExpr: '' };
        }
        case 'dot': {
            if (state.error) return { ...INIT, current: '0.' };
            if (state.overwrite) return { ...state, current: '0.', overwrite: false, lastExpr: '' };
            if (state.current.includes('.')) return state;
            return { ...state, current: state.current + '.', lastExpr: '' };
        }
        case 'negate': {
            if (state.error || state.current === '0') return state;
            const cur = state.current.startsWith('-')
                ? state.current.slice(1)
                : '-' + state.current;
            return { ...state, current: cur };
        }
        case 'percent': {
            if (state.error) return state;
            return {
                ...state,
                current: stripNum(parseFloat(state.current) / 100),
                overwrite: false,
                lastExpr: '',
            };
        }
        case 'clearEntry':
            return { ...state, current: '0', overwrite: true };
        case 'allClear':
            return { ...INIT };
        case 'backspace': {
            if (state.error || state.overwrite) return state;
            let cur = state.current.slice(0, -1);
            if (cur === '' || cur === '-') cur = '0';
            return { ...state, current: cur };
        }
        case 'op': {
            if (state.error) return state;
            const val = parseFloat(state.current);
            let { previous, current } = state;
            if (previous === null) {
                previous = val;
            } else if (!state.overwrite) {
                const r = operate(previous, state.op, val);
                if (!isFinite(r)) return { ...INIT, current: 'Error', error: true };
                previous = r;
                current = stripNum(r);
            }
            return { ...state, previous, current, op: action.op, overwrite: true, lastExpr: '' };
        }
        case 'result':
            return {
                ...INIT,
                current: action.current,
                lastExpr: action.lastExpr || '',
                overwrite: true,
            };
        default:
            return state;
    }
}

export default function CalculatorApp() {
    const store = useDispatch();
    const loaded = useSelector((s) => s.calc.loaded);
    const history = useSelector((s) => s.calc.history);
    const [state, dispatch] = useReducer(reducer, INIT);
    const [view, setView] = useState('calc');
    const feedRef = useRef(null);

    useEffect(() => {
        if (!loaded) store(loadCalc());
    }, [loaded, store]);

    useLayoutEffect(() => {
        if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }, [history.length, state.current, state.op]);

    const equals = () => {
        if (state.error || state.op === null || state.previous === null) return;
        const val = parseFloat(state.current);
        const r = operate(state.previous, state.op, val);
        if (!isFinite(r)) {
            dispatch({ type: 'result', current: 'Error' });
            return;
        }
        const expr = `${formatNumber(state.previous)} ${state.op} ${formatNumber(val)}`;
        dispatch({ type: 'result', current: stripNum(r), lastExpr: expr });
        store(addHistory(expr, r));
    };

    const insertResult = (value) => {
        dispatch({ type: 'result', current: stripNum(value), lastExpr: '' });
        setView('calc');
    };

    useEffect(() => {
        if (view !== 'calc') return undefined;
        const onKey = (e) => {
            const k = e.key;
            if (k >= '0' && k <= '9') dispatch({ type: 'digit', d: k });
            else if (k === '.') dispatch({ type: 'dot' });
            else if (k === '+') dispatch({ type: 'op', op: '+' });
            else if (k === '-') dispatch({ type: 'op', op: '−' });
            else if (k === '*') dispatch({ type: 'op', op: '×' });
            else if (k === '/') {
                e.preventDefault();
                dispatch({ type: 'op', op: '÷' });
            } else if (k === '%') dispatch({ type: 'percent' });
            else if (k === 'Enter' || k === '=') {
                e.preventDefault();
                equals();
            } else if (k === 'Backspace') dispatch({ type: 'backspace' });
            else return;
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, state]);

    if (view === 'history') {
        return <HistoryScreen onBack={() => setView('calc')} onPick={insertResult} />;
    }

    const exprLine = state.op
        ? `${formatNumber(state.previous)} ${state.op}`
        : state.lastExpr || '';
    const display = formatDisplay(state.current);
    const clearLabel = state.current !== '0' && !state.overwrite ? 'C' : 'AC';
    const opActive = (op) => state.op === op && state.overwrite;
    const sizeClass = display.length > 12 ? ' is-xlong' : display.length > 9 ? ' is-long' : '';

    return (
        <div className="calcapp">
            <div className="calc__screen">
                <button
                    className="calc__histbtn"
                    onClick={() => setView('history')}
                    aria-label="History"
                >
                    <HistoryIcon />
                </button>

                <div className="calc__feed" ref={feedRef}>
                    {[...history].reverse().map((h) => (
                        <button
                            key={h.id}
                            className="calc__feeditem"
                            onClick={() => insertResult(h.value)}
                        >
                            <span className="calc__feedexpr">{h.expr}</span>
                            <span className="calc__feedres">{formatNumber(h.value)}</span>
                        </button>
                    ))}
                    <div className="calc__current">
                        <div className="calc__expr">{exprLine || ' '}</div>
                        <div className={`calc__result${sizeClass}`}>{display}</div>
                    </div>
                </div>
            </div>

            <div className="calc__pad">
                <Key
                    cls="calc__key--fn"
                    onClick={() =>
                        dispatch({ type: clearLabel === 'C' ? 'clearEntry' : 'allClear' })
                    }
                >
                    {clearLabel}
                </Key>
                <Key cls="calc__key--fn" onClick={() => dispatch({ type: 'negate' })}>
                    +/-
                </Key>
                <Key cls="calc__key--fn" onClick={() => dispatch({ type: 'percent' })}>
                    %
                </Key>
                <Key
                    cls="calc__key--op"
                    active={opActive('÷')}
                    onClick={() => dispatch({ type: 'op', op: '÷' })}
                >
                    ÷
                </Key>

                {['7', '8', '9'].map((n) => (
                    <Key
                        key={n}
                        cls="calc__key--num"
                        onClick={() => dispatch({ type: 'digit', d: n })}
                    >
                        {n}
                    </Key>
                ))}
                <Key
                    cls="calc__key--op"
                    active={opActive('×')}
                    onClick={() => dispatch({ type: 'op', op: '×' })}
                >
                    ×
                </Key>

                {['4', '5', '6'].map((n) => (
                    <Key
                        key={n}
                        cls="calc__key--num"
                        onClick={() => dispatch({ type: 'digit', d: n })}
                    >
                        {n}
                    </Key>
                ))}
                <Key
                    cls="calc__key--op"
                    active={opActive('−')}
                    onClick={() => dispatch({ type: 'op', op: '−' })}
                >
                    −
                </Key>

                {['1', '2', '3'].map((n) => (
                    <Key
                        key={n}
                        cls="calc__key--num"
                        onClick={() => dispatch({ type: 'digit', d: n })}
                    >
                        {n}
                    </Key>
                ))}
                <Key
                    cls="calc__key--op"
                    active={opActive('+')}
                    onClick={() => dispatch({ type: 'op', op: '+' })}
                >
                    +
                </Key>

                <Key
                    cls="calc__key--num calc__key--zero"
                    onClick={() => dispatch({ type: 'digit', d: '0' })}
                >
                    0
                </Key>
                <Key cls="calc__key--num" onClick={() => dispatch({ type: 'dot' })}>
                    .
                </Key>
                <Key cls="calc__key--op" onClick={equals}>
                    =
                </Key>
            </div>
        </div>
    );
}
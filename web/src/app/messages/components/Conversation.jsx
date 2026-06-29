import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from './Avatar';
import Bubble from './Bubble';
import MessageInput from './MessageInput';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import {
  openThread,
  sendMessage,
  sendMoney,
  sendRequest,
  setActive,
} from '../../../store/slices/messagesSlice';

const MONEY_ERR = {
  funds: 'Not enough bank balance.',
  offline: "They're offline right now.",
  recipient: "Can't send to this number.",
  amount: 'Enter an amount.',
};
const MAX_AMOUNT = 9999999;

function Keypad({ onDigit, onBack }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
  return (
    <div className="msg-keypad">
      {keys.map((k, i) =>
        k === '' ? (
          <span key={i} />
        ) : (
          <button
            key={i}
            className="msg-keypad__key"
            onClick={() => (k === 'back' ? onBack() : onDigit(k))}
          >
            {k === 'back' ? '⌫' : k}
          </button>
        )
      )}
    </div>
  );
}

export default function Conversation({ number, onBack }) {
  const dispatch = useDispatch();
  const conv = useSelector((s) => s.messages.byNumber[number]);
  const scrollRef = useRef(null);

  const [attach, setAttach] = useState(null); // null | 'menu' | 'money'
  const [amount, setAmount] = useState(0);
  const [showKeypad, setShowKeypad] = useState(false);
  const [moneyErr, setMoneyErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dispatch(openThread(number));
    dispatch(setActive(number));
    return () => dispatch(setActive(null));
  }, [number, dispatch]);

  const items = conv?.items || [];
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [items.length]);

  // Type the amount with the physical keyboard while the money sheet is open.
  useEffect(() => {
    if (attach !== 'money') return;
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        setMoneyErr('');
        setAmount((a) => Math.min(MAX_AMOUNT, a * 10 + Number(e.key)));
      } else if (e.key === 'Backspace') {
        setAmount((a) => Math.floor(a / 10));
      } else if (e.key === 'Escape') {
        setAttach(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [attach]);

  const send = (text) => {
    const body = text.trim();
    if (body) dispatch(sendMessage(number, { type: 'text', body }));
  };

  const openMoney = (preset = 0) => {
    setAmount(preset);
    setShowKeypad(false);
    setMoneyErr('');
    setAttach('money');
  };
  const closeAttach = () => {
    setAttach(null);
    setMoneyErr('');
  };

  const doSend = async () => {
    if (amount <= 0) {
      setMoneyErr(MONEY_ERR.amount);
      return;
    }
    setBusy(true);
    const res = await dispatch(sendMoney(number, amount));
    setBusy(false);
    if (res && res.ok) closeAttach();
    else setMoneyErr(MONEY_ERR[res?.reason] || 'Could not send.');
  };
  const doRequest = () => {
    if (amount <= 0) {
      setMoneyErr(MONEY_ERR.amount);
      return;
    }
    dispatch(sendRequest(number, amount));
    closeAttach();
  };

  const name = conv?.name || number;

  return (
    <div className="msg msg--conv">
      <div className="msg-conv__bar">
        <button className="msg-conv__back" onClick={onBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <div className="msg-conv__who">
          <Avatar name={name} src={conv?.avatar} className="msg-avatar--md" />
          <div className="msg-conv__name">
            {name}
            <ChevronRightIcon className="msg-conv__namechev" />
          </div>
        </div>
        <div className="msg-conv__spacer" />
      </div>

      <div className="msg-conv__scroll" ref={scrollRef}>
        {items.map((m) => (
          <Bubble key={m.id} msg={m} onPay={(amt) => openMoney(amt)} />
        ))}
      </div>

      <MessageInput onSend={send} onPlus={() => setAttach('menu')} />

      {attach === 'menu' && (
        <div className="msg-attach" onClick={closeAttach}>
          <div className="msg-attach__sheet" onClick={(e) => e.stopPropagation()}>
            <button className="msg-attach__item" onClick={() => openMoney(0)}>
                Send Money
            </button>
            <button className="msg-attach__cancel" onClick={closeAttach}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {attach === 'money' && (
        <>
          <div className="msg-cash-backdrop" onClick={closeAttach} />
          <div className="msg-cash">
            <button className="msg-cash__grab" onClick={closeAttach} aria-label="Close" />

            <div className="msg-cash__amountrow">
            <button
              className="msg-cash__step"
              onClick={() => setAmount((a) => Math.max(0, a - 1))}
            >
              −
            </button>
            <div className="msg-cash__amount">${amount.toLocaleString()}</div>
            <button
              className="msg-cash__step"
              onClick={() => setAmount((a) => Math.min(MAX_AMOUNT, a + 1))}
            >
              +
            </button>
          </div>

          <button className="msg-cash__kbtoggle" onClick={() => setShowKeypad((v) => !v)}>
            {showKeypad ? 'Hide Keypad' : 'Show Keypad'}
          </button>

          {moneyErr && <div className="msg-cash__err">{moneyErr}</div>}

          {showKeypad && (
            <Keypad
              onDigit={(d) => {
                setMoneyErr('');
                setAmount((a) => Math.min(MAX_AMOUNT, a * 10 + Number(d)));
              }}
              onBack={() => setAmount((a) => Math.floor(a / 10))}
            />
          )}

          <div className="msg-cash__buttons">
            <button className="msg-cash__btn msg-cash__btn--req" onClick={doRequest}>
              Request
            </button>
            <button
              className="msg-cash__btn msg-cash__btn--send"
              onClick={doSend}
              disabled={busy}
            >
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
          </div>
        </>
      )}
    </div>
  );
}

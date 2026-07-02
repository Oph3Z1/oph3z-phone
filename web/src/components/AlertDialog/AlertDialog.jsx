import { useDispatch, useSelector } from 'react-redux';
import './AlertDialog.css';
import { resolveDialog } from '../../store/slices/dialogSlice';

// Phone-wide iOS-style alert. Rendered once at the top of the phone; driven by the
// dialog slice (openDialog thunk).
export default function AlertDialog() {
  const dispatch = useDispatch();
  const { open, title, message, buttons } = useSelector((s) => s.dialog);
  if (!open) return null;

  const row = buttons.length === 2; // two buttons sit side-by-side like iOS

  return (
    <div className="alertdlg">
      <div className="alertdlg__card">
        <div className="alertdlg__body">
          {title && <div className="alertdlg__title">{title}</div>}
          {message && <div className="alertdlg__msg">{message}</div>}
        </div>
        <div className={`alertdlg__btns${row ? ' is-row' : ''}`}>
          {buttons.map((b, i) => (
            <button
              key={i}
              className={`alertdlg__btn alertdlg__btn--${b.style || 'default'}`}
              onClick={() => dispatch(resolveDialog(b.value))}
            >
              {b.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

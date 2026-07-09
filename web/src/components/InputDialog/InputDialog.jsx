import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './InputDialog.css';
import { resolvePrompt } from '../../store/slices/promptSlice';

export default function InputDialog() {
    const dispatch = useDispatch();
    const { open, title, message, placeholder, value, confirmText, cancelText, maxLength, fields } =
        useSelector((s) => s.prompt);

    const isMulti = Array.isArray(fields) && fields.length > 0;
    const defs = useMemo(
        () => (isMulti ? fields : [{ key: '__single', placeholder, value, maxLength }]),
        [isMulti, fields, placeholder, value, maxLength],
    );

    const [vals, setVals] = useState({});
    const firstRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const seed = {};
        defs.forEach((f) => {
            seed[f.key] = f.value || '';
        });
        setVals(seed);
        const id = setTimeout(() => {
            const el = firstRef.current;
            if (el) {
                el.focus();
                const end = el.value.length;
                el.setSelectionRange(end, end);
            }
        }, 60);
        return () => clearTimeout(id);
    }, [open, defs]);

    if (!open) return null;

    const canConfirm = defs.every((f) => f.optional || (vals[f.key] || '').trim());

    const cancel = () => dispatch(resolvePrompt(null));
    const confirm = () => {
        if (!canConfirm) return;
        if (isMulti) {
            const out = {};
            defs.forEach((f) => {
                out[f.key] = (vals[f.key] || '').trim();
            });
            dispatch(resolvePrompt(out));
        } else {
            dispatch(resolvePrompt((vals.__single || '').trim()));
        }
    };
    const onKeyDown = (e) => {
        if (e.key === 'Enter') confirm();
        else if (e.key === 'Escape') cancel();
    };
    const setField = (key, v) => setVals((prev) => ({ ...prev, [key]: v }));

    return (
        <div className="inputdlg" onPointerDown={cancel}>
            <div className="inputdlg__card" onPointerDown={(e) => e.stopPropagation()}>
                <div className="inputdlg__head">
                    {title && <div className="inputdlg__title">{title}</div>}
                    {message && <div className="inputdlg__msg">{message}</div>}
                </div>

                <div className="inputdlg__fields">
                    {defs.map((f, i) => (
                        <input
                            key={f.key}
                            ref={i === 0 ? firstRef : null}
                            className="inputdlg__field"
                            value={vals[f.key] || ''}
                            placeholder={f.placeholder || f.label || ''}
                            maxLength={f.maxLength || maxLength}
                            onChange={(e) => setField(f.key, e.target.value)}
                            onKeyDown={onKeyDown}
                        />
                    ))}
                </div>

                <div className="inputdlg__btns">
                    <button className="inputdlg__btn inputdlg__btn--cancel" onClick={cancel}>
                        {cancelText}
                    </button>
                    <button
                        className="inputdlg__btn inputdlg__btn--confirm"
                        onClick={confirm}
                        disabled={!canConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
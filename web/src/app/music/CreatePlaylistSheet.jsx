import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchNui } from '../../utils/fetchNui';
import { loadLibrary } from '../../store/slices/spotifySlice';
import { pushToast } from '../../store/slices/toastSlice';
import { useT } from '../../i18n/useT';

export default function CreatePlaylistSheet({ onClose }) {
    const t = useT();
    const dispatch = useDispatch();
    const [name, setName] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current && inputRef.current.focus({ preventScroll: true });
    }, []);

    const create = async () => {
        const nm = name.trim();
        if (!nm) return;
        const res = await fetchNui(
            'phone:spotify:createPlaylist',
            { name: nm },
            { ok: true, playlist: { id: 'pl1', name: nm, tracks: [] } },
        );
        onClose();
        if (res && res.ok) {
            dispatch(loadLibrary());
            dispatch(pushToast({ type: 'success', title: t('spotify.playlistCreated'), body: '' }));
        }
    };

    return (
        <div className="sp-sheet" onClick={onClose}>
            <div className="sp-sheet__panel" onClick={(e) => e.stopPropagation()}>
                <button
                    className="sp-sheet__griphit"
                    onClick={onClose}
                    aria-label={t('common.close')}
                >
                    <span className="sp-sheet__grip" />
                </button>
                <div className="sp-sheet__title">{t('spotify.newPlaylist')}</div>
                <input
                    ref={inputRef}
                    className="sp-input"
                    maxLength={60}
                    placeholder={t('spotify.playlistNamePh')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && create()}
                />
                <div className="sp-sheet__row">
                    <button className="sp-btn sp-btn--ghost" onClick={onClose}>
                        {t('common.cancel')}
                    </button>
                    <button
                        className="sp-btn sp-btn--green"
                        disabled={!name.trim()}
                        onClick={create}
                    >
                        {t('spotify.create')}
                    </button>
                </div>
            </div>
        </div>
    );
}
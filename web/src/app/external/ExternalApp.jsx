import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeApp } from '../../store/slices/phoneSlice';
import { openDialog } from '../../store/slices/dialogSlice';
import { openPrompt } from '../../store/slices/promptSlice';
import { pushToast } from '../../store/slices/toastSlice';
import { clearNotifsFor } from '../../store/slices/notificationsSlice';
import { openShare, clearDeliver } from '../../store/slices/airdropSlice';
import { finishAppShare, cancelAppShare } from '../../store/slices/shareSlice';
import ExternalShareSheet from './ExternalShareSheet';
import './ExternalApp.css';

function toFrameSrc(url) {
    if (typeof url === 'string' && url.startsWith('nui://')) {
        return 'https://cfx-nui-' + url.slice('nui://'.length);
    }
    return url;
}

export default function ExternalApp({ app }) {
    const dispatch = useDispatch();
    const identity = useSelector((s) => s.phone.identity);
    const language = useSelector((s) => s.settings.language);
    const deliver = useSelector((s) => s.airdrop.deliver);
    const deliverRef = useRef(deliver);
    deliverRef.current = deliver;
    const shareReq = useSelector((s) => s.share.request);
    const shareReqRef = useRef(shareReq);
    shareReqRef.current = shareReq;
    const sharePosted = useRef(false);
    const frameRef = useRef(null);
    const [shareItem, setShareItem] = useState(null);

    const postToApp = (msg) => {
        const win = frameRef.current && frameRef.current.contentWindow;
        if (win) win.postMessage(msg, '*');
    };

    const deliverAirdrop = () => {
        const d = deliverRef.current;
        if (d && d.appId === app.id) {
            postToApp({ type: 'oph3z:airdrop:received', payload: d.payload });
            dispatch(clearDeliver());
        }
    };

    const postShareRequest = () => {
        const r = shareReqRef.current;
        if (r && r.appId === app.id && !sharePosted.current) {
            sharePosted.current = true;
            postToApp({ type: 'oph3z:shareRequest' });
        }
    };

    const sendInit = () => {
        const win = frameRef.current && frameRef.current.contentWindow;
        if (!win) return;
        win.postMessage(
            { type: 'oph3z:init', app: { id: app.id, label: app.label }, identity, language },
            '*',
        );
        deliverAirdrop();
        postShareRequest();
    };

    useEffect(() => {
        postToApp({ type: 'oph3z:language', language });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language]);

    useEffect(() => {
        dispatch(clearNotifsFor({ app: app.id }));
    }, [app.id, dispatch]);

    useEffect(() => {
        if (deliver && deliver.appId === app.id) deliverAirdrop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deliver, app.id]);

    useEffect(() => {
        if (shareReq && shareReq.appId === app.id) postShareRequest();
        else sharePosted.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shareReq, app.id]);

    useEffect(() => {
        const onMsg = (e) => {
            const d = e.data || {};
            if (d.type === 'oph3z:ready') {
                sendInit();
                deliverAirdrop();
                postShareRequest();
            } else if (d.type === 'oph3z:close') dispatch(closeApp());
            else if (d.type === 'oph3z:toast') {
                dispatch(
                    pushToast({ type: d.toastType, title: d.title, body: d.body, app: app.id }),
                );
            } else if (d.type === 'oph3z:airdrop') {
                dispatch(
                    openShare({
                        kind: 'app',
                        app: {
                            id: app.id,
                            title: d.title || app.label,
                            icon: app.icon,
                            payload: d.payload,
                        },
                    }),
                );
            } else if (d.type === 'oph3z:share') {
                setShareItem(d.item || {});
            } else if (d.type === 'oph3z:shareResult') {
                dispatch(finishAppShare(d.item));
            } else if (d.type === 'oph3z:shareCancel') {
                dispatch(cancelAppShare());
            } else if (d.type === 'oph3z:confirm') {
                dispatch(
                    openDialog({
                        title: d.title,
                        message: d.message,
                        buttons: [
                            { text: d.cancelText || 'Cancel', style: 'cancel', value: false },
                            {
                                text: d.confirmText || 'OK',
                                style: d.destructive ? 'destructive' : 'default',
                                value: true,
                            },
                        ],
                    }),
                ).then((confirmed) =>
                    postToApp({ type: 'oph3z:confirm:result', id: d.id, confirmed }),
                );
            } else if (d.type === 'oph3z:alert') {
                const buttons = (d.buttons && d.buttons.length ? d.buttons : [{ text: 'OK' }]).map(
                    (b, i) => ({
                        text: b.text,
                        style: b.style,
                        value: b.value !== undefined ? b.value : i,
                    }),
                );
                dispatch(openDialog({ title: d.title, message: d.message, buttons })).then(
                    (value) => postToApp({ type: 'oph3z:alert:result', id: d.id, value }),
                );
            } else if (d.type === 'oph3z:prompt') {
                dispatch(
                    openPrompt({
                        title: d.title,
                        message: d.message,
                        placeholder: d.placeholder,
                        value: d.value,
                        confirmText: d.confirmText,
                        cancelText: d.cancelText,
                        maxLength: d.maxLength,
                        fields: d.fields,
                    }),
                ).then((value) => postToApp({ type: 'oph3z:prompt:result', id: d.id, value }));
            }
        };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [app.id, identity]);

    return (
        <div className="extapp">
            <iframe
                ref={frameRef}
                className="extapp__frame"
                src={toFrameSrc(app.url)}
                title={app.label}
                onLoad={sendInit}
                allow="autoplay; microphone; camera; clipboard-read; clipboard-write"
            />
            {shareItem && (
                <ExternalShareSheet app={app} item={shareItem} onClose={() => setShareItem(null)} />
            )}
        </div>
    );
}
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './CameraApp.css';

import { fetchNui } from '../../utils/fetchNui';
import { pad2 } from '../../utils/misc';
import { uploadToProvider, dataURLtoBlob } from '../../utils/upload';
import { playSound } from '../../utils/sound';
import { useNuiEvent } from '../../hooks/useNuiEvent';
import { openApp, saveAvatar, setLaunchTab } from '../../store/slices/phoneSlice';
import { loadPhotos, upsertPhoto } from '../../store/slices/photosSlice';
import { setShareTo, setResumeThread, setDraftAttach } from '../../store/slices/messagesSlice';
import { setResumeGroup, setGroupDraft } from '../../store/slices/groupsSlice';
import { setCapture } from '../../store/slices/xSlice';
import { setCapture as marketSetCapture } from '../../store/slices/marketplaceSlice';
import { FlipIcon } from './components/icons';
import { useT } from '../../i18n/useT';

const fmt = (s) => `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;

const SELFIE_SHIFT = -0.13;

export default function CameraApp() {
    const dispatch = useDispatch();
    const t = useT();
    const items = useSelector((s) => s.photos.items);
    const shareTo = useSelector((s) => s.messages.shareTo);
    const shareToRef = useRef(shareTo);
    shareToRef.current = shareTo;

    const [mode, setMode] = useState('photo');
    const [recording, setRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [busy, setBusy] = useState(false);
    const [flash, setFlash] = useState(false);
    const [processing, setProcessing] = useState(false);

    const feedRef = useRef(null);
    const cfgRef = useRef(null);
    const videoCfgRef = useRef({ mode: 'off', gate: false });
    const recRef = useRef(null);
    const chunksRef = useRef([]);
    const recStartRef = useRef(0);
    const sessionRef = useRef(null);
    const modeRef = useRef('off');
    const procTimerRef = useRef(null);

    const micStreamRef = useRef(null);
    const audioCtxRef = useRef(null);
    const audioGainRef = useRef(null);
    const gateRef = useRef(false);

    const last = useMemo(() => [...items].sort((a, b) => (b.ts || 0) - (a.ts || 0))[0], [items]);

    useEffect(() => {
        (async () => {
            const res = await fetchNui('phone:camera:enter', {}, {});
            if (res && res.camera) cfgRef.current = res.camera;
            if (res && res.video) videoCfgRef.current = res.video;
        })();
        dispatch(loadPhotos());
        return () => {
            if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
            stopSelfMic();
            if (procTimerRef.current) clearTimeout(procTimerRef.current);
            fetchNui('phone:camera:exit', {}, {});
            dispatch(setShareTo(null));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let stopped = false;
        let tries = 0;
        const attach = () => {
            if (stopped) return;
            const mr = window.MainRender;
            if (mr && feedRef.current) {
                mr.renderToTarget(feedRef.current);
                return;
            }
            if (tries++ < 60) setTimeout(attach, 100);
        };
        attach();
        return () => {
            stopped = true;
            if (window.MainRender) window.MainRender.stop();
        };
    }, []);

    useEffect(() => {
        fetchNui('phone:camera:mode', { mode }, {});
        if (window.MainRender && window.MainRender.setShift) window.MainRender.setShift(0);
    }, [mode]);

    useEffect(() => {
        if (!recording) {
            setElapsed(0);
            return;
        }
        const id = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(id);
    }, [recording]);

    useNuiEvent('phone:camera:talk', (d) => {
        const gain = audioGainRef.current;
        const ctx = audioCtxRef.current;
        if (!gain || !ctx || !gateRef.current) return;
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(d && d.talking ? 1 : 0, now, 0.02);
    });

    useNuiEvent('phone:camera:videoDone', (d) => {
        if (procTimerRef.current) {
            clearTimeout(procTimerRef.current);
            procTimerRef.current = null;
        }
        setProcessing(false);
        if (!d) return;
        if (d.photo) dispatch(upsertPhoto(d.photo));
        if (d.url) routeShare(d.url, 'video');
    });

    const routeShare = (url, type) => {
        const to = shareToRef.current;
        if (!to) return;
        dispatch(setShareTo(null));
        if (to === 'x' || to === 'xedit') {
            dispatch(setCapture({ url, type }));
            dispatch(openApp('twexa'));
            return;
        }
        if (to === 'market') {
            dispatch(marketSetCapture({ url, type }));
            dispatch(openApp('marketplace'));
            return;
        }
        if (String(to).startsWith('g:')) {
            const gid = String(to).slice(2);
            dispatch(setGroupDraft({ gid, attach: { type, url } }));
            dispatch(setResumeGroup(gid));
        } else {
            dispatch(setDraftAttach({ number: to, attach: { type, url } }));
            dispatch(setResumeThread(to));
        }
        dispatch(openApp('message'));
    };

    const saveAndRoute = async (url, type, duration) => {
        if (!url) return;
        const to = shareToRef.current;
        if (to === 'profile') {
            dispatch(setShareTo(null));
            dispatch(saveAvatar(url));
            dispatch(setLaunchTab('profile'));
            dispatch(openApp('settings'));
            return;
        }
        const photo = await fetchNui('phone:camera:save', { url, type, duration }, null);
        if (photo) dispatch(upsertPhoto(photo));
        else console.error('[camera] save returned no photo for', url);
        routeShare(url, type);
    };

    const takePhoto = async () => {
        const canvas = feedRef.current;
        if (busy || !canvas) return;
        setBusy(true);
        setFlash(true);
        playSound('photosound.mp3');
        setTimeout(() => setFlash(false), 180);

        try {
            const blob = dataURLtoBlob(canvas.toDataURL('image/jpeg', 0.85));
            const url = await uploadToProvider(blob, 'photo.jpg', cfgRef.current);
            if (url) await saveAndRoute(url, 'image');
        } catch (e) {
            console.error('[camera] takePhoto failed', e);
        }
        setBusy(false);
    };

    const startSelfMic = async (gate) => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) {
                stream.getTracks().forEach((tr) => tr.stop());
                return null;
            }
            const ctx = new Ctx();
            const srcNode = ctx.createMediaStreamSource(stream);
            const gain = ctx.createGain();
            gain.gain.value = gate ? 0 : 1;
            const dest = ctx.createMediaStreamDestination();
            srcNode.connect(gain);
            gain.connect(dest);
            micStreamRef.current = stream;
            audioCtxRef.current = ctx;
            audioGainRef.current = gain;
            gateRef.current = !!gate;
            return dest.stream.getAudioTracks()[0] || null;
        } catch (e) {
            return null;
        }
    };

    const stopSelfMic = () => {
        try {
            if (micStreamRef.current) micStreamRef.current.getTracks().forEach((tr) => tr.stop());
        } catch (_) {}
        try {
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed')
                audioCtxRef.current.close();
        } catch (_) {}
        micStreamRef.current = null;
        audioCtxRef.current = null;
        audioGainRef.current = null;
        gateRef.current = false;
    };

    const startRec = async () => {
        const canvas = feedRef.current;
        if (!canvas || !canvas.captureStream) return;
        const vcfg = videoCfgRef.current || { mode: 'off', gate: false };
        const videoStream = canvas.captureStream(30);

        let audioTrack = null;
        if (vcfg.mode === 'self') audioTrack = await startSelfMic(vcfg.gate);

        const startRes = await fetchNui(
            'phone:camera:videoStart',
            { mode: vcfg.mode, gate: vcfg.gate },
            null,
        );
        modeRef.current = vcfg.mode;
        sessionRef.current =
            vcfg.mode === 'nearby' ? (startRes && startRes.sessionId) || null : null;

        const tracks = videoStream.getVideoTracks();
        const stream = new MediaStream(audioTrack ? [...tracks, audioTrack] : [...tracks]);

        let mime = 'video/webm;codecs=vp8,opus';
        if (!audioTrack || (window.MediaRecorder && !MediaRecorder.isTypeSupported(mime)))
            mime = 'video/webm';
        let rec;
        try {
            rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1500000 });
        } catch (e) {
            stopSelfMic();
            return;
        }
        chunksRef.current = [];
        rec.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.onstop = async () => {
            const duration = Math.round((Date.now() - recStartRef.current) / 1000);
            stopSelfMic();
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const url = await uploadToProvider(blob, 'video.webm', cfgRef.current);
            const rmode = modeRef.current;
            const sid = sessionRef.current;

            if (rmode === 'nearby' && sid) {
                if (!url) {
                    fetchNui('phone:camera:videoStop', { sessionId: sid }, null);
                    return;
                }
                setProcessing(true);
                procTimerRef.current = setTimeout(() => setProcessing(false), 35000);
                fetchNui('phone:camera:videoStop', { sessionId: sid, url, duration }, null);
            } else {
                fetchNui('phone:camera:videoStop', { sessionId: null }, null);
                await saveAndRoute(url, 'video', duration);
            }
        };
        recStartRef.current = Date.now();
        rec.start();
        recRef.current = rec;
        setRecording(true);
    };

    const stopRec = () => {
        const rec = recRef.current;
        if (rec && rec.state !== 'inactive') rec.stop();
        recRef.current = null;
        setRecording(false);
    };

    const toggleVideo = () => (recording ? stopRec() : startRec());

    const onShutter = () => {
        if (processing) return;
        return mode === 'photo' ? takePhoto() : toggleVideo();
    };

    const backToChat = () => {
        const to = shareToRef.current;
        dispatch(setShareTo(null));
        if (to === 'profile') {
            dispatch(setLaunchTab('profile'));
            dispatch(openApp('settings'));
            return;
        }
        if (to === 'x' || to === 'xedit') {
            dispatch(openApp('twexa'));
            return;
        }
        if (to === 'market') {
            dispatch(openApp('marketplace'));
            return;
        }
        if (to) {
            if (String(to).startsWith('g:')) dispatch(setResumeGroup(String(to).slice(2)));
            else dispatch(setResumeThread(to));
        }
        dispatch(openApp('message'));
    };

    const flip = async () => {
        const res = await fetchNui('phone:camera:flip', {}, { front: false });
        const front = !!(res && res.front);
        if (window.MainRender && window.MainRender.setShift) {
            window.MainRender.setShift(front && mode === 'photo' ? SELFIE_SHIFT : 0);
        }
    };

    return (
        <div className="camera">
            <canvas className="camera__feed" ref={feedRef} />
            {flash && <div className="camera__flash" />}

            <div className="camera__topbar" />

            {shareTo && !recording && !processing && (
                <button className="camera__cancel" onClick={backToChat}>
                    {t('camera.cancel')}
                </button>
            )}

            {mode === 'video' && !processing && (
                <div className={`camera__rec${recording ? ' is-recording' : ''}`}>
                    <span className="camera__recdot" />
                    {fmt(elapsed)}
                </div>
            )}

            <div className="camera__bottombar">
                {!recording && (
                    <div className="camera__modes">
                        <button
                            className={mode === 'photo' ? 'is-active' : ''}
                            onClick={() => setMode('photo')}
                        >
                            {t('camera.photo')}
                        </button>
                        <button
                            className={mode === 'video' ? 'is-active' : ''}
                            onClick={() => setMode('video')}
                        >
                            {t('camera.video')}
                        </button>
                    </div>
                )}

                <div className="camera__row">
                    <button
                        className="camera__thumb"
                        onClick={() => dispatch(openApp('photos'))}
                        style={{ visibility: recording ? 'hidden' : 'visible' }}
                        aria-label="Open Photos"
                    >
                        {last ? (
                            last.type === 'video' ? (
                                <video src={last.url} muted />
                            ) : (
                                <img src={last.url} alt="" />
                            )
                        ) : null}
                    </button>

                    <button
                        className={`camera__shutter camera__shutter--${mode}${recording ? ' is-recording' : ''}`}
                        onClick={onShutter}
                        aria-label="Shutter"
                    >
                        <span className="camera__shutter-inner" />
                    </button>

                    <button className="camera__flip" onClick={flip} aria-label="Flip camera">
                        <FlipIcon />
                    </button>
                </div>
            </div>

            {processing && (
                <div className="camera__processing">
                    <div className="camera__spinner" />
                    <div className="camera__processing-title">{t('camera.processing')}</div>
                    <div className="camera__processing-hint">{t('camera.processingHint')}</div>
                </div>
            )}
        </div>
    );
}
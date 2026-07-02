import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './CameraApp.css';

import { fetchNui } from '../../utils/fetchNui';
import { pad2 } from '../../utils/misc';
import { uploadToProvider, dataURLtoBlob } from '../../utils/upload';
import { playSound } from '../../utils/sound';
import { openApp } from '../../store/slices/phoneSlice';
import { loadPhotos, upsertPhoto } from '../../store/slices/photosSlice';
import { setShareTo, setResumeThread, setDraftAttach } from '../../store/slices/messagesSlice';
import { setResumeGroup, setGroupDraft } from '../../store/slices/groupsSlice';
import { FlipIcon } from './components/icons';

const fmt = (s) => `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;

const SELFIE_SHIFT = -0.13; // shift the crop left so the whole character is framed

export default function CameraApp() {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.photos.items);
  // When launched from a chat's camera button, the capture is sent there.
  const shareTo = useSelector((s) => s.messages.shareTo);
  const shareToRef = useRef(shareTo);
  shareToRef.current = shareTo;

  const [mode, setMode] = useState('photo'); // 'photo' | 'video'
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  const feedRef = useRef(null); // <canvas> the live phone view is drawn into
  const cfgRef = useRef(null); // upload provider config (from Lua)
  const recRef = useRef(null); // MediaRecorder
  const chunksRef = useRef([]);
  const recStartRef = useRef(0); // recording start time (for duration)

  // Most recent item for the gallery thumbnail.
  const last = useMemo(
    () => [...items].sort((a, b) => (b.ts || 0) - (a.ts || 0))[0],
    [items]
  );

  // Enter/exit the in-game camera mode; grab the upload config; refresh thumb.
  useEffect(() => {
    (async () => {
      const res = await fetchNui('phone:camera:enter', {}, {});
      if (res && res.camera) cfgRef.current = res.camera;
    })();
    dispatch(loadPhotos());
    return () => {
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
      fetchNui('phone:camera:exit', {}, {});
      // Leaving the camera without capturing cancels any pending chat attach.
      dispatch(setShareTo(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Point the live game-view renderer at our canvas (the character's POV). The
  // renderer (gamerender.js) may take a beat to be ready, so poll. No-op in browser.
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
      if (tries++ < 60) setTimeout(attach, 100); // up to ~6s
    };
    attach();
    return () => {
      stopped = true;
      if (window.MainRender) window.MainRender.stop();
    };
  }, []);

  // Tell Lua the active mode; reset the selfie crop-shift (it's photo-only).
  useEffect(() => {
    fetchNui('phone:camera:mode', { mode }, {});
    if (window.MainRender && window.MainRender.setShift) window.MainRender.setShift(0);
  }, [mode]);

  // Recording timer.
  useEffect(() => {
    if (!recording) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Save an uploaded URL into the Photos library (server), then show it. If the
  // camera was opened from a chat, also send it there and return to Messages.
  const save = async (url, type, duration) => {
    if (!url) return;
    const photo = await fetchNui('phone:camera:save', { url, type, duration }, null);
    if (photo) dispatch(upsertPhoto(photo));
    else console.error('[camera] save returned no photo for', url);

    // If launched from a chat, hand the capture back as a draft attachment so the
    // player can add a caption before sending (don't auto-send).
    const to = shareToRef.current;
    if (to) {
      dispatch(setShareTo(null));
      if (String(to).startsWith('g:')) {
        const gid = String(to).slice(2);
        dispatch(setGroupDraft({ gid, attach: { type, url } }));
        dispatch(setResumeGroup(gid));
      } else {
        dispatch(setDraftAttach({ number: to, attach: { type, url } }));
        dispatch(setResumeThread(to));
      }
      dispatch(openApp('message'));
    }
  };

  // PHOTO: grab the phone-view canvas (JPEG), upload it, save the URL.
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
      if (url) await save(url, 'image');
    } catch (e) {
      console.error('[camera] takePhoto failed', e);
    }
    setBusy(false);
  };

  // VIDEO: record the phone-view canvas stream; on stop send the webm to Lua.
  const startRec = () => {
    const canvas = feedRef.current;
    if (!canvas || !canvas.captureStream) return;
    const stream = canvas.captureStream(30);
    let rec;
    try {
      rec = new MediaRecorder(stream, { mimeType: 'video/webm', videoBitsPerSecond: 1500000 });
    } catch (e) {
      return;
    }
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      const duration = Math.round((Date.now() - recStartRef.current) / 1000);
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = await uploadToProvider(blob, 'video.webm', cfgRef.current);
      await save(url, 'video', duration);
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

  const onShutter = () => (mode === 'photo' ? takePhoto() : toggleVideo());

  // Cancel: go back to the chat that launched the camera, without capturing.
  const backToChat = () => {
    const to = shareToRef.current;
    dispatch(setShareTo(null));
    if (to) {
      if (String(to).startsWith('g:')) dispatch(setResumeGroup(String(to).slice(2)));
      else dispatch(setResumeThread(to));
    }
    dispatch(openApp('message'));
  };

  // Flip rear/front. In PHOTO selfie the native cam is off-centre, so shift the
  // crop left; the VIDEO selfie cam is centred, so no shift there.
  const flip = async () => {
    const res = await fetchNui('phone:camera:flip', {}, { front: false });
    const front = !!(res && res.front);
    if (window.MainRender && window.MainRender.setShift) {
      window.MainRender.setShift(front && mode === 'photo' ? SELFIE_SHIFT : 0);
    }
  };

  return (
    <div className="camera">
      {/* Live viewfinder: the character's POV rendered into the phone screen */}
      <canvas className="camera__feed" ref={feedRef} />
      {flash && <div className="camera__flash" />}

      {/* Black bar behind the status bar / dynamic island */}
      <div className="camera__topbar" />

      {/* Cancel back to the chat (only when launched from Messages) */}
      {shareTo && !recording && (
        <button className="camera__cancel" onClick={backToChat}>
          Cancel
        </button>
      )}

      {/* REC timer — visible in video mode (00:00 idle), counts while recording */}
      {mode === 'video' && (
        <div className={`camera__rec${recording ? ' is-recording' : ''}`}>
          <span className="camera__recdot" />
          {fmt(elapsed)}
        </div>
      )}

      {/* Black bottom bar with the controls */}
      <div className="camera__bottombar">
        {!recording && (
          <div className="camera__modes">
            <button
              className={mode === 'photo' ? 'is-active' : ''}
              onClick={() => setMode('photo')}
            >
              PHOTO
            </button>
            <button
              className={mode === 'video' ? 'is-active' : ''}
              onClick={() => setMode('video')}
            >
              VIDEO
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

          <button
            className="camera__flip"
            onClick={flip}
            aria-label="Flip camera"
          >
            <FlipIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

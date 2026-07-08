// Server-side audio muxer for the Camera app's "nearby voice" video mode.
//
// The Lua coordinator (server/app/camera/main.lua) collects the recorder's
// silent video URL plus one gated voice clip per nearby player, then fires
// 'oph3z-phone:mux:run'. Here we download them, run ffmpeg once to overlay the
// mixed audio onto the (un-re-encoded) video, upload the result, and fire
// 'oph3z-phone:mux:done' with the final URL — or `false` so Lua falls back to
// the silent video. Nothing here ever throws into the event loop: every failure
// path resolves to a clean `false`.
//
// Requirements: ffmpeg reachable at Config.FFmpegPath, and a FXServer Node build
// with global fetch/FormData/Blob (current artifacts ship Node 22, which has
// them). If either is missing we log once and fall back gracefully.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const hasFetch = typeof fetch === 'function' && typeof FormData === 'function' && typeof Blob === 'function';
let warnedNoFetch = false;

function log(msg) {
  console.log(`[oph3z-phone] videomux: ${msg}`);
}

// Resolve ffmpeg once. Honours an explicit Config.FFmpegPath if it points at a
// real file; otherwise auto-detects via PATH (where/which) and common install
// locations, so 'ffmpeg' just works on any host without hand-configuring a path.
let resolvedFfmpeg;

function fileExists(p) {
  try { return !!p && fs.statSync(p).isFile(); } catch (e) { return false; }
}

function whichCmd(cmd) {
  try {
    const finder = process.platform === 'win32' ? 'where' : 'which';
    const r = spawnSync(finder, [cmd], { encoding: 'utf8', windowsHide: true });
    if (r.status === 0 && r.stdout) {
      const first = r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
      if (first) return first;
    }
  } catch (e) { /* ignore */ }
  return null;
}

// winget installs ffmpeg under %LOCALAPPDATA%\Microsoft\WinGet\Packages\<pkg>\<build>\bin.
function findWinget() {
  const local = process.env.LOCALAPPDATA;
  if (!local) return null;
  const base = path.join(local, 'Microsoft', 'WinGet', 'Packages');
  let pkgs;
  try { pkgs = fs.readdirSync(base); } catch (e) { return null; }
  for (const pkg of pkgs) {
    if (!/ffmpeg/i.test(pkg)) continue;
    let subs;
    try { subs = fs.readdirSync(path.join(base, pkg)); } catch (e) { continue; }
    for (const sub of subs) {
      const exe = path.join(base, pkg, sub, 'bin', 'ffmpeg.exe');
      if (fileExists(exe)) return exe;
    }
  }
  return null;
}

function resolveFfmpeg(configured) {
  if (resolvedFfmpeg !== undefined) return resolvedFfmpeg;

  const looksLikePath = configured && (configured.includes('/') || configured.includes('\\'));
  const candidates = [];

  if (looksLikePath) candidates.push(configured);                 // explicit full path
  candidates.push(whichCmd(configured || 'ffmpeg'));               // PATH lookup
  if (process.platform === 'win32') {
    candidates.push(findWinget());
    candidates.push('C:/ProgramData/chocolatey/bin/ffmpeg.exe');
    candidates.push('C:/ffmpeg/bin/ffmpeg.exe');
  } else {
    candidates.push('/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/snap/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg');
  }

  for (const c of candidates) {
    if (c && fileExists(c)) { resolvedFfmpeg = c; log(`using ffmpeg at ${c}`); return c; }
  }
  // Last resort: trust the bare command works on PATH at spawn time.
  resolvedFfmpeg = configured || 'ffmpeg';
  return resolvedFfmpeg;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

// Upload the finished file with the same provider logic the web client uses.
async function upload(filePath, provider) {
  const buf = fs.readFileSync(filePath);
  const blob = new Blob([buf], { type: 'video/webm' });
  const fd = new FormData();
  let url;
  let headers;

  if (provider && provider.provider === 'fivemanage') {
    url = provider.fivemanage && provider.fivemanage.url;
    headers = { Authorization: provider.fivemanage && provider.fivemanage.apiKey };
    fd.append('file', blob, 'video.webm');
  } else {
    url = provider && provider.discord && provider.discord.webhook;
    if (url && !/wait=/.test(url)) url += (url.includes('?') ? '&' : '?') + 'wait=true';
    fd.append('payload_json', JSON.stringify({ attachments: [{ id: 0, filename: 'video.webm' }] }));
    fd.append('files[0]', blob, 'video.webm');
  }
  if (!url) throw new Error('no upload URL in provider config');

  const res = await fetch(url, { method: 'POST', headers, body: fd });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* non-JSON */ }

  if (provider && provider.provider === 'fivemanage') {
    const out = (json && json.data && json.data.url) || (json && json.url) || null;
    if (!out) throw new Error(`fivemanage response ${res.status}: ${text.slice(0, 200)}`);
    return out;
  }
  const out = (json && json.attachments && json.attachments[0] && json.attachments[0].url) || null;
  if (!out) throw new Error(`discord response ${res.status}: ${text.slice(0, 200)}`);
  return out;
}

function runFfmpeg(ffmpeg, args) {
  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = spawn(ffmpeg, args, { windowsHide: true });
    } catch (e) {
      reject(e);
      return;
    }
    let err = '';
    if (proc.stderr) proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${err.slice(-400)}`));
    });
  });
}

async function mux(payload) {
  const { ffmpeg, videoUrl, clips, provider } = payload || {};
  if (!videoUrl || !Array.isArray(clips) || clips.length === 0) return null;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oph3z-vmux-'));
  const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* ignore */ } };

  try {
    const videoFile = await download(videoUrl, path.join(dir, 'video.webm'));
    // Each clip carries the offset (ms into the video) at which that player
    // entered range and began capturing, so its audio is delayed to line up.
    const kept = [];
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i] || {};
      if (!c.url) continue;
      try {
        const f = await download(c.url, path.join(dir, `a${i}.webm`));
        kept.push({ file: f, offset: Math.max(0, parseInt(c.offset, 10) || 0) });
      } catch (e) {
        // A single failed clip download is non-fatal — mix whatever arrived.
        log(`clip download failed: ${e.message}`);
      }
    }
    if (kept.length === 0) { cleanup(); return null; }

    const out = path.join(dir, 'out.webm');
    const args = ['-y', '-i', videoFile];
    kept.forEach((k) => { args.push('-i', k.file); });

    const delayed = kept.map((k, i) => `[${i + 1}:a]adelay=${k.offset}|${k.offset}[a${i}]`);
    const mixIn = kept.map((_, i) => `[a${i}]`).join('');
    const filter = `${delayed.join(';')};${mixIn}amix=inputs=${kept.length}:normalize=0:dropout_transition=0[aout]`;
    args.push('-filter_complex', filter, '-map', '0:v', '-map', '[aout]');
    args.push('-c:v', 'copy', '-c:a', 'libopus', '-b:a', '48k', '-shortest', out);

    await runFfmpeg(resolveFfmpeg(ffmpeg), args);
    const url = await upload(out, provider);
    cleanup();
    return url;
  } catch (e) {
    log(e.message || String(e));
    cleanup();
    return null;
  }
}

on('oph3z-phone:mux:run', async (sessionId, payload) => {
  if (!hasFetch) {
    if (!warnedNoFetch) {
      warnedNoFetch = true;
      log('this FXServer Node build lacks global fetch/FormData — nearby-voice mux disabled, falling back to silent video. Update your server artifacts.');
    }
    emit('oph3z-phone:mux:done', sessionId, false);
    return;
  }
  let url = false;
  try {
    url = (await mux(payload)) || false;
  } catch (e) {
    log(e.message || String(e));
    url = false;
  }
  emit('oph3z-phone:mux:done', sessionId, url);
});

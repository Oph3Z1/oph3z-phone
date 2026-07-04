// Copy text to the clipboard. The async Clipboard API isn't always available in
// the CEF/NUI webview, so fall back to a hidden <textarea> + execCommand('copy').
// Returns true on success.
export async function copyText(text) {
  const str = String(text == null ? '' : text);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(str);
      return true;
    }
  } catch (e) {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

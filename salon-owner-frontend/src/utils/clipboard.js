/**
 * Cross-browser clipboard copy with execCommand fallback.
 * navigator.clipboard requires HTTPS and is unavailable in older Android WebView.
 */
export function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback: hidden textarea + execCommand
  return new Promise((resolve, reject) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      ok ? resolve() : reject(new Error('execCommand copy failed'));
    } catch (err) {
      document.body.removeChild(el);
      reject(err);
    }
  });
}

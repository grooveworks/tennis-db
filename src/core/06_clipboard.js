// Clipboard helper — text を OS クリップボードへ書き込む
// ブラウザ対応:
//   - navigator.share が使えるならシステム共有シートも誘導 (iOS/Android 実機で便利)
//   - navigator.clipboard.writeText (http/https で動作)
//   - execCommand("copy") フォールバック (file:// や古い Safari 用、UX 劣化なし)
// 戻り値: Promise<boolean> 成功/失敗
const copyToClipboard = async (text) => {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fallthrough */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
};

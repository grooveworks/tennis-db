// Clipboard helper — text を OS クリップボードへ書き込む
// ブラウザ対応:
//   - navigator.clipboard.writeText (http/https で動作)
//   - execCommand("copy") フォールバック (file:// や古い Safari 用、UX 劣化なし)
// 戻り値: Promise<boolean> 成功/失敗
// Round 5 Batch A: catch silent 廃止、失敗理由を console.warn (ユーザー報告時のデバッグ用)
//   Round 5 Batch C: 古いコメントの navigator.share 言及削除 (実装に存在しない、dead comment だった)
const copyToClipboard = async (text) => {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("clipboard.writeText failed (falling back to execCommand):", err?.message || err);
  }
  // execCommand fallback、focus 復帰のため savedActive を保存
  const savedActive = typeof document !== "undefined" ? document.activeElement : null;
  let ta = null;
  try {
    ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    return document.execCommand("copy");
  } catch (err) {
    console.warn("clipboard fallback (execCommand) failed:", err?.message || err);
    return false;
  } finally {
    if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
    if (savedActive && typeof savedActive.focus === "function") {
      try { savedActive.focus(); } catch (_) {}
    }
  }
};

// SettingsModal — アプリ設定 (S15.5.7、Header の ⚙️ から起動)
//
// 役割:
//   - 文字サイズ調整 (標準 / 大 / 特大、メモ系テキストの拡大率を localStorage 永続化)
//   - アプリバージョン表示 (Header からは削除、ここで常設表示)
//   - データバックアップ (S16.11 追加、JSON エクスポート、tennis_db_*.json 互換)
//
// props:
//   open:            boolean
//   fontScale:       1.0 | 1.15 | 1.30
//   onFontScaleChange: (scale) => void  state + lsSave
//   onClose:         () => void
//   toast:           useToast() ({ show })

const _SCALE_OPTIONS = [
  { value: 1.0,  label: "標準", desc: "16 px (現行)" },
  { value: 1.15, label: "大",   desc: "18 px" },
  { value: 1.30, label: "特大", desc: "21 px" },
];

// S16.11 データバックアップ: localStorage の全 KEYS を JSON 化して file download
//   既存 tennis_db_*.json (v3 export) と同じトップレベル構造で出力
//   → 後の復元時に v3/v4 両方のツールで読める
//   - データ変換ロジック禁止 (raw のままコピー)
//   - 失敗時は toast で通知 (silent fail 禁止)
const _exportAllData = (toast) => {
  try {
    const data = {
      version: 4,
      exportedAt: new Date().toISOString(),
      tournaments:     lsLoad(KEYS.tournaments)     || [],
      practices:       lsLoad(KEYS.practices)       || [],
      trials:          lsLoad(KEYS.trials)          || [],
      rackets:         lsLoad(KEYS.rackets)         || [],
      strings:         lsLoad(KEYS.strings)         || [],
      venues:          lsLoad(KEYS.venues)          || [],
      opponents:       lsLoad(KEYS.opponents)       || [],
      next:            lsLoad(KEYS.next)            || [],
      quickTrialCards: lsLoad(KEYS.quickTrialCards) || [],
      stringSetups:    lsLoad(KEYS.stringSetups)    || [],
    };
    const json = JSON.stringify(data, null, 2);
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const filename = `tennis_db_v4_${yyyy}${mm}${dd}_${hh}${mi}.json`;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    if (toast) toast.show(`バックアップを保存しました: ${filename}`, "success");
  } catch (err) {
    console.error("Export failed:", err);
    if (toast) toast.show(`バックアップに失敗しました: ${err?.message || err}`, "error");
  }
};

function SettingsModal({ open, fontScale, onFontScaleChange, onClose, toast, onBulkSummarize, bulkSummarizeProgress, onImportCalendarJson }) {
  // インポート用 hidden file input ref
  const importFileRef = useRef(null);
  const handleImportFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file && onImportCalendarJson) onImportCalendarJson(file);
    // 同じファイルを再選択できるようリセット
    if (e.target) e.target.value = "";
  };
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const scale = typeof fontScale === "number" ? fontScale : 1.0;
  const bulkRunning = bulkSummarizeProgress && bulkSummarizeProgress.running;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="アプリ設定"
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, zIndex: 1000,
      }}
    >
      <div style={{
        background: C.panel,
        borderRadius: RADIUS.card,
        width: "100%", maxWidth: 420,
        maxHeight: "90vh",
        overflow: "auto",
        position: "relative",
        animation: "modalEnter 250ms ease-out",
        padding: 20,
      }}>
        {/* 閉じる */}
        <button
          onClick={onClose}
          aria-label="閉じる"
          style={{
            position: "absolute", top: 12, left: 12,
            width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8, border: "none", background: "transparent",
            color: C.textSecondary, cursor: "pointer",
          }}
        >
          <Icon name="x" size={24} />
        </button>

        {/* タイトル */}
        <div style={{
          fontSize: 16, fontWeight: 700, textAlign: "center",
          marginTop: 16, marginBottom: 18, color: C.text,
          display: "inline-flex", width: "100%",
          alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Icon name="settings" size={18} color={C.text} />
          設定
        </div>

        {/* 文字サイズ (メモ系) */}
        <div style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4,
          }}>
            メモ欄の文字サイズ
          </div>
          <div style={{
            fontSize: 11, color: C.textMuted, marginBottom: 10, lineHeight: 1.5,
          }}>
            試打評価のメモ・編集画面のメモ・試打詳細のメモ表示に適用 (老眼配慮)。
            本文やラベルは現行サイズ維持。
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {_SCALE_OPTIONS.map(opt => {
              const sel = Math.abs(scale - opt.value) < 0.01;
              return (
                <button
                  key={opt.value}
                  onClick={() => onFontScaleChange && onFontScaleChange(opt.value)}
                  aria-pressed={sel}
                  style={{
                    flex: 1, minHeight: 60,
                    border: `1.5px solid ${sel ? C.primary : C.border}`,
                    background: sel ? C.primaryLight : C.panel,
                    color: sel ? C.primary : C.textSecondary,
                    borderRadius: 12, cursor: "pointer", padding: "8px 6px",
                    fontFamily: font, fontWeight: 700,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 2,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{opt.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 500, color: sel ? C.primary : C.textMuted }}>
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* プレビュー */}
        <div style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6,
          }}>
            プレビュー
          </div>
          <div style={{
            fontSize: `${16 * scale}px`,
            lineHeight: 1.55,
            color: C.text,
            background: C.bg,
            borderRadius: 10,
            padding: "12px 14px",
            whiteSpace: "pre-wrap",
          }}>
            サーブの打感が良い、ストロークもブレない。フォアの攻撃時に握りが少し緩む。次は手の内側を意識する。
          </div>
        </div>

        {/* S16.11: データバックアップ */}
        <div style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4,
          }}>
            データのバックアップ
          </div>
          <div style={{
            fontSize: 11, color: C.textMuted, marginBottom: 10, lineHeight: 1.5,
          }}>
            全データを JSON ファイルとして保存。試合前 / 重要な編集前に実行を推奨。
            v3 / v4 互換フォーマット。
          </div>
          <button
            type="button"
            onClick={() => _exportAllData(toast)}
            style={{
              width: "100%", minHeight: 44, padding: "8px 16px",
              border: `1px solid ${C.primary}`, borderRadius: 8,
              background: C.panel, color: C.primary,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: font,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginBottom: 8,
            }}
          >
            <Icon name="download-simple" size={16} color={C.primary} />
            全データを JSON で保存
          </button>

          {/* Google カレンダー予定の取り込み (1 ボタン、ファイル選択不要) */}
          <button
            type="button"
            onClick={() => onImportCalendarJson && onImportCalendarJson(null)}
            disabled={!onImportCalendarJson}
            style={{
              width: "100%", minHeight: 44, padding: "8px 16px",
              border: `1px solid ${C.border}`, borderRadius: 8,
              background: C.panel, color: C.text,
              fontSize: 14, fontWeight: 600,
              cursor: onImportCalendarJson ? "pointer" : "not-allowed",
              fontFamily: font,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <Icon name="calendar" size={16} color={C.textSecondary} />
            Google カレンダー予定を取り込む
          </button>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, lineHeight: 1.4 }}>
            アプリ同梱の最新 JSON から大会・練習を追加 (既存 id は skip)。
          </div>
          {/* ファイル選択経由のインポート (任意の JSON ファイル用、上級者向け) */}
          <input
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFileChange}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => importFileRef.current && importFileRef.current.click()}
            disabled={!onImportCalendarJson}
            style={{
              width: "100%", minHeight: 36, padding: "6px 16px", marginTop: 6,
              background: "transparent", border: "none",
              color: C.textMuted, fontSize: 11,
              cursor: onImportCalendarJson ? "pointer" : "not-allowed",
              fontFamily: font,
            }}
          >
            (任意の JSON ファイルから取り込む)
          </button>
        </div>

        {/* 31-2: 既存データの AI 一括要約 */}
        <div style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4,
          }}>
            メモ AI 要約 (一括処理)
          </div>
          <div style={{
            fontSize: 11, color: C.textMuted, marginBottom: 10, lineHeight: 1.5,
          }}>
            既存の練習・試合・試打のメモ (60 文字以上) を AI で一括要約。
            未要約のものだけが対象、既要約はスキップ。回線とコストに注意。
          </div>
          <button
            type="button"
            onClick={() => onBulkSummarize && onBulkSummarize()}
            disabled={bulkRunning || !onBulkSummarize}
            style={{
              width: "100%", minHeight: 44, padding: "8px 16px",
              border: `1px solid ${bulkRunning ? C.border : C.primary}`, borderRadius: 8,
              background: bulkRunning ? C.panel2 : C.panel,
              color: bulkRunning ? C.textMuted : C.primary,
              fontSize: 14, fontWeight: 600,
              cursor: bulkRunning ? "not-allowed" : "pointer",
              fontFamily: font,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <Icon name="brain" size={16} color={bulkRunning ? C.textMuted : C.primary} />
            {bulkRunning
              ? `処理中… ${bulkSummarizeProgress.done}/${bulkSummarizeProgress.total}`
              : "未要約のメモを AI で一括要約"}
          </button>
          {bulkRunning && bulkSummarizeProgress.lastLabel && (
            <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 6, textAlign: "center" }}>
              {bulkSummarizeProgress.lastLabel}
            </div>
          )}
        </div>

        {/* バージョン情報 */}
        <div style={{
          borderTop: `1px solid ${C.divider}`,
          paddingTop: 14, marginTop: 4,
          fontSize: 12, color: C.textSecondary,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>アプリバージョン</span>
          <span style={{ fontFeatureSettings: '"tnum"', color: C.text, fontWeight: 600 }}>
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
}

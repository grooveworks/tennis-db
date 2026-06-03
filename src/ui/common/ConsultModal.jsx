// ConsultModal.jsx — アプリ内 AI 相談 (B). フルスクリーン overlay。
//   core 同梱 (ui/common、heavy 除外リスト外)。client helper aiConsult() (src/domain/ai_consult.js, core) を呼ぶ。
//   承認済デザイン: preview_ai_consult_p3.html (2026-06-03)
//   - 試合中(fast=haiku)/深掘り(deep=sonnet) モード
//   - 定型文は普段隠れ、⚡ で下からシート表示 (本文=答えの領域を削らない)
//   - 定型文は既定 + localStorage の「自分用」を後から追加可能 (ユーザー要望 2026-06-03)
//   注意: 実際の回答は Cloud Function aiConsult の deploy 後に動く (未 deploy 時は失敗表示)

const _CONSULT_FAST_PRESETS = ["今、力んでる", "浅くなった", "焦り・リードされた", "サーブ入らない", "風が強い", "次の2ゲーム集中"];
const _CONSULT_DEEP_PRESETS = ["Lynx無印@46は勝ててる?", "BOOM弦の切り分け", "マメ問題", "直近の負けの共通点"];
const _CONSULT_PRESETS_LS_KEY = LS_PREFIX + "consultPresets";

function _consultLoadCustomPresets() {
  try { return JSON.parse(localStorage.getItem(_CONSULT_PRESETS_LS_KEY) || "{}") || {}; }
  catch (_) { return {}; }
}
function _consultSaveCustomPresets(obj) {
  try { localStorage.setItem(_CONSULT_PRESETS_LS_KEY, JSON.stringify(obj)); } catch (_) {}
}

// 現在の会話を端末に保持 (リロード/アプリ復帰で消えないように。長期知識ではなく"今の会話"の保全)
const _CONSULT_CONVO_LS_KEY = LS_PREFIX + "consultConvo";
function _consultLoadConvo() {
  try { var a = JSON.parse(localStorage.getItem(_CONSULT_CONVO_LS_KEY) || "[]"); return Array.isArray(a) ? a : []; }
  catch (_) { return []; }
}

// Promise にタイムアウトを付ける (応答が来ない時に固まらない)
function _consultWithTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function (_, reject) { setTimeout(function () { reject(new Error("__timeout__")); }, ms); }),
  ]);
}

function ConsultModal({ open, onClose }) {
  // React hooks は条件付き return より前に呼ぶ (hooks 規則)
  const [mode, setMode] = useState("fast");
  const [msgs, setMsgs] = useState(_consultLoadConvo); // localStorage から復元 (リロード/復帰で消えない)
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sheet, setSheet] = useState(false);
  const [custom, setCustom] = useState(_consultLoadCustomPresets);
  // M2: 決定/保留として残す (ワンセット下書き → 確認 → Firestore 追記)
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftView, setDraftView] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const convRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (convRef.current) convRef.current.scrollTop = convRef.current.scrollHeight;
  }, [msgs, loading, open]);

  // 会話を端末に保存 (リロード/アプリ復帰で消えないように。直近40件)
  useEffect(() => {
    try { localStorage.setItem(_CONSULT_CONVO_LS_KEY, JSON.stringify(msgs.slice(-40))); } catch (_) {}
  }, [msgs]);

  // 処理中フラグの ref ミラー (visibility listener が最新値を読むため)
  useEffect(() => { busyRef.current = loading || draftBusy; }, [loading, draftBusy]);

  // アプリ復帰時 (他アプリから戻る/画面ロック解除): 固まった処理中状態を解除して再開可能にする
  useEffect(() => {
    function onVis() {
      if (!document.hidden && busyRef.current) {
        setLoading(false);
        setDraftBusy(false);
        setErr("アプリ復帰で中断された可能性があります。もう一度送ってください（会話は残っています）。");
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return function () { document.removeEventListener("visibilitychange", onVis); };
  }, []);

  if (!open) return null;

  const presets = [].concat(
    mode === "fast" ? _CONSULT_FAST_PRESETS : _CONSULT_DEEP_PRESETS,
    Array.isArray(custom[mode]) ? custom[mode] : []
  );

  async function send(text) {
    const q = (text != null ? text : input).trim();
    if (!q || loading) return;
    setErr("");
    setInput("");
    setSheet(false);
    const history = msgs.slice();
    setMsgs((m) => m.concat([{ role: "user", content: q }]));
    setLoading(true);
    try {
      const { answer } = await _consultWithTimeout(aiConsult(q, history, mode), 45000);
      setMsgs((m) => m.concat([{ role: "assistant", content: answer }]));
    } catch (e) {
      var msg = (e && e.message) || "";
      if (msg === "__timeout__") {
        msg = "応答がありません（通信が不安定かも）。もう一度送ってください（会話は残っています）。";
      } else if (!msg || /^[\x00-\x7F]+$/.test(msg)) {
        // Firebase callable のコード(internal/not-found 等 = ASCII)は素っ気ないので言い換え (= 未 deploy / 通信断)
        msg = "AI相談に接続できませんでした（準備中か通信状態の可能性）。少し待って再試行してください。";
      }
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  function addPreset() {
    const t = (window.prompt("追加する定型文を入力") || "").trim();
    if (!t) return;
    const next = Object.assign({}, custom);
    next[mode] = (Array.isArray(next[mode]) ? next[mode] : []).concat([t]);
    setCustom(next);
    _consultSaveCustomPresets(next);
  }

  // M2: 今の会話から決定/保留のワンセットを下書き (Cloud Function draftSet)
  async function startDraft() {
    if (draftBusy || msgs.length === 0) return;
    setErr("");
    setDraftBusy(true);
    try {
      if (typeof fbFunctions === "undefined" || !fbFunctions) {
        throw new Error("Firebase Functions が初期化されていません");
      }
      const result = await _consultWithTimeout(
        fbFunctions.httpsCallable("aiConsult")({ mode: "draftSet", history: msgs.slice(-30) }), 60000);
      const d = ((result && result.data && result.data.draft) || "").trim();
      if (!d) throw new Error("下書きが空でした");
      setDraftText(d);
      setDraftView(true);
    } catch (e) {
      var m = (e && e.message) || "";
      if (m === "__timeout__") m = "下書きの応答がありません。もう一度試してください。";
      else if (!m || /^[\x00-\x7F]+$/.test(m)) m = "下書きの作成に失敗しました（準備中か通信の可能性）。";
      setErr(m);
    } finally {
      setDraftBusy(false);
    }
  }

  // M2: 確認したワンセットを Firestore aiContext.obj.sets に追記 (既存データ不変・追記のみ)
  async function saveSet() {
    const t = (draftText || "").trim();
    if (!t || draftBusy) return;
    if (typeof fbFunctions === "undefined" || !fbFunctions) { setErr("保存機能が初期化されていません"); return; }
    setErr("");
    setDraftBusy(true);
    try {
      const dt = new Date();
      const ymd = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
      // クラウド経由でサーバーに確実に保存 (端末キャッシュ止まり回避) + タイムアウトで固まらない
      const result = await _consultWithTimeout(
        fbFunctions.httpsCallable("aiConsult")({ mode: "saveSet", text: t, date: ymd }), 30000);
      if (!(result && result.data && result.data.saved)) throw new Error("保存できませんでした");
      setDraftView(false);
      setDraftText("");
      setSaveMsg("保存しました（サーバー確認済み）。次回からAIが最初に読みます。");
      setTimeout(function () { setSaveMsg(""); }, 5000);
    } catch (e) {
      var m = (e && e.message) || "";
      if (m === "__timeout__") m = "保存の応答がありません。通信を確認してもう一度。";
      else if (!m || /^[\x00-\x7F]+$/.test(m)) m = "保存に失敗しました（通信を確認して再試行）。";
      setErr(m);
    } finally {
      setDraftBusy(false);
    }
  }

  // 会話をリセット (端末保存もクリア)
  function clearConvo() {
    if (loading || draftBusy) return;
    setMsgs([]);
    setErr("");
    setInput("");
    try { localStorage.removeItem(_CONSULT_CONVO_LS_KEY); } catch (_) {}
  }

  const SEG = (m, label) => (
    <button
      onClick={() => setMode(m)}
      style={{
        border: 0, background: mode === m ? C.panel : "transparent",
        color: mode === m ? C.primary : C.textSecondary,
        fontFamily: font, fontSize: 13, fontWeight: 600, padding: "6px 12px",
        borderRadius: 8, boxShadow: mode === m ? "0 1px 2px rgba(0,0,0,.12)" : "none",
      }}
    >{label}</button>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 4000, background: C.bg,
      display: "flex", flexDirection: "column",
      paddingBottom: "env(safe-area-inset-bottom, 0)",
    }}>
      {/* ヘッダ */}
      <div style={{
        background: C.panel, borderBottom: "1px solid " + C.divider,
        padding: "12px 12px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ border: 0, background: "transparent", color: C.primary, fontSize: 26, lineHeight: 1, padding: "0 4px" }}>‹</button>
        <div style={{ flex: "0 0 auto" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>AI相談</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>あなたの文脈を読んだ相手</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", background: C.panel2, borderRadius: 10, padding: 3 }}>
          {SEG("fast", "試合中")}
          {SEG("deep", "深掘り")}
        </div>
      </div>

      {/* 文脈バナー */}
      <div style={{
        margin: "10px 12px 2px", background: C.successLight, border: "1px solid #cdecd9",
        borderRadius: 12, padding: "9px 12px", fontSize: 11.5, color: "#0b7a44",
        display: "flex", gap: 7, alignItems: "flex-start", flexShrink: 0,
      }}>
        <span>📂</span>
        <span><b style={{ color: "#08673a" }}>読込済:</b> 決定・保留・試打・戦績・あなたの癖。<b style={{ color: "#08673a" }}>説明し直さなくてOK。</b></span>
      </div>

      {/* 会話 */}
      <div ref={convRef} style={{ flex: 1, overflowY: "auto", padding: "8px 12px 12px" }}>
        {msgs.length === 0 && !loading && (
          <div style={{ color: C.textMuted, fontSize: 14, textAlign: "center", marginTop: 40, lineHeight: 1.7 }}>
            質問を打つか、下の <b>⚡</b> から定型文をタップ。<br />
            {mode === "fast" ? "試合中モード: 短く・即行動できる答え。" : "深掘りモード: データで事実と推測を分けて分析。"}
          </div>
        )}
        {msgs.map((m, i) => (
          m.role === "user" ? (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end", margin: "14px 0 10px" }}>
              <div style={{ background: C.primary, color: "#fff", fontSize: 15, lineHeight: 1.5, padding: "10px 14px", borderRadius: "18px 18px 4px 18px", maxWidth: "82%", whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ) : (
            <div key={i} style={{ background: C.panel, border: "1px solid " + C.divider, borderRadius: "4px 18px 18px 18px", padding: "13px 15px", fontSize: 15, lineHeight: 1.62, color: C.text, boxShadow: "0 1px 3px rgba(0,0,0,.05)", margin: "0 0 12px", whiteSpace: "pre-wrap" }}>{m.content}</div>
          )
        ))}
        {loading && (
          <div style={{ color: C.textMuted, fontSize: 14, padding: "8px 2px" }}>考えています…</div>
        )}
        {err && (
          <div style={{ color: C.error, background: C.errorLight, border: "1px solid #f5c6c2", borderRadius: 12, padding: "10px 12px", fontSize: 13, margin: "4px 0" }}>
            {err}
          </div>
        )}
      </div>

      {/* M2: 保存メッセージ + 「決定/保留として残す」(議論ループを閉じる) */}
      {saveMsg && (
        <div style={{ background: C.successLight, color: "#0b7a44", fontSize: 13, fontWeight: 600, padding: "8px 14px", textAlign: "center", flexShrink: 0, borderTop: "1px solid #cdecd9" }}>{saveMsg}</div>
      )}
      {msgs.length > 0 && (
        <div style={{ background: C.panel, borderTop: "1px solid " + C.divider, padding: "8px 11px 0", flexShrink: 0, display: "flex", gap: 8 }}>
          <button onClick={clearConvo} disabled={loading || draftBusy} style={{ border: "1px solid " + C.border, background: C.panel, color: C.textSecondary, fontFamily: font, fontSize: 13, fontWeight: 600, padding: "9px 13px", borderRadius: 12, flexShrink: 0 }}>新規</button>
          <button onClick={startDraft} disabled={draftBusy} style={{ flex: 1, border: "1px solid " + C.trialAccent, background: draftBusy ? C.panel2 : C.trialLight, color: C.trialAccent, fontFamily: font, fontSize: 13.5, fontWeight: 700, padding: "9px", borderRadius: 12 }}>
            {draftBusy ? "下書き中…" : "📌 決定/保留として残す"}
          </button>
        </div>
      )}

      {/* 入力行: ⚡定型文 + textarea + 送信 */}
      <div style={{ background: C.panel, borderTop: "1px solid " + C.divider, padding: "9px 11px", display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
        <button onClick={() => setSheet(true)} aria-label="定型文" style={{ width: 42, height: 42, border: "1px solid " + C.border, borderRadius: "50%", background: sheet ? C.primaryLight : C.panel, color: C.primary, fontSize: 19, flexShrink: 0 }}>⚡</button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="自分で打つ…"
          rows={1}
          style={{ flex: 1, border: "1px solid " + C.border, borderRadius: 18, padding: "10px 14px", fontFamily: font, fontSize: 15, color: C.text, resize: "none", height: 42, lineHeight: 1.4 }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} aria-label="送信" style={{ width: 42, height: 42, border: 0, borderRadius: "50%", background: (loading || !input.trim()) ? C.appleGray4 : C.primary, color: "#fff", fontSize: 18, flexShrink: 0 }}>↑</button>
      </div>

      {/* 定型文シート (⚡ で開く) */}
      {sheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 4100 }}>
          <div onClick={() => setSheet(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.28)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: C.panel, borderRadius: "20px 20px 0 0", padding: "8px 0 calc(12px + env(safe-area-inset-bottom,0))", boxShadow: "0 -6px 24px rgba(0,0,0,.18)", maxHeight: "70%", overflowY: "auto" }}>
            <div style={{ width: 38, height: 5, borderRadius: 3, background: "#d0d0d4", margin: "4px auto 8px" }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, padding: "0 18px 6px", display: "flex", alignItems: "center", gap: 6 }}>
              ⚡ 定型文（タップで送信）
              <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400, marginLeft: "auto" }}>{mode === "fast" ? "試合中" : "深掘り"}モード</span>
            </div>
            {presets.map((p, i) => (
              <button key={i} onClick={() => send(p)} style={{ display: "block", width: "100%", textAlign: "left", border: 0, borderTop: "1px solid " + C.divider, background: C.panel, fontFamily: font, fontSize: 16, color: C.text, padding: "14px 18px" }}>{p}</button>
            ))}
            <button onClick={addPreset} style={{ display: "block", width: "100%", textAlign: "left", border: 0, borderTop: "1px solid " + C.divider, background: C.panel, fontFamily: font, fontSize: 15, color: C.primary, fontWeight: 600, padding: "14px 18px" }}>＋ 自分の定型文を追加</button>
          </div>
        </div>
      )}

      {/* M2: 下書き確認画面 (ワンセットを確認・編集してから保存。手触りが消えてないか) */}
      {draftView && (
        <div style={{ position: "fixed", inset: 0, zIndex: 4200, background: C.bg, display: "flex", flexDirection: "column", paddingBottom: "env(safe-area-inset-bottom, 0)" }}>
          <div style={{ background: C.panel, borderBottom: "1px solid " + C.divider, padding: "12px 12px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button onClick={() => setDraftView(false)} style={{ border: 0, background: "transparent", color: C.primary, fontSize: 26, lineHeight: 1, padding: "0 4px" }}>‹</button>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>決定/保留として残す</div>
          </div>
          <div style={{ background: C.warningLight, color: "#9a6b00", fontSize: 12.5, padding: "9px 14px", lineHeight: 1.5, flexShrink: 0 }}>
            AIが下書きしました。<b>あなたの言葉・手触りが消えてないか</b>確認し、直してから保存。保存すると次回からAIが最初に読みます。
          </div>
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            style={{ flex: 1, margin: "10px 12px", border: "1px solid " + C.border, borderRadius: 12, padding: "12px 14px", fontFamily: font, fontSize: 14.5, lineHeight: 1.6, color: C.text, resize: "none", whiteSpace: "pre-wrap" }}
          />
          {err && (
            <div style={{ color: C.error, background: C.errorLight, border: "1px solid #f5c6c2", borderRadius: 12, padding: "8px 12px", fontSize: 13, margin: "0 12px 6px" }}>{err}</div>
          )}
          <div style={{ display: "flex", gap: 10, padding: "8px 12px 12px", flexShrink: 0 }}>
            <button onClick={() => setDraftView(false)} disabled={draftBusy} style={{ flex: 1, border: "1px solid " + C.border, background: C.panel, color: C.textSecondary, fontFamily: font, fontSize: 15, fontWeight: 600, padding: "12px", borderRadius: 12 }}>やめる</button>
            <button onClick={saveSet} disabled={draftBusy || !draftText.trim()} style={{ flex: 2, border: 0, background: (draftBusy || !draftText.trim()) ? C.appleGray4 : C.success, color: "#fff", fontFamily: font, fontSize: 15, fontWeight: 700, padding: "12px", borderRadius: 12 }}>{draftBusy ? "保存中…" : "保存する"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Tennis DB v4 Cloud Functions
// summarizeMemo: メモ本文を Anthropic Claude Haiku で 1-2 行に要約する HTTPS Callable
//
// 設計方針:
//   - 認証: callable は context.auth で自動チェック (未ログインは reject)
//   - API キー: Firebase Functions secret として保存、env から読み出し (コードに埋め込まない)
//   - モデル: claude-haiku-4-5 (低コスト・低レイテンシ)
//   - 入出力: { memo: string, fieldType: string } → { summary: string, original: string }
//   - 失敗時: throw HttpsError、クライアント側は要約なしフォールバックで line-clamp 表示

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const Anthropic = require("@anthropic-ai/sdk").default;

// aiConsult が Firestore (決定/状態 + 現データ) を読むため admin を初期化。
// 既存 summarizeMemo / planAssist は admin 不使用なので、二重 init を guard する。
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

// Anthropic API キーを Firebase secret として宣言
//   コンソールから値を入力する: `firebase functions:secrets:set ANTHROPIC_API_KEY`
//   ローカル emulator では .env で上書き可能
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// メモの種別 (フォーカス / コーチメモ / 総括 / 試合・メンタル など) ごとの要約スタイル指示
function _styleHint(fieldType) {
  switch (fieldType) {
    case "focus":      return "練習で意識した動作・狙いを 1 行で";
    case "coachNote":  return "コーチからの指摘の要点を 1 行で";
    case "goodNote":   return "良かった点・成功体験の核を 1 行で";
    case "improveNote":return "改善が必要だった点の核を 1 行で";
    case "mentalNote": return "メンタル・心理状態の要点を 1 行で";
    case "techNote":   return "技術メモの要点を 1 行で";
    case "opponentNote": return "対戦相手の特徴・戦略の要点を 1 行で";
    case "generalNote":return "総括・所感の中で次に活かすべき要点を 1 行で";
    case "strokeNote":
    case "serveNote":
    case "volleyNote": return "試打評価の核となる感触・特徴を 1 行で";
    case "note":       return "試合メモの要点を 1 行で";
    default:           return "テニスのメモを次に振り返る時に思い出すための要点を 1 行で";
  }
}

// ===================================================================
// planAssist: Plan タブの AI 補助 (S17.x 段階 1+2)
//   mode = "organizeStrategy"   : 長文メモ → 5 項目 (各 30 字以内) に短文化
//   mode = "generateResetPhrase": strategy[] + 目標/テーマ → チェンジオーバー用リセット文 1 つ
//   設計方針 (DECISIONS S17 + ChatGPT 整理):
//     - AI は補助役、決定はユーザー (採用 / 編集して採用 / 破棄)
//     - 不安を増やす表現を避ける、抽象論禁止
//     - 試合中に読める短文 (= iPhone 1〜2 行)
// ===================================================================
exports.planAssist = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    region: "asia-northeast1",
    timeoutSeconds: 30,
    memory: "256MiB",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }
    const mode = String(request.data?.mode || "").trim();
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    if (mode === "organizeStrategy") {
      const longText = String(request.data?.longText || "").trim();
      if (longText.length < 30) {
        throw new HttpsError("invalid-argument", "メモが短すぎます (30 字以上)");
      }
      const clipped = longText.slice(0, 4000);
      const prompt = [
        "次のテニス試合の作戦メモを、試合中に見返せる短文 5 項目以内に整理してください。",
        "ルール (厳守):",
        "- 日本語",
        "- 1 項目 30 文字以内",
        "- 5 項目以内 (重要度順、足りなければそれ以下でOK)",
        "- 各項目は 1 行で完結",
        "- 試合中に汗を拭きながら一瞥で読める短さ",
        "- 抽象論や定型句は省く",
        "- 不安を増やす表現を避ける",
        "- 番号 (1. 2. ...) や bullet (・) を付けない、本文のみ",
        "- 出力は項目を改行で区切る (1 項目 = 1 行)",
        "",
        "元のメモ:",
        clipped,
      ].join("\n");
      let items = [];
      try {
        const response = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        });
        const block = (response.content || []).find(b => b.type === "text");
        const text = (block?.text || "").trim();
        items = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 5);
      } catch (err) {
        console.error("Anthropic API error (organizeStrategy):", err?.message || err);
        throw new HttpsError("internal", "Strategy 整理に失敗しました", err?.message);
      }
      if (items.length === 0) throw new HttpsError("internal", "AI 出力が空でした");
      return { items, original: longText };
    }

    if (mode === "generateResetPhrase") {
      const strategy = Array.isArray(request.data?.strategy) ? request.data.strategy : [];
      const targetGoal = String(request.data?.targetGoal || "").trim();
      const targetTheme = String(request.data?.targetTheme || "").trim();
      if (strategy.length === 0) {
        throw new HttpsError("invalid-argument", "Strategy 項目が空です");
      }
      const promptLines = [
        "次の試合作戦から、試合中のチェンジオーバーで自分を戻すための短文を 1 つ作ってください。",
        "ルール (厳守):",
        "- 日本語",
        "- 60 文字以内 (絶対に超えないこと)",
        "- 1〜2 行に収まる長さ",
        "- 「次の 2 ゲーム」 に集中するための言葉",
        "- 試合中に汗を拭きながら一瞥で読める短さ",
        "- 抽象論禁止、具体的な動作 / 意識",
        "- 不安を増やす表現を避ける",
        "- 余計な前置き (「リセット文:」など) は付けない、本文のみ",
        "",
      ];
      if (targetGoal) promptLines.push(`目標: ${targetGoal}`);
      if (targetTheme) promptLines.push(`テーマ: ${targetTheme}`);
      promptLines.push("作戦:");
      strategy.forEach(s => promptLines.push(`- ${s}`));
      const prompt = promptLines.join("\n");
      let resetPhrase = "";
      try {
        const response = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 200,
          messages: [{ role: "user", content: prompt }],
        });
        const block = (response.content || []).find(b => b.type === "text");
        resetPhrase = (block?.text || "").trim();
      } catch (err) {
        console.error("Anthropic API error (generateResetPhrase):", err?.message || err);
        throw new HttpsError("internal", "リセット文生成に失敗しました", err?.message);
      }
      if (!resetPhrase) throw new HttpsError("internal", "AI 出力が空でした");
      // 60 字以内に丸める (AI が超えた場合の保険)
      if (resetPhrase.length > 80) resetPhrase = resetPhrase.slice(0, 80);
      return { resetPhrase };
    }

    throw new HttpsError("invalid-argument", "Unknown mode: " + mode);
  }
);

exports.summarizeMemo = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    region: "asia-northeast1", // 東京リージョン (低レイテンシ)
    timeoutSeconds: 30,
    memory: "256MiB",
    cors: true, // 同オリジンでない localhost や本番 GitHub Pages から呼ぶため
  },
  async (request) => {
    // 認証チェック
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }

    const memo = String(request.data?.memo || "").trim();
    const fieldType = String(request.data?.fieldType || "").trim();

    // 短すぎるメモは要約不要 (そのまま返す)
    if (memo.length < 60) {
      return { summary: memo, original: memo, skipped: "too_short" };
    }
    // 長すぎるメモは安全のため切り詰め (1 メモで API コスト爆発を防ぐ)
    const clipped = memo.slice(0, 4000);

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    // リクエスト 31-2 補修 (B): 出力長を厳守させる (旧 60 文字 → 42 文字 = iPhone 縦表示で必ず 2 行以内)
    const prompt = [
      "次のテニスのメモを、後で振り返った時に思い出すための短い要約に直してください。",
      "ルール (厳守):",
      "- 日本語",
      "- 必ず 42 文字以内 (絶対に超えないこと)",
      "- iPhone の狭い画面で 1〜2 行に収まる長さ",
      "- 元のメモの中で「次に活かす要点」「印象に残る部分」を抜く",
      "- 装飾語句や定型句は省く",
      "- 余計な前置き (「要約:」など) は付けない、要約本文のみ返す",
      `- ${_styleHint(fieldType)}`,
      "",
      "元のメモ:",
      clipped,
    ].join("\n");

    let summary = "";
    try {
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      });
      const block = (response.content || []).find(b => b.type === "text");
      summary = (block?.text || "").trim();
    } catch (err) {
      console.error("Anthropic API error:", err?.message || err);
      throw new HttpsError("internal", "要約生成に失敗しました", err?.message);
    }

    if (!summary) {
      throw new HttpsError("internal", "要約が空でした");
    }

    return { summary, original: memo };
  }
);

// ===================================================================
// aiConsult: 文脈つき AI 相談 (B = AI連携の本体、2026-06)
//   入力: { question: string, history?: [{role,content}], mode?: "fast"|"deep" }
//   文脈: 関数側が Firestore の aiContext(決定/状態) + 現データ(ギア/試打/戦績) を読む
//         (クライアントは質問だけ送る = ゼロ摩擦)
//   原則: ユーザーの議論原則を system prompt に焼く + prompt caching で大文脈を再送しない
//   モデル: fast=claude-haiku-4-5(試合中・速い/安い) / deep=claude-sonnet-4-6(深掘り)
//   設計記録: DESIGN_LOG.md 2026-06-02 アプリ内 AI 相談 (B)
// ===================================================================

// ゆっけさんの議論原則 (B の人格。一般ボットでなく文脈を持った相談相手にする)
const _CONSULT_PRINCIPLES = [
  "あなたはゆっけさん専属のテニス相談相手。一般論を返すボットではなく、彼の文脈を全部持った上で議論する相手として振る舞う。",
  "",
  "# 絶対に守る原則",
  "- 本質を消さない: 体感・感覚は彼の言葉のまま扱う(「面に乗ってビヨーン」を「打感重視」に縮めない)。要約で因果を殺さない。",
  "- 事実と推測を区別する: 彼が実体験で言ったこと=事実、君の推論=推測、と明示して分ける。同じ口調で混ぜない。",
  "- 紐付けを切らない: 試打の体感は必ず(弦+テンション+ラケット+イベント/状況)に紐付けて読む。弦を切り離した感想は判断材料にしない。「飛ばない」が\"どの弦・どのテンション・どの試合\"でかを必ず確認・明示する。",
  "- 一つにまとまるまで他に移らない: 論点を勝手に飛ばさない。2極論にしない。",
  "- 知識は出し惜しみしない: 一般的なギア・ストリング・技術の知識や推奨は積極的に使ってよい(一般論/推測として明示)。",
  "- 「データに無い」は\"彼の個別の記録(戦績・実際の体感)が無い\"時だけに使う。一般知識まで封じない。例:「DBに無いストリングのおすすめは?」→ 一般知識から候補と理由を挙げ、彼の傾向(フラットドライブ/打感重視/98インチ/飛ばないラケットの補完 等)に合わせて絞り込む。決して『データに無い』で打ち切らない。",
  "- ただし彼の個別の事(勝率・彼自身の体感)を語る時だけは、現データを事実の源にし、無ければ無いと言う。彼の記録を憶測で作らない。",
  "- 同じことを何度も言わせない: 下の決定・保留を踏まえ、既出を再質問しない。前回の保留(next-action)から話を進める。",
  "- 却下された道は理由ごと尊重する: 一度却下した選択肢を理由を失って蒸し返さない。",
  "- 平易・簡潔: 専門用語を並べない。試合中はスマホで一瞥できる短さを優先する。",
  "- 彼はINTJ: 論理的根拠・因果が明確な提案を好む。権威でなく根拠。",
  "",
  "# 議論の作法（最重要。ここを外すと彼は議論する気を失う。実際に過去決裂した）",
  "- 彼の論点から逃げない: 彼がストリングの話をしているなら、ストリングを論じる。「弦のせいじゃない」「身体かも」「今回は評価材料にならない」と話を逸らさない・予防線を張らない。逸らしが彼を最も苛立たせる。",
  "- 既知の前提を新情報のように言わない: 「久しぶり/力み/張り替え直後だから評価できない」等、彼がとっくに承知の事を指摘しない。過去の焼き直し禁止。",
  "- テンプレ厳禁・自分で構築する: 条件整理や『どうしますか?』の質問の繰り返しは厳禁。毎回、自分の分析・仮説・新しい視点を最低1つ出して議論を前に進める。聞いてばかり・反射で質問しない。",
  "- 保存ノートは古い可能性: ノートの評価(例『最有力次候補』)と彼の今の評価が食い違ったら、彼の今の言葉を信じる。ノートを根拠に候補を押し付けない。",
  "- 結論に誘導しない: 特定のストーリー(例『弦のせいじゃない』)に彼をはめ込まない。彼の体感を起点に一緒に組み立てる。",
  "- 一貫性: 前の発言と繋げ、論点を1本通す。場当たり的に話を変えない。",
  "",
  "# 口調（厳守・最重要。両極端のどちらも嫌われる）",
  "- 馴れ馴れしさ禁止: 「〜だよ/〜だね/〜じゃん/〜しよう！/〜してみて」等の砕けた語尾・呼びかけ・励まし・絵文字・感嘆符を使わない。",
  "- 上から目線・偉そう・説教を禁止: 命令形(「〜しろ」「〜するな」「〜せよ」)で指示しない。「〜すべき」「〜を忘れている」「当然」「言うまでもなく」等の断罪・評価・見下しをしない。彼を指導する立場に立たない。",
  "- 立ち位置は『対等な専門パートナー』。事実と判断材料を淡々と差し出し、最終判断は彼に委ねる。提案は『データ上はA』『Bという手がある』のように示し、押し付けない。",
  "- 前置き・クッション言葉・共感の演出・自己言及（『私は』『AIとして』）は省く。簡潔・敬意・端的。冗長にしない。",
  "- 試合中の助言も、命令でなく『事実＋選べる手』を短く。例: ×「振り抜くより運べ」 / ○「浅くなる時は弾道を一段上げると深さが出る(05-07の傾向)」。",
  "",
  "# 役割",
  "彼の相談に、上記原則で、現データを根拠に向き合う。ただ整理・質問するのでなく、自分の分析と仮説を出して議論を前に進める。最終判断は彼。却下された道は理由ごと尊重し蒸し返さない。",
].join("\n");

// M2: 相談の会話から「決定/保留のワンセット」を下書きする指示 (mode="draftSet")
const _DRAFTSET_INSTRUCTION = [
  "次の相談の会話から、ゆっけさんの「決定・保留のワンセット」を1つだけ作る。これは後で本人とAIが読み返す記録。",
  "",
  "# 形式 (この見出しで)",
  "■ 発端: なぜこの論点/相談が始まったか",
  "■ 内容: 理由の鎖(体感→なぜ→だから→結論)。体感・感覚は本人の言葉のまま。",
  "■ 食い違いから出た追加情報: 途中で訂正・判明したこと、却下した道とその理由",
  "■ 推測と事実: 本人の実体験=事実 / 推論=推測、と分けて明示",
  "■ 最終決断 または 保留+解く条件: 決まった事。保留なら『何を確かめれば解けるか』を必ず書く",
  "",
  "# 厳守",
  "- 要約して本質を消さない。本人が後で因果を再構築できる密度で残す。弦の体感は(弦+テンション+ラケット+イベント)に紐付けたまま。",
  "- 口語・励まし・絵文字・自己言及なし。淡々と。会話に無いことは書かない(捏造禁止)。",
  "- 決定も保留も出ていない雑談なら、無理に作らず『この相談には残すべき決定/保留はない』とだけ書く。",
].join("\n");

// Firestore から現データを読んで文脈テキストを組む (auth された本人のデータのみ)
async function _buildTennisContext(uid) {
  const dataCol = admin.firestore().collection("users").doc(uid).collection("data");
  const read = async (key) => {
    const snap = await dataCol.doc(key).get();
    const v = snap.data() || {};
    return (v.items != null) ? v.items : (v.obj != null ? v.obj : null);
  };
  const [ai, rackets, setups, strings, trials, tournaments] = await Promise.all([
    read("aiContext"), read("rackets"), read("stringSetups"),
    read("strings"), read("trials"), read("tournaments"),
  ]);
  const byDateDesc = (arr) => arr.slice().sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1));
  const parts = [];
  if (ai && (ai.decisions || ai.status)) {
    parts.push("# 決定・保留 (ワンセット)\n" + (ai.decisions || ""));
    parts.push("# 現在地・原則 (状態)\n" + (ai.status || ""));
  }
  // 相談で保存したワンセット (M2: 議論ループを閉じる。最優先で踏まえ、既出を再質問しない)
  if (ai && Array.isArray(ai.sets) && ai.sets.length) {
    parts.push("# 過去の相談で保存した決定・保留 (ワンセット。最優先で踏まえる。ここで決着/保留した事を蒸し返さない)\n" +
      ai.sets.map(function (s) { return "[" + (s.date || "") + "] " + (s.text || ""); }).join("\n\n").slice(0, 9000));
  }
  if (Array.isArray(rackets)) {
    parts.push("# ラケット\n" + rackets.map(r => `${r.name || ""} [${r.status || ""}]`).join("\n").slice(0, 1500));
  }
  if (Array.isArray(setups)) {
    parts.push("# ストリングセットアップ\n" + setups.map(s => `${s.label || ""}: 縦${s.stringMain || ""}${s.stringCross ? " 横" + s.stringCross : ""}`).join("\n").slice(0, 1500));
  }
  if (Array.isArray(strings)) {
    parts.push("# ストリング(ノート)\n" + strings.map(s => `${s.name || ""}: ${s.note || ""}`).filter(x => x.length > 2).join("\n").slice(0, 3500));
  }
  if (Array.isArray(trials)) {
    parts.push("# 直近の試打 (弦×テンション×ラケット×体感 — 核心。必ず紐付けて読む)\n" +
      byDateDesc(trials).slice(0, 18).map(t =>
        `[${t.date || "?"}] ${t.racketName || ""} / 縦:${t.stringMain || "?"}${t.stringCross ? " 横:" + t.stringCross : ""} ${t.tensionMain || "?"}p :: ` +
        [t.generalNote, t.strokeNote, t.serveNote, t.volleyNote].filter(Boolean).join(" / ")
      ).join("\n").slice(0, 6500));
  }
  if (Array.isArray(tournaments)) {
    parts.push("# 直近の試合 (設定×結果)\n" +
      byDateDesc(tournaments).slice(0, 18).map(t =>
        `[${t.date || "?"}] ${t.name || ""} / ${t.racketName || ""} ${t.stringMain || "?"} ${t.tensionMain || "?"}p` +
        (t.generalNote ? " :: " + String(t.generalNote).slice(0, 120) : "")
      ).join("\n").slice(0, 4500));
  }
  return parts.join("\n\n");
}

exports.aiConsult = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    region: "asia-northeast1",
    timeoutSeconds: 60,
    memory: "512MiB",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }
    const uid = request.auth.uid;
    const mode = request.data?.mode === "deep" ? "deep"
      : request.data?.mode === "draftSet" ? "draftSet"
      : request.data?.mode === "saveSet" ? "saveSet"
      : "fast";

    // M2: ワンセットを Firestore aiContext.obj.sets にサーバー側で確実に追記
    //   (クライアント直書きは offline persistence で端末止まりになりうるため、サーバー側で書いて確実にする)
    if (mode === "saveSet") {
      const setText = String(request.data?.text || "").trim();
      if (!setText) throw new HttpsError("invalid-argument", "保存テキストが空です");
      const setDate = String(request.data?.date || "").trim() || new Date().toISOString().slice(0, 10);
      const ref = admin.firestore().collection("users").doc(uid).collection("data").doc("aiContext");
      try {
        await ref.set({
          obj: { sets: admin.firestore.FieldValue.arrayUnion({ date: setDate, text: setText }) },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error("aiConsult saveSet error:", err && err.message || err);
        throw new HttpsError("internal", "保存に失敗しました", err && err.message);
      }
      const snap = await ref.get();
      const savedSets = ((snap.data() || {}).obj || {}).sets || [];
      return { saved: true, count: savedSets.length };
    }

    // M2: 会話 → 決定/保留のワンセット下書き (保存はクライアントが確認後に Firestore へ)
    if (mode === "draftSet") {
      const dsHistory = Array.isArray(request.data?.history) ? request.data.history.slice(-30) : [];
      if (dsHistory.length === 0) {
        throw new HttpsError("invalid-argument", "会話がありません");
      }
      let dsContext = "";
      try { dsContext = await _buildTennisContext(uid); } catch (_) { dsContext = ""; }
      const dsClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const convo = dsHistory.map(function (m) {
        return (m && m.role === "assistant" ? "AI" : "本人") + ": " + String((m && m.content) || "");
      }).join("\n\n");
      const dsSystem = [{
        type: "text",
        text: _DRAFTSET_INSTRUCTION + "\n\n[ギア/現状データ参照用]\n" + dsContext,
        cache_control: { type: "ephemeral" },
      }];
      const dsMessages = [{ role: "user", content: "次の相談の会話から、決定/保留のワンセットを1つ作れ。\n\n=== 会話 ===\n" + convo }];
      let draft = "";
      try {
        const response = await dsClient.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          system: dsSystem,
          messages: dsMessages,
        });
        const block = (response.content || []).find(function (b) { return b.type === "text"; });
        draft = (block && block.text || "").trim();
      } catch (err) {
        console.error("aiConsult draftSet error:", err && err.message || err);
        throw new HttpsError("internal", "ワンセットの下書きに失敗しました", err && err.message);
      }
      if (!draft) throw new HttpsError("internal", "下書きが空でした");
      return { draft: draft };
    }

    const question = String(request.data?.question || "").trim();
    if (!question) {
      throw new HttpsError("invalid-argument", "質問が空です");
    }
    const model = mode === "deep" ? "claude-opus-4-8" : "claude-haiku-4-5";
    // 会話履歴 (多ターン対応): user/assistant のみ採用、直近 20 件まで
    const history = Array.isArray(request.data?.history) ? request.data.history.slice(-20) : [];

    let context;
    try {
      context = await _buildTennisContext(uid);
    } catch (err) {
      console.error("aiConsult context build error:", err?.message || err);
      throw new HttpsError("internal", "文脈の読み込みに失敗しました", err?.message);
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    // system = 原則 + 現データ。安定文脈なので cache_control でキャッシュ
    //   (同一セッションの連続相談は再送せず安く速い。haiku の最小キャッシュは 4096 tokens)
    const system = [{
      type: "text",
      text: _CONSULT_PRINCIPLES +
        "\n\n========\n以下はゆっけさんの現在地（決定・保留・現データ）。これを唯一の事実源として使う。データに無いことは推測と明示する。\n========\n\n" +
        context,
      cache_control: { type: "ephemeral" },
    }];

    const messages = [];
    for (const m of history) {
      const role = (m && m.role === "assistant") ? "assistant" : "user";
      const c = String((m && m.content) || "").trim();
      if (c) messages.push({ role, content: c });
    }
    messages.push({ role: "user", content: question });

    let answer = "";
    let usage = null;
    try {
      const response = await client.messages.create({
        model,
        max_tokens: mode === "deep" ? 2000 : 800,
        system,
        messages,
      });
      const block = (response.content || []).find(b => b.type === "text");
      answer = (block?.text || "").trim();
      usage = response.usage || null;
    } catch (err) {
      console.error("aiConsult Anthropic error:", err?.message || err);
      throw new HttpsError("internal", "AI相談に失敗しました", err?.message);
    }
    if (!answer) {
      throw new HttpsError("internal", "AI出力が空でした");
    }
    return { answer, model, usage };
  }
);

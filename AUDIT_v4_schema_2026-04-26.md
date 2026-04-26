# Tennis DB v4 SCHEMA 全件監査レポート

実施日: 2026-04-26
監査者: Claude (S13 セッション中、focus バグの再発防止のため)
対象: `src/core/05_schema.js` 全 50+ フィールド × v2 (`v2_index.html`, `index.html`) / v3 (`v3/index.html`) / 実データ (`tennis_db_2026-04-26.json`)

---

## 監査結果サマリ

| 判定 | 件数 | 内容 |
|---|---|---|
| ✅ 修正済 (focus) | 4 ファイル | schema.js / blank.js / PracticeEditForm.jsx / PracticeDetail.jsx / claudeFormatter.js |
| ⚠ Minor (実害低) | 2 件 | tournament.overallResult dropdown / linkedXxx undefined vs "" |
| ❌ Critical (要対応) | **0 件** | エージェント報告の 2 件は誤報、裏取り済 |
| ❓ Unverified | 約 5 件 | Apple Watch 系フィールド (heartRateAvg 等) は実データが少なく振る舞い未確認 |
| ✓ OK | 残り全部 (約 95 件) | 全バージョンで型一致 |

**結論: focus 修正後の v4 SCHEMA に critical な問題は無い**。S14 着手前に **Minor 2 件** だけ判断が必要。

---

## ⚠ Minor 1: tournament.overallResult dropdown 不足

**場所**: `src/ui/sessions/TournamentEditForm.jsx` `_RESULT_OPTS` (line 18-28)

v4 dropdown:
```
"" / "優勝" / "準優勝" / "3位" / "ベスト8" / "ベスト16" / "予選突破" / "敗退" / "予選敗退"
```

v3 RESULT_COLORS (line 117): 上記 + **"準決勝敗退" / "決勝敗退"** を含む

実データ (Firestore 36 件中):
- "準決勝敗退": 2 件 (trn02d 2026-02-14, trn05 2025-09-28)
- "決勝敗退": 1 件 (trn03b 2025-12-30)
- "敗退": 5 件
- "予選突破": 1 件 (cal_069 2026-04-12)
- 計 **9 件**が v4 dropdown に無い値を持つ

**リスク**: v4 で該当大会を開いて保存すると、選択肢に無い値は dropdown が空になる → 保存時に空文字に上書きされる可能性

**対応案**: `_RESULT_OPTS` に "準決勝敗退" "決勝敗退" を追加する 2 行修正。低リスク。

**判断保留**: ユーザー承認待ち。

---

## ⚠ Minor 2: linkedXxx undefined vs "" の混在

**場所**: `src/domain/cascade.js` `computeCascade`

```js
return _trials
  .filter(tr => tr && tr.linkedMatchId === item.id)
  ...
```

厳密比較 `===` のため、`linkedMatchId: undefined` (legacy) と `linkedMatchId: ""` (新規) は別扱い。

実データ確認: 全 trial 46 件で linkedMatchId / linkedPracticeId は文字列 (空または ID)。undefined のものは見つからず。

**リスク**: 現状実害なし。将来 v3 から undefined を含むデータが来たら orphan 検出漏れの可能性。

**対応案**: 現状放置で OK。S15 (マージ機能) 着手時に正規化を追加。

---

## ❓ Unverified: Apple Watch 系フィールド

**場所**: SCHEMA `practice` line 55-65 (heartRateAvg, calories, totalCalories, timeRange, workoutLocation, recoveryHR, hrZone1-5)

`blank.js` には未定義 (= QuickAdd で undefined のまま)。  
EditForm では編集 UI なし、Detail では条件付き表示のみ。

実データ: 大半の practice で空文字または undefined 混在。

**リスク**: 表示は条件付き && で安全。ただし v4 が新規 practice 作成時に undefined のまま Firestore に書き込み → v3 が undefined を期待しない場合に問題の可能性。

**対応案**: 現状放置で OK。Apple Watch インポート (S19) 着手時に再評価。

---

## ✅ 修正済 (focus 関連、本セッションで実施)

| ファイル | 内容 |
|---|---|
| `src/core/05_schema.js:50` | `focus` を `type:"rating"` → `type:"textarea", combinable:true` に変更、label "集中" → "フォーカス" |
| `src/domain/blank.js:50-51` | `focus: 0` → `focus: ""` (テキスト初期値)、コメント更新 |
| `src/ui/sessions/PracticeEditForm.jsx:183-205` | rating row 削除、メモセクションに 🎯 フォーカス Textarea を追加。typeof guard で legacy 数値は空表示 |
| `src/ui/sessions/PracticeDetail.jsx:158-165, 196-206` | 体調セクションから集中削除、メモセクションに 🎯 フォーカス を追加 |
| `src/domain/claudeFormatter.js:79-80` | `集中: ${focus}/5` → `フォーカス: ${focus}` (テキストとして出力)、typeof guard 付き |

ビルド出力: `v4/index.html` 330780 bytes (S13 build)

---

## エージェントの誤報訂正

並列調査エージェントが「Critical」と報告した 2 件は両方とも誤りでした:

### 誤報 1: trial.date YYYY/M/D 不一致
- エージェント主張: 「v3 データ YYYY/M/D（30件）が v4 の YYYY-MM-DD パーサと非互換」
- 真実: `src/core/04_id.js:15` の `normDate` 関数が `/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/` で**両形式に対応済**。v4 はロード時に `normalizeItems` で全件正規化する。

### 誤報 2: trial.judgment 選択肢定義なし
- エージェント主張: 「v4 SCHEMA で type='select' だがオプション定義なし」
- 真実: SCHEMA 中央定義は仕様上 options を持たない設計 (DECISIONS_v4.md の方針通り)。`TrialEditForm.jsx:65-67` で `_teJudgmentRow` 内に「採用候補/保留/却下」定義あり。v3 と同一。

---

## 既知の Firestore データ問題 (本監査外、別対応)

| ID | 種別 | 状態 |
|---|---|---|
| `moffr9mqtf7w4j` | 練習 | focus が数値 0 (本来テキスト) — Step A1 修復対象 |
| `p1776069714875` | 練習 | focus が数値 2 — Step A1 修復対象 |
| `t1777182874335` | 試打 | strokeNote/serveNote/volleyNote 空 (復旧不能、ユーザー諒承済) |

---

## S14 着手前のチェックリスト

- [x] focus フィールド型修正 (Step B 完了)
- [x] v4 build 成功
- [ ] **ブラウザでの動作確認** (port 8080 競合で preview 起動失敗、未実施)
- [ ] Step A1 Firestore データ修復 (起きた後にユーザーがスクリプト実行)
- [ ] ⚠ Minor 1 の判断 (overallResult 2 オプション追加するか)
- [ ] S13 cascade push 承認

---

監査おわり。次に DECISIONS_v4.md に「focus は textarea」を記録し、CLAUDE.md にも「v4 で SCHEMA を変更したら必ず v3 で表示確認」のルール追加を提案する予定。

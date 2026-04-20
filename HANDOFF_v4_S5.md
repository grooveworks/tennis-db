# HANDOFF v4 — Stage S5（Sessions 一覧 / v3 Firestore 読み取り）開始用

作成: 2026-04-21 / 前セッション(S4)末尾で作成

> **次セッション最初にやること**: このファイル + CLAUDE.md + DESIGN_SYSTEM_v4.md + ROADMAP_v4.md を読み、着手前チェックリストを応答に書き出してから着手。

---

## 0. 前セッション(S4)の結果

### 完了事項
- `src/ui/common/` に 13 コンポーネント作成
  - Icon / Badge / Button / Card / Input / Select / Textarea / Modal / ConfirmDialog / Toast / TabBar / Header / SectionTitle
- Lucide アイコン採用（Material Symbols Outlined から変更、ユーザー判断）
  - 比較プロトタイプ 3 ファイル参考資料として追加: `v4/icons_compare.html` / `v4/icons_compare_detail.html` / `v4/icons_lucide_variants.html`
- Badge に `info` variant 追加、`warning` を Yellow 独立色に分離
- `DESIGN_SYSTEM_v4.md` §1.3 (Warning Yellow 独立) / §4.1 (バッジ 8 variants コントラスト表) / §5 (Lucide 採用理由とアイコンマッピング 30 個) を更新
- `src/core/01_constants.js` 冒頭に `const {useState,useEffect,useRef,useCallback,useMemo}=React;` 追加 (全コンポーネントで Hooks 使用のため)
- `_head.html` に Lucide UMD CDN 追加
- `src/app.jsx` をショーケース画面として実装、ユーザー目視確認で S4 OK

### S4 で学んだ教訓 (S5 で活かす)
1. **ライブラリの API 変更**: Lucide の `toSvg()` は v0.x UMD で廃止。公式ドキュメントだけでなく実際の CDN 中身を確認する
2. **判断投げに戻らない**: アイコンセット選定はユーザーの専門領域 (デザイン)、比較プロトタイプを用意して選びやすくする形にすること
3. **バッジ色の被り**: `warning` と `tournament` が同色だった → 分離して解決。設計当初から整合性を確認すべき

### 試打・機材アイコンの確定事項
- 機材 (gear tab): **backpack** (リュック)
- 試打 (trial カテゴリ): **badge-check** (認定バッジ)

---

## 1. S5 の目的

**v3 Firestore に保存されている本番データを v4 の UI で読み取って表示する**。

### S5 で作る
- `src/ui/sessions/SessionCard.jsx` — 3 variants (tournament / practice / trial)、wireframes.html 準拠の見た目
- `src/ui/sessions/SessionsTab.jsx` — 一覧画面本体。月グループ化、フィルタ (全て/大会/練習/試打)、ジャンプセレクタ
- `src/ui/LoginScreen.jsx` (or 同等) — 未ログイン時の画面
- `src/app.jsx` を書き換え: ショーケース → 実アプリのルート (ログイン状態判定 + TabBar + SessionsTab)

### S5 で**やらないこと** (S6 以降)
- カード展開表示（詳細概要）→ S6
- 編集画面（Detail）→ S7
- 新規追加（QuickAdd）→ S8
- 削除 + cascade → S9
- Home タブ → S10
- Sessions マージ → S11
- Gear / Plan / Insights タブ → S12-S14
- インポート → S15

S5 は **読み取り専用**。タップしても何も起きない（または展開の代わりにトースト「S6 で実装予定」）。

---

## 2. S5 の完了条件 (DoD)

1. `src/ui/sessions/SessionCard.jsx` / `SessionsTab.jsx` 作成
2. `src/ui/LoginScreen.jsx` (または `src/ui/common/LoginPrompt.jsx`) 作成
3. `src/app.jsx` を実アプリに書き換え（ショーケースは削除 or 別ページに退避）
4. ログイン前: ログインボタン表示のみ
5. ログイン後: v3 Firestore の `users/{uid}/data/{key}` から tournaments/practices/trials を取得して一覧表示
6. 月グループ表示（直近3ヶ月 + ジャンプセレクタ）
7. フィルタタブ (全て / 🏆 大会 / 🏃 練習 / 🎾 試打)
8. カード色分け (DESIGN_SYSTEM §1.2 準拠、左端 4px 色帯)
9. build.ps1 成功
10. ユーザー検証OK:
    - preview (file://) ではログイン不可なので、確認手順は:
      - **(方法A)** ユーザーに **serve.ps1** でローカルサーバ起動を依頼 (既存 `D:\Downloads\Claude\tennis\serve.ps1` で `http://localhost:8080/v4/` にアクセス)
      - **(方法B)** main に push 後、本番URL `https://grooveworks.github.io/tennis-db/v4/` で確認
    - 方法A を優先（push前にローカル確認できる）
11. 1 commit で push 承認

---

## 3. S5 実装手順

### 3.1 着手前チェックリスト（応答に明示必須）

```
□ CLAUDE.md §0-§4 確認 (要点3行)
□ DESIGN_SYSTEM_v4.md §1-§5 確認 (色・タイポ・余白・コンポーネント仕様)
□ WIREFRAMES_v4.md §2.2 (Sessions 一覧) / §2.3 (展開は未実装) 確認
□ ROADMAP_v4.md S5 の DoD 確認
□ 実行環境制約: preview (file://) で Firebase Auth 動作不可。serve.ps1 経由 or 本番 push で確認。
□ DoD 検証可能性: preview では UI 表示のみ、実データ読み取りは serve.ps1/本番で
□ ユーザー承認を得た
```

### 3.2 実装順序

1. **SessionCard.jsx** — 単体で表示できるカードから先に作る
   - props: `{ type, date, title, meta, badges, onClick }`
   - 3 variants: tournament (orange 帯) / practice (green 帯) / trial (purple 帯)
   - wireframes.html の `.session-card` と同じ見た目を Icon コンポーネント + Badge で再現

2. **SessionsTab.jsx** — タブ本体
   - State: `filter` (all/tournaments/practices/trials), `expandedMonths`
   - Props: `tournaments, practices, trials, loading`
   - 月グループ化 (date を YYYY-MM で集約)
   - ジャンプセレクタ (direct jump to month)
   - Empty state (「データがありません」)

3. **LoginScreen.jsx** (または同等)
   - 未ログイン時の大きな「Google ログイン」ボタン
   - v3 の signInWithPopup → redirect fallback を流用

4. **app.jsx を実アプリに書き換え**
   - State: `user, tournaments, practices, trials, loading, tab`
   - `useEffect(() => { fbAuth.onAuthStateChanged(u => { setUser(u); if (u) loadData(u); }); }, [])`
   - `loadData(u)`: Firestore から 3 コレクションを取得、localStorage にも保存 (v3 と同じキー)
   - ログイン状態で画面切替: LoginScreen or (TabBar + 現在タブの内容)
   - 現在は sessions タブのみ実装、他タブは "S10〜S14 で実装予定" のプレースホルダ

### 3.3 Firestore 読み取りロジック

```js
const loadSessionsFromFirestore = async (user) => {
  if (!user) return null;
  const keys = ["tournaments", "practices", "trials"];
  const results = {};
  for (const k of keys) {
    try {
      const doc = await fbDb.collection("users").doc(user.uid).collection("data").doc(k).get();
      const data = doc.data();
      results[k] = data?.items || [];
    } catch (err) {
      console.error(`Failed to load ${k}:`, err);
      results[k] = [];
    }
  }
  return results;
};
```

### 3.4 月グループ化

```js
const groupByMonth = (items) => {
  const groups = {};
  items.forEach((item) => {
    const nd = normDate(item.date);
    const m = nd.match(/^(\d{4})-(\d{2})/);
    if (!m) return;
    const key = `${m[1]}-${m[2]}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
};
```

---

## 4. S5 完了時にやること

1. ユーザーに動作確認依頼:
   - preview (file://) で UI 表示のみ確認 (ログイン動作は NG)
   - ユーザーに `D:\Downloads\Claude\tennis\serve.ps1` を起動してもらい、`http://localhost:8080/v4/` でログイン + データ表示確認
2. 「S5 OK」確認
3. 1 commit (例: `v4 S5: Sessions 一覧 — v3 Firestore 読み取り表示`)
4. push 承認 → push
5. `HANDOFF_v4_S6.md` 作成 (S6 = カード展開表示)
6. `HANDOFF_v4_S5.md` 削除

---

## 5. S5 で守ること (CLAUDE.md 厳守プロトコル)

- **コンポーネント内部定義禁止** (v3.3.25 再マウント事故防止、TabBar や Modal など全て src/ui/* のトップレベル定義)
- **機能範囲外に手を出さない** — S5 は読み取りのみ、編集機能は S7 で
- **独自スタイル禁止** — DESIGN_SYSTEM にない色・余白は使わない
- **「とりあえず」禁止** — エラー時は原因調査、対処療法しない
- **判断投げ禁止** — ライブラリ選定等はユーザーに確認するが「A/B どちら?」ではなく「Aにします」の形で
- **専門用語でユーザーに説明しない** — preview で見えるものだけで説明

---

## 6. 自戒（S4 で犯した失敗から学ぶ）

- **Lucide の API 誤認**: `toSvg()` が存在すると思い込んで実装 → 表示されず修正。**ライブラリ使用前に実際の CDN 中身を軽く確認すること**
- **判断投げの再発防止**: アイコンセット選定はユーザーの専門領域として比較資料を用意したのは OK。ただし「選択肢 A/B/C どれ」的な場面で迷ったら、まず私の推奨を出す形
- **S5 で同じ事故を防ぐ**: Firestore API の使い方、`onAuthStateChanged` の挙動、`compat` SDK の呼び出し方を事前に v3/index.html で確認してから書く

---

## 7. ファイル参照マップ

- **CLAUDE.md** — 厳守プロトコル（最優先）
- **DESIGN_SYSTEM_v4.md** — S5 実装の完全準拠ソース
- **WIREFRAMES_v4.md** §2.2 — Sessions 一覧の画面構成
- **ROADMAP_v4.md** S5 — DoD
- **v3/index.html** — Firestore 読み取り・ログインロジックの参照元 (line 22-27 Firebase 初期化、line 3049-3075 state定義、line 3076-3094 auth+data load)
- **src/core/02_firebase.js** — `fbApp` / `fbAuth` / `fbDb` 定義済み
- **src/core/03_storage.js** — `lsLoad` / `lsSave` / `save` 定義済み、Firestore 書き込みは save() 経由
- **src/ui/common/** — S4 で作成済みの 13 コンポーネントを組み合わせる
- **v4/icons_compare*.html** — 参考資料、S5 では触らない
- **HANDOFF_v4_S5.md** — 本書

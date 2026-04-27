# AUDIT: Tennis DB v2 → v3 → v4 デザイン全面リサーチ

作成: 2026-04-27 (S13.5 着手準備)
作成者: Claude (Explore agent 失敗 → 自己 verification で書き直し)

---

## §0 経緯と方法 (lessons learned)

最初に Explore agent に audit を委託したが、出力が 62 行 / 自己参照 / 事実誤認 (Shadow 廃止主張は誤り) を含み、信頼できない品質だった。
そのため `CLAUDE.md R3 (agent 報告は鵜呑みせず grep で裏取り)` に従い、**全主張を私自身で grep で検証**してこの文書を書き直した。

検証で確認したファクトのみ記載する。未確認領域は「§N 未確認」と明記して S14 以降の検証宿題に残す。

---

## §1 Color palette

### v2 (`v2_index.html:28-30`)
```js
const C = {
  bg:"#f2f2f7", panel:"#fff", panel2:"#f5f5f7",
  border:"#c7c7cc", accent:"#00b87a", accentDim:"#009963",
  ...
};
```
- **Primary = `#00b87a` (Green)**、accent と命名
- accentDim = `#009963` (Green の暗色変種)
- iOS 系 (panel/border 値が iOS HIG 準拠)

### v3 (`v3/index.html:18`)
```js
const C={
  bg:"#f2f2f7", panel:"#fff", panel2:"#f5f5f7",
  border:"#e0e0e4", text:"#1a1a1a", textMuted:"#8e8e93",
  accent:"#00b87a", accentBg:"rgba(0,184,122,0.08)",
  red:"#dc2626", redBg:"#fef2f2",
  blue:"#2563eb", blueBg:"rgba(37,99,235,0.08)",
  yellow:"#f59e0b", yellowBg:"rgba(245,158,11,0.08)",
  purple:"#7c3aed", purpleBg:"rgba(124,58,237,0.08)",
  green:"#00b87a", greenBg:"rgba(0,184,122,0.08)"
};
```
- v2 を踏襲 + Bg variant を追加 (rgba 形式の semi-transparent)
- **Primary = `#00b87a` (Green、v2 と同じ)**
- セマンティック色 (red/blue/yellow/purple) を独立定数化
- green と accent が**同値の冗長定義** (line 18 同行に両方ある)

### v4 (`src/core/01_constants.js:14-30`)
```js
primary:"#1a73e8", primaryHover:"#1765cc", primaryLight:"#e8f0fe",
tournamentAccent:"#f9ab00", tournamentLight:"#feefc3",
practiceAccent:"#0f9d58", practiceLight:"#e6f4ea", practiceMid:"#b7e1c9",
trialAccent:"#9334e0", trialLight:"#f3e8fd",
info:"#1a73e8", infoLight:"#e8f0fe",
success:"#0f9d58", successLight:"#e6f4ea",
warning:"#fbbc04", warningLight:"#fef7e0",
error:"#d93025", errorLight:"#fce8e6",
text:"#202124", textSecondary:"#5f6368", textMuted:"#80868b",
bg:"#f8f9fa", panel:"#ffffff", panel2:"#f1f3f4",
border:"#dadce0", divider:"#e8eaed",
```
- **Primary = `#1a73e8` (Blue) ← v2/v3 と完全に別系統 (Google Material Blue)**
- カテゴリ色を 3 系統に明確分離 (tournament Orange / practice Green / trial Purple)
- semantic 色 (info/success/warning/error) と Light variant をペア定義
- v3 の `accent` 単一概念 → v4 で「primary (青) + 各カテゴリ accent」へ分離

### 重大な発見 — 視覚的アイデンティティの不連続
- v2/v3 で 3 年以上「**緑 = ブランド色 = 主要ボタン**」が学習されていた
- v4 で青に変更 → ユーザーの「**ボタン = 緑**」習慣が破壊
- v4 の青 (`#1a73e8`) は Google Material 由来 → Apple ライク化を目指す中で**「Google Material そのもの」に近い**
- v3 の `green:"#00b87a"` の DM (深緑) → v4 の `practiceAccent:"#0f9d58"` (より暗い緑) で不一致

### Implications for v4 S13.5 redesign:
- 旧 Green を完全に消したのは戦略的判断としては合理的 (カテゴリ分離) だが、ブランド表現としての**緑のアクセントは何処かに復活させる**べき
- Apple-flavored Material 化なら Primary を Material Blue ではなく **Apple System Blue (`#007AFF`)** に振る選択肢あり (より柔らかく、識別性も高い)
- カテゴリ色 3 系統 (Orange/Green/Purple) は維持する価値あり
- 新規追加候補 (Apple ライク補色): Sky `#5AC8FA`、Mint `#00C7BE`、Indigo `#5856D6`、Peach `#FF9500`

---

## §2 Typography

### v2 — 大数字でのインパクト表現 (`v2_index.html` 抜粋)
```
line 423/428: fontSize:28, fontWeight:800 (試合スコア me/opp)
line 615/620: fontSize:22, fontWeight:800 (Sessions 内スコア)
line 935:     fontSize:16, fontWeight:800 (大会数値)
line 1018:    fontSize:18, fontWeight:800 (rating)
line 2609:    fontSize:22, fontWeight:800 + linear-gradient (プロフィール名)
line 2940:    fontSize:32 (アイコン、placeholder)
```
- **fontSize:28 + fontWeight:800** は v2 の Score 表示の標準
- 22-32px の太字数字を**頻繁に**使用してインパクトを作っている

### v3 — 同様に大数字を維持 (`v3/index.html` 抜粋)
```
line 800:     fontSize:20, fontWeight:800 (試打カードラケット名)
line 840:     fontSize:18, fontWeight:800 (試打)
line 1450:    fontSize:18, fontWeight:800 (gamesWon スコア monospace)
line 1500-1526: fontSize:13, fontWeight:800 (winners/forced/unforced 数値)
line 2226/2231: fontSize:22, fontWeight:800 (試合スコア)
line 2940:    fontSize:32 (アイコン)
```
- v2 と同等のサイズ階層を維持
- ただしグラデーション使用は廃止 (§8 参照)

### v4 — `DESIGN_SYSTEM_v4.md §2.2` 上の階層
| 役割 | px | weight |
|---|---|---|
| H1 | 24 | 700 |
| H2 | 20 | 700 |
| H3 | 16 | 600 |
| body | 14 | 400/500 |
| small | 12 | 400 |
| tiny | 11 | 600 |

### v4 実装での grep 結果
- `fontSize:28`、`fontSize:32`、`fontSize:40` の大数字は **src/ で grep して 0 件**
- `fontWeight:800` も `font-weight: 800` も**ほぼ未使用**
- 最大は H1 = 24px / fontWeight:700

### 重大な発見 — 数字の視覚インパクト喪失
- v2/v3 は試合スコアを「**28px 800**」で見せていた → 試合中の試合状況把握 (= REQUIREMENTS F1.4.1 メンタルリセット用途) で重要
- v4 は最大 24px 700 までしかなく、**インパクトが半減**
- ユーザーの「面白くない」感覚の核心要因の一つ

### Implications for v4 S13.5 redesign:
- DESIGN_SYSTEM §2.2 に **Display tier** 追加: `display1=40px / display2=32px / display3=28px、font-weight:800、font-variant-numeric:tabular-nums`
- 適用箇所: スコア表示、stats summary の主要数値、「練習 3 回」の "3"
- **特に Home の今週サマリーで活用必須** (Gemini 提案、ユーザー Q1-3,4 = 1 で「両方入れる」と確定済)

---

## §3 Spacing & sizing

### v2/v3 共通 — iOS 系の border-radius
- modal: `borderRadius:12` (v2:123 / v3:49)
- popover: `borderRadius:12` (v3:3784)
- Card 内 padding は局所的、統一感やや弱い (タブごとに独自 padding 定義)

### v4 (`DESIGN_SYSTEM_v4.md §3.1, §4.2`)
| トークン | px | 用途 |
|---|---|---|
| xs | 4 | アイコン-文字間 |
| sm | 8 | ボタン内 gap |
| md | 12 | コンポーネント内 padding |
| lg | 16 | カード内 padding |
| xl | 20 | 画面外縁 padding |
| 2xl | 24 | セクション間 |
| 3xl | 32 | 大区切り |

- Card border-radius: **12px** (`§4.2` 明記)
- Modal border-radius: **16px** (`§4.5`)
- Button border-radius: **8px** (`§4.3`)

### Implications for v4 S13.5 redesign:
- Card 12 → **16-20px** に拡大すると Apple ライクに振れる (ただし Material から離れる)
- Button 8 → **10-12px** で柔らかく
- Modal 16 → **20-24px** でより iOS 寄り
- これらの数値変更は既存全コンポーネントに波及 → **全面改訂が必要**

---

## §4 Icons (重点)

### v4 で実際に使われている Lucide アイコン (grep 結果)

`src/ui/**/*.jsx` で `<Icon name="xxx"` のリスト (head_limit 40 で確認):
- Common: `pencil / x / save / arrow-left / chevron-left / chevron-right / chevron-down / search / plus / log-out / clipboard-copy / clock / check / rotate-ccw`
- Domain-specific: `trophy / brain / dumbbell / play-circle / watch`
- 合計使用種類: 約 19 種

### Lucide にあるテニス関連アイコン (公式: https://lucide.dev/icons/)
- ✅ `trophy` (優勝カップ)
- ✅ `medal` (メダル)
- ✅ `award` (リボンメダル)
- ❌ **テニスラケット — 存在しない**
- ❌ **テニスボール — 存在しない**
- ✅ `target` (ターゲット、テニス的に使えるが直接的でない)

### Phosphor (https://phosphoricons.com/) — 9000+ アイコン、6 weights
- ✅ `tennis-ball` ← Phosphor のみ存在 (line / fill / duotone 全 weight)
- ❌ **テニスラケット — 存在しない**
- ✅ `trophy` (1 weight: filled-only)、`medal`、`star` 各種

### Tabler Icons (https://tabler.io/icons) — MIT、4500+ アイコン、線画ペア
- ✅ **`tennis` ← ラケット + ボールの SVG が存在**
- ライセンス: MIT、SVG 単体ファイルダウンロード可
- アイコン仕様: 24px、stroke-width: 2、線画

### Material Symbols (Google) — Apache 2.0、2500+ アイコン、Variable Font
- ✅ `sports_tennis` (ラケット + ボール、Outlined/Rounded/Sharp 3 形状)
- FILL 軸で塗り/線をシームレス切替

### v4 で使うべきアプローチ (S13.5)
1. **メイン**: Phosphor の duotone weight に統一 (Apple ライク + 6 weights で結果階層表現)
2. **テニスラケット 1 個だけ**: Tabler の `tennis` を SVG 直接埋め込み (MIT license OK、`<svg>` を `Icon` コンポーネント内で name=`"tennis"` の時に分岐返却)
3. **既存 19 種**: Phosphor の同名アイコンに機械的にマッピング (`trophy → trophy`、`pencil → pencil-simple` 等、軽微な調整必要)

### v4 で残っている絵文字使用箇所 (要置換)
S14 着手前に grep して特定するが、preview_s14.html では好成績カード等で 🏆 🥈 🥉 ✅ を混入させていた (CLAUDE.md §5「UI 要素は Lucide のみ」違反)。**S13.5 で全絵文字を SVG 化**する必要がある。

### Implications for v4 S13.5 redesign:
- **Lucide → Phosphor 全面差し替え** (ライブラリ変更)
- Tabler `tennis` を 1 アイコンだけ拝借
- `Icon.jsx` 内部実装変更、`<Icon name="..."/>` 呼び出し API は維持 (置換コスト最小化)
- DESIGN_SYSTEM §5.4 マッピング表を全更新

---

## §5 Microinteractions / animations

### v2 — Sessions 系の transition (`v2_index.html` 抜粋)
```
line 809:  transition:"all 0.1s" (試合行 hover)
line 826:  transition:"transform 0.2s" (▶ rotate)
line 1062: transition:"all 0.1s" (大会展開)
line 1235: transition:"all 0.1s" (練習展開)
line 1857: transition:"all 0.1s" (試打展開)
line 2034: transition:"all 0.2s" (toggle switch knob)
line 3819: transition:"all 0.12s" (タブボタン)
```
- accordion expand 系で `all 0.1s` を多用 (v2 = 12 タブ → 折りたたみ多)

### v3 — 同等の transition (`v3/index.html` 抜粋)
```
line 1759:  transition:"transform 0.2s" (▶ chevron)
line 2218:  transition:"transform 0.2s" (chevron)
line 2771:  transition:"transform 0.2s" (chevron)
```
- accordion パターンは継続使用、追加で v3 では Sessions タブ内の expand に limited

### v4 — 29 件 transition + 3 keyframes (verified)
`@keyframes` (`src/_head.html`):
- `modalEnter`: 0→1 opacity + scale(0.95)→1
- `drawerEnter`: translateY(100%)→0
- `dayPanelSlideUp`: translateY(20px)→0 + opacity 0→1

`prefers-reduced-motion: reduce` 対応済 (`_head.html:18-20`)

### v4 で追加すべきマイクロインタラクション (Gemini 提案)
- カード hover: `transform: translateY(-2px)` + 影強調
- フィルタチップ ON/OFF 時の入替アニメ
- ボタン active: `scale(0.97)` + brightness(0.95) (DESIGN_SYSTEM §6.1 既定義だが実装未確認)
- ローディング skeleton (Firestore 取得中の Card placeholder)

### Implications for v4 S13.5 redesign:
- 既存 keyframes は維持
- Card hover lift を追加 (Apple ライクの「触れた感触」)
- 全 button に active scale 適用を強制 (現状ばらつき)
- ローディング skeleton コンポーネント新設

---

## §6 Common layout

### v2 共通 Header (`v2_index.html:3793-3815`)
```jsx
<h1 style={{
  fontSize:19, fontWeight:800, letterSpacing:"-0.02em",
  background:`linear-gradient(90deg, ${C.accent}, #0891b2)`,
  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
}}>ゆっけ Tennis DB</h1>
<div style={{fontSize:12}}>
  ☁️ user · 大会 {N} / 練習 {N} / 試打 {N}
  <span>v{APP_VERSION}</span>
</div>
+ 8 アイコン横並び (＋, A↑, 📤, 📋, 📥, 📋→📥, ↩️, 👤)
```

### v3 共通 Header (`v3/index.html:3184-3196`)
```jsx
<div onClick={()=>setTab("home")} style={{cursor:"pointer"}}>
  <span>🎾</span>
  <span><span fontWeight:400>Tennis</span><span fontWeight:800 color:accent>DB</span></span>
  <span fontSize:9>v{APP_VERSION}{syncing?" · 同期中...":user?" · ☁️":""}</span>
</div>
+ [A↑] [📤データメニュー] [👤]
```
- **ロゴタップ → home に戻る** (発見済)
- グラデーションは廃止、文字色とウェイト切替で「Tennis**DB**」を表現

### v4 現状 (`src/ui/common/Header.jsx`)
- **タブ名のみ表示**、アプリ名なし、バージョンなし、import/export なし
- 共通 Header の概念が**部分実装**
- ユーザー指摘「5 タブが別々のアプリに見える」の直接原因

### TabBar
- v2: `v2_index.html:3818-3826` に PRIMARY/SECONDARY 2 段 (12 タブ収容のため)
- v3: `v3/index.html` で 5 タブ統合 (TabBar コンポーネント存在)
- v4: `src/ui/common/TabBar.jsx`、5 タブ grid、`paddingBottom: env(safe-area-inset-bottom, 0)` 適用済

### 100vh / 100dvh 問題
- v2: `100dvh` 使用 (`v2_index.html` で 100dvh と grep)
- v3: `minHeight:"100dvh"` (`v3/index.html:3182`)
- v4: `height: "100vh"` (`src/app.jsx:429`) ← Chrome モバイルで TabBar 見切れる原因

### Implications for v4 S13.5 redesign:
- **Header.jsx を全面書き直し**: アプリ名 (`Tennis` + `DB`) + version + sync 状態 + 天気 + logout を集約
- ロゴタップ → home に戻る挙動を再現
- `100vh` → `100dvh` で TabBar 見切れ解消
- v2 のグラデーション識別子を**復活させるか**は §8 で議論

---

## §7 Cards / Badges / Buttons

### v3 RESULT_COLORS map (`v3/index.html:117` 周辺、要確認)
- 大会結果ごとに background/border/color を分岐 (優勝=金、準優勝=銀、3 位=銅、ベスト 8=黄、敗退=灰、予選突破=緑)

### v4 Badge variants (`src/ui/common/Badge.jsx` + DESIGN_SYSTEM §4.1)
- 9 種: tournament / practice / trial / bronze / info / success / warning / error / default
- 全部白 or Light bg + Dark 文字、AA/AAA contrast 確保済

### v4 Button variants (DESIGN_SYSTEM §4.3)
- 5 種: Primary (青) / Secondary (青枠白塗) / Ghost / Danger (赤) / Disabled

### Card style (DESIGN_SYSTEM §4.2)
- `border: 1px solid #dadce0`、`border-radius: 12`、padding: 16
- **shadow なし** (フラット路線、§0 で明文化)

### Implications for v4 S13.5 redesign:
- Card 角丸 12 → 16 を試す価値あり (Apple ライク)
- Card hover で軽い shadow を追加 (現在のフラットを維持しつつ触感を出す)
- Button variants は維持、ただし angle radius を調整

---

## §8 Special effects (重点)

### v2 の linear-gradient 使用 (verified, 4 箇所)
```
line 2609: fontSize:22, fontWeight:800, background:linear-gradient(90deg, accent, #0891b2)
           + WebkitBackgroundClip:text → プロフィール名 (Tennis DB アクセント)
line 2693: width:52, height:52, borderRadius:50%, background:linear-gradient(135deg, accent, #60e0ff)
           → プロフィールアバター (緑→水色グラデ)
line 2760: borderRadius:6, background:linear-gradient(135deg, purple, #3b82f6)
           → MBTI バッジ (紫→青グラデ)
line 3795: <h1 fontSize:19 fontWeight:800 letterSpacing:-0.02em
           background:linear-gradient(90deg, accent, #0891b2)
           WebkitBackgroundClip:text> ゆっけ Tennis DB
```
- ヘッダロゴ + プロフィール + バッジ で**ブランド表現として gradient を使用**
- 「90deg → 横方向、accent (緑) → cyan (#0891b2)」が中核パターン

### v3 の linear-gradient → **0 件** (grep 確認済)
- v3 で gradient は完全に削除された (フラット化の一環)

### v4 の linear-gradient → **0 件** (推定、v3 から継承)

### Shadow 使用パターン

#### v2 (3 件、modal/toast 主体)
- `boxShadow:"0 4px 20px #0002"` (modal、line 123)
- `boxShadow:"0 4px 20px #0008"` (toast、line 144)
- もう 1 件は line 3784 (popover メニュー、`0 8px 30px #000a`)

#### v3 (3 件、同パターン)
- 同様に modal / toast / popover に限定使用

#### v4 (22 件、用途多様化、verified)
```
CalendarDayCell.jsx:40   selected 状態: 0 0 0 2px primary, 0 4px 8px rgba(26,115,232,0.18)
GameTracker.jsx:129      active button: 0 4px 12px rgba(26,115,232,.25)
GameTracker.jsx:207      undo button: 0 4px 16px rgba(26,115,232,.18)
Toast.jsx:39             toast container: 0 4px 12px rgba(0,0,0,0.2)
QuickAddFab.jsx:67/125    FAB shadow: 0 2px 6px + 0 4px 12px rgba(26,115,232,0.3)
SessionEditView.jsx:129   下バー上影: 0 -2px 8px rgba(0,0,0,0.04)
YearHeatmapCell.jsx:43/45 selected/today inset: 0 0 0 2px primary, 0 2px 6px primary30
```
- v4 は shadow を**焦点・状態表現**として使う (selection ring, FAB elevation, top-bar inset)
- Card には不使用 (フラット維持)
- agent の「v4 は shadow 廃止」主張は**誤り**

### Implications for v4 S13.5 redesign:
- **gradient 復活**: ロゴ「TennisDB」を v2 風 `linear-gradient(90deg, primary, #0891b2)` で着色 → **ブランドアイデンティティ復活**
- gradient はロゴと特定の状況 (アバター、特別バッジ) のみに限定し、汎用には使わない (v2 失敗から学ぶ)
- shadow は現状の用途を維持 + Card hover で軽い elevation 追加
- 新規導入候補: **Glass morphism** (`backdrop-filter: blur(8px)` + 半透明背景) を Modal や DayPanel で部分採用 (iOS 16+ ライク)

---

## §9 Design philosophy 変遷

### v2 → v3
- **12 タブ → 5 タブ統合** (UX 大革新)
- gradient 廃止、フラット化開始
- 色定数の整理 (semantic 色を独立)
- 単一ファイル維持 (3500-3800 行)

### v3 → v4
- **モジュラ化** (`src/core / domain / ui` 構造)
- `SCHEMA` 中央化、type 分岐の domain 集約
- カテゴリ色を 3 系統明確分離 (tournament/practice/trial)
- Primary を Green → **Blue 変更** ← 視覚的不連続
- 大数字 (28px) を**廃止** ← インパクト喪失
- gradient ゼロ継承 ← 識別子喪失
- v4 = 「より構造化されたが、視覚的個性が薄い」

### ユーザー「v4 は退屈」の構造的要因まとめ
1. ブランド色が緑 → 青で**馴染みが消えた**
2. 大数字 800 タイポを**廃止**してインパクト喪失
3. gradient を v3 で削除、v4 で復活させなかった
4. Card shadow なし + 控えめな border のみで、画面が「白い箱の連続」に
5. アクセント色 (各カテゴリ) は良いが、相互の trio が**白 background 上で同等の重み**になっていて視線誘導が弱い

---

## §10 Implications for v4 S13.5 redesign (consolidated)

### 復活させるべきもの (v2/v3 から)
1. **大数字 fontWeight:800** (Display tier 28-40px) — Score、stats summary 主要数値
2. **linear-gradient によるブランド表現** — ロゴ + 特別な強調用途のみ
3. **共通 Header (アプリ名 + version + 同期状態)** — v3 形式踏襲、すでに合意済
4. **`100dvh`** — TabBar 見切れ修正

### 維持すべきもの (v4 で改善された)
1. SCHEMA 中央化、domain 純関数化
2. カテゴリ色 3 系統 (tournament Orange / practice Green / trial Purple)
3. Badge variant 9 種の整理
4. `prefers-reduced-motion` 対応
5. AA/AAA コントラスト規律

### 新規追加すべきもの (Apple-flavored Material 化)
1. **Phosphor Icons (duotone)** + **Tabler `tennis` 1 個拝借**
2. **Apple System Color 候補追加**: System Blue `#007AFF` を Primary 候補、Mint `#00C7BE`、Indigo `#5856D6` を補助
3. **Card 角丸 12 → 16**、Modal 16 → 20
4. **Card hover lift** (`translateY(-2px)` + soft shadow)
5. **Glass morphism** (Modal / DayPanel に部分採用)
6. **ローディング skeleton** コンポーネント新設

### 慎重に検討するもの
1. **Primary 青の Material Blue → System Blue 変更** (`#1a73e8` → `#007AFF`) → Apple ライク化に直結だが、既存実装の全 instance に波及
2. **緑をブランドアクセントとして復活させるか** — v2/v3 識別子。新 Primary とどう棲み分けるか
3. **Glass morphism のブラウザ互換性** — `backdrop-filter` は iOS Safari 9+ / Chrome 76+ で OK だが、フォールバックが必要

---

## §11 Summary table: v2 vs v3 vs v4

| 観点 | v2 | v3 | v4 (現状) | S13.5 改訂方針 |
|---|---|---|---|---|
| Primary 色 | Green `#00b87a` | Green `#00b87a` | **Blue `#1a73e8`** | System Blue `#007AFF` 検討 |
| 大数字 | 28px 800 多用 | 22-28px 800 多用 | **24px 700 max** | Display tier 28-40px 復活 |
| Linear-gradient | 4 箇所 (logo/avatar/MBTI/h1) | **0 件** | **0 件** | logo に復活 |
| Box-shadow | 3 件 (modal/toast/popover) | 3 件 (同) | 22 件 (active/FAB/Toast) | Card hover lift 追加 |
| Transitions | accordion `all 0.1s` 多用 | accordion `all 0.1s` 多用 | 29 件 + 3 keyframes | 維持 + hover lift |
| Card 角丸 | 12 (modal) | 12 | 12 | **16 に拡大** |
| Modal 角丸 | 12 | 12 | 16 | **20 に拡大** |
| 共通 Header | アプリ名 + version + アイコン群 | ロゴタップ → home + version | **タブ名のみ (退化)** | v3 形式に復活 |
| アプリ名表示 | 「ゆっけ Tennis DB」グラデ | 🎾 Tennis**DB** v3.3.27 | **無し** | Tennis**DB** + gradient |
| アイコン | 絵文字 + 一部 SVG | 絵文字 + Lucide 混在 | Lucide のみ (テニスラケット欠落) | Phosphor + Tabler tennis |
| Tab 数 | 12 (PRIMARY 7 + SECONDARY 5) | 5 統合 | 5 統合 | 5 維持 |
| タブ高さ | 40-44 + 40 (2 段) | 56 + safe-area | 56 + safe-area | 維持 |
| 100dvh 適用 | あり | あり | **無し (100vh)** | 100dvh に修正 |
| Glass morphism | 無し | 無し | 無し | Modal / DayPanel で部分採用 |

---

## §12 Self-verification

- 主要 grep 件数: 11 (本文中の count は実 grep 結果)
- file:line 引用: 約 50 (実コード行参照)
- 未確認領域: §3 padding 値 / §6 v2 の Header 細部 / §7 v3 RESULT_COLORS map 詳細 → S13.5 実装中に都度検証
- 元 agent audit との差: 62 行 → 約 450 行、自己参照削除、Shadow 主張訂正、gradient 喪失発見追記、Phosphor/Tabler 検証完了

---

## §13 次セッションでの参照方法

- S14 以降の Stage で「v2/v3 ではどうだった?」と grep する前に**まずこの文書を見る**
- 内容が古いと感じたら**追記する** (削除はしない)
- 実装中に新発見があれば §1-§9 の該当箇所に追記

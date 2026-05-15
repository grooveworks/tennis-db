# Tennis DB v4 build script
# S17 build 修繕 (2026-05-09): ブラウザ側 Babel transpile を廃止、esbuild で事前 transpile
#
# 経緯: Phase 2 で v4/index.html が 911 KB に到達 → iPhone Safari/Chrome で 5 分以上ロード
#       原因は inline `<script type="text/babel">` を @babel/standalone でブラウザ側 transpile (iPhone WebKit JIT 制限)
#       修繕: PC で事前に esbuild が JSX→JS 変換 + minify 済 JS を inline 埋め込み、ブラウザは直接実行
#
# 流れ:
#   1. src/ 全 JS/JSX を順序連結 (core → domain → ui → app.jsx) → 一時 .jsx
#   2. esbuild で JSX→JS transpile + minify (React global 前提、target=es2017)
#   3. _head.html (Babel CDN なし、`<script>` のみ) + transpile 済 JS + _tail.html を結合 → v4/index.html

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$srcDir = Join-Path $root "src"
$outDir = Join-Path $root "v4"
$out = Join-Path $outDir "index.html"

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# ── Step 1: src/ 連結 (現方式と同じ順序)
$sb = New-Object System.Text.StringBuilder

function AppendFromFile($path) {
  if ([System.IO.File]::Exists($path)) {
    $content = [System.IO.File]::ReadAllText($path)
    [void]$sb.Append($content)
  }
}
function AppendLine($text) {
  [void]$sb.AppendLine($text)
}

# core/ (sort by name)
$coreDir = Join-Path $srcDir "core"
if (Test-Path $coreDir) {
  Get-ChildItem $coreDir -Filter *.js | Sort-Object Name | ForEach-Object {
    AppendLine "// === src/core/$($_.Name) ==="
    AppendFromFile $_.FullName
    AppendLine ""
  }
}

# domain/ (sort by name) — S17 code splitting 段階 1: plan_assist.js は heavy bundle 側へ
$domainDir = Join-Path $srcDir "domain"
if (Test-Path $domainDir) {
  Get-ChildItem $domainDir -Filter *.js | Where-Object {
    $_.Name -ne "plan_assist.js"
  } | Sort-Object Name | ForEach-Object {
    AppendLine "// === src/domain/$($_.Name) ==="
    AppendFromFile $_.FullName
    AppendLine ""
  }
}

# ui/ (recursive, sort by full path) — S17 code splitting 段階 1+2-1+2-2+2-3+2-4+2-5-1+2-5-2+2-5-3: ui/plan/ + ui/insights/ + ui/sessions/{QuickTrialMode,MergeModal,MergePartnerPicker,TournamentEditForm,PracticeEditForm,TrialEditForm,MatchEditModal,YearHeatmap,YearHeatmapCell,WeekPanel}.jsx + ui/gear/{RacketDetailView,PeriodDetailView,SettingHistorySection}.jsx + ui/common/{SettingsModal,WeatherModal}.jsx + ui/home/HomeDayPanel.jsx は heavy bundle 側へ
# 試合中使わない component はファイル単位で厳密除外 (= SessionsTab / GameTracker / _NumWheel / _SetupPicker / LinkedSessionPicker / GearTab / HomeTab は core 維持)
$uiDir = Join-Path $srcDir "ui"
if (Test-Path $uiDir) {
  Get-ChildItem $uiDir -Recurse -Filter *.jsx | Where-Object {
    -not ($_.FullName -match "[\\/]ui[\\/](plan|insights)[\\/]") -and
    -not ($_.FullName -match "[\\/]ui[\\/]sessions[\\/](QuickTrialMode|MergeModal|MergePartnerPicker|TournamentEditForm|PracticeEditForm|TrialEditForm|MatchEditModal|YearHeatmap|YearHeatmapCell|WeekPanel)\.jsx$") -and
    -not ($_.FullName -match "[\\/]ui[\\/]gear[\\/](RacketDetailView|PeriodDetailView|SettingHistorySection)\.jsx$") -and
    -not ($_.FullName -match "[\\/]ui[\\/]common[\\/](SettingsModal|WeatherModal)\.jsx$") -and
    -not ($_.FullName -match "[\\/]ui[\\/]home[\\/]HomeDayPanel\.jsx$")
  } | Sort-Object FullName | ForEach-Object {
    $rel = $_.FullName.Substring($srcDir.Length + 1).Replace("\", "/")
    AppendLine "// === src/$rel ==="
    AppendFromFile $_.FullName
    AppendLine ""
  }
}

# app.jsx
AppendLine "// === src/app.jsx ==="
AppendFromFile (Join-Path $srcDir "app.jsx")
AppendLine ""

# ── core bridge footer (S17 code splitting 段階 1、2026-05-10)
# 連結順序 (core → domain → ui → app.jsx) の最後に bridge を出すことで、
# Icon/Modal/Input/Textarea/NumWheel (= ui/common, ui/sessions) の定義より後で実行されることを保証
# heavy bundle (bundle-heavy.js) は window.__TennisDBCore 経由で共通 UI / 定数 / hooks helper を参照
# APP_VERSION も公開: heavy loader が ./bundle-heavy.js?v=APP_VERSION で cache busting
# fbFunctions は core/02_firebase.js で同期代入されるので value copy で OK (= 再代入なし grep 確認済)
AppendLine "// === core bridge footer (S17 code splitting 段階 1 + 段階 2-1) ==="
AppendLine "window.__TennisDBCore = {"
AppendLine "  C: C, font: font, APP_VERSION: APP_VERSION,"
AppendLine "  Icon: Icon, Modal: Modal, Input: Input, Textarea: Textarea, NumWheel: NumWheel,"
AppendLine "  sortByStatusAndOrder: sortByStatusAndOrder,"
AppendLine "  RACKET_STATUS_PRIORITY: RACKET_STATUS_PRIORITY,"
AppendLine "  STRING_STATUS_PRIORITY: STRING_STATUS_PRIORITY,"
AppendLine "  fbFunctions: fbFunctions,"
AppendLine "  RADIUS: RADIUS,"
AppendLine "  normDate: normDate,"
AppendLine "  _normalizeMatchResult: _normalizeMatchResult,"
AppendLine "  genId: genId,"
AppendLine "  Button: Button,"
AppendLine "  SCHEMA: SCHEMA,"
AppendLine "  isEmptyVal: isEmptyVal,"
AppendLine "  useFocusTrap: useFocusTrap,"
AppendLine "  computeMergeDiff: computeMergeDiff,"
AppendLine "  applyMerge: applyMerge,"
AppendLine "  countRelinks: countRelinks,"
AppendLine "  computeRacketUsage: computeRacketUsage,"
AppendLine "  formatRacketStringDisplay: formatRacketStringDisplay,"
AppendLine "  formatRacketTensionDisplay: formatRacketTensionDisplay,"
AppendLine "  computeSettingHistory: computeSettingHistory,"
AppendLine "  lsLoad: lsLoad,"
AppendLine "  KEYS: KEYS,"
AppendLine "  // 段階 2-5-2 (2026-05-12): session-edit chunk heavy 化のため追加 (4 編集 form + MatchEditModal が core 側 UI primitive / domain helpers / 試合中 component を bridge 経由で参照)"
AppendLine "  Select: Select,"
AppendLine "  MasterField: MasterField,"
AppendLine "  TimeWheel: TimeWheel,"
AppendLine "  SetupPickerButton: SetupPickerButton,"
AppendLine "  _SetupPickerButton: _SetupPickerButton,"
AppendLine "  _computeRecentSetups: _computeRecentSetups,"
AppendLine "  LinkedSessionPicker: LinkedSessionPicker,"
AppendLine "  GameTracker: GameTracker,"
AppendLine "  blankMatch: blankMatch,"
AppendLine "  computeCascade: computeCascade,"
AppendLine "  describeCascadeMessage: describeCascadeMessage,"
AppendLine "  formatFromPreset: formatFromPreset,"
AppendLine "  formatLabel: formatLabel,"
AppendLine "  formatRuleSummary: formatRuleSummary,"
AppendLine "  DEFAULT_MATCH_FORMAT: DEFAULT_MATCH_FORMAT,"
AppendLine "  resolveMatchFormat: resolveMatchFormat,"
AppendLine "  computeSetScoresFromGames: computeSetScoresFromGames,"
AppendLine "  applyTbDetails: applyTbDetails,"
AppendLine "  computeAutoMatchResult: computeAutoMatchResult,"
AppendLine "  LS_PREFIX: LS_PREFIX,"
AppendLine "  // 段階 2-5-3 (2026-05-13): YearHeatmap/WeatherModal/HomeDayPanel heavy 化のため追加 (WeekPanel が result badge 表示で参照)"
AppendLine "  Badge: Badge,"
AppendLine "};"

# ── Step 2: 一時ファイルに書き出して esbuild に渡す
$tmpDir = Join-Path $root ".build_tmp"
if (-not (Test-Path $tmpDir)) { New-Item -ItemType Directory -Path $tmpDir | Out-Null }
$tmpJsx = Join-Path $tmpDir "combined.jsx"
$tmpOut = Join-Path $tmpDir "bundled.js"
$encoding = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tmpJsx, $sb.ToString(), $encoding)

# ── Step 3: esbuild で JSX→JS transpile + minify
$npxPath = "C:\Program Files\nodejs\npx.cmd"
if (-not (Test-Path $npxPath)) {
  Write-Error "npx not found at $npxPath"
  exit 1
}

Write-Host "Running esbuild..."
# S17 build 修繕 (2026-05-09 第 2 弾): --format=esm に変更。
#   経緯: --format=iife (default) だと bundle 全体が 1 つの IIFE 巨大関数になり、
#   iPhone WebKit JIT が約 525 KB で deopt → 試合運用不可レベルの重さ。
#   ESM format は top-level statements として展開され、JIT が個別関数単位で適用 → deopt 回避見込み。
#   _head.html 側で <script type="module"> に変更必須 (top-level await / import 等の ESM 文法を許可)。
& $npxPath --yes esbuild $tmpJsx `
  "--jsx-factory=React.createElement" `
  "--jsx-fragment=React.Fragment" `
  --target=es2017 `
  --format=esm `
  --minify `
  --keep-names `
  --outfile=$tmpOut `
  --log-level=warning

if ($LASTEXITCODE -ne 0) {
  Write-Error "esbuild failed with exit code $LASTEXITCODE"
  exit 1
}

$transpiledJs = [System.IO.File]::ReadAllText($tmpOut)
$transpiledSize = $transpiledJs.Length

# ── Step 3.5: heavy bundle (PlanTab) を別ファイル化 (S17 code splitting 段階 1、2026-05-10)
# 連結順序: prelude (guard + destructure) → plan_assist.js → ui/plan/*.jsx → expose
# IIFE format で別 scope。core から共通部品は window.__TennisDBCore 経由参照
# build 時点で PlanTab.jsx 存在チェック (= 移動・削除事故の早期検出、ChatGPT 指摘 2)
$heavySize = 0
$planDir = Join-Path $srcDir "ui\plan"
$planTabPath = Join-Path $planDir "PlanTab.jsx"
if (-not (Test-Path $planTabPath)) {
  Write-Error "PlanTab.jsx not found at $planTabPath (heavy bundle build aborted)"
  exit 1
}
# S17 code splitting 段階 2-1: InsightsTab.jsx の存在チェック (= 移動・削除事故の早期検出)
$insightsTabPath = Join-Path $srcDir "ui\insights\InsightsTab.jsx"
if (-not (Test-Path $insightsTabPath)) {
  Write-Error "InsightsTab.jsx not found at $insightsTabPath (heavy bundle build aborted)"
  exit 1
}
# S17 code splitting 段階 2-2: QuickTrialMode.jsx の存在チェック (= 移動・削除事故の早期検出)
$quickTrialModePath = Join-Path $srcDir "ui\sessions\QuickTrialMode.jsx"
if (-not (Test-Path $quickTrialModePath)) {
  Write-Error "QuickTrialMode.jsx not found at $quickTrialModePath (heavy bundle build aborted)"
  exit 1
}
# S17 code splitting 段階 2-3: MergeModal.jsx + MergePartnerPicker.jsx の存在チェック
$mergeModalPath = Join-Path $srcDir "ui\sessions\MergeModal.jsx"
$mergePartnerPickerPath = Join-Path $srcDir "ui\sessions\MergePartnerPicker.jsx"
if (-not (Test-Path $mergeModalPath)) {
  Write-Error "MergeModal.jsx not found at $mergeModalPath (heavy bundle build aborted)"
  exit 1
}
if (-not (Test-Path $mergePartnerPickerPath)) {
  Write-Error "MergePartnerPicker.jsx not found at $mergePartnerPickerPath (heavy bundle build aborted)"
  exit 1
}
# S17 code splitting 段階 2-4: RacketDetailView.jsx + PeriodDetailView.jsx + SettingHistorySection.jsx の存在チェック
$racketDetailPath = Join-Path $srcDir "ui\gear\RacketDetailView.jsx"
$periodDetailPath = Join-Path $srcDir "ui\gear\PeriodDetailView.jsx"
$settingHistoryPath = Join-Path $srcDir "ui\gear\SettingHistorySection.jsx"
foreach ($p in @($racketDetailPath, $periodDetailPath, $settingHistoryPath)) {
  if (-not (Test-Path $p)) {
    $fn = [System.IO.Path]::GetFileName($p)
    Write-Error "$fn not found at $p (heavy bundle build aborted)"
    exit 1
  }
}
# S17 code splitting 段階 2-5-1: SettingsModal.jsx の存在チェック
$settingsModalPath = Join-Path $srcDir "ui\common\SettingsModal.jsx"
if (-not (Test-Path $settingsModalPath)) {
  Write-Error "SettingsModal.jsx not found at $settingsModalPath (heavy bundle build aborted)"
  exit 1
}
# S17 code splitting 段階 2-5-2 (2026-05-12): session-edit chunk 一括 heavy 化
#   対象 4 ファイル (= 3 編集 form + MatchEditModal) の存在チェック (= 移動・削除事故の早期検出)
$tournamentEditFormPath = Join-Path $srcDir "ui\sessions\TournamentEditForm.jsx"
$practiceEditFormPath   = Join-Path $srcDir "ui\sessions\PracticeEditForm.jsx"
$trialEditFormPath      = Join-Path $srcDir "ui\sessions\TrialEditForm.jsx"
$matchEditModalPath     = Join-Path $srcDir "ui\sessions\MatchEditModal.jsx"
foreach ($p in @($tournamentEditFormPath, $practiceEditFormPath, $trialEditFormPath, $matchEditModalPath)) {
  if (-not (Test-Path $p)) {
    $fn = [System.IO.Path]::GetFileName($p)
    Write-Error "$fn not found at $p (heavy bundle build aborted)"
    exit 1
  }
}
# S17 code splitting 段階 2-5-3 (2026-05-13): YearHeatmap セット + WeatherModal + HomeDayPanel の存在チェック
$yearHeatmapPath     = Join-Path $srcDir "ui\sessions\YearHeatmap.jsx"
$yearHeatmapCellPath = Join-Path $srcDir "ui\sessions\YearHeatmapCell.jsx"
$weekPanelPath       = Join-Path $srcDir "ui\sessions\WeekPanel.jsx"
$weatherModalPath    = Join-Path $srcDir "ui\common\WeatherModal.jsx"
$homeDayPanelPath    = Join-Path $srcDir "ui\home\HomeDayPanel.jsx"
foreach ($p in @($yearHeatmapPath, $yearHeatmapCellPath, $weekPanelPath, $weatherModalPath, $homeDayPanelPath)) {
  if (-not (Test-Path $p)) {
    $fn = [System.IO.Path]::GetFileName($p)
    Write-Error "$fn not found at $p (heavy bundle build aborted)"
    exit 1
  }
}

$heavySb = New-Object System.Text.StringBuilder
[void]$heavySb.AppendLine("// === heavy bundle prelude (S17 code splitting 段階 1) ===")
[void]$heavySb.AppendLine("if (!window.__TennisDBCore) {")
[void]$heavySb.AppendLine('  throw new Error("TennisDB core bridge is not available");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine("const { C, font, Icon, Modal, Input, Textarea, NumWheel, sortByStatusAndOrder, RACKET_STATUS_PRIORITY, STRING_STATUS_PRIORITY, fbFunctions, RADIUS, normDate, _normalizeMatchResult, genId, Button, SCHEMA, isEmptyVal, useFocusTrap, computeMergeDiff, applyMerge, countRelinks, computeRacketUsage, formatRacketStringDisplay, formatRacketTensionDisplay, computeSettingHistory, lsLoad, KEYS, APP_VERSION, Select, MasterField, TimeWheel, SetupPickerButton, _SetupPickerButton, _computeRecentSetups, LinkedSessionPicker, GameTracker, blankMatch, computeCascade, describeCascadeMessage, formatFromPreset, formatLabel, formatRuleSummary, DEFAULT_MATCH_FORMAT, resolveMatchFormat, computeSetScoresFromGames, applyTbDetails, computeAutoMatchResult, LS_PREFIX, Badge } = window.__TennisDBCore;")
[void]$heavySb.AppendLine("const { useState, useEffect, useMemo, useRef, useCallback } = React;")
[void]$heavySb.AppendLine("")

# plan_assist.js (heavy 同梱、core から除外済)
$planAssistPath = Join-Path $srcDir "domain\plan_assist.js"
if (Test-Path $planAssistPath) {
  [void]$heavySb.AppendLine("// === src/domain/plan_assist.js ===")
  [void]$heavySb.Append([System.IO.File]::ReadAllText($planAssistPath))
  [void]$heavySb.AppendLine("")
}

# ui/plan/*.jsx (現状 PlanTab.jsx のみだが将来増えても拾える)
Get-ChildItem $planDir -Recurse -Filter *.jsx | Sort-Object FullName | ForEach-Object {
  $rel = $_.FullName.Substring($srcDir.Length + 1).Replace("\", "/")
  [void]$heavySb.AppendLine("// === src/$rel ===")
  [void]$heavySb.Append([System.IO.File]::ReadAllText($_.FullName))
  [void]$heavySb.AppendLine("")
}

# ui/insights/*.jsx (S17 code splitting 段階 2-1: InsightsTab を heavy 側へ)
$insightsDir = Join-Path $srcDir "ui\insights"
if (Test-Path $insightsDir) {
  Get-ChildItem $insightsDir -Recurse -Filter *.jsx | Sort-Object FullName | ForEach-Object {
    $rel = $_.FullName.Substring($srcDir.Length + 1).Replace("\", "/")
    [void]$heavySb.AppendLine("// === src/$rel ===")
    [void]$heavySb.Append([System.IO.File]::ReadAllText($_.FullName))
    [void]$heavySb.AppendLine("")
  }
}

# ui/sessions/QuickTrialMode.jsx (S17 code splitting 段階 2-2: 試打モードを heavy 側へ、ファイル単位ピンポイント)
if (Test-Path $quickTrialModePath) {
  [void]$heavySb.AppendLine("// === src/ui/sessions/QuickTrialMode.jsx ===")
  [void]$heavySb.Append([System.IO.File]::ReadAllText($quickTrialModePath))
  [void]$heavySb.AppendLine("")
}

# ui/sessions/MergePartnerPicker.jsx + MergeModal.jsx (S17 code splitting 段階 2-3、2026-05-12)
# Picker → Modal の順で連結 (= 使用順序、読みやすさ重視、function 宣言は hoist されるので順序問わず動く)
foreach ($p in @($mergePartnerPickerPath, $mergeModalPath)) {
  if (Test-Path $p) {
    $fname = Split-Path $p -Leaf
    [void]$heavySb.AppendLine("// === src/ui/sessions/$fname ===")
    [void]$heavySb.Append([System.IO.File]::ReadAllText($p))
    [void]$heavySb.AppendLine("")
  }
}

# ui/gear/{SettingHistorySection,RacketDetailView,PeriodDetailView}.jsx (S17 code splitting 段階 2-4、2026-05-12)
# 連結順: SettingHistorySection → RacketDetailView → PeriodDetailView (= 依存順、ChatGPT 補足通り、function 宣言は hoist されるので順序問わず動くが安全側で依存順)
foreach ($p in @($settingHistoryPath, $racketDetailPath, $periodDetailPath)) {
  if (Test-Path $p) {
    $fname = Split-Path $p -Leaf
    [void]$heavySb.AppendLine("// === src/ui/gear/$fname ===")
    [void]$heavySb.Append([System.IO.File]::ReadAllText($p))
    [void]$heavySb.AppendLine("")
  }
}

# ui/common/SettingsModal.jsx (S17 code splitting 段階 2-5-1、2026-05-12: アプリ設定モーダルを heavy 側へ)
if (Test-Path $settingsModalPath) {
  [void]$heavySb.AppendLine("// === src/ui/common/SettingsModal.jsx ===")
  [void]$heavySb.Append([System.IO.File]::ReadAllText($settingsModalPath))
  [void]$heavySb.AppendLine("")
}

# ui/sessions/{MatchEditModal,TournamentEditForm,PracticeEditForm,TrialEditForm}.jsx (S17 code splitting 段階 2-5-2、2026-05-12: session-edit chunk 一括 heavy 化)
# 連結順: MatchEditModal → TournamentEditForm → PracticeEditForm → TrialEditForm
#   (= TournamentEditForm/PracticeEditForm が MatchEditModal を参照、ファイル読み順を呼出順に揃える。function 宣言は hoist されるので順序問わず動くが可読性優先)
foreach ($p in @($matchEditModalPath, $tournamentEditFormPath, $practiceEditFormPath, $trialEditFormPath)) {
  if (Test-Path $p) {
    $fname = Split-Path $p -Leaf
    [void]$heavySb.AppendLine("// === src/ui/sessions/$fname ===")
    [void]$heavySb.Append([System.IO.File]::ReadAllText($p))
    [void]$heavySb.AppendLine("")
  }
}

# S17 code splitting 段階 2-5-3 (2026-05-13): YearHeatmap セット + WeatherModal + HomeDayPanel を heavy 一括同梱
# 連結順: YearHeatmapCell → WeekPanel → YearHeatmap (= YearHeatmap が上 2 つを使用、可読性優先) → WeatherModal → HomeDayPanel (= 独立)
# YearHeatmapCell / WeekPanel は YearHeatmap.jsx 内クロージャ参照のみ、外部 expose 不要
foreach ($p in @($yearHeatmapCellPath, $weekPanelPath, $yearHeatmapPath, $weatherModalPath, $homeDayPanelPath)) {
  if (Test-Path $p) {
    $fname = Split-Path $p -Leaf
    $subdir = if ($p -like "*\common\*") { "common" } elseif ($p -like "*\home\*") { "home" } else { "sessions" }
    [void]$heavySb.AppendLine("// === src/ui/$subdir/$fname ===")
    [void]$heavySb.Append([System.IO.File]::ReadAllText($p))
    [void]$heavySb.AppendLine("")
  }
}

# heavy 末尾 expose (PlanTab 存在ランタイム検証 + window.__TennisDBHeavy 登録)
[void]$heavySb.AppendLine("// === heavy bundle expose ===")
[void]$heavySb.AppendLine('if (typeof PlanTab === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("PlanTab is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof InsightsTab === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("InsightsTab is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof QuickTrialMode === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("QuickTrialMode is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof MergeModal === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("MergeModal is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof MergePartnerPicker === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("MergePartnerPicker is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof SettingHistorySection === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("SettingHistorySection is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof RacketDetailView === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("RacketDetailView is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof PeriodDetailView === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("PeriodDetailView is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof SettingsModal === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("SettingsModal is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
# 段階 2-5-2: session-edit chunk 4 件のランタイム検証
[void]$heavySb.AppendLine('if (typeof TournamentEditForm === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("TournamentEditForm is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof PracticeEditForm === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("PracticeEditForm is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof TrialEditForm === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("TrialEditForm is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof MatchEditModal === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("MatchEditModal is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
# 段階 2-5-3 (2026-05-13): YearHeatmap / WeatherModal / HomeDayPanel のランタイム検証
# YearHeatmapCell / WeekPanel は外部 expose しない (= YearHeatmap.jsx 内クロージャ参照、ユーザー指摘の expose 最小化原則)
[void]$heavySb.AppendLine('if (typeof YearHeatmap === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("YearHeatmap is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof WeatherModal === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("WeatherModal is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine('if (typeof HomeDayPanel === "undefined") {')
[void]$heavySb.AppendLine('  throw new Error("HomeDayPanel is not defined in heavy bundle");')
[void]$heavySb.AppendLine("}")
[void]$heavySb.AppendLine("window.__TennisDBHeavy = window.__TennisDBHeavy || {};")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.PlanTab = PlanTab;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.InsightsTab = InsightsTab;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.QuickTrialMode = QuickTrialMode;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.MergeModal = MergeModal;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.MergePartnerPicker = MergePartnerPicker;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.RacketDetailView = RacketDetailView;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.PeriodDetailView = PeriodDetailView;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.SettingsModal = SettingsModal;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.TournamentEditForm = TournamentEditForm;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.PracticeEditForm = PracticeEditForm;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.TrialEditForm = TrialEditForm;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.MatchEditModal = MatchEditModal;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.YearHeatmap = YearHeatmap;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.WeatherModal = WeatherModal;")
[void]$heavySb.AppendLine("window.__TennisDBHeavy.HomeDayPanel = HomeDayPanel;")
# SettingHistorySection / YearHeatmapCell / WeekPanel は expose しない
# (= heavy IIFE 内クロージャ参照のみ、外部から呼ばれない、expose 最小化原則 ChatGPT 補足 6 + ユーザー段階 2-5-3 指摘)

$tmpHeavyJsx = Join-Path $tmpDir "heavy.jsx"
$heavyOut = Join-Path $outDir "bundle-heavy.js"
[System.IO.File]::WriteAllText($tmpHeavyJsx, $heavySb.ToString(), $encoding)

Write-Host "Running esbuild for heavy bundle..."
& $npxPath --yes esbuild $tmpHeavyJsx `
  "--jsx-factory=React.createElement" `
  "--jsx-fragment=React.Fragment" `
  --target=es2017 `
  --format=iife `
  --minify `
  --keep-names `
  --outfile=$heavyOut `
  --log-level=warning

if ($LASTEXITCODE -ne 0) {
  Write-Error "esbuild (heavy) failed with exit code $LASTEXITCODE"
  exit 1
}

if (Test-Path $heavyOut) { $heavySize = (Get-Item $heavyOut).Length }
Remove-Item $tmpHeavyJsx -ErrorAction SilentlyContinue

# ── Step 4: HTML 結合 → v4/index.html
$headHtml = [System.IO.File]::ReadAllText((Join-Path $srcDir "_head.html"))
$tailHtml = [System.IO.File]::ReadAllText((Join-Path $srcDir "_tail.html"))
$finalHtml = $headHtml + $transpiledJs + "`n" + $tailHtml

[System.IO.File]::WriteAllText($out, $finalHtml, $encoding)

# ── Step 5: クリーンアップ + 結果出力
Remove-Item $tmpJsx -ErrorAction SilentlyContinue
Remove-Item $tmpOut -ErrorAction SilentlyContinue

$size = (Get-Item $out).Length
Write-Host "Built: $out"
Write-Host "Core size (v4/index.html): $size bytes (transpiled+minified by esbuild)"
Write-Host "Heavy size (v4/bundle-heavy.js): $heavySize bytes"
Write-Host "Transpiled core JS only: $transpiledSize bytes"

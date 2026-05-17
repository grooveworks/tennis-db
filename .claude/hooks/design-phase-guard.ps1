# UserPromptSubmit hook: 設計フェーズキーワードを検知して R7 棚卸しプロトコルを強制
# Claude が「資料・過去発言・制約を読まずに前提決め打ちで設計を書く」癖 (F16) を物理的に縛る
# 2026-05-17 新設 (前提決め打ち / 訂正の逆方向決め打ちパターン対策)
#
# 仕様:
# - strong (11): 単独で発火
# - weak (7) + anchor (10): 同一 prompt 内に両方あれば発火 (案 α: 単純部分文字列マッチ)
# - 発火 = .claude/state/design-phase.json に 24h flag 書込 + additionalContext 注入
# - 注: .claude/state/ は .gitignore で除外される runtime 領域。commit に混入させない。

$inputJson = [Console]::In.ReadToEnd()
try {
  $obj = $inputJson | ConvertFrom-Json
} catch {
  exit 0
}

# user prompt のフィールド名は環境により異なる、複数を試す (user-keyword-guard と同方式)
$prompt = ""
if ($obj.user_prompt) { $prompt = $obj.user_prompt }
elseif ($obj.prompt)  { $prompt = $obj.prompt }
elseif ($obj.message) { $prompt = $obj.message }

if (-not $prompt) {
  exit 0
}

# キーワード集合 (R7 確定)
# strong: 単独で発火
$strongKeywords = @(
  '設計','フェーズ','フェーズ計画','棚卸し','Gate','試合中信頼性',
  'local-first','offline','core','heavy','Firestore'
)
# weak: anchor と同時にある時のみ発火
$weakKeywords = @(
  '次のステップ','保存','同期','運用','大会','方針','要件'
)
# anchor: weak の発火条件
$anchorKeywords = @(
  'Tennis DB','v4','試合','実戦','設計','Gate','core','heavy','Firestore','local-first'
)

# ASCII / 日本語混在判定ヘルパー (ASCII は case-insensitive、日本語は literal)
function Test-KeywordInPrompt($keyword, $text) {
  # ASCII のみで構成されているか (0-127)
  $isAscii = $true
  foreach ($ch in $keyword.ToCharArray()) {
    if ([int]$ch -gt 127) { $isAscii = $false; break }
  }
  if ($isAscii) {
    return $text.ToLower().Contains($keyword.ToLower())
  } else {
    return $text.Contains($keyword)
  }
}

# 検出
$strongHit = @()
$weakHit = @()
$anchorHit = @()

foreach ($kw in $strongKeywords) {
  if (Test-KeywordInPrompt $kw $prompt) { $strongHit += $kw }
}
foreach ($kw in $weakKeywords) {
  if (Test-KeywordInPrompt $kw $prompt) { $weakHit += $kw }
}
foreach ($kw in $anchorKeywords) {
  if (Test-KeywordInPrompt $kw $prompt) { $anchorHit += $kw }
}

# 発火判定
$fire = $false
$anchorMatched = $false
if ($strongHit.Count -gt 0) {
  $fire = $true
}
elseif ($weakHit.Count -gt 0 -and $anchorHit.Count -gt 0) {
  $fire = $true
  $anchorMatched = $true
}

if (-not $fire) {
  exit 0
}

# .claude/state/ ディレクトリ作成 (初回時)
$stateDir = ".claude/state"
if (-not (Test-Path $stateDir)) {
  New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
}

# flag 書込
$detected = @()
$detected += $strongHit
$detected += $weakHit
$detected += $anchorHit
$detected = $detected | Select-Object -Unique

$now = [int][double]::Parse((Get-Date -UFormat %s))
$excerpt = if ($prompt.Length -gt 120) { $prompt.Substring(0, 120) } else { $prompt }

$flagObj = @{
  ts = $now
  detected_keywords = $detected
  anchor_matched = $anchorMatched
  prompt_excerpt = $excerpt
}
$flagJson = $flagObj | ConvertTo-Json -Compress -Depth 5
Set-Content -Path ".claude/state/design-phase.json" -Value $flagJson -Encoding UTF8

# additionalContext 注入文 (固定文面、R7 修正版)
$kwList = $detected -join ', '

$msg = @"
=== DESIGN PHASE DETECTED (フック強制注入、R7 設計前提棚卸しプロトコル) ===

検知キーワード: $kwList
flag 書込: .claude/state/design-phase.json (ts=$now, 有効 24h)

このターンは「設計相談段階」(段階 A)。応答内で必ず以下を実行:

1. 今回の論点を明確化

2. 今回の論点に必要な資料を選び、選定理由を明記して Read する
   候補 (固定 Read ではない、論点別の参照原則):
   - 全論点共通: CLAUDE.md R6/R7 / CLAUDE_failures.md
   - 機能・要件論点: REQUIREMENTS_v4.md
   - 進行・凍結論点: ROADMAP_v4.md
   - 着手タスク: HANDOFF_v4_S<N>.md
   - UI/UX 論点: WIREFRAMES_v4.md / DESIGN_SYSTEM_v4.md
   - 保存/同期/信頼性論点: src/core/02_firebase.js / src/core/03_storage.js / Firestore 関連
   - 過去発言: MEMORY 該当エントリ (feedback_*.md / reference_*.md / user_*.md)

3. 12 項目棚卸しを応答内に書く (§1-12)

4. §5 で未確認前提を「未確認仮説」と明示 (事実扱い禁止)

5. §6-8 で複数パターンを検討、対象外には理由

6. §10 でユーザー確認事項を提示

応答冒頭チェックリスト (手続き型、固定ファイル名チェックではない):
□ 今回読む資料を選定した
□ 選定理由を書いた
□ 実際に Read した
□ 各資料 2 行サマリーを書いた

DESIGN_LOG.md について (2 段階):
- 段階 A (= 今、相談段階): 推奨だが必須ではない。応答内棚卸しで足りる
- 段階 B (= 実装着手前): 必須。src/** / build.ps1 / 高リスク語パスを編集する時、
  当日見出し + §1/§5/§11/§12/§14 の見出しが (当日エントリ範囲内に) 無ければ file-guard が ask で止める

8 禁止 (CLAUDE.md R7):
1. 未確認前提を事実扱い  2. 1 経路/状態に決め打ち
3. 訂正を逆方向決め打ちに置換  4. 資料未読で設計案
5. 「理解しました」で即実装  6. 複数パターンを 1 つに圧縮
7. dev mode を実戦保証扱い  8. 同一コードパスで検証省略

ストップサイン (違反察知時の自己停止):
- 「ご指摘の通りです」直後の実装トーン移行
- 「同趣旨だから」「便宜上」での項目統合
- ユーザー訂正直後の逆方向決め打ち
- DESIGN_LOG §5/§13 表の空欄チェック埋め
"@

# 出力
$output = @{
  hookSpecificOutput = @{
    hookEventName = "UserPromptSubmit"
    additionalContext = $msg
  }
} | ConvertTo-Json -Compress -Depth 10

Write-Output $output

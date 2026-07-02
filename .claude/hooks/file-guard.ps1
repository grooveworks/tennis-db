# PreToolUse hook (Edit/Write matcher): 重要ファイルの編集を検知して承認を強制
# 引っかかったら permissionDecision: "ask" を返してユーザー承認 prompt を出す
# Claude が独断で重要ファイルを編集できなくする
# 2026-05-05 Stage 番号事故を受けて新設

$inputJson = [Console]::In.ReadToEnd()
try {
  $obj = $inputJson | ConvertFrom-Json
} catch {
  # 入力が JSON でない場合はスルー (ブロックしない)
  exit 0
}

$file = ""
if ($obj.tool_input.file_path) {
  $file = $obj.tool_input.file_path
}

if (-not $file) {
  exit 0
}

# 2026-07-01: 新規 preview_*.html (ワークシート/ツール) 作成を検知して現状調査を確認 (再発明防止)
$writeContent = ""
if ($obj.tool_input.content) { $writeContent = $obj.tool_input.content }
if ($writeContent -and ($file -match 'preview_.*\.html$') -and (-not (Test-Path $file))) {
  $reasonCS = "新規プレビュー/ツール ($file) を作成しようとしています。アプリに同等の既存機能が無いか (src/ui, src/core/05_schema.js, src/domain, 実データ .claude/data-latest.json) を grep/Read で調べ、現状を報告しましたか? 再発明 (例: 主観8軸ワークシート) 防止のため、未調査なら止まって現状調査を先にしてください。(memory: feedback_investigate_current_app_first)"
  $outputCS = @{
    hookSpecificOutput = @{
      hookEventName = "PreToolUse"
      permissionDecision = "ask"
      permissionDecisionReason = $reasonCS
    }
  } | ConvertTo-Json -Compress -Depth 10
  Write-Output $outputCS
  exit 0
}

# 監視対象ファイル (パスに含まれていればマッチ)
$criticalPatterns = @(
  '01_constants.js',   # APP_VERSION 含む
  'build.ps1',         # ビルドスクリプト (データ破壊事故 2026-05-03 関連)
  'settings.json',     # claude 設定
  'settings.local.json',
  'session-start.ps1', # フック自体
  'file-guard.ps1',
  'git-guard.ps1',
  'user-keyword-guard.ps1',
  'design-phase-guard.ps1',  # R7 設計フェーズ hook 自体 (2026-05-17 追加)
  'current-state-guard.ps1', # 現状調査ゲート hook 自体 (2026-07-01 追加)
  'CLAUDE.md',               # 行動規範本体 (R7 追加に伴い保護、2026-05-17)
  'CLAUDE_failures.md'       # 失敗パターン記録 (R7 / F16 追加に伴い保護、2026-05-17)
)

$isCritical = $false
$matched = ""
foreach ($p in $criticalPatterns) {
  if ($file -like "*$p*") {
    $isCritical = $true
    $matched = $p
    break
  }
}

if (-not $isCritical) {
  # R7 設計フェーズ flag 検知 (2026-05-17 追加、当日エントリ範囲限定)
  # critical 通過後、設計フェーズ flag が有効なら設計対象パスをチェック
  $flagPath = ".claude/state/design-phase.json"
  $flagActive = $false
  $flagDetected = @()
  if (Test-Path $flagPath) {
    try {
      $flag = Get-Content $flagPath -Raw -Encoding UTF8 | ConvertFrom-Json
      $now = [int][double]::Parse((Get-Date -UFormat %s))
      if (($now - $flag.ts) -lt 86400) {  # 24h
        $flagActive = $true
        $flagDetected = $flag.detected_keywords
      }
    } catch { }
  }

  if (-not $flagActive) {
    exit 0
  }

  # 設計対象 path 判定 (src/** / _head.html / build.ps1)
  $designTargets = @(
    'src[\\/].*\.jsx?$',
    'src[\\/]_head\.html$',
    'build\.ps1$'
  )
  # 高リスク語パス (Firestore / save / sync 系)
  $highRiskWords = @(
    'Firestore','save','sync','localStorage','IndexedDB',
    'offline','loadHeavy','__TennisDBCore','__TennisDBHeavy',
    'pushState','popstate','history\.back',
    'MatchEditModal','GameTracker','SessionEditView',
    'TournamentEditForm','PracticeEditForm'
  )

  $matchesDesign = $false
  foreach ($pat in $designTargets) {
    if ($file -match $pat) { $matchesDesign = $true; break }
  }
  if (-not $matchesDesign) {
    foreach ($word in $highRiskWords) {
      if ($file -match $word) { $matchesDesign = $true; break }
    }
  }

  if (-not $matchesDesign) {
    exit 0
  }

  # Phase 1: DESIGN_LOG.md 当日エントリ範囲内に必須セクション 5 件があるか確認
  $today = Get-Date -Format "yyyy-MM-dd"
  $designLogPath = "DESIGN_LOG.md"
  $missingSections = @()

  if (-not (Test-Path $designLogPath)) {
    $missingSections += "DESIGN_LOG.md 自体が存在しない"
  } else {
    $log = Get-Content $designLogPath -Raw -Encoding UTF8
    $todayPattern = "##\s+$today"
    $todayMatch = [regex]::Match($log, $todayPattern)

    if (-not $todayMatch.Success) {
      $missingSections += "## $today (当日見出し)"
    } else {
      # 当日エントリの範囲を切り出し (## YYYY-MM-DD から次の ## 見出し直前まで、または EOF)
      $startIdx = $todayMatch.Index + $todayMatch.Length
      $afterStart = $log.Substring($startIdx)
      $nextH2 = [regex]::Match($afterStart, "(?m)^##\s+")
      if ($nextH2.Success) {
        $todayEntry = $afterStart.Substring(0, $nextH2.Index)
      } else {
        $todayEntry = $afterStart
      }

      # 当日エントリ範囲内に限定して必須セクション存在確認
      if (-not ($todayEntry -match "###\s+§1\."))  { $missingSections += "### §1. (当日エントリ内)" }
      if (-not ($todayEntry -match "###\s+§5\."))  { $missingSections += "### §5. (当日エントリ内)" }
      if (-not ($todayEntry -match "###\s+§11\.")) { $missingSections += "### §11. (当日エントリ内)" }
      if (-not ($todayEntry -match "###\s+§12\.")) { $missingSections += "### §12. (当日エントリ内)" }
      if (-not ($todayEntry -match "###\s+§14\.")) { $missingSections += "### §14. (当日エントリ内)" }
    }
  }

  if ($missingSections.Count -eq 0) {
    exit 0
  }

  $missingStr = $missingSections -join " / "
  $kwStr = $flagDetected -join ","
  $r7Reason = "R7 設計フェーズ flag が active (検知: $kwStr) で、設計対象パス $file を編集しようとしていますが、DESIGN_LOG.md 当日エントリに必須要素が不足: $missingStr。R7 プロトコル §1-15 を当日エントリ内に埋めてから着手してください (Phase 1: 当日見出し + §1/§5/§11/§12/§14 見出し存在チェック、当日エントリ範囲限定)。"

  $r7Output = @{
    hookSpecificOutput = @{
      hookEventName = "PreToolUse"
      permissionDecision = "ask"
      permissionDecisionReason = $r7Reason
    }
  } | ConvertTo-Json -Compress -Depth 10
  Write-Output $r7Output
  exit 0
}

# Stage 番号変更を特に検知
$newStr = ""
if ($obj.tool_input.new_string) { $newStr = $obj.tool_input.new_string }
if ($obj.tool_input.content) { $newStr = $obj.tool_input.content }

$isStageChange = $newStr -match 'APP_VERSION\s*=\s*"[\d\.]+-S[\d\.]+'

$reason = "重要ファイル編集を検知: $matched. ユーザーに変更内容と理由を提示して明示承認を取りましたか? まだなら一度止まって確認してください。"

if ($isStageChange) {
  $reason = "APP_VERSION (Stage 番号 -S<N> を含む) の変更を検知。Stage 番号の独断変更は禁止 (memory: feedback_stage_numbering_2026_05_05)。ユーザーに「Stage 番号を変更します、何番にしますか?」と必ず確認してから進めてください。"
}

$output = @{
  hookSpecificOutput = @{
    hookEventName = "PreToolUse"
    permissionDecision = "ask"
    permissionDecisionReason = $reason
  }
} | ConvertTo-Json -Compress -Depth 10

Write-Output $output

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

# 監視対象ファイル (パスに含まれていればマッチ)
$criticalPatterns = @(
  '01_constants.js',   # APP_VERSION 含む
  'build.ps1',         # ビルドスクリプト (データ破壊事故 2026-05-03 関連)
  'settings.json',     # claude 設定
  'settings.local.json',
  'session-start.ps1', # フック自体
  'file-guard.ps1',
  'git-guard.ps1',
  'user-keyword-guard.ps1'
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

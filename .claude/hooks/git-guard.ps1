# PreToolUse hook (Bash matcher): git commit / git push を検知して承認を強制
# 引っかかったら permissionDecision: "ask" を返す → harness がユーザー承認 prompt を出す
# Claude が独断で commit/push できなくする
# 2026-05-05 push 規律違反 (12 commit を独断で push) を受けて新設

$inputJson = [Console]::In.ReadToEnd()
try {
  $obj = $inputJson | ConvertFrom-Json
} catch {
  exit 0
}

$cmd = ""
if ($obj.tool_input.command) {
  $cmd = $obj.tool_input.command
}

if (-not $cmd) {
  exit 0
}

# git commit / push / reset --hard / push --force を検知
$dangerous = $false
$kind = ""

# 順序重要: より特殊なパターンを先に判定
if ($cmd -match '\bgit\s+push\s+.*(--force|--force-with-lease|\s-f\b)') {
  $dangerous = $true
  $kind = "git push --force (破壊的・履歴上書き)"
}
elseif ($cmd -match '\bgit\s+reset\s+--hard\b') {
  $dangerous = $true
  $kind = "git reset --hard (破壊的)"
}
elseif ($cmd -match '\bgit\s+commit\b') {
  $dangerous = $true
  $kind = "git commit"
}
elseif ($cmd -match '\bgit\s+push\b') {
  $dangerous = $true
  $kind = "git push"
}

if (-not $dangerous) {
  exit 0
}

# S17 段階 2-4 後 (= 2026-05-12 ChatGPT 補足): git push の場合、VERIFY_LOG.md 必須項目チェックを追加
# 不足なら reason に追記して、Claude Code 側でも「VERIFY_LOG.md 更新が必要」を意識させる
# (.git/hooks/pre-push で物理ブロックされるが、Claude Code 内でも事前に気付かせる = 二重防御)
$verifyHint = ""
if ($kind -eq "git push") {
  $verifyLogPath = Join-Path (Get-Location).Path "VERIFY_LOG.md"
  $verifyOK = $false
  if (Test-Path $verifyLogPath) {
    $content = Get-Content $verifyLogPath -Raw -Encoding UTF8
    if ($content -match "実画面検証: 済" -and $content -match "console error 0: 済") {
      $verifyOK = $true
    }
  }
  if (-not $verifyOK) {
    $verifyHint = " ⚠️ VERIFY_LOG.md の必須項目 (= 「実画面検証: 済」「console error 0: 済」) が不足しています。push 前に VERIFY_LOG.md を今回 push 内容で更新してください。.git/hooks/pre-push でも物理ブロックされます。"
  }
}

$reason = "$kind を検知。直近の user message に明示承認 (Y / OK / やれ / push して 等) はありましたか? memory ルール「push は確認してから」(feedback_push_confirmation) と「コミット粒度ルール」(feedback_commit_granularity) を順守。承認が無ければユーザーに確認してから実行してください。${verifyHint}"

$output = @{
  hookSpecificOutput = @{
    hookEventName = "PreToolUse"
    permissionDecision = "ask"
    permissionDecisionReason = $reason
  }
} | ConvertTo-Json -Compress -Depth 10

Write-Output $output

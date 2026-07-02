# UserPromptSubmit hook: 「作る/実装/搭載」意図を検知して『現状調査を先にやれ・再発明禁止』を強制注入
# Claude が最終目的=アプリ実装の現状を調べずに孤立して作る癖を物理的に縛る
# 2026-07-01 新設 (主観8軸の入力ワークシートを、アプリの既存試打評価を調べず新規作成した失敗を受けて)
# 仕様: design-phase-guard.ps1 と同型 (UserPromptSubmit + additionalContext 注入)

$inputJson = [Console]::In.ReadToEnd()
try {
  $obj = $inputJson | ConvertFrom-Json
} catch {
  exit 0
}

$prompt = ""
if ($obj.user_prompt) { $prompt = $obj.user_prompt }
elseif ($obj.prompt)  { $prompt = $obj.prompt }
elseif ($obj.message) { $prompt = $obj.message }

if (-not $prompt) {
  exit 0
}

# 「作る/変える」意図キーワード (単独で発火)
$buildKeywords = @(
  '作って','作成','実装','搭載','組み込','組込','新しく','新規','作り直',
  '機能','画面','ツール','ワークシート','プレビュー','コンポーネント'
)

function Test-KwInPrompt($kw, $text) {
  $isAscii = $true
  foreach ($ch in $kw.ToCharArray()) {
    if ([int]$ch -gt 127) { $isAscii = $false; break }
  }
  if ($isAscii) {
    return $text.ToLower().Contains($kw.ToLower())
  } else {
    return $text.Contains($kw)
  }
}

$hit = @()
foreach ($kw in $buildKeywords) {
  if (Test-KwInPrompt $kw $prompt) { $hit += $kw }
}

if ($hit.Count -eq 0) {
  exit 0
}

$kwList = ($hit | Select-Object -Unique) -join ', '

$msg = @"
=== 現状調査ゲート (フック強制注入 2026-07-01) ===
検知: $kwList

作る/変える/提案の前に、必ず『アプリの現状』を調べて事実で報告せよ。再発明禁止。

1. 対象機能がアプリに既にあるか、既存コード (src/ui, src/core/05_schema.js, src/domain) と実データ (.claude/data-latest.json) を grep/Read で調べる。
2. 「今どうなっているか」を事実として報告してから動く。孤立した新規作成に逃げない。
3. 既存があれば再発明せず、活用/拡張する。

この癖の証拠 (2026-07-01): 主観8軸の入力ワークシートを新規作成したが、アプリの試打評価 (05_schema.js:84 の rating 9軸 / TrialEditForm) に既に存在していた。
(memory: feedback_investigate_current_app_first)
"@

$output = @{
  hookSpecificOutput = @{
    hookEventName = "UserPromptSubmit"
    additionalContext = $msg
  }
} | ConvertTo-Json -Compress -Depth 10

Write-Output $output

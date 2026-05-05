# UserPromptSubmit hook: ユーザー発言にキーワードが含まれたら警告コンテキストを注入
# Claude が「都合よく解釈」「軽視」しないように、応答生成の前に強制的に警告を読ませる
# 2026-05-05 ユーザー軽視パターン (S16 と何度言われても無視) を受けて新設

$inputJson = [Console]::In.ReadToEnd()
try {
  $obj = $inputJson | ConvertFrom-Json
} catch {
  exit 0
}

# user prompt のフィールド名は環境により異なる、複数を試す
$prompt = ""
if ($obj.user_prompt) { $prompt = $obj.user_prompt }
elseif ($obj.prompt)  { $prompt = $obj.prompt }
elseif ($obj.message) { $prompt = $obj.message }

if (-not $prompt) {
  exit 0
}

# 警告キーワード (これが出たら user は強い不満 / 訂正 / 過去発言の強調をしている)
$alertPatterns = @(
  '違う',
  'やめて',
  'やめろ',
  '戻して',
  '戻せ',
  '無視',
  '何度も',
  'ちゃんと',
  '勝手に',
  '都合',
  '馬鹿',
  'バカ',
  '聞いてない',
  '聞いてねえ',
  '言ったろ',
  '言っただろ',
  '前にも',
  '何回',
  'うんざり',
  'マジで',
  'やばい',
  'イライラ'
)

$found = @()
foreach ($p in $alertPatterns) {
  if ($prompt -match $p) {
    $found += $p
  }
}

if ($found.Count -eq 0) {
  exit 0
}

$kwList = $found -join ', '

$msg = @"
=== USER ALERT KEYWORDS DETECTED (フックから強制注入) ===

検知キーワード: $kwList

ユーザーは強い不満・訂正・過去発言の強調・指示無視への抗議のいずれかを発しています。
以下を応答前に必ず実行してください:

1. **即停止**: 反射的に「対応します」と書き始めない
2. **何が起きたか正確に把握**: ユーザーが何を訴えているのか、字面通り読む (都合よく解釈しない)
3. **過去ログ確認**: 自分がユーザーの指示を軽視・無視・都合解釈していないか自己点検
4. **責任主語**: 失敗を外部要因にしない、「私が ◯◯ した」で書く (CLAUDE.md R5)
5. **謝罪は単独で**: 謝罪する場合は次アクションと混ぜない (memory: feedback_apology_discipline)
6. **不利情報を自分から開示**: ユーザーに問い詰められる前に、自分のミス動機・限界を白状する

このパターンを「一回限り」として処理しない。自分の構造的欠陥 (発言軽視・自己保身・責任回避) を疑え。
"@

$output = @{
  hookSpecificOutput = @{
    hookEventName = "UserPromptSubmit"
    additionalContext = $msg
  }
} | ConvertTo-Json -Compress -Depth 10

Write-Output $output

# SessionStart hook: 毎セッション開始時に重要コンテキストを Claude のモデル context に強制注入
# Claude が読み飛ばせないように systemMessage と additionalContext の両方で出す
# 2026-05-05 Stage 番号事故 (-S18 を独断継承して 12 push) を受けて新設

$msg = @"
=== CRITICAL CONTEXT (フック強制表示・読み飛ばし禁止) ===

[Stage 番号ルール — 独断変更禁止]
- src/core/01_constants.js の APP_VERSION (-S<N> suffix を含む) を独断で変更/継承しない
- 新しい push 直前に必ずユーザーに「Stage 番号は何にしますか?」と確認
- 過去 commit message の -S18 系には、ユーザー認識では S16 として進んでいた作業が含まれる (2026-05-05 事故)
- HANDOFF / ROADMAP / DECISIONS で Stage 番号が出てきたら、ユーザー認識と git 履歴の乖離を疑う

[ユーザー発言軽視禁止]
- ユーザーが「違う / やめて / 戻して / 無視するな / 何度も言った / ちゃんと / 勝手に」等を発したら即停止
- 過去の指示を「都合よく解釈」しない、字面通り受ける
- 「一回限りのミス」として処理せず、自分の構造的パターン (発言軽視・自己保身) を疑う

[コミット/プッシュ規律]
- git commit / push を実行する前に、直近の user message に明示承認 (Y / OK / やれ / push して 等) があるか確認
- 無ければ「commit して良いですか?」とユーザーに先に確認

[重要ファイル編集の承認義務]
- src/core/01_constants.js (APP_VERSION 含む)
- build.ps1
- .claude/settings.json
- .claude/hooks/*.ps1
- 編集前に必ずユーザーに変更内容と理由を提示して明示承認を取る

[応答時の自己点検]
- 自分に不利な情報 (限界・欠陥・サボった事実) を自分から開示しているか?
- ユーザーに技術判断を投げていないか?
- 「次は気をつける」で終わらせず、外部対策 (フック・テスト・lint) を提案しているか?
"@

# JSON 出力 (additionalContext で model に注入)
$output = @{
  hookSpecificOutput = @{
    hookEventName = "SessionStart"
    additionalContext = $msg
  }
} | ConvertTo-Json -Compress -Depth 10

Write-Output $output

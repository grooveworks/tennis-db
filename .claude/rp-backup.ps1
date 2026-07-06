# Racketpedia 収集データのバックアップ (宝の山の保全)
# out/ (データベース一式) + cache/inbox/ (未解析の原文) を日付つき zip に保存。
# 保存先: D:\Downloads\racketpedia_backup\  (公開リポジトリの外・ローカルのみ)
$ErrorActionPreference = 'Stop'
$repo = "D:\Downloads\Claude\tennis"
$dest = "D:\Downloads\racketpedia_backup"
New-Item -ItemType Directory -Force $dest | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmm'
$zip = Join-Path $dest "racketpedia_data_$stamp.zip"
$targets = @("$repo\gear\racketpedia\out", "$repo\gear\racketpedia\cache\inbox") | Where-Object { Test-Path $_ }
Compress-Archive -Path $targets -DestinationPath $zip -Force
$size = [Math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "バックアップ完了: $zip ($size MB)"
# 30世代を超えた古い zip は削除
Get-ChildItem $dest -Filter 'racketpedia_data_*.zip' | Sort-Object Name -Descending | Select-Object -Skip 30 | Remove-Item -Force
Write-Host ("保持世代: " + (Get-ChildItem $dest -Filter 'racketpedia_data_*.zip').Count)
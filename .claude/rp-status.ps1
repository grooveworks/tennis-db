# Racketpedia 取込の状態確認 (受け口・ログ末尾・直近取込) — 読み取りのみ
$ErrorActionPreference = 'Continue'
Set-Location "D:\Downloads\Claude\tennis"
try {
  $r = Invoke-WebRequest "http://127.0.0.1:8765/" -TimeoutSec 4 -UseBasicParsing
  Write-Host "受け口: 稼働中"
} catch { Write-Host "受け口: 停止 ($($_.Exception.Message))" }
Write-Host ""
Write-Host "=== ログ末尾 ==="
if (Test-Path racketpedia\listener.log) { Get-Content racketpedia\listener.log -Tail 8 } else { Write-Host "(ログなし)" }
Write-Host ""
Write-Host "=== 直近取込 上位5 ==="
& python -c "import json,io,sys; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8'); d=json.load(open('racketpedia/out/store_string.json',encoding='utf-8')); rows=sorted(d.values(), key=lambda r: r.get('last_captured') or '', reverse=True)[:5]; [print(' ', r.get('last_captured'), r.get('slug'), '|', r.get('lab_data')) for r in rows]"

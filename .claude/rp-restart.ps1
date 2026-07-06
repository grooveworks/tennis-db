# Racketpedia 受け口の再起動 + 健全性チェック (許可済みパス .claude/*.ps1 から実行)
$ErrorActionPreference = 'Continue'
Set-Location "D:\Downloads\Claude\tennis"
Get-Process pythonw -ErrorAction SilentlyContinue | Where-Object {
  try { (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine -match 'listener\.py' } catch { $false }
} | Stop-Process -Force
Start-Sleep -Seconds 1
$exew = "C:\Users\yusuke-grooveworks\AppData\Local\Python\pythoncore-3.14-64\pythonw.exe"
$null = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine = "`"$exew`" gear\racketpedia\listener.py"; CurrentDirectory = "D:\Downloads\Claude\tennis"
}
Start-Sleep -Seconds 3
try {
  $r = Invoke-WebRequest "http://127.0.0.1:8765/" -TimeoutSec 5 -UseBasicParsing
  Write-Host "受け口 再起動OK: $($r.Content)"
} catch {
  Write-Host "再起動失敗: $($_.Exception.Message)"
  if (Test-Path gear\racketpedia\listener.log) { Get-Content gear\racketpedia\listener.log -Tail 8 }
}

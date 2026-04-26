$port = 8080
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$listener = New-Object System.Net.HttpListener

# 管理者で起動すれば LAN 公開 (スマホ等からアクセス可)、通常起動なら localhost のみ
$lanMode = $false
try {
    $listener.Prefixes.Add("http://+:$port/")
    $listener.Start()
    $lanMode = $true
} catch {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

Write-Host "Serving $root on:" -ForegroundColor Green
Write-Host "  PC: http://localhost:$port" -ForegroundColor Cyan
if ($lanMode) {
    $lanIPs = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.PrefixOrigin -eq 'Dhcp' -or $_.PrefixOrigin -eq 'Manual' } | Select-Object -ExpandProperty IPAddress)
    foreach ($ip in $lanIPs) {
        if ($ip -ne '127.0.0.1' -and -not $ip.StartsWith('169.254.')) {
            Write-Host "  Phone (same WiFi): http://${ip}:$port" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  (LAN/phone: 管理者として PowerShell を起動すると有効化)" -ForegroundColor DarkYellow
}

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css'
    '.js'   = 'application/javascript'
    '.json' = 'application/json'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.csv'  = 'text/csv'
}
while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
        $method = $ctx.Request.HttpMethod
        $path = $ctx.Request.Url.LocalPath
        if ($path -eq '/') { $path = '/v3/index.html' }
        $filePath = Join-Path $root ($path -replace '/', '\')
        $res = $ctx.Response
        try {
            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $res.ContentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $res.ContentLength64 = $bytes.Length
                if ($method -ne 'HEAD') {
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $res.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
                $res.ContentLength64 = $msg.Length
                if ($method -ne 'HEAD') {
                    $res.OutputStream.Write($msg, 0, $msg.Length)
                }
            }
        } catch {
            Write-Warning "Request error for $path : $($_.Exception.Message)"
        } finally {
            try { $res.Close() } catch {}
        }
    } catch {
        Write-Warning "Server loop error: $($_.Exception.Message)"
    }
}

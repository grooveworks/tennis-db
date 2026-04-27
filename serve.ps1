# Tennis DB local dev server.
# Port resolution:
#   1) Use $env:PORT if a valid number (preview_start integration).
#   2) Else try 8080 (standalone default).
#   3) If 8080 is busy, fall back to an OS-assigned free port.

function Get-FreePort {
    $t = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $t.Start()
    $p = $t.LocalEndpoint.Port
    $t.Stop()
    return $p
}

$port = $null
if ($env:PORT -match '^[1-9]\d{0,4}$') { $port = [int]$env:PORT }
if (-not $port) { $port = 8080 }

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$listener = $null
$lanMode = $false
$started = $false

# Try http://+:$port (LAN visible, requires admin).
try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://+:$port/")
    $listener.Start()
    $lanMode = $true
    $started = $true
} catch { $listener = $null }

# Fallback: http://localhost:$port (no admin needed).
if (-not $started) {
    try {
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add("http://localhost:$port/")
        $listener.Start()
        $started = $true
    } catch { $listener = $null }
}

# Fallback: pick a free port if the requested one is taken.
if (-not $started) {
    $port = Get-FreePort
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
    $started = $true
}

Write-Host "Serving $root on:" -ForegroundColor Green
Write-Host "  Local: http://localhost:$port" -ForegroundColor Cyan
if ($lanMode) {
    $lanIPs = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.PrefixOrigin -eq 'Dhcp' -or $_.PrefixOrigin -eq 'Manual' } | Select-Object -ExpandProperty IPAddress)
    foreach ($ip in $lanIPs) {
        if ($ip -ne '127.0.0.1' -and -not $ip.StartsWith('169.254.')) {
            Write-Host "  Phone (same WiFi): http://${ip}:$port" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  (LAN/phone: run PowerShell as administrator to enable)" -ForegroundColor DarkYellow
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

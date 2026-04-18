# Tennis DB v4 build script
# .NET API + StringBuilder で確実に連結、BOM 無し UTF-8 で書き込み

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$srcDir = Join-Path $root "src"
$outDir = Join-Path $root "v4"
$out = Join-Path $outDir "index.html"

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$sb = New-Object System.Text.StringBuilder

function AppendFromFile($path) {
  if ([System.IO.File]::Exists($path)) {
    $content = [System.IO.File]::ReadAllText($path)
    [void]$sb.Append($content)
  }
}

function AppendLine($text) {
  [void]$sb.AppendLine($text)
}

# 1. _head.html
AppendFromFile (Join-Path $srcDir "_head.html")

# 2. core/
$coreDir = Join-Path $srcDir "core"
if (Test-Path $coreDir) {
  Get-ChildItem $coreDir -Filter *.js | Sort-Object Name | ForEach-Object {
    AppendLine "// === src/core/$($_.Name) ==="
    AppendFromFile $_.FullName
    AppendLine ""
  }
}

# 3. domain/
$domainDir = Join-Path $srcDir "domain"
if (Test-Path $domainDir) {
  Get-ChildItem $domainDir -Filter *.js | Sort-Object Name | ForEach-Object {
    AppendLine "// === src/domain/$($_.Name) ==="
    AppendFromFile $_.FullName
    AppendLine ""
  }
}

# 4. ui/
$uiDir = Join-Path $srcDir "ui"
if (Test-Path $uiDir) {
  Get-ChildItem $uiDir -Recurse -Filter *.jsx | Sort-Object FullName | ForEach-Object {
    $rel = $_.FullName.Substring($srcDir.Length + 1).Replace("\", "/")
    AppendLine "// === src/$rel ==="
    AppendFromFile $_.FullName
    AppendLine ""
  }
}

# 5. app.jsx
AppendLine "// === src/app.jsx ==="
AppendFromFile (Join-Path $srcDir "app.jsx")
AppendLine ""

# 6. _tail.html
AppendFromFile (Join-Path $srcDir "_tail.html")

# BOM 無し UTF-8 で書き込み
$output = $sb.ToString()
$encoding = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($out, $output, $encoding)

$size = (Get-Item $out).Length
Write-Host "Built: $out"
Write-Host "Size: $size bytes"

# Tennis DB v4 build script
# S17 build 修繕 (2026-05-09): ブラウザ側 Babel transpile を廃止、esbuild で事前 transpile
#
# 経緯: Phase 2 で v4/index.html が 911 KB に到達 → iPhone Safari/Chrome で 5 分以上ロード
#       原因は inline `<script type="text/babel">` を @babel/standalone でブラウザ側 transpile (iPhone WebKit JIT 制限)
#       修繕: PC で事前に esbuild が JSX→JS 変換 + minify 済 JS を inline 埋め込み、ブラウザは直接実行
#
# 流れ:
#   1. src/ 全 JS/JSX を順序連結 (core → domain → ui → app.jsx) → 一時 .jsx
#   2. esbuild で JSX→JS transpile + minify (React global 前提、target=es2017)
#   3. _head.html (Babel CDN なし、`<script>` のみ) + transpile 済 JS + _tail.html を結合 → v4/index.html

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$srcDir = Join-Path $root "src"
$outDir = Join-Path $root "v4"
$out = Join-Path $outDir "index.html"

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# ── Step 1: src/ 連結 (現方式と同じ順序)
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

# core/ (sort by name)
$coreDir = Join-Path $srcDir "core"
if (Test-Path $coreDir) {
  Get-ChildItem $coreDir -Filter *.js | Sort-Object Name | ForEach-Object {
    AppendLine "// === src/core/$($_.Name) ==="
    AppendFromFile $_.FullName
    AppendLine ""
  }
}

# domain/ (sort by name)
$domainDir = Join-Path $srcDir "domain"
if (Test-Path $domainDir) {
  Get-ChildItem $domainDir -Filter *.js | Sort-Object Name | ForEach-Object {
    AppendLine "// === src/domain/$($_.Name) ==="
    AppendFromFile $_.FullName
    AppendLine ""
  }
}

# ui/ (recursive, sort by full path)
$uiDir = Join-Path $srcDir "ui"
if (Test-Path $uiDir) {
  Get-ChildItem $uiDir -Recurse -Filter *.jsx | Sort-Object FullName | ForEach-Object {
    $rel = $_.FullName.Substring($srcDir.Length + 1).Replace("\", "/")
    AppendLine "// === src/$rel ==="
    AppendFromFile $_.FullName
    AppendLine ""
  }
}

# app.jsx
AppendLine "// === src/app.jsx ==="
AppendFromFile (Join-Path $srcDir "app.jsx")
AppendLine ""

# ── Step 2: 一時ファイルに書き出して esbuild に渡す
$tmpDir = Join-Path $root ".build_tmp"
if (-not (Test-Path $tmpDir)) { New-Item -ItemType Directory -Path $tmpDir | Out-Null }
$tmpJsx = Join-Path $tmpDir "combined.jsx"
$tmpOut = Join-Path $tmpDir "bundled.js"
$encoding = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tmpJsx, $sb.ToString(), $encoding)

# ── Step 3: esbuild で JSX→JS transpile + minify
$npxPath = "C:\Program Files\nodejs\npx.cmd"
if (-not (Test-Path $npxPath)) {
  Write-Error "npx not found at $npxPath"
  exit 1
}

Write-Host "Running esbuild..."
& $npxPath --yes esbuild $tmpJsx `
  "--jsx-factory=React.createElement" `
  "--jsx-fragment=React.Fragment" `
  --target=es2017 `
  --minify `
  --keep-names `
  --outfile=$tmpOut `
  --log-level=warning

if ($LASTEXITCODE -ne 0) {
  Write-Error "esbuild failed with exit code $LASTEXITCODE"
  exit 1
}

$transpiledJs = [System.IO.File]::ReadAllText($tmpOut)
$transpiledSize = $transpiledJs.Length

# ── Step 4: HTML 結合 → v4/index.html
$headHtml = [System.IO.File]::ReadAllText((Join-Path $srcDir "_head.html"))
$tailHtml = [System.IO.File]::ReadAllText((Join-Path $srcDir "_tail.html"))
$finalHtml = $headHtml + $transpiledJs + "`n" + $tailHtml

[System.IO.File]::WriteAllText($out, $finalHtml, $encoding)

# ── Step 5: クリーンアップ + 結果出力
Remove-Item $tmpJsx -ErrorAction SilentlyContinue
Remove-Item $tmpOut -ErrorAction SilentlyContinue

$size = (Get-Item $out).Length
Write-Host "Built: $out"
Write-Host "Size: $size bytes (transpiled+minified by esbuild)"
Write-Host "Transpiled JS only: $transpiledSize bytes"

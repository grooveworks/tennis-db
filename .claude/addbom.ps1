param([string]$path = 'D:/Downloads/Claude/tennis/.claude/extract_gcal.ps1')
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$utf8bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($path, $content, $utf8bom)
Write-Host "BOM added"

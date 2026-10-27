param([ValidateRange(1024,65535)][int]$Port = 8787)
$ErrorActionPreference = 'Stop'
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $runtimeRoot = Join-Path $repositoryRoot '.build\node-runtime'
    $runtime = Get-ChildItem -LiteralPath $runtimeRoot -Directory -Filter 'node-v24*-win-x64' -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
    if (-not $runtime) { throw 'Node.js 24 installieren und das Terminal danach neu starten.' }
    $env:Path = $runtime.FullName + ';' + $env:Path
}
Push-Location -LiteralPath $PSScriptRoot
try {
    if (-not (Test-Path -LiteralPath 'node_modules\wrangler')) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Installation fehlgeschlagen.' }
    }
    & npm.cmd run prepare:demo
    if ($LASTEXITCODE -ne 0) { throw 'Demo konnte nicht vorbereitet werden.' }
    & npm.cmd run admin -- init
    if ($LASTEXITCODE -ne 0) { throw 'Administration konnte nicht vorbereitet werden.' }
    Write-Host "Portal: http://127.0.0.1:$Port"
    Write-Host 'Zugaenge im zweiten Terminal erzeugen und importieren; siehe README.md.'
    & npm.cmd run dev -- --port $Port
} finally { Pop-Location }

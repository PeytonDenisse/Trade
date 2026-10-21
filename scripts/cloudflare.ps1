# Run from PowerShell: .\scripts\cloudflare.ps1 login
# Uses the portable Node installation when present, otherwise Node from PATH.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$portableNode = Join-Path (Split-Path -Parent $projectRoot) '.local-tools\node_modules\node\bin\node.exe'
$nodeCommand = if (Test-Path -LiteralPath $portableNode) { $portableNode } else { 'node' }
Push-Location $projectRoot
try {
    & $nodeCommand --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js @args
    exit $LASTEXITCODE
} finally {
    Pop-Location
}

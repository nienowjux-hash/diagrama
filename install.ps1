$ErrorActionPreference = 'Stop'

$url = 'https://github.com/nienowjux-hash/diagrama/releases/latest/download/DiagramaSetup.exe'
$out = Join-Path $env:TEMP 'DiagramaSetup.exe'

Write-Host "Baixando o Diagrama..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $url -OutFile $out

Write-Host "Abrindo o instalador..." -ForegroundColor Cyan
Start-Process -FilePath $out -Wait

Write-Host "Pronto." -ForegroundColor Green

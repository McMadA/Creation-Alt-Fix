<#
.SYNOPSIS
    Creation+Alt+Fix - Registreert caf-backup:// URI Protocol Handler in Windows
.DESCRIPTION
    Maakt het mogelijk om de Desktop Backup Manager direct met 1 klik te starten
    vanuit het CRM Admin Dashboard in de browser (Chrome, Edge, Firefox).
#>

$protocolName = "caf-backup"
$workspaceDir = "C:\Users\Admin\Documents\GitHub\Websites\Creation-Alt-Fix"
$guiScript = Join-Path $workspaceDir "scripts\backup-hub-gui.ps1"
$command = "powershell.exe -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$guiScript`""

$regPath = "HKCU:\Software\Classes\$protocolName"
New-Item -Path $regPath -Force | Out-Null
Set-ItemProperty -Path $regPath -Name "(Default)" -Value "URL:Creation+Alt+Fix Backup Manager Protocol"
Set-ItemProperty -Path $regPath -Name "URL Protocol" -Value ""

$cmdPath = "$regPath\shell\open\command"
New-Item -Path $cmdPath -Force | Out-Null
Set-ItemProperty -Path $cmdPath -Name "(Default)" -Value $command

Write-Host "  [OK] Protocol '$protocolName`://' succesvol geregistreerd in Windows Registry (HKCU)!" -ForegroundColor Green
Write-Host "  Je kunt de Desktop Backup Manager nu direct vanuit de browser starten via caf-backup://open" -ForegroundColor Cyan

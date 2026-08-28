<#
.SYNOPSIS
    Creation+Alt+Fix - Automatische Vimexx Server Backup Taakplanner Insteller (TASK-811)

.DESCRIPTION
    Configureert de automatische periodieke back-up van alle 12 Vimexx domeinen, databases en mailboxen
    in de Windows Taakplanner (Task Scheduler).
#>

[CmdletBinding()]
param (
    [string]$Time = "21:30",
    [ValidateSet("Daily", "Weekly")]
    [string]$Frequency = "Daily",
    [string]$DayOfWeek = "Sunday",
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
$backupScript = Join-Path $scriptDir "backup-vimexx-server.ps1"
$taskName = "Vimexx-Server-Complete-Backup"

Write-Host "================================================================================" -ForegroundColor DarkCyan
Write-Host "  Creation+Alt+Fix - Windows Taakplanner Configuratie: Vimexx Server Backup" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor DarkCyan

if (-not (Test-Path $backupScript)) {
    Write-Host "  [FOUT] Kan backup-vimexx-server.ps1 niet vinden in $scriptDir!" -ForegroundColor Red
    exit 1
}

# Delete existing task if force or present
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "  Bestaande taak '$taskName' gevonden. Wordt bijgewerkt..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create Scheduled Task Action
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$backupScript`""

# Create Trigger (Daily or Weekly)
if ($Frequency -eq "Daily") {
    $trigger = New-ScheduledTaskTrigger -Daily -At $Time
    Write-Host "  Trigger: Dagelijks om $Time uur" -ForegroundColor Green
} else {
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DayOfWeek -At $Time
    Write-Host "  Trigger: Wekelijks op $DayOfWeek om $Time uur" -ForegroundColor Green
}

# Principal & Settings
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# Register the Scheduled Task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Automatische complete server backup van alle 12 domeinen, databases en mailboxen op Vimexx DirectAdmin (Creation+Alt+Fix TASK-811)." | Out-Null

Write-Host "`n  [OK] Windows Taakplanner taak '$taskName' succesvol geregistreerd!" -ForegroundColor Green
Write-Host "  De server backup zal automatisch $Frequency draaien om $Time uur." -ForegroundColor Cyan

<#
.SYNOPSIS
    Creation+Alt+Fix - Bureaublad Snelkoppeling Maker voor Backup Control Center
#>

$desktopPath = [System.Environment]::GetFolderPath("Desktop")
$workspaceDir = "C:\Users\Admin\Documents\GitHub\Websites\Creation-Alt-Fix"
$guiScript = Join-Path $workspaceDir "scripts\backup-hub-gui.ps1"

Write-Host "Bezig met aanmaken van snelkoppeling op bureaublad ($desktopPath)..." -ForegroundColor Cyan

# 1. Create Windows Shortcut (.lnk)
$wshShell = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktopPath "Creation+Alt+Fix Backup Manager.lnk"
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-STA -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$guiScript`""
$shortcut.WorkingDirectory = $workspaceDir
$shortcut.Description = "Creation+Alt+Fix - Backup & Server Control Center Dashboard"
$shortcut.IconLocation = "shell32.dll, 258" # Shield / server backup icon
$shortcut.Save()

Write-Host "  [OK] Snelkoppeling aangemaakt: $shortcutPath" -ForegroundColor Green

# 2. Create standalone .bat launcher
$batPath = Join-Path $desktopPath "Start_Backup_Manager.bat"
$batContent = @"
@echo off
title Creation+Alt+Fix Backup Manager
start "" powershell.exe -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "$guiScript"
exit
"@
$batContent | Out-File -FilePath $batPath -Encoding ASCII
Write-Host "  [OK] Batch launcher aangemaakt: $batPath" -ForegroundColor Green

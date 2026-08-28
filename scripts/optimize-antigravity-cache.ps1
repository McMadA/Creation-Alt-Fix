<#
.SYNOPSIS
    Optimalisatie- en compressie-tool voor Antigravity / Gemini cache en data.
.DESCRIPTION
    1. Analyseert de omvang van C:\Users\Admin\.gemini
    2. Verwijdert veilige tijdelijke browser cache (Chromium Cache & Code Cache)
    3. Ruimt optioneel oude browser subagent video-opnames (.webp) op
    4. Verwijdert overbodige oude backup-mappen
    5. Past transparante Windows NTFS-compressie toe op de data- en conversatiebestanden (bespaart 60-80% schijfruimte zonder verlies van werking)
#>

[CmdletBinding()]
param (
    [switch]$CleanBrowserCache = $true,
    [switch]$CleanOldRecordings = $true,
    [int]$RecordingsOlderThanDays = 7,
    [switch]$CleanOldBackups = $true,
    [switch]$ApplyNTFSCompression = $true
)

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Antigravity / Gemini Cache & Storage Optimizer " -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Cyan

$geminiPath = "$env:USERPROFILE\.gemini"
if (-not (Test-Path $geminiPath)) {
    Write-Warning "Gemini map niet gevonden op: $geminiPath"
    return
}

function Get-FolderSizeMB ([string]$path) {
    if (-not (Test-Path $path)) { return 0 }
    $measure = Get-ChildItem -Path $path -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
    if ($measure.Sum) { return [math]::Round($measure.Sum / 1MB, 2) }
    return 0
}

$initialSize = Get-FolderSizeMB $geminiPath
$initialGB = [math]::Round($initialSize / 1024, 2)
Write-Host "`nHuidige totale grootte van .gemini: $initialGB GB ($initialSize MB)" -ForegroundColor Yellow

# 1. Browser Cache Opruimen
if ($CleanBrowserCache) {
    Write-Host "`n[1/4] Tijdelijke Browser Cache opruimen..." -ForegroundColor White
    $browserCacheDirs = @(
        "$geminiPath\antigravity-browser-profile\Default\Cache",
        "$geminiPath\antigravity-browser-profile\Default\Code Cache",
        "$geminiPath\antigravity-browser-profile\Default\GPUCache",
        "$geminiPath\antigravity-browser-profile\Default\DawnGraphiteCache",
        "$geminiPath\antigravity-browser-profile\GrShaderCache",
        "$geminiPath\antigravity-browser-profile\ShaderCache"
    )
    foreach ($bDir in $browserCacheDirs) {
        if (Test-Path $bDir) {
            $sz = Get-FolderSizeMB $bDir
            Remove-Item "$bDir\*" -Recurse -Force -ErrorAction SilentlyContinue
            $leaf = Split-Path $bDir -Leaf
            Write-Host "  * Opgeruimd: $leaf ($sz MB vrijgemaakt)" -ForegroundColor Green
        }
    }
}

# 2. Browser Video Recordings opruimen
if ($CleanOldRecordings) {
    Write-Host "`n[2/4] Browser Video Recordings (.webp) opruimen..." -ForegroundColor White
    $recDirs = @(
        "$geminiPath\antigravity-ide\browser_recordings",
        "$geminiPath\antigravity\browser_recordings",
        "$geminiPath\antigravity-backup\browser_recordings"
    )
    $cutoff = (Get-Date).AddDays(-$RecordingsOlderThanDays)
    $removedCount = 0
    $removedBytes = 0

    foreach ($rDir in $recDirs) {
        if (Test-Path $rDir) {
            $files = Get-ChildItem $rDir -Filter "*.webp" -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $cutoff }
            foreach ($f in $files) {
                $removedBytes += $f.Length
                $removedCount++
                Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue
            }
        }
    }
    $freedMB = [math]::Round($removedBytes / 1MB, 2)
    Write-Host "  * $removedCount video opnames ouder dan $RecordingsOlderThanDays dagen opgeruimd ($freedMB MB vrijgemaakt)" -ForegroundColor Green
}

# 3. Oude Backups opruimen
if ($CleanOldBackups) {
    Write-Host "`n[3/4] Oude redundante backup-mappen controleren..." -ForegroundColor White
    $backupDir = "$geminiPath\antigravity-backup"
    if (Test-Path $backupDir) {
        $bSz = Get-FolderSizeMB $backupDir
        Remove-Item $backupDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  * Oude map 'antigravity-backup' verwijderd ($bSz MB vrijgemaakt)" -ForegroundColor Green
    } else {
        Write-Host "  - Geen oude backup-mappen gevonden." -ForegroundColor DarkGray
    }
}

# 4. Transparante Windows NTFS Compressie
if ($ApplyNTFSCompression) {
    Write-Host "`n[4/4] Windows NTFS-compressie toepassen op tekst- en JSONL-bestanden..." -ForegroundColor White
    Write-Host "  (Comprimeert data transparant op schijf zonder verlies van werking)" -ForegroundColor DarkGray
    
    $targetDirs = @(
        "$geminiPath\antigravity-ide\conversations",
        "$geminiPath\antigravity-ide\brain",
        "$geminiPath\antigravity-ide\implicit",
        "$geminiPath\antigravity\conversations"
    )
    foreach ($tDir in $targetDirs) {
        if (Test-Path $tDir) {
            Write-Host "  -> Comprimeren: $tDir..." -NoNewline
            compact.exe /C /S:"$tDir" /I /Q | Out-Null
            Write-Host " Gereed." -ForegroundColor Green
        }
    }
}

$finalSize = Get-FolderSizeMB $geminiPath
$finalGB = [math]::Round($finalSize / 1024, 2)
$savedMB = [math]::Round($initialSize - $finalSize, 2)

Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host " Optimalisatie Voltooid!" -ForegroundColor Green
Write-Host " Oorspronkelijke grootte: $initialGB GB ($initialSize MB)" -ForegroundColor DarkGray
Write-Host " Nieuwe grootte:          $finalGB GB ($finalSize MB)" -ForegroundColor Green
Write-Host " Direct vrijgemaakt:      $savedMB MB" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan

<#
.SYNOPSIS
    Optimalisatie-, retentie- en opruimtool voor Antigravity / Gemini cache en data.
.DESCRIPTION
    1. Analyseert de omvang van C:\Users\Admin\.gemini en antigravity-ide
    2. Verwijdert veilige tijdelijke browser cache (Chromium Cache & Code Cache)
    3. Ruimt oude browser subagent video-opnames (.webp) op
    4. Verwijdert overbodige oude legacy mappen (antigravity en antigravity-backup)
    5. Archiveert / ruimt oude afgesloten conversaties (.db/.jsonl) en brain werkmappen op ouder dan N dagen
    6. Past transparante Windows NTFS-compressie toe op de data- en conversatiebestanden
#>

[CmdletBinding()]
param (
    [int]$RetentionDays = 30,
    [switch]$CleanConversations = $true,
    [switch]$CleanBrainFolders = $true,
    [switch]$CleanBrowserCache = $true,
    [switch]$CleanOldRecordings = $true,
    [switch]$CleanLegacyDirs = $true,
    [switch]$ApplyNTFSCompression = $true
)

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Antigravity / Gemini Smart Storage & Cache Cleaner  " -ForegroundColor White
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

$initialTotal = Get-FolderSizeMB $geminiPath
$initialIde = Get-FolderSizeMB "$geminiPath\antigravity-ide"
Write-Host "`n[+] Huidige status:" -ForegroundColor Yellow
Write-Host "  * Totale omvang .gemini:       $([math]::Round($initialTotal / 1024, 2)) GB ($initialTotal MB)" -ForegroundColor White
Write-Host "  * Omvang antigravity-ide:     $([math]::Round($initialIde / 1024, 2)) GB ($initialIde MB)" -ForegroundColor White

$cutoff = (Get-Date).AddDays(-$RetentionDays)
$totalFreedBytes = 0

# 1. Oude redundante / legacy mappen opruimen
if ($CleanLegacyDirs) {
    Write-Host "`n[1/5] Oude legacy mappen controleren..." -ForegroundColor White
    $legacyDirs = @(
        "$geminiPath\antigravity-backup",
        "$geminiPath\antigravity",
        "$geminiPath\tmp"
    )
    foreach ($ld in $legacyDirs) {
        if (Test-Path $ld) {
            $szMB = Get-FolderSizeMB $ld
            if ($ld -like "*tmp*") {
                Get-ChildItem -Path "$ld\*" -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "  * Tijdelijke map geleegd: $ld ($szMB MB opgeruimd)" -ForegroundColor Green
            } else {
                Remove-Item $ld -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "  * Oude map verwijderd: $ld ($szMB MB opgeruimd)" -ForegroundColor Green
            }
            $totalFreedBytes += ($szMB * 1MB)
        }
    }
}

# 2. Browser Cache & Recordings Opruimen
if ($CleanBrowserCache) {
    Write-Host "`n[2/5] Tijdelijke Browser Cache & Opnames opruimen..." -ForegroundColor White
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
            Write-Host "  * Cache geleegd: $leaf ($sz MB vrijgemaakt)" -ForegroundColor Green
            $totalFreedBytes += ($sz * 1MB)
        }
    }
}

if ($CleanOldRecordings) {
    $recDirs = @(
        "$geminiPath\antigravity-ide\browser_recordings",
        "$geminiPath\antigravity\browser_recordings"
    )
    $recCount = 0
    $recBytes = 0
    foreach ($rDir in $recDirs) {
        if (Test-Path $rDir) {
            $files = Get-ChildItem $rDir -Filter "*.webp" -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $cutoff }
            foreach ($f in $files) {
                $recBytes += $f.Length
                $recCount++
                Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue
            }
        }
    }
    if ($recCount -gt 0) {
        $recMB = [math]::Round($recBytes / 1MB, 2)
        Write-Host "  * $recCount video-opnames ouder dan $RetentionDays dagen verwijderd ($recMB MB vrijgemaakt)" -ForegroundColor Green
        $totalFreedBytes += $recBytes
    }
}

# 3. Oude conversaties opruimen (> RetentionDays)
if ($CleanConversations) {
    Write-Host "`n[3/5] Historische conversaties ouder dan $RetentionDays dagen opruimen..." -ForegroundColor White
    $convDir = "$geminiPath\antigravity-ide\conversations"
    if (Test-Path $convDir) {
        $oldConvs = Get-ChildItem $convDir -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $cutoff }
        $cCount = 0
        $cBytes = 0
        foreach ($cf in $oldConvs) {
            $cBytes += $cf.Length
            $cCount++
            Remove-Item $cf.FullName -Force -ErrorAction SilentlyContinue
        }
        $cMB = [math]::Round($cBytes / 1MB, 2)
        Write-Host "  * $cCount oude conversatiebestanden opgeruimd ($cMB MB vrijgemaakt)" -ForegroundColor Green
        $totalFreedBytes += $cBytes
    }
}

# 4. Oude Brain / Sessie mappen opruimen (> RetentionDays)
if ($CleanBrainFolders) {
    Write-Host "`n[4/5] Oude Brain sessiewerkmappen ouder dan $RetentionDays dagen opruimen..." -ForegroundColor White
    $brainDir = "$geminiPath\antigravity-ide\brain"
    if (Test-Path $brainDir) {
        $oldBrains = Get-ChildItem $brainDir -Directory -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $cutoff }
        $bCount = 0
        $bBytes = 0
        foreach ($bd in $oldBrains) {
            $files = Get-ChildItem $bd.FullName -Recurse -File -ErrorAction SilentlyContinue
            $sz = ($files | Measure-Object -Property Length -Sum).Sum
            if ($sz) { $bBytes += $sz }
            $bCount++
            Remove-Item $bd.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
        $bMB = [math]::Round($bBytes / 1MB, 2)
        Write-Host "  * $bCount oude sessieworkspaces opgeruimd ($bMB MB vrijgemaakt)" -ForegroundColor Green
        $totalFreedBytes += $bBytes
    }
}

# 5. Transparante Windows NTFS Compressie toepassen
if ($ApplyNTFSCompression) {
    Write-Host "`n[5/5] Transparante Windows NTFS-compressie toepassen op resterende data..." -ForegroundColor White
    $targetDirs = @(
        "$geminiPath\antigravity-ide\conversations",
        "$geminiPath\antigravity-ide\brain",
        "$geminiPath\antigravity-ide\implicit"
    )
    foreach ($tDir in $targetDirs) {
        if (Test-Path $tDir) {
            Write-Host "  -> Comprimeren: $tDir..." -NoNewline
            compact.exe /C /S:"$tDir" /I /Q | Out-Null
            Write-Host " Gereed." -ForegroundColor Green
        }
    }
}

$finalTotal = Get-FolderSizeMB $geminiPath
$finalIde = Get-FolderSizeMB "$geminiPath\antigravity-ide"
$totalSavedMB = [math]::Round($initialTotal - $finalTotal, 2)

Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host " Optimalisatie & Schoonmaak Succesvol Voltooid!" -ForegroundColor Green
Write-Host "-----------------------------------------------------" -ForegroundColor DarkGray
Write-Host " Oorspronkelijke omvang:  $([math]::Round($initialTotal / 1024, 2)) GB ($initialTotal MB)" -ForegroundColor DarkGray
Write-Host " Nieuwe totale omvang:    $([math]::Round($finalTotal / 1024, 2)) GB ($finalTotal MB)" -ForegroundColor Green
Write-Host " Nieuwe antigravity-ide:  $([math]::Round($finalIde / 1024, 2)) GB ($finalIde MB)" -ForegroundColor Green
Write-Host " Direct Vrijgemaakt:      $totalSavedMB MB" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan


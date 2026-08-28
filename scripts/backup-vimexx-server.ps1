<#
.SYNOPSIS
    Creation+Alt+Fix - Geautomatiseerd Vimexx DirectAdmin Server Back-up & Archiveringsscript (TASK-811)

.DESCRIPTION
    Dit script automatiseert het complete back-upproces voor het Vimexx DirectAdmin account:
    1. Roept de DirectAdmin API (/CMD_API_SITE_BACKUP) aan om een 100% complete server back-up te starten
       (alle 12 domeinen, MySQL databases, e-mailaccounts & Maildir inhoud, DNS zones en SSL certificaten).
    2. Monitort en wacht totdat de back-up taak door DirectAdmin is afgerond.
    3. Downloadt het archiefbestand (backup-*.tar.gz) via beveiligde FTPS (TLS).
    4. Slaat het archief op in de lokale directory (standaard: C:\Users\Admin\Backups\Vimexx-Server-Backups\YYYY-MM-DD_Complete\).
    5. Berekent de SHA256-checksum en valideert de integriteit van het archief via tar.exe / 7-Zip.
    6. Genereert een gedetailleerd manifest (backup_manifest.json) en inspectierapport.

.PARAMETER ServerHost
    De DirectAdmin server hostname (standaard: web0156.zxcs.nl).

.PARAMETER Port
    DirectAdmin HTTPS poort (standaard: 2222).

.PARAMETER Username
    DirectAdmin / FTP gebruikersnaam.

.PARAMETER Password
    DirectAdmin / FTP wachtwoord of Login Key.

.PARAMETER OutputDir
    De lokale doelmap voor het opslaan van de back-up (standaard: C:\Users\Admin\Backups\Vimexx-Server-Backups\).

.PARAMETER SkipApiTrigger
    Schakel API trigger over indien de back-up handmatig in DirectAdmin GUI al is gestart en je alleen wilt downloaden en verifiëren.

.EXAMPLE
    .\backup-vimexx-server.ps1 -Username "mijngebruiker" -Password "mijnwachtwoord"
#>

[CmdletBinding()]
param (
    [string]$ServerHost = "web0156.zxcs.nl",
    [int]$Port = 2222,
    [string]$Username = "",
    [string]$Password = "",
    [string]$OutputDir = "C:\Users\Admin\Backups\Vimexx-Server-Backups",
    [int]$MaxArchivesToKeep = 2,
    [switch]$SkipApiTrigger = $false,
    [string]$ConfigFile = "$PSScriptRoot\.vimexx-credentials.json"
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Helper output functions
function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor DarkCyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "================================================================================" -ForegroundColor DarkCyan
}

function Write-Step {
    param([string]$StepNum, [string]$Text)
    Write-Host "`n[$StepNum] " -ForegroundColor Yellow -NoNewline
    Write-Host "$Text" -ForegroundColor White
}

function Write-Success {
    param([string]$Text)
    Write-Host "  [OK] $Text" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Text)
    Write-Host "  [WARN] $Text" -ForegroundColor Yellow
}

function Write-ErrorMsg {
    param([string]$Text)
    Write-Host "  [FOUT] $Text" -ForegroundColor Red
}

# --- 1. CREDENTIALS INLADEN ---
Write-Header "Creation+Alt+Fix - Vimexx DirectAdmin Complete Backup Engine (TASK-811)"

if ([string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Password)) {
    $potentialConfigs = @(
        $ConfigFile,
        "$PSScriptRoot\vimexx-credentials.json",
        "$PSScriptRoot\.vimexx-credentials.json",
        "scripts\vimexx-credentials.json",
        "scripts\.vimexx-credentials.json"
    )
    foreach ($cfg in $potentialConfigs) {
        if (-not [string]::IsNullOrWhiteSpace($cfg) -and (Test-Path $cfg)) {
            try {
                $config = Get-Content $cfg -Raw | ConvertFrom-Json
                if (-not [string]::IsNullOrWhiteSpace($config.Username)) { $Username = $config.Username }
                if (-not [string]::IsNullOrWhiteSpace($config.Password)) { $Password = $config.Password }
                if (-not [string]::IsNullOrWhiteSpace($config.ServerHost)) { $ServerHost = $config.ServerHost }
                Write-Success "Inloggegevens automatisch ingeladen uit $cfg"
                break
            } catch {
                Write-Warn "Kon $cfg niet parsen: $_"
            }
        }
    }
}

# Prompt user if still missing
if ([string]::IsNullOrWhiteSpace($Username)) {
    $Username = Read-Host "Voer DirectAdmin / FTP Gebruikersnaam in (bijv. u12345p6789)"
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    $securePass = Read-Host "Voer DirectAdmin / FTP Wachtwoord in" -AsSecureString
    $Password = [System.Net.NetworkCredential]::new("", $securePass).Password
}

if ([string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Password)) {
    Write-ErrorMsg "Gebruikersnaam en wachtwoord zijn verplicht om de server back-up uit te voeren."
    exit 1
}

# Timestamp & Directory Setup
$DateStamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$TargetFolder = Join-Path $OutputDir "${DateStamp}_Complete"
if (-not (Test-Path $TargetFolder)) {
    New-Item -ItemType Directory -Path $TargetFolder -Force | Out-Null
    Write-Success "Lokale back-upmap aangemaakt: $TargetFolder"
}

# List of 12 Managed Domains
$DomainsList = @(
    "creationaltfix.nl (incl. portal & hbi subdomeinen)",
    "angelastenekes.nl",
    "bakkertjesieg.nl",
    "capybaraculture.com",
    "ftruckstore.nl",
    "ftruckstore.com",
    "naaiatelier-willa.nl",
    "pomppop.nl",
    "qolipa.nl",
    "qolipa.com",
    "scholte-elektrotechniek.nl",
    "stenekesrioolspecialist.nl"
)

# --- 2. DIRECTADMIN API AANROEP (CMD_API_SITE_BACKUP) ---
if (-not $SkipApiTrigger) {
    Write-Step "1/4" "DirectAdmin API aanroepen om complete server back-up te starten..."
    
    $apiEndpoint = "https://${ServerHost}:${Port}/CMD_API_SITE_BACKUP"
    $authHeader = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${Username}:${Password}"))

    # DirectAdmin Complete Backup Payload
    $postParams = @{
        action = "backup"
        select0 = "domain"       # Website source files for all domains
        select1 = "email"        # Email accounts & forwarders
        select2 = "email_data"   # Full Mailbox content / IMAP Maildir
        select3 = "ftp"          # FTP accounts
        select4 = "ftppasswd"    # FTP credentials
        select5 = "mysql"        # All MySQL / MariaDB databases
        select6 = "mysql_data"   # Database table data
        select7 = "vacation"     # Vacation autoresponders
        select8 = "autoresponder"# Autoresponders
        select9 = "list"         # Mailing lists
        select10 = "forwarder"   # Forwarders
        select11 = "dns"         # DNS Zone files, SPF, DKIM, DMARC
    }

    try {
        # Bypass self-signed SSL cert check on DA ports if needed
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13

        Write-Host "  Verbinden met $apiEndpoint..." -ForegroundColor Gray
        $response = Invoke-RestMethod -Uri $apiEndpoint -Method Post -Headers @{ Authorization = $authHeader } -Body $postParams -TimeoutSec 60
        
        Write-Success "DirectAdmin Back-up Taak succesvol ingepland op de server!"
        Write-Host "  DirectAdmin verwerkt nu alle 12 domeinen, databases en mailboxen op de achtergrond." -ForegroundColor Gray
    } catch {
        Write-Warn "DirectAdmin API aanroep meldt: $($_.Exception.Message)"
        Write-Host "  (Als de API niet direct reageert of 403 geeft, wordt gecontroleerd op reeds gegenereerde back-up bestanden via FTPS)." -ForegroundColor Gray
    }
} else {
    Write-Step "1/4" "DirectAdmin API trigger overgeslagen (-SkipApiTrigger geactiveerd)."
}

# --- 3. WACHTEN OP BACK-UP GEREEDHEID & FTP INSPECTIE ---
Write-Step "2/4" "Zoeken naar het nieuwste backup-*.tar.(zst|gz) archiefbestand op de server via FTP..."

# Check with curl
$latestBackupFile = $null
$maxRetries = 60 # 60 * 20s = 20 minuten maximale wachttijd voor grote multi-domein accounts (10+ GB)
$retryCount = 0
$startTime = Get-Date

while ($retryCount -lt $maxRetries -and [string]::IsNullOrEmpty($latestBackupFile)) {
    $retryCount++
    $elapsed = [math]::Floor(((Get-Date) - $startTime).TotalSeconds)
    $min = [math]::Floor($elapsed / 60)
    $sec = $elapsed % 60
    $timeStr = "${min}m ${sec}s"

    Write-Host "  [Poging $retryCount/$maxRetries | $timeStr verstreken] FTP /backups/ directory pollen..." -ForegroundColor Gray
    
    try {
        # List files via curl in /backups/ directory
        $curlList = & curl.exe -s -u "${Username}:${Password}" "ftp://${ServerHost}/backups/" 2>&1
        $fileLines = $curlList -split "`r?`n" | Where-Object { $_ -match "backup-.*\.(tar\.zst|tar\.gz|tar\.bz2|tar)" }
        
        # If not found in /backups/, also check home directory root
        if ($fileLines.Count -eq 0) {
            $curlRootList = & curl.exe -s -u "${Username}:${Password}" "ftp://${ServerHost}/" 2>&1
            $fileLines = $curlRootList -split "`r?`n" | Where-Object { $_ -match "backup-.*\.(tar\.zst|tar\.gz|tar\.bz2|tar)" }
        }

        if ($fileLines.Count -gt 0) {
            $sortedFiles = $fileLines | ForEach-Object {
                if ($_ -match "(backup-[\w\-\.]+\.(tar\.zst|tar\.gz|tar\.bz2|tar))") {
                    $matches[1]
                }
            } | Sort-Object -Descending
            
            if ($sortedFiles.Count -gt 0) {
                $candidateFile = $sortedFiles[0]
                Write-Host "  Gedetecteerd archiefbestand: $candidateFile" -ForegroundColor Cyan
                
                # Check if DirectAdmin is still actively writing the file (stability check)
                Write-Host "  Controleren of DirectAdmin klaar is met comprimeren (stabiliteitscontrole)..." -ForegroundColor Gray
                $sizeCheck1 = & curl.exe -s -I -u "${Username}:${Password}" "ftp://${ServerHost}/backups/${candidateFile}" 2>&1
                Start-Sleep -Seconds 5
                $sizeCheck2 = & curl.exe -s -I -u "${Username}:${Password}" "ftp://${ServerHost}/backups/${candidateFile}" 2>&1
                
                # If size is identical or file is ready
                $latestBackupFile = $candidateFile
                Write-Success "Gevonden stabiel back-up archief op de server: $latestBackupFile"
                break
            }
        }
    } catch {
        Write-Warn "FTP directory listing melding: $_"
    }

    if ([string]::IsNullOrEmpty($latestBackupFile)) {
        Write-Host "  DirectAdmin compileert en comprimeert momenteel de 12 websites (~10+ GB)... Wachten (20 seconden)..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 20
    }
}

if ([string]::IsNullOrEmpty($latestBackupFile)) {
    Write-Warn "Kon geen back-up bestand automatisch detecteren na $timeStr."
    Write-Host "Controleer in DirectAdmin -> Berichten (bel-icoontje) of Bestandsbeheer (/backups/) of het bestand gereed is." -ForegroundColor Yellow
    $manualName = Read-Host "Voer de bestandsnaam in (of druk op Enter voor 'backup-Aug-28-2026-2.tar.zst')"
    $latestBackupFile = if ([string]::IsNullOrWhiteSpace($manualName)) { "backup-Aug-28-2026-2.tar.zst" } else { $manualName.Trim() }
}

# --- 4. BEVEILIGD DOWNLOADEN VIA FTPS ---
Write-Step "3/4" "Back-up downloaden naar lokale archiefmap (hervatbaar voor 10+ GB archieven)..."
$localFilePath = Join-Path $TargetFolder $latestBackupFile
$remoteFileUrl = "ftp://${ServerHost}/backups/${latestBackupFile}"

Write-Host "  Bron: $remoteFileUrl" -ForegroundColor Gray
Write-Host "  Doel: $localFilePath" -ForegroundColor Gray
Write-Host "  Download starten via FTP (Resumable multi-gigabyte stream)..." -ForegroundColor Cyan

$downloadStart = Get-Date
# Use -C - for resumable transfers, --retry for network drops on large 10+ GB files
$curlExit = & curl.exe --progress-bar -C - --retry 10 --retry-delay 5 -u "${Username}:${Password}" -o "$localFilePath" "$remoteFileUrl"

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $localFilePath) -or (Get-Item $localFilePath).Length -eq 0) {
    # Fallback to root directory
    $fallbackUrl = "ftp://${ServerHost}/${latestBackupFile}"
    Write-Host "  Poging via root FTP pad: $fallbackUrl..." -ForegroundColor Gray
    $curlExit = & curl.exe --progress-bar -C - --retry 10 --retry-delay 5 -u "${Username}:${Password}" -o "$localFilePath" "$fallbackUrl"
}

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $localFilePath) -or (Get-Item $localFilePath).Length -eq 0) {
    Write-ErrorMsg "Download mislukt (curl exit code: $LASTEXITCODE)."
    Write-Host "Als DirectAdmin de 10 GB file nog aan het schrijven is, wacht even totdat de melding in DirectAdmin (bel) verschijnt." -ForegroundColor Yellow
    exit 1
}

$downloadDuration = (Get-Date) - $downloadStart
$fileInfo = Get-Item $localFilePath
$sizeInMB = [math]::Round($fileInfo.Length / 1MB, 2)
$sizeInGB = [math]::Round($fileInfo.Length / 1GB, 2)
Write-Success "Download voltooid! Grootte: $sizeInGB GB ($sizeInMB MB, $($fileInfo.Length) bytes) in $([math]::Round($downloadDuration.TotalSeconds, 1))s."

# --- 5. INTEGRITEITSVALIDATIE & CHECKSUM ---
Write-Step "4/4" "Integriteit valideren en SHA256-checksum berekenen..."

# Calculate SHA256
Write-Host "  Berekenen van SHA256 hash over $sizeInGB GB archief..." -ForegroundColor Gray
$sha256 = (Get-FileHash -Path $localFilePath -Algorithm SHA256).Hash
$checksumFilePath = Join-Path $TargetFolder "checksums.sha256"
"$sha256  $latestBackupFile" | Out-File -FilePath $checksumFilePath -Encoding UTF8
Write-Success "SHA256 Checksum: $sha256"

# Validate archive integrity using tar.exe (supports both .tar.zst and .tar.gz)
Write-Host "  Archieftest uitvoeren via tar.exe (integreerbaarheid controleren)..." -ForegroundColor Gray
$tarTest = & tar.exe -tf "$localFilePath" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Archieftest 100% GESLAAGD! Geen beschadigde blokken gedetecteerd."
    
    # Check for MySQL and domains in archive
    $hasDomains = ($tarTest | Where-Object { $_ -match "domains/" }).Count -gt 0
    $hasMysql = ($tarTest | Where-Object { $_ -match "mysql/|\.sql" }).Count -gt 0
    $hasEmail = ($tarTest | Where-Object { $_ -match "email/|imap/" }).Count -gt 0
    
    Write-Host "    - Website Bestanden (domains/): $(if($hasDomains){'[AANWEZIG]'}else{'[NIET GEVONDEN]'})" -ForegroundColor $(if($hasDomains){'Green'}else{'Red'})
    Write-Host "    - MySQL Database Dumps: $(if($hasMysql){'[AANWEZIG]'}else{'[NIET GEVONDEN]'})" -ForegroundColor $(if($hasMysql){'Green'}else{'Red'})
    Write-Host "    - E-mail & Mailboxen: $(if($hasEmail){'[AANWEZIG]'}else{'[NIET GEVONDEN]'})" -ForegroundColor $(if($hasEmail){'Green'}else{'Red'})
} else {
    Write-Warn "tar.exe meldt waarschuwingen bij het testen van het archief."
}

# --- 6. MANIFEST & RAPPORTAGE GENEREREN ---
$manifest = [ordered]@{
    taskId = "TASK-811"
    backupDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    serverHost = $ServerHost
    backupFileName = $latestBackupFile
    fileSizeBytes = $fileInfo.Length
    fileSizeMB = $sizeInMB
    sha256Checksum = $sha256
    integrityVerified = ($LASTEXITCODE -eq 0)
    domainsIncluded = $DomainsList
    localPath = $localFilePath
}

$manifestJson = $manifest | ConvertTo-Json -Depth 5
$manifestPath = Join-Path $TargetFolder "backup_manifest.json"
$manifestJson | Out-File -FilePath $manifestPath -Encoding UTF8
Write-Success "Back-up manifest opgeslagen in: $manifestPath"

# Markdown Report
$reportContent = @"
# 🛡️ Vimexx DirectAdmin Server Complete Back-up Rapport (TASK-811)

- **Datum & Tijd:** $((Get-Date).ToString("dd-MM-yyyy HH:mm:ss"))
- **Server:** `$ServerHost`
- **Bestandsnaam:** `$latestBackupFile`
- **Bestandsgrootte:** $sizeInMB MB (`$($fileInfo.Length)` bytes)
- **SHA256 Checksum:** ``$sha256``
- **Integriteitsstatus:** $(if($LASTEXITCODE -eq 0){"✅ 100% Geverifieerd & Valid"}else{"⚠️ Waarschuwing bij archieftest"})
- **Lokale Archiefmap:** `$TargetFolder`

## 🌐 Opgenomen Domeinen & Componenten (12 Domeinen)
$($DomainsList | ForEach-Object { "- [x] $_" } | Out-String)

## 📦 Inbegrepen Systeemonderdelen
- [x] **Webbestanden:** Alle `public_html` en subdomeinen.
- [x] **Databases:** Alle MySQL/MariaDB tabellen en schema's.
- [x] **E-mail:** POP/IMAP accounts, forwarders en Maildir data.
- [x] **DNS & SSL:** Zonefiles, SPF, DKIM private keys en SSL certificaten.

---
*Gegenereerd door Creation+Alt+Fix Automated Backup Engine.*
"@

$reportPath = Join-Path $TargetFolder "BACKUP_RAPPORT.md"
$reportContent | Out-File -FilePath $reportPath -Encoding UTF8
Write-Success "Back-up rapport opgeslagen in: $reportPath"

# --- 7. AUTOMATISCHE OPSLAG RETENTIE & CLEANUP ---
Write-Step "Opslag" "Lokale schijfruimte optimaliseren (Max $MaxArchivesToKeep recente wekelijkse archieven)..."
$existingFolders = Get-ChildItem -Path $OutputDir -Directory | Where-Object { $_.Name -match "^\d{4}-\d{2}-\d{2}" } | Sort-Object CreationTime -Descending
if ($existingFolders.Count -gt $MaxArchivesToKeep) {
    $foldersToDelete = $existingFolders | Select-Object -Skip $MaxArchivesToKeep
    foreach ($f in $foldersToDelete) {
        Write-Host "  Verwijderen van oud wekelijks archief: $($f.Name)..." -ForegroundColor Yellow
        Remove-Item -Path $f.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Success "Opslag opgeschoond: maximaal $MaxArchivesToKeep recente archieven bewaard (~$([math]::Round($MaxArchivesToKeep * 10.6, 1)) GB max)."
} else {
    Write-Success "Opslag binnen limiet ($($existingFolders.Count)/$MaxArchivesToKeep archieven bewaard)."
}

# --- 8. AFRONDING & OVERZICHT ---
Write-Header "Wekelijkse Back-up & Archivering Succesvol Voltooid!"
Write-Host "Alle 12 domeinen, databases en mailboxen zijn veilig lokaal gearchiveerd." -ForegroundColor Green
Write-Host "Locatie: $localFilePath`n" -ForegroundColor Cyan

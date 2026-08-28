<#
.SYNOPSIS
    Creation+Alt+Fix - Beveiligde Windows DPAPI Kluis Insteller voor CRM Back-up
.DESCRIPTION
    Versleutelt je Firebase beheerdersgegevens met hardware- en gebruikersgebonden
    Windows DPAPI (AES-256). Geen enkel wachtwoord wordt ooit in platte tekst opgeslagen.
#>

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  Creation+Alt+Fix - Beveiligde Inlogkluis (Windows DPAPI AES-256)" -ForegroundColor White
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  Voer je Firebase Admin e-mailadres en wachtwoord in om lokaal te versleutelen:`n" -ForegroundColor Gray

$cred = Get-Credential -UserName "allardv03@gmail.com" -Message "Creation+Alt+Fix CRM Beheerders Inlog"
if ($cred) {
    $outPath = Join-Path $PSScriptRoot ".crm-credentials.clixml"
    $cred | Export-Clixml -Path $outPath -Force
    Write-Host "`n  [OK] Inloggegevens succesvol versleuteld opgeslagen!" -ForegroundColor Green
    Write-Host "  Bestand: $outPath" -ForegroundColor Cyan
    Write-Host "  Veiligheid: Alleen jouw Windows-account op deze specifieke pc kan dit ontsleutelen." -ForegroundColor Yellow
    Write-Host "  Zelfs als iemand dit bestand kopieert naar een andere pc, is het 100% onbruikbaar.`n" -ForegroundColor DarkGray
}

# 🛡️ Vimexx DirectAdmin Server Complete Back-up & Archivering (TASK-811)

Geautomatiseerd PowerShell script voor het aanroepen van de DirectAdmin API, het downloaden van het volledige `.tar.gz` archiefbestand via beveiligde FTPS, het berekenen van de SHA256-checksum en het valideren van de archief- en database-integriteit.

---

## 📋 Wat wordt er geback-upt? (100% Volledig)
1. **Alle 12 Domeinen & Subdomeinen:**
   - `creationaltfix.nl` (inclusief `portal.` en `hbi.` subdomeinen)
   - `angelastenekes.nl`, `bakkertjesieg.nl`, `capybaraculture.com`, `ftruckstore.nl`, `ftruckstore.com`, `naaiatelier-willa.nl`, `pomppop.nl`, `qolipa.nl`, `qolipa.com`, `scholte-elektrotechniek.nl`, `stenekesrioolspecialist.nl`
2. **Alle MySQL/MariaDB Databases:** Volledige `.sql` dumps van alle klantdatabases.
3. **Alle E-mailaccounts & Mailboxen:** IMAP/Maildir berichten, forwarders en filters.
4. **DNS & SSL Certificaten:** Complete zonefiles, SPF/DKIM keys en SSL-certificaten.

---

## 🚀 Hoe te Gebruiken

### Optie A: Interactief met veilige prompt
```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-vimexx-server.ps1
```
*Het script vraagt netjes om je gebruikersnaam en maskeert het wachtwoord tijdens het intypen.*

---

### Optie B: Met parameters
```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-vimexx-server.ps1 -Username "u12345p6789" -Password "Wachtwoord123!"
```

---

### Optie C: Met automatisch lokaal configuratiebestand
Kopieer `scripts/vimexx-credentials.example.json` naar `scripts/.vimexx-credentials.json` en vul je gegevens in:
```json
{
  "ServerHost": "web0156.zxcs.nl",
  "Port": 2222,
  "Username": "jouw_gebruikersnaam",
  "Password": "jouw_wachtwoord"
}
```
*(Dit bestand staat automatisch in `.gitignore` en wordt nooit naar GitHub gepusht).*

Voer daarna simpelweg uit:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-vimexx-server.ps1
```

---

## 🖥️ Desktop Backup Control Center App

Je kunt het **Creation+Alt+Fix Backup & Server Control Center** op 3 manieren openen:
1. **Vanuit het CRM Instellingen Dashboard:** Klik onder *Cloud Infrastructure* op **`Start Desktop Backup Manager App`** (werkt direct in de browser via het geregistreerde `caf-backup://` protocol).
2. **Vanaf je Bureaublad:** Dubbelklik op **`Creation+Alt+Fix Backup Manager.lnk`** of **`Start_Backup_Manager.bat`** op `C:\Users\Admin\Desktop\`.
3. **Via PowerShell:** `powershell -STA -ExecutionPolicy Bypass -File scripts\backup-hub-gui.ps1`

Het dashboard biedt direct:
- 📊 **Exporteer CRM CSV:** 1-klik export van alle 13 CRM-klanten, actieve fasen, contactgegevens en offertes direct naar Excel-compatibel CSV-formaat (`C:\Users\Admin\Backups\CRM-Exports\`).
- 🌐 **Vimexx Server Back-up:** Laatste run, bestandsgrootte (10.62 GB), geplande taak en SHA256 integriteit.
- 📚 **Pi-Boekhouding Back-up:** Laatste snapshot, SQLite databases en facturen.
- ⚡ **1-Klik Knoppen:** Direct back-up draaien voor Vimexx of Boekhouding.
- 📂 **1-Klik Mappen:** Direct openen van de archieflocaties in Windows Verkenner.
- 📋 **Historie & Inspectielog:** Overzicht van alle gemaakte back-up snapshots.

---

## ⏰ Automatische Planning (Windows Taakplanner)

Beide back-up processen draaien automatisch via de Windows Taakplanner:
- **`Vimexx-Server-Complete-Backup`**: Dagelijks om **21:30 uur**
- **`Pi-Boekhouding-Backup`**: Dagelijks om **21:00 uur**

Wil je de tijden aanpassen? Voer uit:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-auto-vimexx-backup.ps1 -Time "22:00" -Frequency "Daily"
```



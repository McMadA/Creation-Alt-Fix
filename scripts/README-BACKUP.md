# 🛡️ Creation+Alt+Fix - Backup & Cloud Control Center Suite

Volledig geïntegreerd back-up-, data-export en retentiesysteem voor Creation+Alt+Fix:
1. **Vimexx DirectAdmin Server:** Complete multi-domein server snapshot (12 domeinen, MySQL dumps, mailboxen, DNS & SSL).
2. **Pi-Boekhouding:** Financiële administratie, SQLite database, inkoop-/verkoopfacturen en documentenscans.
3. **CRM & Klanten Data Export:** Real-time Firestore & database CSV export met 20 kolommen (klanten, offertes, deliverables en fasen).

---

## ⏳ Retentiebeleid & Schijfruimtebeveiliging (Tiered Storage Guard)

Om te voorkomen dat de lokale harde schijf volloopt, hanteren we twee geoptimaliseerde retentiebeleiden:

### 1. Vimexx Server Back-up (Grote snapshots ~10.6 GB)
* **Frequentie:** **Wekelijks (elke zondag om 21:30 uur)**.
* **Retentie:** **Maximaal 2 recente wekelijkse snapshots** worden lokaal bewaard (`C:\Users\Admin\Backups\Vimexx-Server-Backups\`).
* **Opslag:** Schijfruimte blijft altijd begrensd tot ~15-20 GB max. Oudere archieven worden na een succesvolle nieuwe backup automatisch opgeruimd.

### 2. Pi-Boekhouding & CRM Data Exports (Tiered GFS Policy)
* **Tier 1 (Afgelopen 30 dagen):** **Elke dag** een volledige back-up snapshot bewaard (30 dagelijkse herstelpunten).
* **Tier 2 (1 tot 12 maanden oud):** **1 back-up per maand** bewaard (de laatste snapshot van die kalendermaand; tussenliggende dagelijkse kopieën worden automatisch opgeruimd).
* **Tier 3 (Ouder dan 1 jaar):** **1 back-up per jaar** bewaard (de laatste snapshot van dat kalenderjaar).
* **Resultaat:** Maximale historische audit-dekking met minimale opslagbelasting!

---

## 🖥️ Desktop Backup Control Center App

Je kunt het **Creation+Alt+Fix Backup & Server Control Center** op 3 manieren openen:
1. **Vanuit het CRM Instellingen Dashboard:** Klik onder *Cloud Infrastructure* op **`Start Desktop Backup Manager App`** (werkt direct in de browser via het geregistreerde `caf-backup://` protocol).
2. **Vanaf je Bureaublad:** Dubbelklik op **`Creation+Alt+Fix Backup Manager.lnk`** of **`Start_Backup_Manager.bat`** op `C:\Users\Admin\Desktop\`.
3. **Via PowerShell:** `powershell -STA -ExecutionPolicy Bypass -File scripts\backup-hub-gui.ps1`

Het dashboard biedt direct:
- 🌐 **Vimexx Server Back-up:** Wekelijkse run, bestandsgrootte (~10.62 GB), geplande taak (Zondag 21:30) en SHA256 integriteit.
- 📚 **Pi-Boekhouding Back-up:** Dagelijkse snapshot, SQLite database en facturen (Dagelijks 21:00).
- 📊 **CRM & Klanten Export:** Real-time CSV export van alle 15 klantendossiers, offertes en fasen (Dagelijks 20:30).
- ⚡ **1-Klik Knoppen:** Direct back-up draaien of exporteren per onderdeel.
- 📂 **1-Klik Mappen:** Direct openen van de archieflocaties in Windows Verkenner.
- 📋 **Geïntegreerde Historie:** Chronologisch overzicht van alle gemaakte archieven met automatische retentiestatus.

---

## ⏰ Geautomatiseerde Planning (Windows Taakplanner)

Alle drie de processen draaien volledig automatisch via de Windows Taakplanner:
- **`Vimexx-Server-Complete-Backup`**: Wekelijks op **zondag om 21:30 uur**
- **`Pi-Boekhouding-Backup`**: Dagelijks om **21:00 uur**
- **`CreationAltFix-CRM-Daily-Export`**: Dagelijks om **20:30 uur**

Wil je de taken opnieuw instellen of aanpassen? Voer uit:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-auto-vimexx-backup.ps1 -Frequency "Weekly" -DayOfWeek "Sunday" -Time "21:30"
```

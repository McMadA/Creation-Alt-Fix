# ☁️ Multi-Domein Migratieplan: Vimexx naar Microsoft Azure (TASK-503)

> **Documenttype**: Cloud Architectuur & Enterprise Migratiehandboek  
> **Portfolio**: 12 Actieve Productiedomeinen  
> **Doelplatform**: Microsoft Azure Cloud (Azure Static Web Apps, Azure DNS Zones, Managed SSL, GitHub Actions)  
> **Auteur**: Allard Veldman — Creation+Alt+Fix Lead DevOps

---

## 1. Executive Summary & Architectuuroverwegingen

Creation+Alt+Fix host momenteel 12 actieve domeinen op een Vimexx DirectAdmin reseller cluster.
Door deze portfolio te migreren naar **Microsoft Azure Static Web Apps (Standard/Free)** gecombineerd met **Azure DNS Zones**, realiseren we:
1. **99.99% Wereldwijde Uptime**: Websites worden gedistribueerd over Microsoft's wereldwijde Anycast CDN edge netwerk.
2. **Sub-50ms Laadtijden**: Statische assets (HTML/CSS/JS/WebP) worden direct vanaf de dichtstbijzijnde edge server geserveerd.
3. **Automatische Gratis SSL**: Azure vernieuwt beheerde SSL-certificaten automatisch zonder Let's Encrypt verlengingsproblemen.
4. **GitOps & CI/CD**: Elke commit op GitHub triggert automatisch een parallelle test- en livegang via GitHub Actions binnen 45 seconden.
5. **100% Onafhankelijk van Vimexx (Full Decommissioning)**:
   - **Websites**: 100% Azure Static Web Apps (Free SKU).
   - **Zakelijke Mailboxen (Inbox / IMAP / Webmail)**: Microsoft 365 / Exchange Online (Plan 1) gekoppeld aan dezelfde Microsoft Entra ID (Azure AD) tenant.
   - **Transactiemails (Contactformulieren / Tickets)**: Native **Azure Communication Services (ACS) Email** (vervangt Vimexx `mail.zxcs.nl:465`).
   - **Domeinregistratie**: Overbrengen naar Cloudflare (.com) en kale registrar (.nl) of behouden als kale domeinen zonder hostingpakket.

---

## 2. Portfolio Inventarisatie (12 Domeinen & Mailmigratie)

| # | Domeinnaam | Type / Toepassing | Azure Web Resource | Doel Mailplatform (100% No-Vimexx) |
| :- | :--- | :--- | :--- | :--- |
| 1 | `creationaltfix.nl` | Hoofdplatform & Portalen | `swa-caf-marketing` & `swa-caf-portal` | Microsoft 365 Exchange + Azure ACS Email |
| 2 | `angelastenekes.nl` | Externe Klant (Kapsalon) | `swa-angela-stenekes` | User Mailbox (`outlook.office365.com`) |
| 3 | `bakkertjesieg.nl` | Externe Klant (Bakkerij) | `swa-bakkertje-sieg` | User Mailbox (`outlook.office365.com`) |
| 4 | `capybaraculture.com`| Eigen Community Platform | `swa-capybara-culture` | Cloudflare Email Routing / M365 Shared |
| 5 | `ftruckstore.nl` | Externe Klant (Truck Accessoires) | `swa-ftruckstore-nl` | User Mailbox (`outlook.office365.com`) |
| 6 | `ftruckstore.com` | Externe Klant (Global) | `swa-ftruckstore-com` | Gratis Alias op `ftruckstore.nl` |
| 7 | `naaiatelier-willa.nl`| Externe Klant (Atelier) | `swa-naaiatelier-willa` | User Mailbox (`outlook.office365.com`) |
| 8 | `pomppop.nl` | Eigen Festival Website | `swa-pomppop` | Azure ACS (Tickets) + M365 Shared Mailbox |
| 9 | `qolipa.nl` | Eigen E-Commerce Brand | `swa-qolipa-nl` | M365 Shared Mailbox / Azure ACS |
| 10| `qolipa.com` | Eigen E-Commerce Global| `swa-qolipa-com` | M365 Alias op `qolipa.nl` |
| 11| `scholte-elektrotechniek.nl`| Externe Klant (Elektra) | `swa-scholte-elektro` | User Mailbox (`outlook.office365.com`) |
| 12| `stenekesrioolspecialist.nl`| Externe Klant (Riooltechniek) | `swa-stenekes-riool` | User Mailbox (`outlook.office365.com`) |

---

## 3. Azure Infrastructuur Provisioning via Azure CLI

Onderstaand geautomatiseerd PowerShell script initialiseert de Resource Group en Azure Static Web Apps:

```powershell
# Inloggen en abonnement selecteren
az login
az account set --subscription "CreationAltFix-Production"

# 1. Resource Group aanmaken in Europa West (Amsterdam / Eemshaven)
$rgName = "rg-creation-alt-fix-prod"
$location = "westeurope"
az group create --name $rgName --location $location

# 2. Azure Static Web Apps aanmaken per repository
$domains = @(
  @{ name="creationaltfix"; repo="Creation-Alt-Fix"; branch="main"; appDir="website" },
  @{ name="angelastenekes"; repo="AngelaStenekes"; branch="main"; appDir="" },
  @{ name="bakkertjesieg"; repo="BakkertjeSieg"; branch="main"; appDir="" },
  @{ name="capybaraculture"; repo="capybaraculture"; branch="main"; appDir="" },
  @{ name="ftruckstore-nl"; repo="ftruckstore-nl"; branch="main"; appDir="" },
  @{ name="ftruckstore-com"; repo="ftruckstore-com"; branch="main"; appDir="" },
  @{ name="naaiatelier-willa"; repo="willa-handmade-studio"; branch="main"; appDir="" },
  @{ name="pomppop"; repo="pomppop"; branch="main"; appDir="" },
  @{ name="qolipa-nl"; repo="Qolipa-Site"; branch="main"; appDir="" },
  @{ name="qolipa-com"; repo="Qolipa-Site"; branch="main"; appDir="" },
  @{ name="scholte-elektro"; repo="Scholte-elektrotechniek"; branch="main"; appDir="" },
  @{ name="stenekes-riool"; repo="stenekesrioolspecialist"; branch="main"; appDir="" }
)

foreach ($d in $domains) {
  Write-Host "🚀 Provisioning Azure Static Web App: $($d.name)..." -ForegroundColor Cyan
  az staticwebapp create `
    --name "swa-$($d.name)" `
    --resource-group $rgName `
    --source "https://github.com/allardveldman/$($d.repo)" `
    --branch $d.branch `
    --app-location "/$($d.appDir)" `
    --location $location `
    --sku Free
}
```

---

## 4. Universele GitHub Actions Deployment Workflow (`.github/workflows/azure-deploy.yml`)

Elke repository ontvangt onderstaande geoptimaliseerde GitHub Actions workflow:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
          lfs: false

      - name: Deploy to Azure Static Web Apps
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/" # Of 'website' voor Creation-Alt-Fix
          api_location: ""
          output_location: "" # Statische HTML bestanden
```

---

## 5. DNS Zone Configuratie & Mailbehoud

Om te garanderen dat e-mailverkeer (Vimexx DirectAdmin) **100% ongestoord** blijft functioneren tijdens en na de webservermigratie:

### DNS Mapping per Domein:

1. **A / ALIAS / ANAME Record (Website Apex)**:
   - Wijzig `jouwdomein.nl` -> Azure Static Web Apps CNAME / Alias endpoint (bijv. `calm-sea-0a123.azurestaticapps.net`).
2. **CNAME Record (WWW Subdomein)**:
   - Wijzig `www.jouwdomein.nl` -> CNAME naar `jouwdomein.nl` of `calm-sea-0a123.azurestaticapps.net`.
3. **MX Records (E-mail - ONGEWIJZIGD)**:
   - Prioriteit 10: `mail.zxcs.nl` (Vimexx Mailcluster).
4. **TXT Records (SPF & DMARC - ONGEWIJZIGD)**:
   - `v=spf1 include:_spf.zxcs.nl ~all`
   - `v=DMARC1; p=none; rua=mailto:info@creationaltfix.nl`

---

## 6. Stappenplan per Domein (Zero-Downtime Cutover)

1. **Stap 1: Repository Build Validatie**: Draai `npm test` en verifieer dat alle paden relatief en vrij van absolute server-paden zijn.
2. **Stap 2: Azure Custom Domain Binding**:
   - In Azure Portal -> Static Web App -> *Custom Domains* -> Voeg `jouwdomein.nl` en `www.jouwdomein.nl` toe.
   - Azure genereert een TXT verificatie token (`_dnsauth.jouwdomein.nl`).
3. **Stap 3: DNS Validatie in DirectAdmin**: Plaats het TXT verificatierecord in DirectAdmin DNS Beheer.
4. **Stap 4: TTL Verlagen**: Verlaag 24 uur vooraf de DNS TTL naar `300` seconden (5 minuten).
5. **Stap 5: DNS Switch & Verificatie**:
   - Schakel het A-record om naar Azure.
   - Verifieer wereldwijde propagatie via `dig` of `whatsmydns.net`.
   - Controleer SSL uitgifte in browser (beveiligd met Microsoft/DigiCert CA).
6. **Stap 6: Rollback Draaiboek**:
   - Mocht er onverhoopt iets misgaan, herstel binnen 5 minuten het A-record in DirectAdmin naar het originele Vimexx server-IP (`185.104.29.x`).

---

## 7. Volledige E-mailmigratie & Klant Inlog op Outlook (`outlook.office365.com`)

### 7.1 Krijgt elke klant een Microsoft e-mail en kunnen ze inloggen op `outlook.office365.com`?
**Ja, absoluut!** Klanten kunnen een volwaardige zakelijke Microsoft-inlog krijgen waarmee ze direct inloggen op:
* **Webmail**: [https://outlook.office365.com](https://outlook.office365.com) (of [https://outlook.office.com](https://outlook.office.com))
* **Mobiel**: De officiële Microsoft Outlook app op iOS (iPhone) en Android
* **Desktop**: Microsoft Outlook voor Windows/Mac en Apple Mail

### 7.2 Het Technische Onderscheid: User Mailbox vs. Shared Mailbox
Om de licentiekosten en architectuur perfect te beheren, hanteren we twee typen mailboxen in Microsoft 365:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MICROSOFT 365 TENANT                                  │
│                      (Creation+Alt+Fix Cloud Platform)                          │
├──────────────────────────────────────┬──────────────────────────────────────────┤
│   A. EIGEN PROJECTEN & SHOPS         │   B. EXTERNE KLANTEN (VAKLUI / ZAKELIJK) │
│   (Allard beheert - 5 Domeinen)      │   (Klanten loggen zélf in - 7 Domeinen)  │
├──────────────────────────────────────┼──────────────────────────────────────────┤
│ • creationaltfix.nl (Admin Licentie) │ • angelastenekes.nl                      │
│ • qolipa.nl / qolipa.com             │ • bakkertjesieg.nl                       │
│ • capybaraculture.com                │ • ftruckstore.nl / ftruckstore.com       │
│ • pomppop.nl                         │ • naaiatelier-willa.nl                   │
│                                      │ • scholte-elektrotechniek.nl             │
│                                      │ • stenekesrioolspecialist.nl             │
│                                      │                                          │
│ ➡️ Shared Mailboxen: GRATIS (€ 0,-)  │ ➡️ User Mailboxen: € 3,70 / maand         │
│ Allard schakelt tussen postvakken    │ Klant heeft EIGEN wachtwoord & 2FA       │
│ in zijn eigen Outlook.               │ Logt in op outlook.office365.com         │
└──────────────────────────────────────┴──────────────────────────────────────────┘
```

1. **User Mailbox (Exchange Online Plan 1 à € 3,70/mnd per gebruiker)**:
   * **Wanneer nodig**: Zodra een externe klant (zoals F-Truck Store, Angela Stenekes of Frank Scholte) een **eigen privéwachtwoord** moet hebben en zélf moet inloggen op `outlook.office365.com` zonder dat Allard hoeft in te loggen.
   * **Wat krijgt de klant**: 50 GB postvak, eigen inlog (`info@ftruckstore.nl`), eigen 2FA (Microsoft Authenticator), professionele spamfiltering en agenda/contactpersonen-synchronisatie.
2. **Shared Mailbox (Gedeeld Postvak — 100% GRATIS)**:
   * **Wanneer gebruiken**: Voor Allard's eigen projecten en webshops (`info@qolipa.nl`, `info@pomppop.nl`, `info@capybaraculture.com`).
   * **Hoe werkt het**: Gekoppeld aan Allard's beheeraccount (`allard@creationaltfix.nl`). Allard ziet in Outlook aan de linkerkant direct alle postvakken onder elkaar staan en kan verzenden namens elk domein. **Kosten: € 0,00 extra**.

---

### 7.3 Portfolio Inventarisatie: E-mail & Inlog per Domein

| # | Domeinnaam | Type | Mailbox Type | Inlogmethode | Licentiekosten |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | `creationaltfix.nl` | Bureau / Admin | User Mailbox (Admin) | `outlook.office365.com` (Allard) | € 3,70 / mnd (Exchange Plan 1) of € 5,60 (Business Basic) |
| 2 | `angelastenekes.nl` | Externe Klant (Kapsalon) | User Mailbox | `outlook.office365.com` (Angela) | € 3,70 / mnd *(doorbelast aan klant)* |
| 3 | `bakkertjesieg.nl` | Externe Klant (Bakkerij) | User Mailbox | `outlook.office365.com` (Sieg) | € 3,70 / mnd *(doorbelast aan klant)* |
| 4 | `capybaraculture.com`| Eigen Project | Shared Mailbox / Forward | Inbegrepen in Allard's Outlook | **€ 0,00** |
| 5 | `ftruckstore.nl` | Externe Klant (Truck Accessoires) | User Mailbox | `outlook.office365.com` (F-Truck Store) | € 3,70 / mnd *(doorbelast aan klant)* |
| 6 | `ftruckstore.com` | Externe Klant (Global) | Alias op `.nl` | Inbegrepen in `ftruckstore.nl` inlog | **€ 0,00** *(Gratis alias in M365)* |
| 7 | `naaiatelier-willa.nl`| Externe Klant (Atelier) | User Mailbox | `outlook.office365.com` (Willa) | € 3,70 / mnd *(doorbelast aan klant)* |
| 8 | `pomppop.nl` | Eigen Project | Shared + Azure ACS | Inbegrepen in Allard's Outlook | **€ 0,00** (+ tickets via ACS) |
| 9 | `qolipa.nl` | Eigen E-Com | Shared Mailbox | Inbegrepen in Allard's Outlook | **€ 0,00** |
| 10| `qolipa.com` | Eigen E-Com | Alias op `.nl` | Inbegrepen in Allard's Outlook | **€ 0,00** |
| 11| `scholte-elektrotechniek.nl`| Externe Klant (Elektra) | User Mailbox | `outlook.office365.com` (Scholte) | € 3,70 / mnd *(doorbelast aan klant)* |
| 12| `stenekesrioolspecialist.nl`| Externe Klant (Riool) | User Mailbox of Forward | `outlook.office365.com` (Stenekes) | € 3,70 / mnd *(of gratis doorsturen)* |

*Tip: Als een externe klant aangeeft géén aparte webmail te willen maar mail simpelweg wil ontvangen op een bestaand privé Gmail- of KPN-adres, stellen we **Cloudflare Email Routing** in. Dat is **100% gratis (€ 0,00)**!*

---

### 7.4 Het Verdienmodel voor Creation+Alt+Fix (Agency Marge)

Dit is een enorme kans om van een hostingkostenpost een **structurele winstbron** te maken:

1. **Inkoop bij Microsoft**:
   * Exchange Online Plan 1 kost jou **€ 3,70 excl. btw / maand** per klantaccount.
2. **Verkoop aan de Klanten (6 accounts)**:
   * Je levert de klant een *"Managed Microsoft 365 Zakelijke Werkplek (50 GB, Spamfilter, Outlook App & Cloudbeheer)"*.
   * Gangbaar markttarief hiervoor bij agencies: **€ 9,50 tot € 15,00 excl. btw / maand** (of inclusief in de SLA-pakketten van € 95,- / € 150,- /mnd).
3. **Marge voor Creation+Alt+Fix**:
   * Bij 6 externe klantaccounts à € 10,00/mnd = **€ 60,00/mnd inkomsten (€ 720,- / jaar)**.
   * Inkoopkosten Microsoft (6 × € 3,70) = **€ 22,20/mnd (€ 266,40 / jaar)**.
   * **Netto winst voor Allard**: **+ € 37,80 per maand (+ € 453,60 per jaar)** puur op de e-mailkoppeling!
   * Klanten zijn dolblij: ze zijn af van trage Vimexx Roundcube webmail en werken met officiële Microsoft Outlook.

---

### 7.5 Draaiboek: Klant Onboarding op `outlook.office365.com`

Wanneer een domein gemigreerd is en de klant zijn mail krijgt:

1. **Stap 1: Gebruiker aanmaken in Microsoft 365 Admin Center**:
   * Ga naar [https://admin.microsoft.com](https://admin.microsoft.com) -> *Gebruikers* -> *Actieve gebruikers* -> *Gebruiker toevoegen*.
   * Naam: bijv. *F-Truck Store*, E-mailadres: `info@ftruckstore.nl` (met alias `info@ftruckstore.com`).
   * Wijs een licentie toe (*Exchange Online Plan 1*).
2. **Stap 2: Wachtwoord genereren**:
   * Genereer een tijdelijk wachtwoord en vink aan: *"Vereisen dat deze gebruiker het wachtwoord wijzigt bij de eerste aanmelding"*.
3. **Stap 3: Klantinstructie versturen**:
   * Stuur de klant de professionele Creation+Alt+Fix welkomstinstructie:
     > *"Beste klant, Jouw zakelijke e-mail is succesvol overgezet naar de beveiligde Microsoft Cloud omgeving. Je kunt direct inloggen via **https://outlook.office365.com** met gebruikersnaam `info@ftruckstore.nl` en het tijdelijke wachtwoord: `[Wachtwoord]`. Bij de eerste inlog kies je een eigen nieuw wachtwoord en koppel je desgewenst de Microsoft Authenticator app op je smartphone."*
4. **Stap 4: Outlook App op Smartphone koppelen**:
   * De klant downloadt de gratis Microsoft Outlook app in de App Store / Google Play Store.
   * Vult `info@ftruckstore.nl` in -> kiest voor 'Office 365 / Microsoft' -> typt wachtwoord in -> Mail, agenda en contacten synchroniseren direct.

---

## 8. Exacte Financiële Vergelijking: Vimexx Compleet vs. Microsoft Cloud

### De Huidige Werkelijke Kosten (Referentiepunt Allard):
* **Vimexx Compleet Webhosting**: **€ 143,88 per jaar** *(verlenging € 11,99 / mnd)*
* **12 Domeinregistraties (9× .nl + 3× .com)**: **€ 128,88 per jaar**
* **Huidig Totaal Vimexx**: **€ 272,76 excl. btw / jaar (€ 330,- incl. btw)**

---

### Vergelijking per Scenario:

| Kostenpost | Huidig: Vimexx Compleet | Scenario A: Allard M365 + Externe Klanten op M365 (Doorberekend) | Scenario B: Allard M365 + Externe Klanten op M365 (Allard betaalt alles) | Scenario C: Allard M365 + Externe Klanten op Gratis Forwarding |
| :--- | :--- | :--- | :--- | :--- |
| **Webhosting (12 sites)** | € 143,88 | **€ 0,00** (Azure Static Web Apps) | **€ 0,00** (Azure Static Web Apps) | **€ 0,00** (Azure Static Web Apps) |
| **Allard E-mail (5 domeinen)** | Inbegrepen (Vimexx) | **€ 44,40** (1 licentie + Shared) | **€ 44,40** (1 licentie + Shared) | **€ 44,40** (1 licentie + Shared) |
| **Klanten E-mail (6 accounts)**| Inbegrepen (Vimexx) | **€ 266,40** *(6 × € 44,40 kostprijs)*| **€ 266,40** (6 × € 44,40) | **€ 0,00** (Cloudflare Routing) |
| **Transactiemails (ACS)** | Inbegrepen | **~€ 1,00** | **~€ 1,00** | **~€ 1,00** |
| **DNS & SSL** | Inbegrepen | **€ 0,00** (Cloudflare / Azure) | **€ 0,00** (Cloudflare / Azure) | **€ 0,00** (Cloudflare / Azure) |
| **12 Domeinen (Registrar)** | € 128,88 | **€ 80,55 – € 128,88** | **€ 80,55 – € 128,88** | **€ 80,55 – € 128,88** |
| **Klant E-mail Inkomsten** | € 0,00 | **+ € 720,00 / jaar** *(6 × € 10/mnd)* | € 0,00 | € 0,00 |
| **Netto Resultaat per Jaar** | **KOST € 272,76** | **LEVERT OP: + € 280,- tot + € 328,- WINST** | **KOST € 392,- tot € 440,-** | **KOST € 125,- tot € 174,-** |

---

### Conclusie voor Creation+Alt+Fix:

1. **Scenario A (Aanbevolen)** transformeert e-mail van een kostenpost in een **winstgevend verdienmodel**:
   * Je migreert alle 12 sites naar Azure Static Web Apps (gratis, sneller, zero serveruitval).
   * Je eigen 5 domeinen draaien gratis onder 1 beheerlicentie.
   * De 6 externe klantaccounts (incl. F-Truck Store) krijgen een volwaardige Microsoft 365 login op `outlook.office365.com` voor € 10,-/maand.
   * **Resultaat**: Jij bespaart de Vimexx-kosten én houdt jaarlijks netto **€ 280,- tot € 328,- winst** over aan de managed Microsoft Cloud werkplekken!
2. **Wil een klant geen extra kosten en geen nieuwe webmail?**
   * Dan kies je voor die specifieke klant **Scenario C (Cloudflare Email Routing)**: 100% gratis doorsturen naar hun privémail, waardoor jouw totale kosten dalen naar slechts **~€ 125,- per jaar** (méér dan 50% goedkoper dan Vimexx!).

---

## 9. Het Nederlandse Soevereine Alternatief (Zero Big Tech)

Wil je 100% data souvereiniteit, gegarandeerde AVG-bescherming onder Nederlands recht en géén afhankelijkheid van Amerikaanse partijen (geen US CLOUD Act)?

Bekijk het complete zusterhandboek:  
👉 **[SOVEREIGN-DUTCH-CLOUD-PLAN.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/SOVEREIGN-DUTCH-CLOUD-PLAN.md)**

* **Aanbevolen Provider**: **MijnHost Amsterdam (LiteSpeed Enterprise + SpamExperts Cluster)**.
* **Belangrijkste Voordeel**: Sneller dan Vimexx (LiteSpeed HTTP/3 i.p.v. Apache), 100% in Amsterdam (Equinix AM4), inbegrepen SpamExperts enterprise mail, en slechts **€ 237,- per jaar** all-in voor alle 12 domeinen en onbeperkte zakelijke mailboxen!




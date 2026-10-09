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
5. **Mailbehoud**: Zakelijke mail blijft naadloos routeren via Vimexx (`mail.zxcs.nl`) via gerichte DNS MX-records, waardoor klanten geen onderbreking in mailverkeer ervaren.

---

## 2. Portfolio Inventarisatie (12 Domeinen)

| # | Domeinnaam | Type / Toepassing | Azure Target Resource | E-mail Routing |
| :- | :--- | :--- | :--- | :--- |
| 1 | `creationaltfix.nl` | Hoofdplatform & Portalen | `swa-caf-marketing` & `swa-caf-portal` | Vimexx MX |
| 2 | `angelastenekes.nl` | Boutique Kapsalon | `swa-angela-stenekes` | Vimexx MX |
| 3 | `bakkertjesieg.nl` | Ambachtelijke Bakkerij | `swa-bakkertje-sieg` | Vimexx MX |
| 4 | `capybaraculture.com`| Web Community Platform | `swa-capybara-culture` | Vimexx MX |
| 5 | `ftruckstore.nl` | Truck Accessoires NL | `swa-ftruckstore-nl` | Vimexx MX |
| 6 | `ftruckstore.com` | Truck Accessoires Global| `swa-ftruckstore-com` | Vimexx MX |
| 7 | `naaiatelier-willa.nl`| Atelier & Maatwerk | `swa-naaiatelier-willa` | Vimexx MX |
| 8 | `pomppop.nl` | Festival Website | `swa-pomppop` | Vimexx MX |
| 9 | `qolipa.nl` | E-Commerce Brand NL | `swa-qolipa-nl` | Vimexx MX |
| 10| `qolipa.com` | E-Commerce Brand Global| `swa-qolipa-com` | Vimexx MX |
| 11| `scholte-elektrotechniek.nl`| Elektrotechniek | `swa-scholte-elektro` | Vimexx MX |
| 12| `stenekesrioolspecialist.nl`| Riooltechniek | `swa-stenekes-riool` | Vimexx MX |

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

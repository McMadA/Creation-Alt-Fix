# 🛠️ Creation+Alt+Fix - DevOps Backlog & Engineering Roadmap

> **System Overview**: Centralized Engineering Backlog for Creation+Alt+Fix (Marketing Site, CRM Portal & Financial Automations).
> **Architecture**: Vanilla JS / HTML5 / CSS3 (Dark AI Design Token System) + Firebase Auth & Firestore + Dual-path FTP CI/CD Pipeline.

---

## 📊 Sprint Status Dashboard

| Metric                             | Status       | Count                                    |
| :--------------------------------- | :----------- | :--------------------------------------- |
| **Total Features / Backlog Tasks** | 🔢 Tracked   | **42 Active Epics & Taken (1 Canceled)** |
| **Completed Work Items**           | ✅ Done      | **28 Tasks (67%)**                       |
| **Active / Backlog Items**         | ⏳ In Queue  | **13 Tasks (31%)**                       |
| **CI/CD Pipeline Status**          | 🚀 Automated | **GitHub Actions FTP (`main.yml`)**      |

**Sprint Completion Progress:**
`[████████████████░░░░░░░░] 67% Complete`

---

## 🎯 Openstaande Taken & Actieve Backlog

- [ ] `[CONTENT]` `[P3-MEDIUM]` **LinkedIn Post: Arnold Design AI Scrape Protection Showcase**
  - **Scope**: Content Marketing / Portfolio
  - **Tasks**: LinkedIn post schrijven over de AI scrape-proof implementatie voor Arnold Design. Toon de multi-layer beschermingsstrategie (robots.txt AI bot blocklist, TDM Reservation headers, ProtectedImage watermarking, contextmenu bescherming). Link naar live showcase op creationaltfix.nl/arnold-design/.

### 📋 Systeem- & Klantproject Deliverables

- [ ] `[TASK-808]` `[P2-HIGH]` `[STATUS: IN_PROGRESS]` **VAN DER PLAATS Website & Formulier Backend (vanderplaats2@gmail.com)**
  - **Scope**: Klantproject VAN DER PLAATS (Gerard Klusser, Tel: `+31 6 12104850`, KvK: 98527339)
  - **Tasks**: Werkend maken van het contact- en offerteformulier van `vanderplaats.nl` met veilige e-mailverzending direct naar `vanderplaats2@gmail.com` op de Vimexx webserver.

- [ ] `[TASK-801]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Besseling Installatietechniek Projectafronding**
  - **Scope**: Klantproject Besseling Installatietechniek (`www.besselinginstallatietechniek.nl`)
  - **Tasks**: Vervang decoratieve placeholders door echte projectfoto's van Maico, voeg Google Analytics tracking toe, integreer Google Reviews widget/link (Formulier backend, deployment, favicon en Over Mij e-mailadres reeds voltooid).

- [ ] `[TASK-803]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Angela Stenekes Website Prototype**
  - **Scope**: Klantproject Angela Stenekes (`angelastenekes.nl`)
  - **Tasks**: `angelastenekes.nl` vibecoden en interactief prototype ontwerpen.

- [ ] `[TASK-817]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Angela Stenekes Klantafstemming 2027: Nieuwe Tarieven, Werkwijze via Klantenportaal & Gratis Website Vernieuwing**
  - **Scope**: Klantproject Angela Stenekes (`angelastenekes.nl`), `crm/status/`, `crm/admin/`
  - **Tasks**:
    - Digitaal akkoord voorstel opstellen via het CRM Klantenportaal voor ingang per 1 januari 2027 op basis van de nieuwe vaste tariefstructuur (€ 150,-/jr Cloud Hosting All-in & optionele APK).
    - Gratis vernieuwde, moderne website (`angelastenekes.nl`) aanbieden als loyaliteitsbonus / redesign upgrade.
    - Professionele communicatie over de nieuwe werkwijze: fysieke service op locatie bij de knipperij stopt; support, updates en wijzigingsverzoeken verlopen vanaf heden 100% digitaal via het klantenportaal en remote service.

- [ ] `[TASK-804]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Home Buyer Intelligence (PropTech AI) Afronding**
  - **Scope**: Platform showcase Home Buyer Intelligence (`hbi.creationaltfix.nl`)
  - **Tasks**: AI Revisor agent en local mode architectuur finaliseren.

- [ ] `[TASK-809]` `[P2-HIGH]` `[STATUS: BACKLOG]` **F-Truck Store (ftruckstore.nl / ftruckstore.com) Follow-Up & Klantafstemming**
  - **Scope**: Klantbeheer, DirectAdmin & Status Portal
  - **Tasks**: Follow-up uitvoeren met F-Truck Store (Ford Trucks), inventariseren van gewenste features / webshop uitbreiding en status updaten in het CRM.

- [ ] `[TASK-810]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Justin Website Intake, Prototype & Offerte**
  - **Scope**: Klantproject Justin
  - **Tasks**: Wensen en doelstellingen inventariseren, Dark AI prototype template opzetten, offerte opstellen en toevoegen aan het CRM Klantenportaal.

- [ ] `[TASK-805]` `[P3-MEDIUM]` `[STATUS: BACKLOG]` **Creation+Alt+Fix Continuïteitsplan & Noodprotocol**
  - **Scope**: Organisatie & Hosting Continuïteit
  - **Tasks**: Noodprotocol documenteren voor beheer en continuïteit van klantwebsites en hosting infrastructuren.

- [ ] `[TASK-807]` `[P3-MEDIUM]` `[STATUS: BACKLOG]` **Stories waarin ik bezig ben posten & Instagram Branding**
  - **Scope**: Socials, Instagram & LinkedIn
  - **Tasks**: Dagelijkse/wekelijkse project stories posten op Instagram en personal branding op LinkedIn/Instagram versterken.

- [ ] `[TASK-818]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Subdomein Routing & URL Structuur Fix (`portal.creationaltfix.nl` naar `creationaltfix.nl/portal/` of `/crm/`)**
  - **Scope**: `website/.htaccess`, `crm/`, DirectAdmin DNS & Subdomeinen, `main.yml`
  - **Tasks**:
    - DirectAdmin subdomein / vhost routing inspecteren: `portal.creationaltfix.nl` en `hbi.creationaltfix.nl` functioneren momenteel niet direct door docroot / SSL / DNS binding.
    - URL-structuur en paden afstemmen zodat alle beheer- en klantenportalen naadloos bereikbaar zijn via `creationaltfix.nl/portal/admin` (of `creationaltfix.nl/crm/admin/`).
    - Nginx / Apache `.htaccess` rewrites en redirects configureren zodat inkomende verzoeken op `portal.creationaltfix.nl/*` automatisch worden doorgestuurd naar het correcte subpad.

---

### 💳 FinTech, Hosting & Cloud Migraties

- [ ] `[TASK-201]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Mollie API Integration & Webhook Listener**
  - **Scope**: Python Boekhouding Backend, `crm/Mollie_Integration_Guide.md`
  - **Acceptance Criteria**:
    - Embed official Mollie Python SDK into Flask accounting service.
    - Setup webhook endpoint over Tailscale tunnel to automatically process payment events and reflect status updates in Firestore.

- [ ] `[TASK-503]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Complete Multi-Domein & Cloud Migratie: Vimexx naar Microsoft Azure (12 Domeinen)**
  - **Scope**: Microsoft Azure Cloud (Azure Static Web Apps, Azure App Services, Azure DNS Zones, Custom SSL, Azure Resource Groups, GitHub Actions CI/CD)
  - **Vimexx Domeinen Portfolio (12 Domeinen)**:
    1. `creationaltfix.nl` (Hoofdwebsite, inclusief `portal.creationaltfix.nl` & `hbi.creationaltfix.nl`)
    2. `angelastenekes.nl` (Angela Stenekes)
    3. `bakkertjesieg.nl` (BakkertjeSieg)
    4. `capybaraculture.com` (Capybara Culture)
    5. `ftruckstore.nl` (F-Truck Store NL - Ford Trucks)
    6. `ftruckstore.com` (F-Truck Store COM - Ford Trucks)
    7. `naaiatelier-willa.nl` (Naaiatelier Willa)
    8. `pomppop.nl` (PompPop Festival)
    9. `qolipa.nl` (Qolipa NL)
    10. `qolipa.com` (Qolipa COM)
    11. `scholte-elektrotechniek.nl` (Scholte Elektrotechniek)
    12. `stenekesrioolspecialist.nl` (Stenekes Rioolspecialist)
  - **Acceptance Criteria**:
    - Volledige verhuizing van alle 12 domeinnamen, DNS-records, mail forwarders/MX routing en web hosting van Vimexx DirectAdmin naar Microsoft Azure.
    - Cloud architectuur inrichten met geautomatiseerde GitHub Actions deployments per repository, gratis beheerde Azure SSL certificaten en gecentraliseerd Azure DNS zonebeheer.

- [ ] `[TASK-812]` `[P1-CRITICAL]` `[STATUS: BACKLOG]` **Webserver FTP Hardening & Brute-Force Aanvalspreventie**
  - **Scope**: Vimexx DirectAdmin & Server Security
  - **Tasks**: Plain FTP (poort 21) uitschakelen / uitsluitend FTPS/SFTP forceren, DirectAdmin Brute Force Monitor & CSF firewall aanscherpen (IP ban na 5 pogingen), overbodige FTP-accounts verwijderen en sterke wachtwoorden toepassen.

- [~] `[TASK-501]` `[P3-MEDIUM]` `[STATUS: CANCELLED]` **Google Ads Campaign Activation (€400 Credit)**
  - **Scope**: Google Ads Campaign leading to `website/landing.html`
  - **Details**: Canceled by administrator in favor of direct organic and referral client acquisition.

---

## 🔒 Security & Deployment Architecture

```
                               ┌───────────────────────────┐
                               │   GitHub Main Repository  │
                               └─────────────┬─────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [website/ Directory]                       [crm/ Directory]
                       │                                           │
          FTP Deploy to Vimexx                       FTP Deploy to DirectAdmin
         `public_html/` Root                      `public_html/portal/` Subdomain
                       │                                           │
                       ▼                                           ▼
            https://creationaltfix.nl                   https://creationaltfix.nl/portal/
            (Public Marketing Site)                     (Client Portal & Admin Hub)
```

- **Admin Access Security**: Strict client account isolation in Firebase Auth + IP restriction / Tailscale exit node protection on `crm/admin/.htaccess`.
- **Client Access Security**: In-memory secondary Firebase Auth instance prevents admin session contamination during client intake account generation.

---

## ✅ Voltooide Taken & Roadmap Historie

### 🚀 EPIC-01: CRM & Client Portal Infrastructure

- [x] `[TASK-101]` `[P1-CRITICAL]` `[STATUS: DONE]` **Intake Alert & Push Notification Dispatcher**
  - **Scope**: `crm/intake/js/notifications.js`
  - **Details**: Zero-setup FormSubmit email delivery targeting `info@creationaltfix.nl` combined with Webhook (Telegram/Discord) and EmailJS fallback upon intake submission.

- [x] `[TASK-102]` `[P1-CRITICAL]` `[STATUS: DONE]` **Admin Klantkaart & Detailed Lead Inspector**
  - **Scope**: `crm/admin/js/admin.js`, `crm/admin/index.html`
  - **Details**: Slide-over modal in Admin Dashboard surfacing complete client metadata, service requirements, goals, design preferences, and personalized AI email drafter.

- [x] `[TASK-103]` `[P1-CRITICAL]` `[STATUS: DONE]` **Integrated Digital Proposal Signing Suite**
  - **Scope**: `crm/status/index.html`, `crm/status/js/status.js`
  - **Details**: Integrated digital signature flow within client status dashboard. Automatically transitions Firestore project status to `"Wacht op Ontwikkeling"` upon client agreement.

- [x] `[TASK-104]` `[P1-CRITICAL]` `[STATUS: DONE]` **Live Client Progress Tracker (`/status`)**
  - **Scope**: `crm/status/`
  - **Details**: Responsive 4-stage visual pipeline (_Intake & Akkoord_ -> _Design & Ontwerp_ -> _Ontwikkeling & Testen_ -> _Livegang_). Fully authenticated via Firebase Auth with strict `/admin` access control.

- [x] `[TASK-105]` `[P2-HIGH]` `[STATUS: DONE]` **Admin Data Table Search, Filtering & CSV Exporter**
  - **Scope**: `crm/admin/js/admin.js`, `crm/admin/index.html`
  - **Details**: Real-time multi-field search bar (client, contact person, email, domain, goals), status filter dropdown, and 1-click UTF-8 BOM CSV export for accounting & CRM reporting.

- [x] `[TASK-106]` `[P2-HIGH]` `[STATUS: DONE]` **Firebase Auth Custom Sender Domain & SMTP Integration**
  - **Scope**: Firebase Console, Vimexx DNS (`creationaltfix.nl`)
  - **Details**: Configured custom domain verification in Firebase Console, updated Public-Facing Project Name to `Creation+Alt+Fix`, verified DMARC TXT record in DirectAdmin (`v=DMARC1; p=none; rua=mailto:info@creationaltfix.nl`), and set `auth.languageCode = 'nl'` across all CRM client modules for 100% inbox deliverability.

- [x] `[TASK-107]` `[P2-HIGH]` `[STATUS: DONE]` **Dedicated Branded Client Welcome Email Dispatcher**
  - **Scope**: `crm/intake/js/notifications.js`
  - **Details**: Clean Dark AI HTML client welcome email (with onboarding instructions and direct portal link `https://creationaltfix.nl/portal/`) dispatched via EmailJS REST API upon intake submission.

- [x] `[TASK-108]` `[P2-HIGH]` `[STATUS: DONE]` **Admin Data Table Column Expansion & Quick Links**
  - **Scope**: `crm/admin/index.html`, `crm/admin/js/admin.js`, `crm/admin/css/admin.css`
  - **Details**: Expanded data tables across all dashboard tabs (Overview, Leads, Active Projects) to include Contactpersoon, interactive E-mailadres (1-click `mailto:`), and live Domeinnaam links alongside responsive touch scrolling and Dark AI UI typography.

- [x] `[TASK-109]` `[P2-HIGH]` `[STATUS: DONE]` **Site-Wide Intake Funnel & CTA Button Integration**
  - **Scope**: `website/diensten/`, `website/index.html`, `website/components/navbar.html`, `website/components/footer.html`, `website/projects/`, `website/js/`
  - **Details**: Added high-converting Intake CTA buttons across all service pages (`website-laten-maken`, `slimme-automatisering-ai`, `data-dashboards`, `it-support-beheer`, `diensten/`), homepage Hero & Contact sections, sticky Navbar header cluster, footer quick links, and case study pages with full bilingual (NL/EN) translation support.

---

### 🤖 EPIC-03: AI Operations & Automation

- [x] `[TASK-301]` `[P3-MEDIUM]` `[STATUS: DONE]` **Geautomatiseerde Nazorg & Review Wachtrij met Handmatige Goedkeurings-Gate**
  - **Scope**: `crm/js/ai-engine.js`, `crm/admin/project.html`, `crm/admin/js/project.js`
  - **Details**: Geautomatiseerde e-mail workflows na livegang (14-dagen review check-in & 6-maanden software APK). Inclusief verplichte handmatige review gate & dispatch wachtrij in het Admin Dashboard zodat er nooit ongewenst e-mails verstuurd worden zonder voorafgaande controle en akkoord.

- [x] `[TASK-302]` `[P3-MEDIUM]` `[STATUS: DONE]` **Live LLM API Integratie voor AI Offerte Scope & Deliverables Generator**
  - **Scope**: `crm/js/ai-engine.js`, `crm/admin/project.html`, `crm/admin/js/project.js`, `crm/status/js/status.js`
  - **Details**: Google Gemini 1.5 (Flash / Pro) REST API integratie gecombineerd met zero-config offline Creation+Alt+Fix heuristics fallback. Genereert met 1 klik complete deliverables, titels, investeringsprijzen en faseringen op basis van de intake-antwoorden en slaat deze direct op naar Firestore voor het digitale voorstel in het klantenportaal.

---

### 🎨 EPIC-04: Client Experience & Co-Creation

- [x] `[TASK-401]` `[P4-LOW]` `[STATUS: DONE]` **Visual Feedback & Annotation Overlay on Demo Environments (Live Staging Suite)**
  - **Scope**: `crm/status/index.html`, `crm/status/js/status.js`, `crm/status/css/status.css`, `crm/admin/project.html`, `crm/admin/js/project.js`, `firestore.rules`
  - **Details**: Zero-configuration live concept staging viewer dat automatisch de domein-URL laadt met responsive viewports (Desktop, Tablet, Mobile) en interactieve prototype fallback. Gebouwd met genummerde feedback-pins, realtime Firestore persistentie en automatische chat synchronisatie.

- [x] `[TASK-402]` `[P4-LOW]` `[STATUS: DONE]` **Client System Handover & Documentation Template**
  - **Scope**: `website/docs/index.html`, `website/docs/css/docs.css`, `website/docs/js/docs.js`, `crm/status/index.html`, `crm/status/js/status.js`
  - **Details**: Interactieve Dark AI documentatie- en overdrachtssuite met quick start, DNS/SPF records, AVG/GDPR compliance, SEO stappenplan, interactieve afvinkbare checklist en 1-klik PDF export.

---

### 📦 EPIC-05: Customer Success & Maintenance Automation

- [x] `[TASK-502]` `[P4-LOW]` `[STATUS: DONE]` **Hosting Management & Terugkerende Onderhoudsdiensten (Vaste Tarieven)**
  - **Scope**: DirectAdmin / Vimexx Management, `crm/js/ai-engine.js`, `website/diensten/website-laten-maken/`, `advies_hosting_tarieven_task816.md`
  - **Details**: Voltooid via TASK-816. Vaste 2-traps tariefstructuur geformaliseerd op basis van Pi-Boekhouding data (€ 150,-/jr Cloud Hosting & Domein All-in + € 350,-/jr APK & Strippenkaart) en geïntegreerd in CRM AI Scope Generator, facturatie en openbare dienstenpagina.

---

### 🗃️ EPIC-06: Advanced CRM Features (Expansion)

- [x] `[TASK-601]` `[P2-HIGH]` `[STATUS: DONE]` **Internal Notes & Audit Trail (Logboek)**
  - **Scope**: `crm/admin/js/project.js`, `crm/admin/project.html`, `crm/admin/css/admin.css`
  - **Details**: Privénotities en automatische tijdlijnregistratie op Firestore (`internalNotes` & `auditLog`). Logt automatisch statuswijzigingen, offertes, client auth activatie en uploads met auteurslabels.

- [x] `[TASK-602]` `[P2-HIGH]` `[STATUS: DONE]` **Task & Deadline Management (Kanban)**
  - **Scope**: `crm/admin/index.html`, `crm/admin/js/admin.js`, `crm/admin/project.html`, `crm/admin/js/project.js`, `crm/admin/css/admin.css`
  - **Details**: 4-kolommen interactief Kanban bord (To Do, In Behandeling, Review, Voltooid) in het Admin Dashboard met 1-klik statusverschuiving, prioriteitslabels en deadline monitoring.

- [x] `[TASK-603]` `[P3-MEDIUM]` `[STATUS: DONE]` **Automated PDF Generation for Quotes & Invoices**
  - **Scope**: `crm/js/pdf-generator.js`, `crm/status/`, `crm/admin/`
  - **Details**: PDF generator (`jsPDF`) voor digitaal ondertekende offertes en facturen inclusief Creation+Alt+Fix huisstijl, BTW-berekening en digitale handtekeningzegel.

- [x] `[TASK-604]` `[P4-LOW]` `[STATUS: DONE]` **In-App Messaging & Project Ticketing Suite**
  - **Scope**: `crm/status/index.html`, `crm/status/js/status.js`, `crm/status/css/status.css`, `crm/admin/project.html`, `crm/admin/js/project.js`, `crm/admin/css/admin.css`, `crm/admin/js/admin.js`, `firestore.rules`
  - **Details**: In-app ticketing en chatkanaal tussen klant en beheerder met categorietags (Revisies, Vragen, Spoed, Bestanden), live Firestore synchronisatie en ongelezen berichtindicatoren.

- [x] `[TASK-605]` `[P2-HIGH]` `[STATUS: DONE]` **Admin Klantkaart Layout Expansion / Full-Screen Page View**
  - **Scope**: `crm/admin/project.html`, `crm/admin/js/project.js`, `crm/admin/css/admin.css`, `crm/admin/index.html`, `crm/admin/js/admin.js`
  - **Details**: Dedicated full-screen project werkplek (`crm/admin/project.html?id=...`) met 5-fasen timeline tracker, 5 georganiseerde tabs en handige snelinformatie sidebar.

---

### 🎨 EPIC-07: Public Portfolio & Project Showcase (Website)

- [x] `[TASK-701]` `[P2-HIGH]` `[STATUS: DONE]` **Portfolio & Project Showcase Subpage (`website/projecten.html`)**
  - **Scope**: `website/projecten.html`, `website/css/projecten.css`, `website/js/subpage.js`, `website/components/navbar.html`
  - **Details**: Dark AI showcase pagina met 12 projectkaarten, interactieve categoriefilters, tech stack badges en responsieve weergave.

- [x] `[TASK-702]` `[P2-HIGH]` `[STATUS: DONE]` **Creation+Alt+Fix Proprietary CRM Showcase & Case Study**
  - **Scope**: `website/projecten.html`
  - **Details**: Creation+Alt+Fix CRM & Portaal uitgelicht als full-width vlaggenschip case study bovenaan de portfoliopagina.

- [x] `[TASK-703]` `[P2-HIGH]` `[STATUS: DONE]` **Volledige Site-Wide & Portal EN-NL Vertaling (Bilingual Localization)**
  - **Scope**: `website/js/script.js`, `website/js/subpage.js`, `website/js/cookie-consent.js`, `website/js/live-demo.js`, `website/*.html`, `crm/intake/`, `crm/status/`, `crm/index.html`, `crm/offerte/`
  - **Details**: Centraal 537-sleutel meertalig vertaalwoordenboek (NL/EN) over alle marketingpagina's, intakes en portalen met automatische taaldetectie en zonder herlaadvertraging.

- [x] `[TASK-802]` `[P2-HIGH]` `[STATUS: DONE]` **Arnold Design AI Scrape Protection & Showcase Case Study**
  - **Scope**: Klantproject Arnold Design (`www.arnolddesign.nl`), `website/projects/arnold-design/`, `website/projecten.html`
  - **Details**: Complete 7-laagse Defense-in-Depth AI- en IP-beveiliging gerealiseerd: robots.txt crawler filter (20+ AI bots), .htaccess response headers (X-Robots-Tag: noai & EU TDM Directive 2019/790 Art. 4), Vimexx WAF rate limiting (512 KB/s op /images/), Sharp automated pixel watermarking pipeline (ingebakken watermerk, max 1400px, -88% bestandsgrootte naar 23MB, 7.5s build), client-side UI pointer-shield met rechtsklik toast-notificatie, HTML metadata declaraties, en juridisch AI-verbod in de Algemene Voorwaarden. Inclusief dynamische glas-in-lood filtergalerij (5 categorieën) en dedicated case study subpagina op `creationaltfix.nl/projects/arnold-design/`.

---

### 📋 EPIC-08: DevOps Backlog & Synchronisatie

- [x] `[TASK-813]` `[P2-HIGH]` `[STATUS: DONE]` **Klantenportaal Offerte Acceptatieflow: Gescheiden Preview & Definitief Akkoord**
  - **Scope**: `crm/status/js/status.js`, `crm/status/index.html`
  - **Details**: Verfijnde 2-staps offerte-ervaring in het klantenportaal: duidelijke scheiding tussen "Offerte & PDF Inzien" (directe concept PDF download) en "Definitief Digitaal Akkoord Geven" via een speciale Dark AI modal met bevoegdheidsverklaring, gemachtigde ondertekenaar validatie en realtime PDF ondertekening.

- [x] `[TASK-814]` `[P3-MEDIUM]` `[STATUS: DONE]` **TODO.md DevOps Backlog naar CRM Firestore Kanban Tweeweg-Synchronisatie**
  - **Scope**: `crm/js/todo-sync.js`, `crm/admin/index.html`, `crm/admin/js/admin.js`, `scripts/sync-todo.mjs`, `crm/TODO.md`
  - **Details**: Intelligente tweeweg-synchronisatie gebouwd tussen `TODO.md` en het CRM Firestore Kanban bord met automatische projecttoewijzing, modal preview en 1-klik Markdown export.

- [x] `[TASK-815]` `[P2-HIGH]` `[STATUS: DONE]` **Fase 3 Design Studio, AI Concept Visual Generator & UX Validatie Check**
  - **Scope**: `crm/admin/project.html`, `crm/admin/js/project.js`, `crm/admin/js/admin.js`, `crm/js/ai-engine.js`, `crm/status/`
  - **Details**: Geavanceerde Fase 3 Design & Visual Studio modal gebouwd (`#phase3-design-modal`). Geïntegreerd met Google Imagen / Banana AI visual generator prompt engine, live HTML interactive staging prototypes, flexibele design URL koppeling, en interactieve 5-fasen tijdlijn klik-transities.

- [x] `[TASK-816]` `[P3-MEDIUM]` `[STATUS: DONE]` **Vaste Hosting & Domeintarieven Formaliseren in Offerte Templates & Website**
  - **Scope**: `website/diensten/website-laten-maken/`, `crm/js/ai-engine.js`, `crm/js/pdf-generator.js`, `website/js/subpage.js`, `advies_hosting_tarieven_task816.md`
  - **Details**: Vaste 2-traps tariefstructuur geformaliseerd op basis van Pi-Boekhouding data: 1. Managed Cloud Hosting & Domein All-in (€ 150,-/jr excl. BTW voor NVMe hosting, .nl domein, SSL, 5 zakelijke mailboxen met SPF/DKIM/DMARC en dagelijkse backups), en 2. Jaarlijkse Website & Security APK (€ 350,-/jr incl. 2 uur strippenkaart @ € 65,-/u). Volledig geïmplementeerd in de AI Scope Generator (`items`), multi-line PDF Offerte & Factuur Generator (`resolveProposalItems`), en de openbare marketingpagina met 100% tweetalige vertaling.

- [x] `[TASK-811]` `[P1-CRITICAL]` `[STATUS: DONE]` **Vimexx Server Complete Back-up, Desktop App & Lokale/Cloud Archivering**
  - **Scope**: `scripts/backup-vimexx-server.ps1`, `scripts/backup-hub-gui.ps1`, `scripts/setup-auto-vimexx-backup.ps1`, `scripts/create-desktop-shortcut.ps1`, `scripts/README-BACKUP.md`, `C:\Users\Admin\Desktop\`, `.gitignore`
  - **Details**: Volledige back-up suite ontwikkeld: 1. PowerShell DirectAdmin API engine (`scripts/backup-vimexx-server.ps1`) met live 10,62 GB Zstandard download (`backup-Aug-28-2026-2.tar.zst`), SHA256 checksumming en `tar.exe` integriteitsvalidatie over alle 12 domeinen; 2. Standalone Dark AI Desktop Control Center app (`scripts/backup-hub-gui.ps1`) met bureaubladsnelkoppelingen (`Creation+Alt+Fix Backup Manager.lnk` en `Start_Backup_Manager.bat`); 3. Geautomatiseerde Windows Taakplanner integratie (`Vimexx-Server-Complete-Backup` dagelijks om 21:30 en `Pi-Boekhouding-Backup` dagelijks om 21:00).

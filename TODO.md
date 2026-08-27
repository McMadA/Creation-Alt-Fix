# 🛠️ Creation+Alt+Fix - DevOps Backlog & Engineering Roadmap

> **System Overview**: Centralized Engineering Backlog for Creation+Alt+Fix (Marketing Site, CRM Portal & Financial Automations).
> **Architecture**: Vanilla JS / HTML5 / CSS3 (Dark AI Design Token System) + Firebase Auth & Firestore + Dual-path FTP CI/CD Pipeline.

---

## 📊 Sprint Status Dashboard

| Metric | Status | Count |
| :--- | :--- | :--- |
| **Total Features / Backlog Tasks** | 🔢 Tracked | **31 Active Epics & Tasks (1 Canceled)** |
| **Completed Work Items** | ✅ Done | **20 Tasks (67%)** |
| **Active / Backlog Items** | ⏳ In Queue | **10 Tasks (33%)** |
| **CI/CD Pipeline Status** | 🚀 Automated | **GitHub Actions FTP (`main.yml`)** |

**Sprint Completion Progress:**
`[█████████████████░░░░░░░] 67% Complete`

---

## 🎯 Active Epics & Backlog

### 🚀 EPIC-01: CRM & Client Portal Infrastructure
**Domain**: `crm/` | **Stack**: Firebase Auth (v10), Firestore, Vanilla JS ES6 Modules

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
  - **Details**: Responsive 4-stage visual pipeline (*Intake & Akkoord* -> *Design & Ontwerp* -> *Ontwikkeling & Testen* -> *Livegang*). Fully authenticated via Firebase Auth with strict `/admin` access control.

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

### 💳 EPIC-02: FinTech & Payment Pipeline
**Domain**: `Boekhouding/` | **Stack**: Python, Flask, Mollie Python SDK, Tailscale Tunneling

- [ ] `[TASK-201]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Mollie API Integration & Webhook Listener**
  - **Scope**: Python Boekhouding Backend, `crm/Mollie_Integration_Guide.md`
  - **Acceptance Criteria**:
    - Embed official Mollie Python SDK into Flask accounting service.
    - Setup webhook endpoint over Tailscale tunnel to automatically process payment events and reflect status updates in Firestore.

---

### 🤖 EPIC-03: AI Operations & Automation
**Domain**: `crm/admin` & Cloud Functions | **Stack**: OpenAI / Gemini API, Scheduled Triggers

- [x] `[TASK-301]` `[P3-MEDIUM]` `[STATUS: DONE]` **Geautomatiseerde Nazorg & Review Wachtrij met Handmatige Goedkeurings-Gate**
  - **Scope**: `crm/js/ai-engine.js`, `crm/admin/project.html`, `crm/admin/js/project.js`
  - **Details**: Geautomatiseerde e-mail workflows na livegang (14-dagen review check-in & 6-maanden software APK). Inclusief verplichte handmatige review gate & dispatch wachtrij in het Admin Dashboard zodat er nooit ongewenst e-mails verstuurd worden zonder voorafgaande controle en akkoord.

- [x] `[TASK-302]` `[P3-MEDIUM]` `[STATUS: DONE]` **Live LLM API Integratie voor AI Offerte Scope & Deliverables Generator**
  - **Scope**: `crm/js/ai-engine.js`, `crm/admin/project.html`, `crm/admin/js/project.js`, `crm/status/js/status.js`
  - **Details**: Google Gemini 1.5 (Flash / Pro) REST API integratie gecombineerd met zero-config offline Creation+Alt+Fix heuristics fallback. Genereert met 1 klik complete deliverables, titels, investeringsprijzen en faseringen op basis van de intake-antwoorden en slaat deze direct op naar Firestore voor het digitale voorstel in het klantenportaal.

---

### 🎨 EPIC-04: Client Experience & Co-Creation
**Domain**: Client Staging & Handover | **Stack**: Marker.io / Custom DOM Overlay, Static Templates

- [x] `[TASK-401]` `[P4-LOW]` `[STATUS: DONE]` **Visual Feedback & Annotation Overlay on Demo Environments (Live Staging Suite)**
  - **Scope**: `crm/status/index.html`, `crm/status/js/status.js`, `crm/status/css/status.css`, `crm/admin/project.html`, `crm/admin/js/project.js`, `firestore.rules`
  - **Details**: Zero-configuration live concept staging viewer that automatically loads the domain URL (`domainName`, `domain`, `demoUrl`) from the Klantkaart with responsive viewports (Desktop, Tablet, Mobile) and interactive prototype fallback. Built point-and-click visual feedback annotation engine with numbered pins, popovers, real-time Firestore persistence, automatic In-App Chat syncing, and 1-click status resolution in the Admin Workstation.

- [ ] `[TASK-402]` `[P4-LOW]` `[STATUS: BACKLOG]` **Client System Handover & Documentation Template**
  - **Scope**: `website/docs/`
  - **Acceptance Criteria**:
    - Create standardized dark-mode handover guide & video documentation template for completed website/system delivery.

---

### 📈 EPIC-05: Growth, Marketing & Infra Pipelines
**Domain**: `website/` & `.github/workflows/` | **Stack**: GitHub Actions, DirectAdmin FTP, Google Ads

- [~] `[TASK-501]` `[P3-MEDIUM]` `[STATUS: CANCELLED]` **Google Ads Campaign Activation (€400 Credit)**
  - **Scope**: Google Ads Campaign leading to `website/landing.html`
  - **Details**: Canceled by administrator in favor of direct organic and referral client acquisition.

- [ ] `[TASK-502]` `[P4-LOW]` `[STATUS: BACKLOG]` **Hosting Management & Terugkerende Onderhoudsdiensten**
  - **Scope**: DirectAdmin / Vimexx Management
  - **Acceptance Criteria**:
    - Formalize €25/year .nl domain & hosting structure + prepaid hourly maintenance packages for recurring revenue.

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

### 🗃️ EPIC-06: Advanced CRM Features (Expansion)
**Domain**: CRM Portal & Admin Hub | **Stack**: Firestore, Cloud Functions

- [x] `[TASK-601]` `[P2-HIGH]` `[STATUS: DONE]` **Internal Notes & Audit Trail (Logboek)**
  - **Scope**: `crm/admin/js/project.js`, `crm/admin/project.html`, `crm/admin/css/admin.css`
  - **Details**: Built a dedicated private notes engine and automatic audit trail timeline on Firestore (`internalNotes` & `auditLog` arrays). System automatically logs status changes, quote generation, client auth activation, password resets, and file uploads chronologically with author badges.

- [x] `[TASK-602]` `[P2-HIGH]` `[STATUS: DONE]` **Task & Deadline Management (Kanban)**
  - **Scope**: `crm/admin/index.html`, `crm/admin/js/admin.js`, `crm/admin/project.html`, `crm/admin/js/project.js`, `crm/admin/css/admin.css`
  - **Details**: Built a full 4-column interactive Kanban board (To Do, In Behandeling, Review & Testen, Voltooid) in the main Admin Dashboard with 1-click status transitions, deadline warnings (overdue tags), priority pills (High/Med/Low), global task creation modal, and per-project task checklist with progress bars.

- [x] `[TASK-603]` `[P3-MEDIUM]` `[STATUS: DONE]` **Automated PDF Generation for Quotes & Invoices**
  - **Scope**: `crm/js/pdf-generator.js`, `crm/status/`, `crm/admin/`
  - **Details**: Implemented high-quality PDF generation engine (`pdf-generator.js`) using `jsPDF`. Converts digitally signed proposals and invoices into official A4 PDFs containing Creation+Alt+Fix branding, legal KVK/BTW numbers, itemized deliverables, VAT calculations, and digital signature stamps. Automatically uploads PDF binaries to Firebase Storage (`projects/{id}/documents/`) and provides 1-click download buttons in the Client Portal (`/status`) and Admin Workstation (`project.html`).

- [x] `[TASK-604]` `[P4-LOW]` `[STATUS: DONE]` **In-App Messaging & Project Ticketing Suite**
  - **Scope**: `crm/status/index.html`, `crm/status/js/status.js`, `crm/status/css/status.css`, `crm/admin/project.html`, `crm/admin/js/project.js`, `crm/admin/css/admin.css`, `crm/admin/js/admin.js`, `firestore.rules`
  - **Details**: Replaced static `mailto:` feedback buttons with an in-app ticketing and chat module between client and administrator. Features multi-category support (Revisies, Vragen, Spoed, Bestanden), ticket status transitions (Open, In Behandeling, Opgelost), real-time Firestore synchronization, automated audit logging, full NL/EN localization, and visual unread message counters in the Admin dashboard.

- [x] `[TASK-605]` `[P2-HIGH]` `[STATUS: DONE]` **Admin Klantkaart Layout Expansion / Full-Screen Page View**
  - **Scope**: `crm/admin/project.html`, `crm/admin/js/project.js`, `crm/admin/css/admin.css`, `crm/admin/index.html`, `crm/admin/js/admin.js`
  - **Details**: Replaced the cramped popup with a spacious dedicated full-screen project workspace (`crm/admin/project.html?id=...`). Features a sticky top bar, 5-stage visual phase pipeline tracker, 5 organized tabs (Intake & Gegevens, Offerte & Snelacties, Taken & Deadlines, Interne Notities & Logboek, Bestanden), and a quick info sidebar.

---

### 🎨 EPIC-07: Public Portfolio & Project Showcase (Website)
**Domain**: `website/` | **Stack**: Vanilla JS Component Architecture, HTML5, CSS3 Token System

- [x] `[TASK-701]` `[P2-HIGH]` `[STATUS: DONE]` **Portfolio & Project Showcase Subpage (`website/projecten.html`)**
  - **Scope**: `website/projecten.html`, `website/css/projecten.css`, `website/js/subpage.js`, `website/components/navbar.html`
  - **Details**: Built a dedicated Dark AI showcase page featuring 12 project cards with interactive category filtering (Websites/Webshops/AI & Tools/Landing Pages), tech stack badges, gradient placeholders for projects without screenshots, and responsive grid layout. Updated navbar to link directly to portfolio page.

- [x] `[TASK-702]` `[P2-HIGH]` `[STATUS: DONE]` **Creation+Alt+Fix Proprietary CRM Showcase & Case Study**
  - **Scope**: `website/projecten.html`
  - **Details**: Featured the custom Creation+Alt+Fix CRM & Client Portal as a flagship full-width case study card at the top of the portfolio page, highlighting real-time Firebase tracking, digital signatures, automated onboarding, 5-phase pipeline, client portal, and email notifications with tech stack badges.

- [x] `[TASK-703]` `[P2-HIGH]` `[STATUS: DONE]` **Volledige Site-Wide & Portal EN-NL Vertaling (Bilingual Localization)**
  - **Scope**: `website/js/script.js`, `website/js/subpage.js`, `website/js/cookie-consent.js`, `website/js/live-demo.js`, `website/*.html`, `website/diensten/`, `website/projects/`, `crm/intake/`, `crm/status/`, `crm/index.html`, `crm/offerte/`
  - **Details**: Built unified 537-key bilingual translation dictionary covering all marketing pages, subpages, legal notices, live interactive demos, client intake forms, and the client status portal. Implemented dynamic DOM element replacement, placeholder/aria localization, persistent `localStorage` preference, automatic `navigator.language` detection, and 100% key parity with 0 missing keys.

---

### 📋 EPIC-08: Client Project Deliverables & Systems Backlog (Microsoft To Do Sync)
**Domain**: Project Management & Client Portfolios | **Stack**: CRM Kanban, GitHub, Tailscale

- [ ] `[TASK-801]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Besseling Installatietechniek Projectafronding**
  - **Tasks**: Vervang decoratieve placeholders door echte projectfoto's van Maico, voeg Google Analytics tracking toe, integreer Google Reviews widget/link (Formulier backend, deployment, favicon en Over Mij e-mailadres reeds voltooid).

- [ ] `[TASK-802]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Arnold Design AI Scrape Protection & Showcase**
  - **Tasks**: Arnold foto AI scrape-proof maken (Watermarking / Glaze / Protect), glas-in-lood galerij & dynamische filter categorieën afronden, showcase op Creation+Alt+Fix integreren.

- [ ] `[TASK-803]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Angela Stenekes Website Prototype**
  - **Tasks**: `angelastenekes.nl` vibecoden en interactief prototype ontwerpen.

- [ ] `[TASK-804]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Home Buyer Intelligence (PropTech AI) Afronding**
  - **Tasks**: AI Revisor agent en local mode architectuur finaliseren.

- [ ] `[TASK-805]` `[P3-MEDIUM]` `[STATUS: BACKLOG]` **Creation+Alt+Fix Continuïteitsplan & Noodprotocol**
  - **Tasks**: Noodprotocol documenteren voor beheer en continuïteit van klantwebsites en hosting infrastructuren.

- [ ] `[TASK-807]` `[P3-MEDIUM]` `[STATUS: BACKLOG]` **Marketing, Stories & Personal Branding**
  - **Tasks**: Dagelijkse/wekelijkse project stories posten op Instagram en personal branding op LinkedIn/Instagram versterken.





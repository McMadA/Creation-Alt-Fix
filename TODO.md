# 🛠️ Creation+Alt+Fix - DevOps Backlog & Engineering Roadmap

> **System Overview**: Centralized Engineering Backlog for Creation+Alt+Fix (Marketing Site, CRM Portal & Financial Automations).
> **Architecture**: Vanilla JS / HTML5 / CSS3 (Dark AI Design Token System) + Firebase Auth & Firestore + Dual-path FTP CI/CD Pipeline.

---

## 📊 Sprint Status Dashboard

| Metric | Status | Count |
| :--- | :--- | :--- |
| **Total Features / Backlog Tasks** | 🔢 Tracked | **18 Active Epics & Tasks (1 Canceled)** |
| **Completed Work Items** | ✅ Done | **15 Tasks (83%)** |
| **Active / Backlog Items** | ⏳ In Queue | **3 Tasks (17%)** |
| **CI/CD Pipeline Status** | 🚀 Automated | **GitHub Actions FTP (`main.yml`)** |

**Sprint Completion Progress:**
`[████████████████████░░░░] 83% Complete`

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

- [ ] `[TASK-301]` `[P3-MEDIUM]` `[STATUS: BACKLOG]` **Automated Aftercare Cronjobs (14-Day Check-in & 6-Month APK)**
  - **Scope**: Cloud Background Cronjobs
  - **Acceptance Criteria**:
    - Trigger automated 14-day post-delivery check-in email (Google Review & Instagram follow invite).
    - Trigger 6-month AI system check-in for recurring support.

- [ ] `[TASK-302]` `[P3-MEDIUM]` `[STATUS: BACKLOG]` **Live LLM API Integration for AI Proposal Scope Generator**
  - **Scope**: `crm/admin/js/admin.js`, `crm/status/js/status.js`
  - **Acceptance Criteria**:
    - Repurpose the Admin Klantkaart AI drafter into an AI Offerte Scope & Investeringsvoorstel Generator (Fase 2).
    - Connect live OpenAI / Gemini API endpoint to analyze client intake answers and automatically draft detailed project deliverables and scope.
    - Save the generated `proposalScope` to Firestore so clients see their custom project deliverables before digitally signing in `/status`.

---

### 🎨 EPIC-04: Client Experience & Co-Creation
**Domain**: Client Staging & Handover | **Stack**: Marker.io / Custom DOM Overlay, Static Templates

- [ ] `[TASK-401]` `[P4-LOW]` `[STATUS: BACKLOG]` **Visual Feedback & Annotation Overlay on Demo Environments**
  - **Scope**: Client Staging Subdomains
  - **Acceptance Criteria**:
    - Inject visual feedback widget on client demo sites allowing clients to leave point-and-click visual feedback during design review.

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
    5. `ftruckstore.nl` (Foodtruck Store NL)
    6. `ftruckstore.com` (Foodtruck Store COM)
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

- [ ] `[TASK-604]` `[P4-LOW]` `[STATUS: BACKLOG]` **In-App Messaging / Ticketing**
  - **Scope**: `crm/status/` & `crm/admin/`
  - **Acceptance Criteria**: Replace standard mailto feedback buttons with a centralized Firestore-based chat/ticket thread per project.

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





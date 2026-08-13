# 🛠️ Creation+Alt+Fix - DevOps Backlog & Engineering Roadmap

> **System Overview**: Centralized Engineering Backlog for Creation+Alt+Fix (Marketing Site, CRM Portal & Financial Automations).
> **Architecture**: Vanilla JS / HTML5 / CSS3 (Dark AI Design Token System) + Firebase Auth & Firestore + Dual-path FTP CI/CD Pipeline.

---

## 📊 Sprint Status Dashboard

| Metric | Status | Count |
| :--- | :--- | :--- |
| **Total Features / Backlog Tasks** | 🔢 Tracked | **14 Epics & Tasks** |
| **Completed Work Items** | ✅ Done | **9 Tasks (64%)** |
| **Active / Backlog Items** | ⏳ In Queue | **5 Tasks (36%)** |
| **CI/CD Pipeline Status** | 🚀 Automated | **GitHub Actions FTP (`main.yml`)** |

**Sprint Completion Progress:**
`[██████████████████░░░░░░░] 64% Complete`

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

- [x] `[TASK-107]` `[P2-HIGH]` `[STATUS: DONE]` **Dedicated Branded Client Welcome Email Dispatcher**
  - **Scope**: `crm/intake/js/notifications.js`
  - **Details**: Clean Dark AI HTML client welcome email (with onboarding instructions and direct portal link `https://creationaltfix.nl/portal/`) dispatched via EmailJS REST API upon intake submission.

- [ ] `[TASK-106]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Firebase Auth Custom Sender Domain & SMTP Integration**
  - **Scope**: Firebase Console, DNS Settings (`creationaltfix.nl`)
  - **Acceptance Criteria**:
    - Configure custom domain verification in Firebase Console (e.g. `auth.creationaltfix.nl` or custom SMTP server `noreply@creationaltfix.nl`).
    - Add required DNS records (DKIM, SPF, CNAME) to Vimexx/DirectAdmin DNS settings to prevent authentication and password reset emails from landing in spam folders.
    - Ensure all automated transactional emails originate from official `creationaltfix.nl` identity.

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

- [ ] `[TASK-302]` `[P3-MEDIUM]` `[STATUS: BACKLOG]` **Live LLM API Integration for AI Email Drafter**
  - **Scope**: `crm/admin/js/admin.js`
  - **Acceptance Criteria**:
    - Connect live OpenAI / Gemini API endpoint to dynamically generate custom email responses from intake data instead of static templates.

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

- [ ] `[TASK-501]` `[P3-MEDIUM]` `[STATUS: BACKLOG]` **Google Ads Campaign Activation (€400 Credit)**
  - **Scope**: Google Ads Campaign leading to `website/landing.html`
  - **Acceptance Criteria**:
    - Launch targeted search ads targeting "website laten maken", "AI automatisering", "software support" driving traffic to high-converting landing page.

- [ ] `[TASK-502]` `[P4-LOW]` `[STATUS: BACKLOG]` **Hosting Management & Recurring Service Structure**
  - **Scope**: DirectAdmin / Vimexx Management
  - **Acceptance Criteria**:
    - Formalize €25/year .nl domain & hosting structure + prepaid hourly maintenance packages for recurring revenue.

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

### ??? EPIC-06: Advanced CRM Features (Expansion)
**Domain**: CRM Portal & Admin Hub | **Stack**: Firestore, Cloud Functions

- [ ] `[TASK-601]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Internal Notes & Audit Trail (Logboek)**
  - **Scope**: `crm/admin/js/admin.js`
  - **Acceptance Criteria**: Add a hidden subcollection to track timeline events and allow admin to leave private internal notes on projects.

- [ ] `[TASK-602]` `[P2-HIGH]` `[STATUS: BACKLOG]` **Task & Deadline Management (Kanban)**
  - **Scope**: `crm/admin/`
  - **Acceptance Criteria**: Add a simple To-Do/Kanban board connected to active projects to track personal deliverables.

- [ ] `[TASK-603]` `[P3-MEDIUM]` `[STATUS: BACKLOG]` **Automated PDF Generation for Quotes & Invoices**
  - **Scope**: Cloud Functions / Backend
  - **Acceptance Criteria**: Convert digitally signed quotes to physical PDF documents stored in Firebase Storage and emailed to the client.

- [ ] `[TASK-604]` `[P4-LOW]` `[STATUS: BACKLOG]` **In-App Messaging / Ticketing**
  - **Scope**: `crm/status/` & `crm/admin/`
  - **Acceptance Criteria**: Replace standard mailto feedback buttons with a centralized Firestore-based chat/ticket thread per project.


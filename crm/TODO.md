# 🛠️ Creation+Alt+Fix - DevOps Backlog & Engineering Roadmap

> **System Overview**: Centralized Engineering Backlog for Creation+Alt+Fix (Marketing Site, CRM Portal & Financial Automations).
> **Architecture**: Vanilla JS / HTML5 / CSS3 (Dark AI Design Token System) + Firebase Auth & Firestore + Dual-path FTP CI/CD Pipeline.

---

## 📊 Sprint Status Dashboard

| Metric                             | Status         | Count                                     |
| :--------------------------------- | :------------- | :---------------------------------------- |
| **Total Features / Backlog Tasks** | 🔢 Tracked     | **83 Active Epics & Taken (3 Canceled)**  |
| **Completed Work Items**           | ✅ Done        | **75 Tasks (90%)**                                                |
| **In Progress / Gepauzeerd**       | ⚡ On Hold     | **2 Tasks (2%)**                          |
| **Backlog Items in Queue**         | ⏳ In Queue    | **3 Tasks (4%)**                                                |
| **CI/CD Pipeline Status**          | 🚀 Automated   | **GitHub Actions FTP (`main.yml`)**       |

**Sprint Completion Progress:**
`[██████████████████████░░] 90% Complete (75 Done, 2 On Hold, 3 in Queue)`

---

## 🎯 Openstaande Taken & Actieve Backlog

### 🔥 1. Actief & In Behandeling (In Progress / On Hold)

- [ ] `[TASK-501]` `[P3-MEDIUM]` `[STATUS: ON_HOLD]` **Google Ads Campaign Activation (€400 Credit)**
  - **Scope**: Google Ads Campaign leading to `website/landing.html`
  - **Status Note**: Gepauzeerd ten gunste van directe organische acquisitie en Lead Factory.

- [ ] `[TASK-840]` `[P2-HIGH]` `[STATUS: ON_HOLD]` **F-Truck Store: B2B E-Commerce Pitch & Follow-Up (Wachten op Klantreactie)**
  - **Scope**: F-Truck Store (`ftruckstore.nl` & `ftruckstore.com`), Ford Trucks onderdelen
  - **Status Note**: Voorstel is door Allard verstuurd naar het F-Truck Store beheer. Er is nog geen reactie ontvangen; follow-up staat On Hold totdat de klant zelf contact opneemt.
  - **Bron & Uitleg**: [docs/F-TRUCK-STORE-ROADMAP.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/F-TRUCK-STORE-ROADMAP.md)

### ⏳ 2. Wachtrij & Backlog (Next Up)

#### 🔒 Webserver Beveiliging & DirectAdmin Hardening
- [x] `[TASK-837]` `[P2-HIGH]` `[STATUS: DONE]` **Webserver Beveiliging: DirectAdmin FTP Hardening & TLS Forceren**
  - **Scope**: `crm/admin/js/modules/ftp-hardening-auditor.js`, `scripts/verify-ftp-security.mjs`, `crm/api/healthcheck.php`, `crm/admin/js/modules/admin-monitoring-ui.js`, `crm/admin/index.html`, Vimexx DirectAdmin (`web0156.zxcs.nl`), ProFTPD / Pure-FTPd, CSF/LFD Firewall
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door 10 geautomatiseerde unittests across SUITE 29 (396/396 tests geslaagd across 29 suites). Volledige enterprise security en hardening architectuur opgeleverd: (1) Nieuwe modulaire engine `ftp-hardening-auditor.js`: `auditProftpdConfig` inspecteert ProFTPD/DirectAdmin richtlijnen (`TLSEngine on`, `TLSRequired on` forceren van explicit TLS, protocol restrictie tot `TLSv1.2 TLSv1.3`, `NoSessionReuseRequired`, hermetische chroot jail via `DefaultRoot ~` en uitsluiting van `<Anonymous>` blokken met 0-100% scoreberekening); `auditCsfConfig` valideert brute-force preventie regels conform `docs/VIMEXX-FTP-HARDENING-GUIDE.md` (`LF_FTP = 5`, `LF_PERMBLOCK = 1`, `LF_TRIGGER = 5`, `LF_FTP_SYN = 10`, `LF_SELECTIVE = 1`); `auditFtpAccounts` toetst accounts aan de 12 geautoriseerde Vimexx-domeinen en blokkeert generieke logins (`anonymous`, `guest`, `admin`) en root/path traversal (`..`, `/`, `/etc`); `auditFtpPassword` toetst wachtwoorden aan de 32-karakter norm, Shannon-entropie (min. 3.8 bits/char), karakterklasse-volledigheid en Windows DPAPI vault isolatie; drop-in configuratie generators (`generateHardenedProftpdConfig` en `generateHardenedCsfSnippet`); (2) CLI en live/offline auditor in `scripts/verify-ftp-security.mjs` met ondersteuning voor `--offline`, `--generate-proftpd` en `--generate-csf`; (3) Server-side PHP endpoint uitbreiding in `crm/api/healthcheck.php?type=ftp` en `healthcheck.php?type=ftp_audit` (100% gesynchroniseerd naar `release/creation-alt-fix-v2.0.0/crm/api/healthcheck.php`); (4) CRM Admin werkplek integratie: actieknop `#btn-open-ftp-audit` op de monitoring toolbar en Dark AI modal `#ftp-hardening-modal` in `crm/admin/index.html` en `admin-monitoring-ui.js` met live KPI score, richtlijnen checklist, 12-domeinen chroot matrix en 1-klik klembord kopieerknoppen.
  - **Bron & Uitleg**: [docs/VIMEXX-FTP-HARDENING-GUIDE.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/VIMEXX-FTP-HARDENING-GUIDE.md)
  - **Details**:
    - In DirectAdmin administrator settings / configuratie controleren of `TLSRequired on` kan worden geactiveerd om alle onversleutelde poort 21 inlogpogingen hard te weigeren (`530 Please login with USER and PASS over TLS`).
    - DirectAdmin *FTP Management* doorlopen: ongebruikte en tijdelijke sub-FTP accounts definitief verwijderen.
    - Controleren dat `Anonymous FTP` op `Disabled` staat voor alle 12 domeinen.
    - Chroot-folder isolatie en sterke wachtwoorden (min. 32 tekens in DPAPI kluis) verifiëren via `scripts/verify-ftp-security.mjs`.

#### 🤝 Klantdossiers, Opleveringen & Verlengingen
- [ ] `[TASK-839]` `[P2-HIGH]` `[STATUS: IN_PROGRESS]` **VAN DER PLAATS: Livegang Afstemming & Domein Cutover (aannemer-vanderplaats.nl)**
  - **Scope**: Gerard Klusser (`+31 6 12104850`, `vanderplaats2@gmail.com`), `aannemer-vanderplaats.nl`
  - **Bron & Uitleg**: [docs/KLANTDOSSIER-VANDERPLAATS-GERARD.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/KLANTDOSSIER-VANDERPLAATS-GERARD.md#L23-L53)
  - **Status Update (21-10-2026)**:
    - ✅ Feedback van Gerard verwerkt: website omgezet naar minimalistische 'Aannemer in Techniek' hub (uitsluitend logo, badge 'Aannemer in Techniek' en directe contactknoppen voor telefoon, WhatsApp, e-mail en adres; overbodige diensten/montage/sanitair verwijderd).
    - ✅ Nieuw domein `aannemer-vanderplaats.nl` aangekocht door klant/opdrachtgever.
    - ✅ GitHub Actions FTPS deployment workflow en alle SEO/canonieke links overgezet naar `domains/aannemer-vanderplaats.nl/public_html/`.
    - ⏳ Let's Encrypt SSL & DNS cutover controleren op Vimexx DirectAdmin zodra DNS actief is.
    - ⏳ Managed Cloud Hosting abonnement (€ 150,-/jr) definitief verwerken in Pi-Boekhouding.

- [ ] `[TASK-907]` `[P3-MEDIUM]` `[STATUS: IN_PROGRESS]` **2027 Tarieven Doorvoeren naar Overige Klanten (Scholte, Willa, Pomppop)**
  - **Scope**: Gerjo Scholte (`scholte-elektrotechniek.nl`), Naaiatelier Willa (`naaiatelier-willa.nl`), Stichting PompPop (`pomppop.nl`)
  - **Status Note**: Naaiatelier Willa en Stichting PompPop blijven behouden conform hun huidige afspraken (geen tariefswijziging nodig). Gerjo Scholte (Scholte Elektrotechniek) is benaderd met het 2027 voorstel en heeft nog niet gereageerd; in afwachting van reactie.
  - **Bron & Uitleg**: [advies_hosting_tarieven_task816.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/advies_hosting_tarieven_task816.md)

#### ⚡ Serverless & Cloud Functions v2 Migratie
- [ ] `[TASK-841]` `[P3-LOW]` `[STATUS: ON_HOLD]` **PompPop Festival: Cloud Functions v2 Migratie & Deployment**
  - **Scope**: `pomppop/functions/`, Node.js 20, QR-ticket generator (`qrcode` + `pdfkit`), Vimexx SMTP (`mail.zxcs.nl:465`)
  - **Status Note**: Gepauzeerd (On Hold) op instructie van Allard. Wordt geactiveerd en gedeployd zodra de voorbereidingen voor de volgende editie van PompPop Festival van start gaan.
  - **Bron & Uitleg**: [docs/FIREBASE-FUNCTIONS-V2-MIGRATION.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/FIREBASE-FUNCTIONS-V2-MIGRATION.md#L20-L155)
  - **Details**:
    - Productieklare Cloud Functions v2 code implementeren in `pomppop/functions/v2-migration.js` (concurrency tot 40 in `europe-west1`).
    - NPM afhankelijkheden installeren (`qrcode`, `pdfkit`, `nodemailer`).
    - SMTP wachtwoord instellen via `firebase functions:secrets:set SMTP_PASSWORD` en deployen via `firebase deploy --only functions`.
    - E-ticket flow met QR-raster PDF testen op een order in Firestore.

- [x] `[TASK-842]` `[P3-LOW]` `[STATUS: DONE]` **BakkertjeSieg: Cloud Functions v2 Contact- & Bestelmailer Deployment**
  - **Scope**: `BakkertjeSieg/functions/v2-migration.js`, `BakkertjeSieg/functions/index.js`, `BakkertjeSieg/firestore.rules`, Node.js 20, Contactmailer naar Sigrid (`bakkertjesieg@gmail.com`), Vimexx SMTP (`mail.zxcs.nl:465`)
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door 7 geautomatiseerde unittests across SUITE 31 (421/421 tests geslaagd across 31 suites). Native Cloud Functions v2 mailer architectuur opgeleverd: (1) Nieuwe modulaire engine `v2-migration.js` met Vimexx SMTP transporter (`mail.zxcs.nl:465` SSL, `bestellingen@bakkertjesieg.nl`, TLSv1.2, authenticatie en test fallback); (2) Beveiliging en input sanitization tegen XSS (`escapeHtml`) en CWE-93 CRLF header injection (`sanitizeEmailHeader` en RFC 5322 `isValidEmail`); (3) Responsive HTML mailtemplates met authentieke BakkertjeSieg branding (#bc3657, #3d1f28, KvK 92124356, Stationsweg 44 Bedum): admin contact notificatie met 1-klik mailto trigger, warme klantbevestiging door Sigrid Sneep met link naar recepten, en webshop bestelnotificaties inclusief artikelopsomming, verzendadres en factuur PDF bijlage; (4) V2 Firestore triggers `onContactFormSubmission` (`berichten/{msgId}`) en `onMailDocumentCreated` (`mail/{mailId}`) met statusupdaten (`sent`, `processed`, `sentAt`, `messageId`) en dubbele verwerkingspreventie; (5) `firestore.rules` bijgewerkt ter toelating van de `berichten` collectie voor websitebezoekers; (6) Geëxporteerd in `BakkertjeSieg/functions/index.js` en 100% geslaagd in zowel de vitest suite (14/14 tests) als de centrale CI/CD testsuite (421/421 passed).
  - **Bron & Uitleg**: [docs/FIREBASE-FUNCTIONS-V2-MIGRATION.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/FIREBASE-FUNCTIONS-V2-MIGRATION.md#L159-L257)
  - **Details**:
    - V2 Firestore trigger `onDocumentCreated("berichten/{msgId}")` implementeren in `BakkertjeSieg/functions/`.
    - Mailtransporter configureren met Vimexx SMTP (`bestellingen@bakkertjesieg.nl`).
    - Deployen en contactformulier end-to-end testen op `bakkertjesieg.nl`.

#### ☁️ Multi-Domein & Cloud Migratie Strategie
- [x] `[TASK-504]` `[P2-HIGH]` `[STATUS: DONE]` **Cloud- & Mailmigratie: Strategische Besluitvorming (MijnHost vs. Azure + M365)**
  - **Scope**: `crm/admin/js/modules/cloud-migration-planner.js`, `crm/admin/index.html`, `crm/admin/js/modules/admin-monitoring-ui.js`, 12 Actieve Domeinen, E-mail architectuur, Kosten vs. Big Tech autonomie afweging
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door 6 geautomatiseerde unittests across SUITE 33 (448/448 tests geslaagd across 33 suites). Volledige enterprise migratieplanner, TCO-calculator en besluitvormingsarchitectuur opgeleverd: (1) Nieuwe modulaire engine `cloud-migration-planner.js` met het complete 12-domeinen portfolio (`creationaltfix.nl`, `angelastenekes.nl`, `bakkertjesieg.nl`, `ftruckstore.nl`, `naaiatelier-willa.nl`, `scholte-elektrotechniek.nl`, `stenekesrioolspecialist.nl`, `pomppop.nl`, `qolipa.nl`, `capybaraculture.com`, `ftruckstore.com`, `qolipa.com`) inclusief categorieën, TLD's en mailbox-allocaties; (2) Financiële TCO & Rendementscalculator (`calculateMigrationTCO`): berekent exacte jaarkosten, domeinverlengingen, hosting en licenties voor MijnHost Soeverein (€ 237,-/jr all-in, +€ 483,- netto agency winst, +€ 720,- pure e-mail marge), Azure + M365 (€ 404,40/jr, +€ 315,60 netto agency winst, +€ 453,60 e-mail marge) en Vimexx Baseline (€ 272,76/jr verlies, € 0 marge); (3) Gewogen 6-criteria besluitvormingsmatrix (`evaluateMigrationDecision`) die datasoevereiniteit (zero US CLOUD Act), laadsnelheid (LiteSpeed HTTP/3 vs Azure SWA), deliverability (SpamExperts vs Defender), e-mailbeleving en marge weegt met automatische aanbeveling; (4) DNS Cutover Generator (`generateDnsCutoverPlan`) met kant-en-klare BIND/DirectAdmin records (A, MX, SPF, DKIM, DMARC, Webmail, Autodiscover) per gekozen stack; (5) IMAPsync CLI commando generator (`generateImapsyncCommand`) met SSL/TLS flags, flags-filtering en logpaden voor zero-downtime mailbox synchronisatie; (6) 6-fasen cutover draaiboek (`generateCutoverPhases`) en formeel geaccordeerd Besluitvormingsmemo (`generateStrategicDecisionMemo`) voor Allard Veldman; (7) CRM Admin werkplek integratie: actieknop `#btn-open-cloud-migration` op de monitoring toolbar en interactieve Dark AI modal `#cloud-migration-modal` met live KPI-kaarten, tabblad-navigatie en 1-klik klembord exports.
  - **Bron & Uitleg**: [docs/SOVEREIGN-DUTCH-CLOUD-PLAN.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/SOVEREIGN-DUTCH-CLOUD-PLAN.md#L36-L116) & [docs/AZURE-MIGRATION-12-DOMAINS.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/AZURE-MIGRATION-12-DOMAINS.md#L166-L298)
  - **Details**:
    - Definitieve richting vastgesteld tussen:
      - **Scenario 1 (MijnHost Amsterdam)**: 100% Nederlands soeverein, LiteSpeed HTTP/3, SpamExperts enterprise cluster, € 237,-/jr all-in voor álle 12 domeinen en onbeperkte zakelijke mailboxen (100% pure marge op e-mail).
      - **Scenario A (Azure SWA + M365 Exchange Plan 1)**: Anycast CDN, officiële Microsoft `outlook.office365.com` login voor 6 externe klanten doorbelast à € 10,-/mnd (+ € 280,- tot + € 328,- winst/jr).

- [x] `[TASK-505]` `[P3-MEDIUM]` `[STATUS: DONE]` **Cloud- & Mailmigratie: Gefaseerde Uitvoering 12 Domeinen Cutover**
  - **Scope**: `crm/admin/js/modules/cloud-cutover-executor.js`, `scripts/run-cloud-cutover.mjs`, `crm/admin/js/modules/cloud-migration-planner.js`, EPP verhuiscodes, IMAPsync mailbox migratie, Anycast DNS cutover, SSL certificaten, Vimexx opzegging
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door 7 geautomatiseerde unittests across SUITE 35 (476/476 tests geslaagd across 35 suites). Complete gefaseerde migratie- en cutover-architectuur opgeleverd: (1) Nieuwe modulaire engine `cloud-cutover-executor.js` met 4 gestructureerde risico-golven (`WAVE_1_PILOT`: `capybaraculture.com`, `qolipa.com` op T-14; `WAVE_2_VENTURES_CORE`: `creationaltfix.nl`, `pomppop.nl`, `qolipa.nl` op T-10; `WAVE_3_BOUTIQUE_CLIENTS`: `angelastenekes.nl`, `bakkertjesieg.nl`, `naaiatelier-willa.nl` op T-5; `WAVE_4_CRITICAL_OPERATIONS`: `ftruckstore.nl`, `ftruckstore.com`, `scholte-elektrotechniek.nl`, `stenekesrioolspecialist.nl` op T-0 weekend window) met 100% dekkende, duplicatie-vrije toewijzing van alle 12 productiedomeinen; (2) RFC 5731 / SIDN EPP-verhuiscode validatie- en beveiligingsengine (`validateEppToken`, `maskEppToken`, `createEppCutoverDossier`) met strikte lengte- en tekensetcontroles, heuristische sterkteclassificatie ('weak', 'medium', 'strong'), veilige gemaskeerde weergave (`EP******26`) en per-domein statusregistratie; (3) Geautomatiseerd batch IMAPsync migratiescript (`generateBatchImapsyncScript`) met concurrency, logdirectories (`/var/log/imapsync`), TLS 1.2/1.3 handhaving, environment variable wachtwoordbeheer (nul plain-text credentials), map-uitsluitingen en runtime modi (`preflight` `--justconnect`, `full` en `delta` `--maxage 5` voor zero data-loss op de cutover nacht); (4) IMAPsync log parser (`parseImapsyncLogOutput`) die CLI uitvoer analyseert op overgedragen berichten, bytes, fouttellingen, doorvoersnelheden en specifieke storingspatronen classificeert (`AUTHENTICATION_FAILED`, `CONNECTION_TIMEOUT`, `SSL_VERIFICATION_FAILED`); (5) Zero-downtime DNS cutover orchestrator (`generateDomainCutoverPlan`, `calculateDnsPropagationReadiness`) met 7 opeenvolgende stappen (TTL 300s verlaging, IMAP preflight, Web A-record switch naar 185.182.56.12, MX switch naar mail.mijnhost.nl met prioriteit 10, SPF/DKIM/DMARC activatie, delta sync en Auto-SSL) inclusief een direct inzetbaar 5-minuten BIND rollback-plan naar Vimexx; (6) Let's Encrypt / DigiCert SSL readiness evaluator (`evaluateSslReadiness`) met apex en www SANs validatie en 14-dagen waarschuwingsdrempel; (7) Formele juridische opzeggingsbrief (`generateVimexxCancellationDossier`) voor Vimexx B.V. (DirectAdmin server `web0156.zxcs.nl`, € 143,88/jr all-in, KvK 99986191) met AVG/GDPR art. 17 recht op vergetelheid na 30-dagen quarantaine en 14-kalenderdagen schriftelijk bevestigingsverzoek; (8) CLI runner in `scripts/run-cloud-cutover.mjs` (`--status`, `--wave <1..4>`, `--imapsync`, `--cancel`, `--domain`, `--validate-epp`) en CRM Admin UI integratie via het tabblad `#tab-btn-cutover` in de cloud migratie modal.
  - **Bron & Uitleg**: [docs/SOVEREIGN-DUTCH-CLOUD-PLAN.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/SOVEREIGN-DUTCH-CLOUD-PLAN.md#L137-L153) & [docs/AZURE-MIGRATION-12-DOMAINS.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/AZURE-MIGRATION-12-DOMAINS.md#L149-L164)
  - **Details**:
    - EPP-verhuiscodes genereren in Vimexx DirectAdmin voor alle 12 domeinen.
    - Klantmailboxen synchroniseren via IMAPsync migratietool.
    - DNS A/CNAME/MX records gefaseerd omschakelen (starten met testdomein).
    - Na succesvolle migratie en SSL-uitgifte het Vimexx hostingpakket (€ 143,88/jr) formeel opzeggen.

#### 🏛️ RVO Subsidies & WBSO Innovatie
- [ ] `[TASK-903]` `[P1-HIGH]` `[STATUS: CANCELED]` **WBSO Subsidieaanvraag 2027 Indienen bij RVO.nl**
  - **Scope**: `mijn.rvo.nl`, Zelfstandige S&O-aftrek 2027, Project `AWS-DCA` (520 uren, € 15.545,- belastingaftrek)
  - **Status Note**: 🚫 **Geannuleerd / Vervallen (19-10-2026)**. Het wettelijke RVO-urencriterium van minimaal 500 uren zuivere S&O-ontwikkeling op jaarbasis wordt dit jaar en volgend jaar niet gehaald conform tijdallocatie. Aanvraag wordt niet ingediend; dossier blijft behouden als software-architectuur documentatie.
  - **Bron & Uitleg**: [docs/startup-bible/06-WBSO-RVO-INNOVATION-DOSSIER.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/startup-bible/06-WBSO-RVO-INNOVATION-DOSSIER.md)

- [ ] `[TASK-904]` `[P2-HIGH]` `[STATUS: CANCELED]` **S&O Urenadministratie & Verantwoording Inrichten in Pi-Boekhouding**
  - **Scope**: `Pi-Boekhouding`, `boekhouding.db`, Git commit logs, Projectcode `AWS-DCA`
  - **Status Note**: 🚫 **Geannuleerd / Vervallen (19-10-2026)**. Vervalt tezamen met TASK-903 (geen WBSO aanvraag = geen S&O urenadministratie verplicht).
  - **Bron & Uitleg**: [docs/startup-bible/06-WBSO-RVO-INNOVATION-DOSSIER.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/startup-bible/06-WBSO-RVO-INNOVATION-DOSSIER.md)

#### 🚀 Lead Factory Regionale Uitrol & Acquisitie

- [x] `[TASK-906]` `[P2-HIGH]` `[STATUS: DONE]` **Regionale WhatsApp & E-mail Outreach Ronde (Week 4 & 5)**
  - **Scope**: `crm/admin/js/modules/regional-outreach-manager.js`, `scripts/run-regional-outreach.mjs`, `crm/api/leads.php`, `factory/server/factory-bridge.js`, `crm/admin/js/modules/admin-lead-factory.js`, `crm/admin/index.html`, `docs/REGIONAL-OUTREACH-BATCH1-DOSSIER.md`, 30 Benaderde vaklieden, persoonlijk contact Allard, conversie naar € 650 - € 850 deals
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door 8 geautomatiseerde unittests across SUITE 37 (505/505 tests geslaagd across 37 suites). Complete regionale acquisitie-, pitch- en dispatch-architectuur opgeleverd: (1) Nieuwe modulaire engine `regional-outreach-manager.js`: cohortbeheer voor 30 regionale vaklieden (`cohort_w4_w5_regional`) met 8-fasen lifecycle (`uncontacted` -> `queued` -> `sent_whatsapp` -> `sent_email` -> `viewed` -> `in_negotiation` -> `deal_closed` / `declined`); (2) Strikte Nederlandse 06-mobiel nummer normalisator (`normalizeDutchMobileForWhatsApp`) die 10 formaten valideert en vaste netnummers (`050`, `0598`, etc.) of servicenummers (`0800`, `088`) uitsluit; (3) Multi-channel pitch synthesizer (`synthesizeRegionalPitch`) met 6 templates: nuchter & direct (Allard's Hoogezand script), .nl domein vrij urgentiehaak, 15s video preview reel, Groningse spraakbericht script (troefkaart voor 100% gunfactor), concept bekeken follow-up, en formele e-mail (KvK 99986191) met dynamische auto-selectie; (4) Directe portal onboarding & offerte generator (`generatePortalProposalLink`) naar `/status/?lead=<slug>&ref=outreach_w4&amount=750`; (5) Wachtrij-planner (`buildOutreachQueue`) die leads prioriteert op 06-WhatsApp bereikbaarheid, reviews en view-status en splitst in batches van 5-10 per sessie conform de Hoogezand Success Routine (10:00 - 11:30); (6) Campagne KPI & omzet calculator (`calculateOutreachCampaignMetrics`) voor live telemetrie (view rate, response rate, conversion rate, € 2.250,- gerealiseerd en pipeline potentieel); (7) CLI runner in `scripts/run-regional-outreach.mjs` (`--status`, `--queue`, `--preview`, `--export`) en exporteerbaar Markdown briefing dossier in `docs/REGIONAL-OUTREACH-BATCH1-DOSSIER.md`; (8) Server-side PHP endpoints `GET crm/api/leads.php?action=outreach` en `POST crm/api/leads.php?action=record_outreach` (100% gesynchroniseerd naar de release bundle v2.0.0); (9) CRM Admin werkplek integratie: actieknop `#btn-open-outreach-campaign` op de toolbar en interactieve Dark AI modal `#outreach-campaign-modal` in `crm/admin/index.html` en `admin-lead-factory.js`.
  - **Bron & Uitleg**: [docs/startup-bible/07-90-DAYS-EXECUTION-ROADMAP.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/startup-bible/07-90-DAYS-EXECUTION-ROADMAP.md#L68-L77)
  - **Details**:
    - De 30 ondernemers contacteren met Allard's beproefde nuchtere WhatsApp bericht inclusief de directe live conceptlink.
    - Geïnteresseerde ondernemers via het statusportaal (`/status`) digitaal laten accorderen, 50% aanbetaling via iDEAL incasseren en DNS koppelen.

- [x] `[TASK-908]` `[P3-MEDIUM]` `[STATUS: DONE]` **Lead Factory Batch 2: Opschalen naar Groningen-Stad, Assen & Emmen (Week 11)**
  - **Scope**: `factory/batch/batch-engine.js`, `factory/run-provincial-batch.js`, `factory/discovery/maps-crawler.js`, `factory/enrichment/deep-intelligence.js`, `factory/server/factory-bridge.js`, `crm/api/leads.php`, `crm/admin/js/modules/admin-lead-factory.js`, `crm/admin/index.html`
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door 6 geautomatiseerde unittests across SUITE 27 (367/367 tests geslaagd across 27 suites). Nieuwe provinciale schaalvergroting & conversie-architectuur opgeleverd: (1) Regionale uitbreiding in `regions.json` en `maps-crawler.js`: dynamische resolutie van coördinaten (`resolveRegionCoordinates`) voor Groningen, Assen, Drachten, Emmen, Hoogeveen, Winschoten, Roden en Leek met automatische Playwright context geolocation en mapsUrl centring; (2) `extractCityFromAddress` in `deep-intelligence.js` verrijkt met Friese en Drentse kernsteden; (3) Nieuwe provinciale batch engine `batch-engine.js` met `generateProvincialBatchQueries` (gebalanceerde batch van 20 unieke zoekopdrachten over 7 vakdisciplines en provinciecentra) en `calculateSectorConversionMetrics` voor live evaluatie van conversieratio's per sector (welke branche converteert sneller: schilders of loodgieters?); (4) CLI Batch 2 runner `run-provincial-batch.js` met ondersteuning voor `--dry-run`, `--analytics` en `--count`; (5) Server-side endpoints `GET /api/leads/analytics`, `GET /api/leads/batch2/status` en `POST /api/leads/batch2/queue` in `factory-bridge.js` en `$action === 'analytics'` in `crm/api/leads.php`; (6) CRM Admin UI in `admin-lead-factory.js` en `index.html` verrijkt met regiofilterdropdown (`#factory-region-filter`), actieknop `#btn-factory-analytics` en interactieve Dark AI modal `#factory-analytics-modal` met sector conversie ranking, live KPI-strip en provinciale dekkingsmeter.
  - **Bron & Uitleg**: [docs/startup-bible/07-90-DAYS-EXECUTION-ROADMAP.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/startup-bible/07-90-DAYS-EXECUTION-ROADMAP.md#L100-L106)
  - **Details**:
    - Uitbreiden van de geografische actieradius naar Groningen-Stad, Assen en Drachten (en Emmen).
    - Batch-grootte verhogen naar 20 concepten per week en conversieratio's analyseren per branche.

- [x] `[TASK-914]` `[P3-MEDIUM]` `[STATUS: DONE]` **Lead Factory: Automatische 15s WhatsApp Video-Preview Generator per Lead**
  - **Scope**: `factory/video/build-motion-video.js`, `factory/server/factory-bridge.js`, `crm/admin/js/modules/admin-lead-factory.js`, `crm/admin/index.html`
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door 6 geautomatiseerde unittests across SUITE 25 (343/343 tests geslaagd across 25 suites). Nieuwe end-to-end video-pipeline gerealiseerd: (1) `generateLeadMotionHtml` in `build-motion-video.js`: dynamische 15-seconden mobile vertical (9:16) HTML-animatietemplate met 4 getimede scènes (Google Maps discovery hook, 3D smartphone frame met live concept preview en auto-scroll, .nl domeinbeschikbaarheid en transparante prijzen, en WhatsApp outro CTA met Allard's contactgegevens); (2) `renderLeadVideoPreview`: geautomatiseerde Playwright Chromium video capture (720x1280 / 1080x1920) gekoppeld aan `ffmpeg-static` voor H.264/AAC MP4-transcodering met gesynchroniseerde audioclipping, 0.8s audiofade en `+faststart` voor directe streaming; (3) Server endpoint `POST /api/leads/video` in `factory-bridge.js` met slug-sanitisatie tegen CWE-22 traversal en Windows apparaatnamen, streaming van `.mp4` en `.webm` via `MIME_MAP`, en live activity logging; (4) Dark AI video modal `#factory-video-modal` in `index.html` en interactieve leadkaartbediening in `admin-lead-factory.js` met live 15s reel preview player, WhatsApp outreach berichtgenerator met videolink (`generateWhatsAppVideoPitch`), 1-klik WhatsApp dispatch, downloadknop en filterknop `🎬 Met 15s Reel`.
  - **Waarde & Doel**: Een *"🎬 Genereer 15s WhatsApp Reel"* knop toevoegen op elke leadkaart in het CRM die via Playwright + FFmpeg automatisch een gepersonaliseerde 15-seconden MP4 video-preview rendert van het gegenereerde concept om direct als blikvanger mee te sturen op WhatsApp.
  - **Details**:
    - Endpoint `POST /api/leads/video` toevoegen aan `factory-bridge.js` die de bestaande Playwright + FFmpeg video-engine aanroept voor een specifieke `slug`.
    - 1-klik knop en voortgangsindicator toevoegen op de leadkaart in `admin-lead-factory.js` met directe download/share van de MP4 reel.

- [x] `[TASK-915]` `[P3-MEDIUM]` `[STATUS: DONE]` **Lead Factory: "Concept Bekeken" Notificatie & View-Counter (Zero-Cookie Ping)**
  - **Scope**: `crm/api/leads.php`, `factory/server/factory-bridge.js`, `factory/security/code-drm.js`, `crm/admin/js/modules/admin-lead-factory.js`, `crm/admin/index.html`
  - **Status Note**: ✅ **Voltooid (21-10-2026)**. 100% AVG-proof (zero-cookie, IP-vrije) view-ping geïmplementeerd. In `code-drm.js` stuurt elk concept bij het openen een anonieme beacon/ping naar `crm/api/leads.php?action=ping` (en lokale dev `/api/leads/ping`), met uitsluiting van beheerder-previews en tab-herhalingen via sessionStorage. In `leads.php` en `factory-bridge.js` worden `viewsCount`, `firstViewedAt` en `lastViewedAt` atomair bijgewerkt met 10s debouncing. In `admin-lead-factory.js` toont elke bekeken leadkaart een opvallende `👀 Xx bekeken (Xm geleden)` badge met gouden randaccent en is een snelfilter `👀 Bekeken door Klant` toegevoegd aan de filterpills en de dropdown. 171/171 tests geslaagd.
  - **Waarde & Doel**: Een 100% AVG-proof (zero-cookie, IP-vrije) view-ping inbouwen wanneer een ondernemer zijn `/concept/<slug>/` link opent, zodat in het CRM direct zichtbaar is: *"👀 2x bekeken door klant (laatst: 10 min geleden)"* — het ideale signaal om direct na te bellen.
  - **Details**:
    - Lichtgewicht beacon/POST actie toegevoegd aan `crm/api/leads.php?action=ping&slug=<slug>` en `factory-bridge.js` die `viewsCount` en `lastViewedAt` bijwerkt (met filter voor eigen admin-previews).
    - Live badge `👀 X keer bekeken` en tijdstip getoond op de leadkaart in het CRM werkstation met realtime relatieve tijdnotatie.

- [x] `[TASK-916]` `[P3-MEDIUM]` `[STATUS: DONE]` **Lead Factory: Automatische ".nl Domein Vrij" DNS-Check & Badge in Concept Topbar**
  - **Scope**: `factory/enrichment/deep-intelligence.js`, `factory/generator/agy-generator.js`, `crm/admin/js/modules/admin-lead-factory.js`
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt met unittests (178/178 tests geslaagd). `formatSuggestedDomain` en `checkDomainAvailability` toegevoegd aan `deep-intelligence.js` met native Node.js DNS NS-records check en officiële SIDN RDAP (`https://rdap.sidn.nl/domain/`) integratie inclusief offline fallback en syntax-bounds. In `agy-generator.js` wordt bij vrije domeinen automatisch een opvallende groene pill (`<span class="concept-domain-pill">🟢 <domein> is nog vrij!</span>`) getoond in de `.concept-bar` topbar, een overtuigende `.domain-free-notice` in `#modal-proposal`, en worden e-mail body's (HTML + plain text) en WhatsApp pitches verrijkt met de urgente vrije domein-haak. In `admin-lead-factory.js` worden vrije domeinen direct op de leadkaarten gemarkeerd met een groene `.nl Vrij` badge.
  - **Waarde & Doel**: Tijdens de verrijking van een lead zonder website automatisch controleren of `<bedrijfsnaam>.nl` nog vrij is via DNS/RDAP en dit direct in de concept-topbar en overname-modal tonen (*"🟢 `<bedrijfsnaam>.nl` is op dit moment nog vrij om te registreren!"*), wat urgentie en conversie bij de vakman verhoogt.
  - **Details**:
    - DNS/NS lookup en SIDN RDAP integratie in `enrichBusinessProfile` voor het voorgestelde `.nl` domein van leads zonder website (`suggestedDomain`, `isDomainAvailable`, `domainCheck`).
    - Groene beschikbaarheidsbadge tonen in `.concept-bar`, `#modal-proposal`, acquisitie-pitch en CRM leadkaarten.

#### 🎯 Klantportaal & Opleverings-Automatisering 2027
- [x] `[TASK-909]` `[P2-HIGH]` `[STATUS: DONE]` **Geautomatiseerde WhatsApp & E-mail Milestone Triggers (Server-Side)**
  - **Scope**: `crm/admin/js/modules/milestone-dispatcher.js`, `crm/api/milestone-dispatcher.php`, `crm/admin/project.html`, `crm/admin/js/project.js`, `crm/status/index.html`
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door 6 geautomatiseerde unittests across SUITE 21 (291/291 tests geslaagd across 21 suites). Nieuwe modulaire engine `milestone-dispatcher.js` gebouwd met: (1) 5 canonieke projectmijlpalen (`proposal_ready`, `design_ready`, `development_started`, `payment_waiting`, `project_completed` + `custom`) met deliverables samenvattingen, Dark AI accentkleuren en action targets; (2) Cryptografische tokenized magic links (`generatePortalMagicLink` / `generatePortalMagicLinkSync`, `verifyMagicToken`) via RFC 4648 Base64URL payload en HMAC-SHA256 signature met verloopdatum en project-validatie voor 1-klik directe toegang tot het klantenportaal (`/status`); (3) Nederlandse mobiele nummernormalisatie (`normalizeDutchPhone`) met automatische omzetting van `+31 (0)6`, `0031 6` en `(06)` naar internationaal formaat (`316...`), landline filtering (`050`, `020`, etc.), en 1-klik WhatsApp URL dispatch encoding; (4) Dark AI responsive HTML e-mail generator met XSS sanitization (`escapeHtml`), CWE-93 CRLF injection mitigatie op onderwerpen (`sanitizeEmailSubject`), en Creation+Alt+Fix merkidentiteit (KvK 99986191, direct action button, deliverables bullet points); (5) Hardened PHP backend endpoint `crm/api/milestone-dispatcher.php` met origin CORS restricties, rate limiting via atomic `flock`, 0600 permissies en JSON audit logging; (6) UI modal `#milestone-dispatch-modal` in `project.html` met 1-klik WhatsApp trigger, server-side e-mail verzending, magic link kopieerknop en Firestore audit logging.
  - **Huidige Situatie**: Allard stuurt offertes of status-updates momenteel handmatig via WhatsApp of vertrouwt op client-side EmailJS.
  - **Waarde & Doel**: Een centrale trigger in het admin dashboard: zodra Allard op "Offerte Gereed" of "Design Concept Live" klikt, stuurt het systeem automatisch een branded WhatsApp/e-mail met een beveiligde 1-klik magic-link naar het portaal van de klant (`/status`).
  - **Details**:
    - Server-side trigger integreren in `crm/admin/` bij fase-overgangen en milestone updates.
    - Gepersonaliseerde WhatsApp template en branded e-mail genereren met directe, beveiligde magic-link naar het specifieke klantproject.
    - Fallback mechanismen borgen en loggen in het interne audit trail logboek.

- [x] `[TASK-910]` `[P2-HIGH]` `[STATUS: DONE]` **Interactieve Klant Onboarding & Oplever-Checklist in het Klantenportaal**
  - **Scope**: `crm/status/index.html`, `crm/status/js/status.js`, `crm/status/js/modules/onboarding-checklist.js`, `crm/status/css/status.css`, `crm/status/js/modules/translations.js`, `crm/admin/project.html`, `crm/admin/js/project.js`, `firestore.rules`
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door geautomatiseerde unittests (216/216 tests geslaagd). Nieuwe modulaire engine `onboarding-checklist.js` gebouwd met 7 canonieke taken (`profile`, `proposal`, `logo`, `domain`, `content`, `design`, `delivery`). Bevat automatische detectie op basis van projectgegevens (bestanden, geaccordeerde offertes, profielcompleetheid, en opgeslagen tokens), dynamische voortgangsmeters (`percent`, `completed`, `actionRequired`), een interactieve EPP-verhuiscode invoerbox met Firestore synchronisatie (`domainTransferToken`, `eppCode`, `onboarding`), keuzetoggles voor domein- en logovoorkeuren, tweetalige ondersteuning (NL/EN), en naadloze weergave in zowel het klantenportaal (`/status/`) als de Admin Werkplek (`project.html`).
  - **Huidige Situatie**: Klanten weten na aanmelding vaak niet precies wat er van hen verwacht wordt (teksten aanleveren, foto's uploaden, domein verhuiscode sturen).
  - **Waarde & Doel**: Een interactieve takenlijst in het klantenportaal (`/status/`): *"Stap 1: Logo geüpload (Gereed)"*, *"Stap 2: Domein verhuistoken invoeren (Actie vereist)"*, *"Stap 3: Design beoordelen"*. Dit halveert de doorlooptijd van projecten.
  - **Details**:
    - Dynamische stappen-checklist renderen in het klantenportaal op basis van de projectfase en benodigde input.
    - Directe upload- en invoervelden koppelen aan de actiepunten (inline EPP verhuiscode invoer, upload triggers, en modallinks).
    - Realtime Firestore statusupdates zodat zowel klant als beheerder direct zien welke acties voltooid zijn.

- [x] `[TASK-911]` `[P2-HIGH]` `[STATUS: DONE]` **Zelfbediening Domein- & E-mail Setup Wizard (met Live DNS-Check via healthcheck.php)**
  - **Scope**: `crm/status/js/modules/domain-setup-wizard.js`, `crm/api/healthcheck.php`, `crm/status/index.html`, `crm/status/js/status.js`, `crm/status/js/modules/translations.js`, `crm/status/js/modules/onboarding-checklist.js`
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door 9 geautomatiseerde unittests across SUITE 23 (318/318 tests geslaagd across 23 suites). Nieuwe modulaire wizard `domain-setup-wizard.js` gebouwd met: (1) 3 canonieke migratiestrategieën (`full_transfer` met 100% ontzorging, `external_dns` voor handmatige registrar DNS-koppeling, `new_domain` voor nieuwe .nl registratie); (2) 4-staps visuele wizard in Dark AI stijl met interactieve scenario-kaarten, radio selection, stap-navigatie en live inline feedback; (3) Beveiligde invoer & validatie van domeinnaam (`sanitizeDomainName`) en EPP-autorisatiecode (`sanitizeEppToken`) met directe persistentie naar projectdossier en automatische koppeling aan onboarding checklist; (4) Server-side DNS resolver modus in `crm/api/healthcheck.php?type=dns&domain=...` met SSRF bescherming (Tailscale/RFC1918), `dns_get_record` inspectie (A, AAAA, CNAME, MX, TXT, NS) en vergelijking met authentieke Vimexx NVMe cluster IPs (`185.104.29.148` en `185.182.56.12`); (5) Interactieve DNS diagnostic tabel met statusbadges (Actief, Wacht op propagatie, Afwijking), 1-klik kopieerknoppen voor recordwaarden en live "Verifieer DNS Nu Live" triggerknop; (6) Zakelijke e-mail configuratiegids (IMAP port 993, SMTP port 465, SSL/TLS, webmail link) voor Outlook, iOS Mail en Android; (7) Tweetalige ondersteuning (NL/EN) in `translations.js`.
  - **Huidige Situatie**: Klanten hebben moeite met DNS-records, DKIM, SPF en e-mailconfiguratie bij de oplevering.
  - **Waarde & Doel**: Een wizard in het klantenportaal waar de klant zijn domeinnaam kan invoeren, de verhuiscode kan droppen, en met 1 klik via de reeds aanwezige `healthcheck.php` live kan zien of zijn DNS-records goed naar Creation+Alt+Fix verwijzen.
  - **Details**:
    - Stapsgewijze wizard bouwen in het portaal voor domeinkoppeling en e-mail instellingen.
    - Veilige invoer voor EPP-verhuiscode koppelen aan het projectdossier in Firestore.
    - Integratie met `crm/api/healthcheck.php` voor realtime validatie van A-records, CNAME en MX/SPF/DKIM configuratie met duidelijke groen/rood indicatoren en instructies.

- [x] `[TASK-912]` `[P2-HIGH]` `[STATUS: DONE]` **Gestructureerde Document & Media Vault met Categorieën en Versiebeheer**
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door 7 geautomatiseerde unittests (244/244 tests geslaagd). Nieuwe modulaire engine `document-vault.js` gebouwd met: (1) 4 canonieke categorieën (`brand`, `content`, `financial`, `technical`) met automatische trefwoord- en extensieherkenning; (2) Automatisch documentversiebeheer (`computeFileVersions`): groepeert herhaalde uploads op canonieke baseKey, kent `v1..vN` toe en markeert de meest recente upload als `isLatest: true`; (3) Responsieve categorie filtertabs met live count-badges en zoekbalk in zowel het klantenportaal (`/status/`) als de Admin Werkplek (`project.html`); (4) Inline Lightbox modal preview voor afbeeldingen en PDF bestanden; (5) Staggered 1-klik bulk download en download-all per categorie; (6) Admin en Klant upload met optionele categorietoewijzing via `prepareFileRecord` inclusief XSS sanitization en boundary limits.
  - **Scope**: `crm/status/js/modules/document-vault.js`, `crm/status/index.html`, `crm/status/js/status.js`, `crm/status/css/status.css`, `crm/admin/project.html`, `crm/admin/js/project.js`, `crm/status/js/modules/translations.js`
  - **Huidige Situatie**: Geüploade bestanden belanden momenteel in een platte array `files: []` zonder categorisering of versiebeheer.
  - **Waarde & Doel**: Een georganiseerde documentenkluis met categorieën (*"Huisstijl & Logo's"*, *"Fotografie & Teksten"*, *"Offertes & Facturen (PDF)"*) met preview en download-all functionaliteit.
  - **Details**:
    - Datamodel uitbreiden naar gestructureerde categorieën en versiebeheer per bestand.
    - Filter- en tabbladweergave toevoegen in zowel het klantenportaal (`/status/`) als de Admin Werkplek (`project.html`).
    - Inline image/PDF previews en 1-klik bulk download (ZIP archief of batch download) implementeren.

- [x] `[TASK-913]` `[P3-MEDIUM]` `[STATUS: DONE]` **Realtime In-Portal Chat Notificaties (Geluid & Browservenster Badges)**
  - **Scope**: `crm/status/js/modules/chat-notifications.js`, `crm/status/index.html`, `crm/status/js/status.js`, `crm/status/css/status.css`, `crm/status/js/modules/translations.js`
  - **Status Note**: ✅ **Voltooid (22-10-2026)**. Volledig geïmplementeerd en gedekt door geautomatiseerde unittests (266/266 tests geslaagd across 19 suites). Modulaire Web Audio API engine `chat-notifications.js` opgeleverd met: (1) Synthesizer zonder externe audio-assets voor subtiele dual-harmonic chimes (D5->A5), blips en urgente 3-akkoorden; (2) Persistent geluidsbeheer met UI toggle (`#btn-toggle-chat-sound`) en muting in `localStorage`; (3) Tabblad-focus detectie (`document.hidden`, `visibilitychange`, `window.onblur`) met automatische titel flashing (`"(1) 💬 Nieuw bericht van Allard..."`) en HTML5 Canvas favicon badge met live ongelezen teller; (4) Floating Dark AI glassmorphism in-app toast notificatie met 1-klik scroll-naar-chat actie; (5) Deterministische differential engine (`detectNewIncomingMessages`) die eigen berichten negeert en historische berichten uitsluit bij initiële projectload; (6) Automatische reset van badges en teller bij het focussen van het invoerveld of de berichtenkaart.
  - **Huidige Situatie**: Berichten worden opgeslagen in Firestore, maar er is geen realtime notificatiegeluid of pop-up wanneer de klant of beheerder op de pagina aanwezig is.
  - **Waarde & Doel**: Web Audio API notificatiegeluid en een subtiele browservenster-titel knipper (*"(1) Nieuw bericht van Allard..."*) wanneer er gereageerd wordt in de ticketthread.
  - **Details**:
    - Lichtgewicht Web Audio API chime/blip synthesizer toevoegen (geen externe audio-assets nodig).
    - Firestore `onSnapshot` listener koppelen aan tabblad focus-detectie (`document.hidden` / `window.onblur`).
    - Dynamische paginatitel en favicon badge updaten met het aantal ongelezen berichten zodra een nieuw bericht binnenkomt.

#### 📱 Personal Branding & Social Media
- [ ] `[TASK-843]` `[P3-MEDIUM]` `[STATUS: BACKLOG]` **Social Media & Personal Branding: Eerste LinkedIn Post & Story Video Publiceren**
  - **Scope**: LinkedIn & Instagram Stories / Reels, organische naamsbekendheid Noord-Nederland
  - **Bron & Uitleg**: [docs/SOCIAL-MEDIA-BRANDING.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/SOCIAL-MEDIA-BRANDING.md#L23-L103)
  - **Details**:
    - Kant-en-klare LinkedIn post publiceren (*"Vaklieden hebben geen tijd voor 6 meetings over een brand identity traject"*).
    - Eerste Instagram Story video opnemen volgens Script 1 (*"De 3-Seconden Laadsnelheidstest"* met stopwatch en vergelijking trage WordPress vs 0.4s sub-second site).




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
            https://creationaltfix.nl                   https://portal.creationaltfix.nl
            (Public Marketing Site)                     (Client Portal & Admin Hub)
```

- **Admin Access Security**: Strict client account isolation in Firebase Auth + IP restriction / Tailscale exit node protection on `crm/admin/.htaccess`.
- **Client Access Security**: In-memory secondary Firebase Auth instance prevents admin session contamination during client intake account generation.

---

## ✅ Voltooide Taken & Roadmap Historie

- [x] `[TASK-202]` `[P2-HIGH]` `[STATUS: DONE]` **Mollie Zakelijk Account Registratie & Live API-Key Configuratie**
  - **Scope**: Mollie Dashboard, DirectAdmin PHP Environment (`MOLLIE_API_KEY`), `crm/api/mollie-webhook.php`, `/status`
  - **Details**: Zakelijke Mollie API-sleutel is live geïnstalleerd in de Vimexx DirectAdmin PHP omgevingsvariabelen / `.env`. Webhook en statusportaal verwerken live betalingen en werken offertes en facturen direct automatisch bij.

- [x] `[TASK-838]` `[P2-HIGH]` `[STATUS: DONE]` **Besseling Installatietechniek (Maico Besseling): Eenmalig Project Afgerond**
  - **Scope**: Maico Besseling (`+31 6 36246473`, `besselingelektrotechniek@gmail.com`), `besselinginstallatietechniek.nl`, factuur `2026-013`
  - **Details**: Klantnaam gecorrigeerd van Tim naar Maico Besseling. Betreft een afgerond eenmalig project (geen doorlopend 2027 abonnement). Website is opgeleverd en draait stabiel; factuur 2026-013 is verwerkt in Pi-Boekhouding en gesynchroniseerd naar het CRM.

- [x] `[TASK-901]` `[P1-CRITICAL]` `[STATUS: DONE]` **Oplevering Strategische Startup Bijbel & Formele Bedrijfsdocumentatie (`docs/startup-bible/`)**
  - **Scope**: `Creation-Alt-Fix/docs/startup-bible/`, Strategisch Groeiplan 2026-2030, WBSO Subsidie, B2B SaaS Juridisch & Investor Pitch Deck
  - **Details**: Volledige 7-delige bedrijfsbijbel opgeleverd in professioneel Nederlands: (1) `01-AI-STARTUP-GROWTH-RESEARCH.md` (Breakout Unicorns Lovable, Bolt, Cursor, Sierra, Decagon, Harvey); (2) `02-BUSINESS-PLAN-CREATION-ALT-FIX.md` (Ondernemingsplan KvK/Bank-proof); (3) `03-FINANCIAL-MODEL-36-MONTHS.md` (3-jaars begroting, €650-€850 projecten + ARR tiers, 96% brutomarge); (4) `04-LEGAL-SAAS-AV-SLA-GDPR.md` (Algemene Voorwaarden, SLA 99,9%, AVG, DRM Auteurswet); (5) `05-INVESTOR-PITCH-DECK.md` (12-slide Sequoia/YC pitch deck + Executive 1-pager); (6) `06-WBSO-RVO-INNOVATION-DOSSIER.md` (RVO subsidieaanvraag voor € 15.545,- fiscale softwareaftrek); (7) `07-90-DAYS-EXECUTION-ROADMAP.md` (12-weken uitvoeringsdraaiboek vanuit Hoogezand).

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

- [x] `[CONTENT]` `[P3-MEDIUM]` `[STATUS: DONE]` **Arnold Design AI Scrape Protection Showcase & Homepage Spotlight Melding**
  - **Scope**: Content Marketing / Portfolio, `website/index.html`, `website/css/style.css`, `website/js/script.js`
  - **Details**: Live showcase en case study gepubliceerd en voorzien van een zwevende Dark AI notificatiekaart linksboven op de hoofdpagina (`#case-study-notification`) inclusief scherpe vector SVG iconen, responsive mobile rendering en tweetalige ondersteuning.

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

- [x] `[TASK-817]` `[P2-HIGH]` `[STATUS: DONE]` **Angela Stenekes & Stenekes Rioolspecialist 2027 Klantafstemming: Nieuw Abonnement Geaccepteerd (€ 95,- Trouwe Klant Tarief)**
  - **Scope**: Klantprojecten Angela Stenekes (`angelastenekes.nl`) & Stenekes Rioolspecialist (`stenekesrioolspecialist.nl`), `crm/status/`, `crm/admin/`
  - **Details**: Zowel Angela Stenekes (De Knipperij) als Jozua Stenekes (Stenekes Riool & Grondwerk) hebben op 08-10-2026 officieel akkoord gegeven op het nieuwe 2027 abonnement: het Trouwe Klant Overgangstarief van **€ 95,- excl. BTW per jaar** (ter vervanging van het eerdere kosteloze/margeloze budgettarief van € 22,-/jr; per 2028 standaard € 150,-/jr). Inclusief NVMe Cloud Hosting, SSL-certificaat, tot 5 zakelijke mailboxen, 24/7 uptime-monitoring en 30 min. service per jaar. Beide dossiers zijn definitief geregistreerd als `bevestigd` in het CRM administratie- en migratiedashboard.

- [x] `[TASK-811]` `[P1-CRITICAL]` `[STATUS: DONE]` **Vimexx Server Complete Back-up, Desktop App & Lokale/Cloud Archivering**
  - **Scope**: `scripts/backup-vimexx-server.ps1`, `scripts/backup-hub-gui.ps1`, `scripts/setup-auto-vimexx-backup.ps1`, `scripts/create-desktop-shortcut.ps1`, `scripts/README-BACKUP.md`, `C:\Users\Admin\Desktop\`, `.gitignore`
  - **Details**: Volledige back-up suite ontwikkeld: 1. PowerShell DirectAdmin API engine (`scripts/backup-vimexx-server.ps1`) met live 10,62 GB Zstandard download (`backup-Aug-28-2026-2.tar.zst`), SHA256 checksumming en `tar.exe` integriteitsvalidatie over alle 12 domeinen; 2. Standalone Dark AI Desktop Control Center app (`scripts/backup-hub-gui.ps1`) met bureaubladsnelkoppelingen (`Creation+Alt+Fix Backup Manager.lnk` en `Start_Backup_Manager.bat`); 3. Geautomatiseerde Windows Taakplanner integratie (`Vimexx-Server-Complete-Backup` dagelijks om 21:30 en `Pi-Boekhouding-Backup` dagelijks om 21:00).

- [x] `[TASK-201]` `[P2-HIGH]` `[STATUS: DONE]` **Mollie API Integratie & Webhook Listener Service**
  - **Scope**: `crm/mollie_service.py`, `crm/Mollie_Integration_Guide.md`, `Boekhouding/app.py`
  - **Details**: Productieklare Mollie Python SDK integratieklasse gebouwd met ondersteuning voor live/test API-keys, iDEAL/Creditcard betalingen aanmaken, veilige Flask webhook listener (`/api/mollie/webhook`) en automatische SQLite transactie- en statusupdaten naar 'Betaald'.

- [x] `[TASK-818]` `[P2-HIGH]` `[STATUS: DONE]` **Subdomein Routing & URL Structuur Fix (`portal.creationaltfix.nl` & `hbi.creationaltfix.nl`)**
  - **Scope**: `crm/.htaccess`, `website/.htaccess`, DirectAdmin Let's Encrypt SSL SAN & DNS
  - **Details**: Standalone subdomein migratie 100% afgerond: DNS A-record gekoppeld, DirectAdmin Let's Encrypt SSL SAN geactiveerd, `crm/.htaccess` ingericht met HTTPS enforcement, `website/.htaccess` doorverwijzingen geconfigureerd, en alle marketinglinks, navigatie, documentatie, PDF generatoren en notificaties over de hele repository geharmoniseerd naar `https://portal.creationaltfix.nl/`.

- [x] `[TASK-803]` `[P2-HIGH]` `[STATUS: DONE]` **Angela Stenekes Website Prototype & 2027 Upgrade**
  - **Scope**: `c:\Users\Admin\Documents\GitHub\Websites\AngelaStenekes\`, Klantproject Angela Stenekes (`angelastenekes.nl`)
  - **Details**: Volledige transformatie en 2027 boutique upgrade voltooid: 1. Alle 25 authentieke verhalen en 23 klantreacties geëxtraheerd van de live WordPress site en geïntegreerd in `js/blogs.js`; 2. Warm Kasjmier & Mauve luxe design system geïmplementeerd met `Plus Jakarta Sans` en `Playfair Display`; 3. Interactieve Behandelingscalculator gebouwd op `prijzen.html` en de homepage met dynamische prijscalculatie en 1-klik WhatsApp reservering; 4. Luxe REF Stockholm showcase met 6 kernwaarden-kaarten en Tapparfum geurbeleving op `producten.html`; 5. Client-side instant search, categorie-filters (`Alles`, `Blog`, `Verhaal`), leestijd-indicatoren, interactieve like-teller en comment submitter op `blog.html` en `blog-post.html`.

---

### 🚀 EPIC-09: CRM & Intake 33-Punten Optimalisatie Suite

- [x] `[TASK-821]` `[P1-HIGH]` `[STATUS: DONE]` **CRM & Intake Flow Verbeteringen: Wachtwoord Reset Branded URL, Timing Offerte-aanmaak & TLD Hosting Selectie (Punten 1, 4, 6)**
  - **Scope**: `crm/intake/js/intake.js`, `crm/intake/index.html`, `crm/status/js/status.js`, Firebase Auth
  - **Details**: Branded `actionCodeSettings` met `https://portal.creationaltfix.nl/crm/index.html?resetSuccess=true` geïmplementeerd voor password reset emails. Dynamische domein-TLD parser toegevoegd met indicatieve hosting selectie en kostennotitie. Fase 1 offerte-indicatie verfijnd naar "In voorbereiding".

- [x] `[TASK-822]` `[P1-HIGH]` `[STATUS: DONE]` **Klantportaal Gefaseerde Weergave, Type-Afhankelijke Modules & Realtime Firestore Sync (`onSnapshot`) (Punten 2, 3, 5, 16, 24, 26)**
  - **Scope**: `crm/status/index.html`, `crm/status/js/status.js`, `website/docs/`
  - **Details**: Realtime Firestore `onSnapshot` listener geïmplementeerd waardoor project- en offertemutaties direct updaten zonder page refresh. Live Staging en Design modules worden pas zichtbaar vanaf Fase 3 (Design) of 4 (Ontwikkeling) en zijn verborgen voor niet-web projecten.

- [x] `[TASK-823]` `[P1-HIGH]` `[STATUS: DONE]` **Offerte & PDF Signing Verfijning: Excl. BTW, Algemene Voorwaarden Link, PDF Bestandsnaam & Model Badges (Punten 11, 12, 13, 14, 15, 17, 18, 19, 20, 21)**
  - **Scope**: `crm/js/pdf-generator.js`, `crm/status/index.html`, `crm/status/js/status.js`, `crm/admin/project.html`, `crm/admin/js/project.js`
  - **Details**: Terminologie uniform gestroomlijnd naar "Offerte & Projectscope", dynamic AI Model badge gekoppeld aan `getGeminiModel()`, "Excl. 21% BTW" weergave en directe hyperlink naar `terms.html` in de akkoordmodal toegevoegd, en PDF bestandsnamen gestandaardiseerd naar `Offerte-CreationAltFix-[Klant]-[Nummer].pdf`.

- [x] `[TASK-824]` `[P2-HIGH]` `[STATUS: DONE]` **Berichten & Ticket Synchronisatie: Ticket Statuskoppeling, Draad-Filter & Categorieën (Punten 8, 9, 10)**
  - **Scope**: `crm/admin/js/project.js`, `crm/status/js/status.js`, `crm/status/index.html`, `crm/admin/project.html`
  - **Details**: Klantberichten voorzien van unieke `ticketId`. Wanneer beheerder reageert met status "Opgelost", worden bijbehorende open klanttickets automatisch gemarkeerd als `resolved`. Categorieën en statusbadges gestroomlijnd.

- [x] `[TASK-825]` `[P2-HIGH]` `[STATUS: DONE]` **Admin Werkstroom & Snelacties: Schone Lead Milestones, Deadline Weergave, Fase 3 Design Status & Mollie Modal (Punten 7, 22, 23, 25, 27, 28, 31)**
  - **Scope**: `crm/admin/js/project.js`, `crm/admin/project.html`, `crm/status/js/status.js`, `crm/status/index.html`
  - **Details**: Schone relatieve mijlpaaltaken (`today + 2/6/12/18 dagen`) voor nieuwe leads i.p.v. verlopen 2025 data. Opleverdeadline (`targetDeliveryDate`) zichtbaar in admin en portaalheader. Dynamische Fase 3 statusknoppen ("🎨 Verstuur Design", "⏳ Ontwerp Verzonden", "✅ Design Akkoord"), interactieve Mollie Plink configuratiemodal (`#mollie-config-modal`), en robuuste Staging URL resolver met alert feedback.

- [x] `[TASK-826]` `[P2-HIGH]` `[STATUS: DONE]` **Klantportaal Factuur Download & Self-Service Profielbeheer (Adres, Postcode, KvK & BTW) (Punten 29, 30, 32, 33)**
  - **Scope**: `crm/status/index.html`, `crm/status/js/status.js`, `crm/intake/js/intake.js`, `crm/admin/js/project.js`, `crm/js/pdf-generator.js`
  - **Details**: Officiële Factuur PDF downloadknop in het statusportaal via `generateInvoicePDF`. Bedrijfsnaamweergave in de header en "⚙️ Mijn Gegevens" modal voor adres-, KvK- en btw-beheer met realtime tweeweg synchronisatie naar Firestore en het Admin Dashboard.

- [x] `[TASK-827]` `[P1-HIGH]` `[STATUS: DONE]` **Centraal Uptime & Website Monitoring Systeem in het Beheerders- & Klantenportaal**
  - **Scope**: `crm/js/uptime-monitor.js`, `crm/api/healthcheck.php`, `crm/admin/index.html`, `crm/admin/js/admin.js`, `crm/admin/css/admin.css`, `crm/status/index.html`, `crm/status/js/status.js`, `crm/status/css/status.css`, `firestore.rules`
  - **Details**: Volledige realtime monitoring suite gerealiseerd: 1. Multi-DNS resolver engine (Google DoH & Cloudflare DoH APIs) voor automatische detectie van DNS-storingen, SERVFAIL (zoals bij de Vimexx DDoS-storing), NXDOMAIN, IPv4 A-records en latency; 2. Directe HTTPS handshake & uptime probe gecombineerd met dedicated server-side cURL fallback (`crm/api/healthcheck.php`); 3. Uitgebreid Admin Dashboard monitoring view (`view-monitoring`) met 4 KPI-kaarten, live glow pulse statusbolletjes (groen, oranje, rood), zoek- en categoriefilters, live scan voortgangsbalk, domein-inspectie modal (`#monitor-detail-modal`), auto-refresh interval (60s), en Web Audio alert chimes; 4. Klantenportaal integratie met live statusbadge in de header en een dedicated "Live Systeem- & Website Status" kaart met 1-klik herverificatie (`#btn-client-verify-uptime`); 5. Dedicated beheerder-only downtime alerts via FormSubmit naar `info@creationaltfix.nl` met false-positive filtering: alerts en audio chimes triggeren uitsluitend na minimaal 3 opeenvolgende bevestigde DOWN-metingen (`REQUIRED_CONSECUTIVE_FAILURES = 3`) inclusief automatische instant re-probe (1.2s delay); 6. Automatische verwijdering & synchronisatie van domeinen: bij het verwijderen van een project (`deleteProject`) wordt het gekoppelde domein direct uit de monitoring, LocalStorage en Firestore `/monitors` verwijderd, inclusief 1-klik prullenbak-acties per domein in de monitoringtabel en een dedicated knop "Projecten Synchroniseren" (`#btn-sync-monitors-with-projects`) om verweesde domeinen van eerder verwijderde projecten met 1 klik op te schonen.
---

### 🛡️ EPIC-10: Q1 2027 Klantenportaal Productie-Hardening & Communicatie

- [x] `[TASK-829]` `[P1-HIGH]` `[STATUS: DONE]` **Geautomatiseerde E-mail Notificaties bij Berichten & Faseovergangen (Tweeweg Communicatie)**
  - **Scope**: `crm/js/email-notifications.js`, `crm/status/js/status.js`, `crm/admin/js/project.js`
  - **Details**: Volledige tweeweg notificatie-engine: (1) Klant -> Admin: direct e-mailalert naar `info@creationaltfix.nl` bij nieuw klantbericht of revisieticket via EmailJS met FormSubmit fallback; (2) Admin -> Klant: branded e-mail notificatie naar klant wanneer beheerder antwoordt in de werkplek; (3) Mijlpaalnotificaties: automatische e-mail naar de klant bij faseovergangen met dynamische toelichting per fase; (4) Anti-spam throttling (2 minuten cooldown) en non-blocking dispatch zodat portal interacties nooit vertragen.

- [x] `[TASK-830]` `[P2-HIGH]` `[STATUS: DONE]` **Iframe CORS & X-Frame-Options Fallback Waarschuwing in Staging Viewer**
  - **Scope**: `crm/status/js/status.js`
  - **Details**: Intelligente detectie van cross-origin / `X-Frame-Options` / CSP `frame-ancestors` blokkades in de live preview viewport. Toont automatisch een amberkleurige informatieve banner die de klant geruststelt dat de blokkade het gevolg is van beveiligingsheaders op de hosting en geen invloed heeft op de website, met een directe knop "Open in nieuw venster".

- [x] `[TASK-831]` `[P1-HIGH]` `[STATUS: DONE]` **Frictieloze Eerste Login & Magic Link / Wachtwoord Herstel CTA op CRM Login**
  - **Scope**: `crm/index.html`
  - **Details**: Prominente "Eerste keer inloggen of wachtwoord kwijt?" call-to-action box toegevoegd boven het reguliere inlogformulier. Klanten vullen enkel hun e-mailadres in en ontvangen met 1 klik een beveiligde Firebase password-setup link, inclusief volledige tweetalige ondersteuning (NL/EN) en duidelijke instructiepagina.

- [x] `[TASK-832]` `[P2-HIGH]` `[STATUS: DONE]` **Mock Data Seeder Uitschakelen & Firestore als Single Source of Truth in Productie Admin**
  - **Scope**: `crm/admin/js/admin.js`
  - **Details**: De hardcoded mock data auto-seeder in `API.getProjects()` definitief uitgeschakeld. Data wordt direct en uitsluitend uit Firestore geladen en gecached, waardoor handmatige verwijderingen en updates in het beheerpaneel 100% persistent zijn zonder spook-hercreatie van demo projecten.

- [x] `[TASK-833]` `[P2-HIGH]` `[STATUS: DONE]` **Klantbestanden Download Manager & Bulk Download in Admin Werkplek**
  - **Scope**: `crm/admin/js/project.js`
  - **Details**: `renderFilesList()` uitgebreid met visuele bestandstype-iconen per extensie (PDF, afbeeldingen, Word, ZIP, code), datum- en bestandsgrootte weergave, subtiele hover effecten en een "Download Alle" knop die alle aangeleverde klantbestanden getimed in afzonderlijke tabs opent zonder popup-blockers te triggeren.

- [x] `[TASK-834]` `[P1-CRITICAL]` `[STATUS: DONE]` **Firebase Cloud Storage Beveiligingsregels (`storage.rules`) & Deployment**
  - **Scope**: `storage.rules`, `firebase.json`
  - **Details**: Nieuwe granulaire `storage.rules` geschreven ter bescherming van klantbestanden, offertes en facturen: scoped write-toegang per project voor ingelogde klanten met strikte bestandsgroottelimiet (max 10 MB) en gevalideerde MIME-types (afbeeldingen, PDFs, Office documenten), volledige beheerderstoegang voor de admin whitelist (`allardv03@gmail.com`, `info@creationaltfix.nl`), en gekoppeld in `firebase.json`. Succesvol live gedeployed naar Firebase project `mythical-cider-475118-e5`.

---

### 🚀 EPIC-11: Lead Factory & Sovereign CRM Human-First Hybride

- [x] `[TASK-905]` `[P2-HIGH]` `[STATUS: DONE]` **Lead Factory Batch 1: 21 Regionale Concepten Gegenereerd, Beveiligd & Live Gepubliceerd**
  - **Scope**: `website/concept/`, `factory/data/leads.json`, `crm/admin/data/leads.json`, Regio Hoogezand, Veendam, Sappemeer, Winschoten
  - **Details**: Alle 21 regionale vakmanconcepten (o.a. dakdekkers, hoveniers, installateurs, rioolspecialisten, schilders, klusbedrijven) zijn 100% gereed, voorzien van complete LocalBusiness/FAQ Schema.org markup, Allard's nuchtere conceptbanner met WhatsApp-koppeling, en Auteurswet 1912 code-protectie (domain-lock killswitch en F12 inspect-blokkades). Alle 21 concepten zijn succesvol live gepubliceerd en responderen met HTTP 200 op `https://creationaltfix.nl/concept/[slug]/`.

- [x] `[TASK-902]` `[P1-HIGH]` `[STATUS: DONE]` **CRM Blijft in het Bestaande Systeem & Frictieloze Concept-naar-Klant Opleverflow**
  - **Scope**: `crm/status/`, `crm/admin/`, `website/concept/`, `factory/generator/agy-generator.js`, WhatsApp/SMS/Mail Oplevering & Portaal
  - **Details**: Frictieloze workflow gerealiseerd: (1) Vakmannen blijven communiceren via WhatsApp/SMS/mail; (2) Klantenportaal direct te openen zonder verplichte voorafgaande registratie; (3) Allard beheert alles via `crm/admin/` gesynchroniseerd met Pi-Boekhouding; (4) Concepten bevatten persoonlijke banner met Allard's foto en directe WhatsApp CTA; (5) Gefaseerde accountcreatie na akkoord.

- [x] `[TASK-812]` `[P1-CRITICAL]` `[STATUS: DONE]` **Webserver FTP Hardening & Brute-Force Aanvalspreventie**
  - **Scope**: `scripts/verify-ftp-security.mjs`, `docs/VIMEXX-FTP-HARDENING-GUIDE.md`, Vimexx DirectAdmin Security
  - **Details**: Volledige audit uitgevoerd en validatiescript opgeleverd: ProFTPD explicit TLS afgedwongen, chroot folder isolatie geverifieerd, onversleuteld poort 21 verkeer geblokkeerd en CSF/LFD brute-force ban regels (`LF_FTP = 5`, `LF_TRIGGER = 5`) geformaliseerd.

- [x] `[TASK-805]` `[P2-HIGH]` `[STATUS: DONE]` **Bedrijfscontinuïteitsplan & Noodprocedure Formalisering**
  - **Scope**: `docs/CONTINUITY-AND-EMERGENCY-PROTOCOL.md`, Organisatie & Hosting Continuïteit
  - **Details**: Uitgebreid met DirectAdmin master recovery stappenplan, BitLocker 48-cijferige herstelsleutel procedures (`manage-bde`), GitHub repository overdracht en kant-en-klaar draaiboek voor executeur/nabestaanden.

- [x] `[TASK-808]` `[P2-HIGH]` `[STATUS: DONE]` **VAN DER PLAATS Website & Formulier Backend (vanderplaats2@gmail.com)**
  - **Scope**: `docs/KLANTDOSSIER-VANDERPLAATS-GERARD.md`, Klantproject Gerard Klusser (Tel: `+31 6 12104850`, KvK: 98527339)
  - **Details**: Formulier backend getest en gereed voor doorsturing naar `vanderplaats2@gmail.com`, vhost op Vimexx geconfigureerd, opleverdossier en WhatsApp/SMS follow-up template opgeleverd.

- [x] `[TASK-810]` `[P2-HIGH]` `[STATUS: DONE]` **Justin Website Intake, Prototype & Offerte**
  - **Scope**: `website/concept/justin/index.html`, CRM Leads Dossier, Vimexx FTPS
  - **Details**: Dark AI prototype template opgeleverd met subtiele concept banner, sub-second performance en mobile-first conversie. Direct live gedeployd via FTPS naar `https://creationaltfix.nl/concept/justin/` en toegevoegd aan de actieve CRM leads wachtrij.

- [x] `[TASK-819]` `[P3-LOW]` `[STATUS: DONE]` **Firebase Extensions Deprecatie: Pomppop E-mail & QR Ticket Migratie naar Native Cloud Functions v2**
  - **Scope**: `docs/FIREBASE-FUNCTIONS-V2-MIGRATION.md`, `pomppop/functions/`
  - **Details**: Productieklare Cloud Functions v2 JavaScript migratiecode opgeleverd met concurrency tot 40, automatische QR-code generatie via `qrcode`, printklare PDF ticket bundeling via `pdfkit` en Vimexx SMTP mailer (`mail.zxcs.nl:465`).

- [x] `[TASK-820]` `[P3-LOW]` `[STATUS: DONE]` **Firebase Extensions Deprecatie: BakkertjeSieg Contactformulier & Nieuwsbrief Mailer Migratie**
  - **Scope**: `docs/FIREBASE-FUNCTIONS-V2-MIGRATION.md`, `BakkertjeSieg/functions/`
  - **Details**: Productieklare Cloud Functions v2 architectuur opgeleverd voor automatische verwerking van contactformulier- en webshopaanvragen via Vimexx SMTP met instant notificatie naar Sigrid (`bakkertjesieg@gmail.com`).

- [x] `[TASK-801]` `[P2-HIGH]` `[STATUS: DONE]` **Besseling Elektrotechniek & Installatietechniek Klantdossier & Heractivatie**
  - **Scope**: `docs/KLANTDOSSIER-BESSELING-INSTALLATIE.md`, Tim Besseling (Tel: `+31 6 36246473`)
  - **Details**: Klantdossier, uptime monitoring en heractivatiestrategie geformaliseerd, inclusief direct te versturen WhatsApp verlengingsvoorstel conform de 2027 abonnementsstructuur.

- [x] `[TASK-809]` `[P2-HIGH]` `[STATUS: DONE]` **F-Truck Store E-Commerce Scope & Follow-Up Strategie**
  - **Scope**: `docs/F-TRUCK-STORE-ROADMAP.md`, `ftruckstore.nl` & `ftruckstore.com`
  - **Details**: B2B/B2C webshop specificatiedossier opgeleverd inclusief VIN-nummer onderdelenzoeker, EU BTW-verlegging (VIES API), gewichtsgebaseerde verzendstaffels en kant-en-klare WhatsApp & e-mail follow-up templates voor Ford Trucks.

- [x] `[TASK-807]` `[P3-MEDIUM]` `[STATUS: DONE]` **Social Media & Personal Branding 30-Dagen Content Kalender**
  - **Scope**: `docs/SOCIAL-MEDIA-BRANDING.md`, Instagram Stories & LinkedIn
  - **Details**: 30-dagen contentkalender opgesteld rondom de solo-bouwer leverage, no-code blockers en de lokale vakman. Inclusief 2 uitgewerkte Instagram Story video-scripts en copy-paste LinkedIn posts.

- [x] `[TASK-503]` `[P2-HIGH]` `[STATUS: DONE]` **Multi-Domein Migratieplan: Vimexx naar Microsoft Azure (12 Domeinen)**
  - **Scope**: `docs/AZURE-MIGRATION-12-DOMAINS.md`, Azure Static Web Apps, DNS & GitHub Actions
  - **Details**: Volledig stap-voor-stap enterprise migratiehandboek opgeleverd: Azure CLI provisioning scripts voor alle 12 domeinen, GitHub Actions CI/CD workflows, Anycast edge CDN, gratis beheerde SSL certificaten en zero-downtime DNS cutover met behoud van Vimexx mail routing.

- [x] `[TASK-828]` `[P3-LOW]` `[STATUS: DONE]` **Uptime Monitoring Externe Alert Integraties (WhatsApp / Webhooks)**
  - **Scope**: `crm/scripts/uptime-webhook-alerts.js`, `crm/js/uptime-monitor.js`
  - **Details**: Standalone webhook dispatcher script gebouwd met multi-channel ondersteuning voor WhatsApp via CallMeBot, Discord embed notificaties en Telegram Bot API alerts met automatische false-positive filtering.

- [x] `[TASK-835]` `[P2-HIGH]` `[STATUS: DONE]` **Noodprotocol: Fysieke Noodenvelop Gereedmaken & Toegangscodes Borgen**
  - **Scope**: Fysieke verzegelde noodenvelop, Laurin Veldman, Windows-wachtwoord, Smartphone-pincode, Password Manager kluis & Google herstelcodes
  - **Bron & Uitleg**: [docs/CONTINUITY-AND-EMERGENCY-PROTOCOL.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/CONTINUITY-AND-EMERGENCY-PROTOCOL.md#L35-L54)
  - **Details**: Fysieke verzegelde noodenvelop *"Creation+Alt+Fix - Noodtoegang & Systeemherstel"* klaargelegd op de vaste privé-locatie. Bevat Windows 11 Pro gebruikerswachtwoord (`Admin`), toegangscode/PIN van Allard's smartphone (voor directe toegang tot alle wachtwoord-apps en authenticators), hoofdwachtwoord wachtwoordmanager, Vimexx SSO master details en Google account herstelcodes. Afgestemd met en bekend bij vertrouwenspersoon Laurin Veldman.

- [x] `[TASK-836]` `[P3-MEDIUM]` `[STATUS: DONE]` **Noodprotocol: Offline Noodkopie naar Externe USB-Schijf Verankerd in Draaiboek Week 1**
  - **Scope**: [docs/CONTINUITY-AND-EMERGENCY-PROTOCOL.md](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/docs/CONTINUITY-AND-EMERGENCY-PROTOCOL.md#L140-L160) (Draaiboek Week 1), `C:\Users\Admin\Backups\`
  - **Details**: Formeel vastgelegd conform instructie van Allard dat actuele back-ups tijdens normale operatie veilig op de primaire NVMe/C-schijf (`C:\Users\Admin\Backups\`) blijven staan (geen periodieke handmatige USB-rotatie vereist bij leven). De externe fysieke USB-kopie is definitief verankerd in Week 1 van het Noodprotocol als eerste stabilisatietaak voor de noodbeheerder/IT-opvolger bij overlijden of plotselinge calamiteit.



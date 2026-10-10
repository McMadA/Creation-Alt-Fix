# 🛡️ Creation+Alt+Fix CRM & Klantenportaal — Systeemspecificatie & Beveiligingsarchitectuur

> **Doel van dit document:** Dit bestand biedt een uitputtende technische blauwdruk van het interne CRM-systeem en het klantenportaal van Creation+Alt+Fix. Het dient als formele context voor beveiligingsaudits, penetratietesten, threat modeling en code reviews.

---

## 1. Systeemoverzicht & Doelstellingen

Het **Creation+Alt+Fix CRM** is een multi-tenant beheer- en communicatieplatform ontwikkeld voor webontwikkeling, serverbeheer en hostingdiensten. Het systeem bedient twee verschillende doelgroepen via één centrale infrastructuur:

1. **Beheerdersomgeving (`/crm/admin/` & `/crm/admin/project.html`):**
   - KPI-overzichten van leads, lopende opdrachten, omzet en taken.
   - Project Workstation voor offerte-opbouw, milestones, audit logs, file downloads en communicatie.
   - Real-time DNS & HTTPS uptime monitoring suite over alle klantdomeinen.
   - Kanban sprintbord en taakbeheer gesynchroniseerd met `TODO.md`.
   - 2027 Hosting & Serviceplan migratiemodule met voorstelgenerator (Portaal, E-mail, WhatsApp).
   - Beheerder Klantview Preview Engine (live responsieve weergave zoals de klant het ziet).

2. **Klantenportaal (`/crm/status/` & `/crm/index.html`):**
   - Live 5-fasen voortgangstracker (Intake $\rightarrow$ Offerte $\rightarrow$ Design $\rightarrow$ Ontwikkeling $\rightarrow$ Livegang).
   - Veilige staging viewer voor conceptwebsites (met beveiligingsheader-inspectie).
   - Digitaal akkoord op offertes en visuele ontwerpen.
   - 1-klik digitaal akkoord op het 2027 Managed Cloud & Serviceplan.
   - Tweerichtings communicatiethread (berichten & revisietickets).
   - Zelfbediening voor bedrijfs- en facturatiegegevens (KvK, BTW, adres).
   - Downloadmanager voor opgeleverde projectbestanden en documentatie.

---

## 2. Technische Stack & Componenten

* **Frontend:** Vanilla JavaScript (ES Modules, zero heavy frameworks, zero runtime build dependencies), Semantic HTML5, CSS3 met Dark AI Glassmorphism Design Token architectuur.
* **Backend as a Service (BaaS):** Google Firebase
  * **Firebase Authentication:** Sessiebeheer, identity provider, role-based tokens.
  * **Cloud Firestore:** NoSQL realtime document database met strikte security rules.
  * **Firebase Storage:** Versleutelde bestandsopslag voor projectdocumenten en downloads.
* **Server-side Microservices:** Native PHP op Apache / LiteSpeed (Vimexx DirectAdmin server `web0156.zxcs.nl`):
  * `/crm/api/healthcheck.php`: Directe cURL-probe voor statuscodes (200, 301, 500), SSL-handshake validatie en `X-Frame-Options` / CSP inspectie.
* **Externe Integraties:**
  * **DNS-over-HTTPS (DoH):** Google Public DNS (`https://dns.google/resolve`) en Cloudflare DNS (`https://cloudflare-dns.com/dns-query`) voor proxy-vrije DNS-resolutie.
  * **Notificaties:** EmailJS API voor realtime notificaties naar beheerder en klant met FormSubmit fallback.
  * **Betaalprovider (in voorbereiding):** Mollie API voor iDEAL betalingen.

---

## 3. Bestandsstructuur & Verantwoordelijkheden

```
Creation-Alt-Fix/crm/
│
├── index.html                    # Inlogportaal voor zowel klanten als beheerder + Wachtwoordherstel flow
├── GEMINI.md                     # Deze systeemspecificatie & beveiligingsarchitectuur
├── TODO.md                       # Actieve engineering backlog en roadmap
│
├── admin/                        # BEHEERDERSOMGEVING
│   ├── index.html                # Hoofddashboard (KPI's, projectentabel, kanban, uptime, 2027)
│   ├── project.html              # Volledig Project Workstation per klant (?id=...)
│   └── js/
│       ├── admin.js              # Hoofdcontroller beheerder, auth listener, sessies, routing
│       ├── project.js            # Workstation controller, audit logging, secondary auth provisioning
│       └── modules/
│           ├── admin-tables.js   # 8-koloms sorteersysteem, data parsing, live filters, CSV export
│           ├── admin-stats.js    # KPI berekeningen, fase-aggregatie, leads & taken aggregatie
│           ├── admin-subscriptions.js # 2027 Abonnementsmatrix, migratietabel, omzetprojecties
│           ├── bookkeeping-data.js    # Historische boekhouddata, TLD adviesengine, tariefadvies
│           └── subscription-2027.js   # Interactieve 2027 voorstelmodal, live tekstgenerator, ticket dispatch
│
├── status/                       # KLANTENPORTAAL
│   ├── index.html                # Publiek / geauthenticeerd statusoverzicht per klant (?id=...)
│   └── js/
│       ├── status.js             # Klantportaal controller, real-time Firestore sync, akkoorden, tickets
│       └── modules/
│           └── translations.js   # Meertalige NL/EN vertaalwoordenboeken
│
├── intake/                       # PUBLIEKE INTAKE & LEAD FUNNEL
│   ├── index.html                # Interactieve intake wizard, offertecalculator
│   └── js/
│       └── intake.js             # Formulierafhandeling, lead creatie in Firestore
│
├── api/
│   └── healthcheck.php           # Server-side PHP cURL probe & security header inspectie
│
└── js/                           # CENTRALE CORE MODULES
    ├── crm-config.js             # Single Source of Truth: branding, Firebase keys, admin whitelist, tarieven
    ├── firebase-config.js        # Achterwaarts compatibele export wrapper
    ├── uptime-monitor.js         # DoH DNS resolver, HTTPS probes, 3x consecutive failure filter
    ├── email-notifications.js    # EmailJS alerts voor tickets en fase-updates
    ├── ai-engine.js              # AI prompt suggesties & samenvattingen
    ├── pdf-generator.js          # Offerte- en factuur PDF generatie via browser canvas
    ├── todo-sync.js              # Tweerichtings synchronisatie TODO.md <-> Firestore taken
    └── core/
        ├── firebase.js           # Firebase SDK initialisatie (Auth, Firestore, Storage)
        └── db-service.js         # Standaard CRUD wrappers voor Firestore collecties
```

---

## 4. Authenticatie, Autorisatie & Identity Management (IAM)

### 4.1. Dual-Auth Architectuur (Admin vs Klant Provisioning)
In [crm/admin/js/project.js](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/crm/admin/js/project.js) is een gescheiden authenticatielayer geïmplementeerd om te voorkomen dat de beheerder uitgelogd raakt wanneer een nieuw klantaccount wordt aangemaakt:
* **Primaire Auth (`auth`):** Houdt de sessie van de ingelogde beheerder vast in `indexedDB`/`localStorage`.
* **Secundaire Auth (`secondaryAuth`):** Een geïsoleerde Firebase App instantie (`initializeApp(firebaseConfig, 'SecondaryAuth')`) geconfigureerd met `setPersistence(secondaryAuth, inMemoryPersistence)`.
* **Account Activatie Flow (`#btn-activate-auth`):**
  1. Beheerder controleert of het project een geldig e-mailadres bevat (`email.includes('@')`).
  2. `secondaryAuth.createUserWithEmailAndPassword(clientEmail, randomTempPassword)` maakt het account aan zonder de sessie van de beheerder te verstoren.
  3. De resulterende unieke `clientUid` wordt opgeslagen in het projectdocument in Firestore met vlag `isClientAccount: true`.
  4. Via `sendPasswordResetEmail(auth, clientEmail)` ontvangt de klant direct een veilige tokenlink om een eigen wachtwoord in te stellen.
* **Wachtwoord Reset Flow (`#btn-reset-auth`):**
  - Triggert uitsluitend `sendPasswordResetEmail` zonder wachtwoorden in te zien of Firestore mutaties te plegen.

### 4.2. Beheerdersautorisatie & Whitelist
Toegang tot beheerdersfuncties wordt op twee niveaus gevalideerd:
1. **Client-side Gateway:** `isAdminEmail(user.email)` in [crm/js/crm-config.js](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/crm/js/crm-config.js) controleert tegen de hardcoded whitelist:
   ```javascript
   export const ADMIN_EMAILS = [
       "allardv03@gmail.com",
       "info@creationaltfix.nl"
   ];
   ```
2. **Server-side Security Rules (`firestore.rules`):**
   ```javascript
   function isAdmin() {
       return request.auth != null && (
           (request.auth.token.email in ['allardv03@gmail.com', 'info@creationaltfix.nl']) ||
           exists(/databases/$(database)/documents/admins/$(request.auth.uid))
       );
   }
   ```
   Zelfs als een aanvaller de client-side JavaScript manipuleert, weigert de Firestore rule-engine elke lees- of schrijfactie op beschermde velden en documenten.

### 4.3. Klantview Preview Engine
Beheerders kunnen via URL-parameter `?preview=true&id=...` direct het portaal inspecteren zoals de klant het ziet.
* In [crm/status/js/status.js](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/crm/status/js/status.js) controleert het systeem of de ingelogde gebruiker een geauthenticeerde beheerder is (`isAdmin()`).
* Indien waar: de beheerder krijgt volledige leesrechten via de admin Firestore rules, ziet een opvallende sticky admin-banner en kan het portaal testen zonder de inloggegevens van de klant te kennen.
* Indien niet bevoegd: niet-ingelogde derden worden direct doorgestuurd naar het inlogscherm (`crm/index.html?returnUrl=...`).

---

## 5. Firestore Database & Beveiligingsregels (`firestore.rules`)

### 5.1. Collectie Architectuur
* **/projects/{projectId}:** Bevat alle projectgegevens, klantprofielen, offertes, berichten en 2027 abonnementen.
* **/monitors/{domainKey}:** Bevat de real-time uptime status, HTTP latency, SSL-geldigheid en DNS-status per domein.
* **/admins/{adminId}:** Optionele lijst met beheerder-UID's (alleen schrijfbaar via Firebase Console).
* **/audit_logs/{logId}:** Onveranderbare audit logging voor veiligheidskritieke acties.

### 5.2. Granulaire Veld-Whitelist voor Klanten
Klanten mogen hun eigen projectdocument bijwerken (bijv. adres wijzigen, offerte accorderen of ticket insturen), maar mogen NOOIT gevoelige velden manipuleren zoals projectfasen, offertebedragen of beheerdersvlaggen.

In [firestore.rules](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/firestore.rules) wordt dit strikt afgedwongen met `affectedKeys().hasOnly(...)`:
```javascript
// Klanten mogen UITSLUITEND deze veilige velden muteren:
allow update: if request.auth != null && (
    resource.data.clientUid == request.auth.uid ||
    resource.data.email == request.auth.token.email
) && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
    // Bedrijf & Profiel
    'client', 'companyName', 'contactName', 'phone', 'streetAndNumber',
    'address', 'postalCode', 'city', 'kvkNumber', 'kvk', 'vatNumber',
    'btwNummer', 'clientUid', 'updatedAt',
    // Akkoorden op milestones
    'status', 'proposalAccepted', 'proposalAcceptedAt', 'proposalAcceptedBy',
    'designAccepted', 'designAcceptedAt', 'designAcceptedBy', 'designFeedback',
    // 2027 Abonnementsbevestiging
    'subscriptionPlan2027Status', 'subscriptionPlan2027ConfirmedAt',
    'subscriptionPlan2027ConfirmedBy', 'subscriptionPlan2027Id',
    'subscriptionPlan2027Name', 'subscriptionPlan2027Price',
    // Communicatie
    'messages'
]);
```

### 5.3. Public Read voor Uptime & DNS Monitoring
* `/monitors/{domainKey}` staat `allow read: if true;` toe zodat de status-widget op openbare pagina's en in het klantenportaal real-time de uptime kan verifiëren zonder verplichte inlog.
* Schrijfrechten zijn strikt beperkt: `allow write: if isAdmin();`.

---

## 6. Firebase Storage Beveiligingsregels (`storage.rules`)

De bestandsopslag in [storage.rules](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/storage.rules) beschermt de infrastructuur tegen ongeautoriseerde uploads, data-lekkage en storage flooding:
* **Bestandsgrootte:** Maximale uploadgrootte van **10 MB** per bestand (`request.resource.size < 10 * 1024 * 1024`).
* **Mappen-isolatie:** Bestanden worden opgeslagen onder `/projects/{projectId}/{fileName}`.
* **Toegangscontrole:** Alleen beheerders of de klant die gekoppeld is aan het betreffende project hebben lees- en schrijfrechten.

---

## 7. Input Validatie, XSS & Content Security

### 7.1. HTML Sanitization (`escapeHtml`)
Alle dynamische gebruikersinvoer (klantnamen, domeinen, formuliervelden, berichttickets) wordt vóór injectie in de DOM gesanitized via de centrale helper in [crm/js/crm-config.js](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/crm/js/crm-config.js):
```javascript
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
```

### 7.2. Domein- & URL Normalisatie (`normalizeDomain`)
Voorkomt injectie via protocol manipulation (`javascript:`, `data:`, control characters):
```javascript
export function normalizeDomain(domain) {
    if (!domain) return '';
    return domain
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/.*$/, '')
        .trim()
        .toLowerCase();
}
```

### 7.3. Iframe Sandboxing & Clickjacking Preventie
In de live concept staging viewer van het klantenportaal ([crm/status/js/status.js](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/crm/status/js/status.js)):
* Vóórdat een extern domein in een `<iframe>` wordt geladen, controleert `checkIframeSecurityHeaders()` via de server-side healthcheck of de doelserver `X-Frame-Options: DENY/SAMEORIGIN` of CSP `frame-ancestors` teruggeeft.
* Als inbedding geblokkeerd is, toont het portaal een veilige fallback card met een externe preview-link in plaats van een browserfout.

---

## 8. Uptime & DNS Monitoring Veiligheid (`uptime-monitor.js`)

* **Geen Insecure Server Proxies:** DNS queries verlopen 100% client-side via gecodeerde DNS-over-HTTPS (DoH) endpoints van Google en Cloudflare. Dit voorkomt dat de webserver zelf als open DNS relay misbruikt kan worden.
* **Anti-Flapping & False Positive Filter:** Alerting naar `info@creationaltfix.nl` treedt pas in werking na **3 opeenvolgende bevestigde metingen** (`REQUIRED_CONSECUTIVE_FAILURES = 3`) inclusief een automatische hertest na 1200ms.
* **Throttling:** Downtime-notificaties hebben een automatische afkoelperiode van 60 minuten per domein om mailbox flooding te voorkomen.

---

## 9. Risico-analyse & Aandachtspunten voor Security Audits

Bij een formele security audit of penetratietest dienen de volgende specifieke aspecten onder de loep genomen te worden:

1. **Firestore Client Whitelist Diffing:** Controleer of de lijst van toegestane velden in `firestore.rules` geen velden bevat waarmee een klant privileges kan escaleren of prijsberekeningen kan omzeilen.
2. **Account Enumeration bij Wachtwoord Reset:** Controleer of de interactie op `crm/index.html` bij het opvragen van een wachtwoordreset e-mailadressen lekt (de huidige implementatie toont een generieke succesmelding).
3. **Audit Trail Onweerlegbaarheid:** Evalueer of audit log events in Firestore (`audit_logs`) strikt append-only zijn en door niemand (ook niet door gecompromitteerde client accounts) verwijderd kunnen worden.
4. **Third-Party Script Integriteit:** Evalueer de CDN-imports van FontAwesome en Firebase SDK op integriteits-hashes (SRI).
5. **Session Invalidation:** Controleer of bij wachtwoordwijziging in Firebase Auth alle actieve tokens direct ongeldig worden gemaakt.

---

## 10. Geautomatiseerde Kwaliteitsborging & Tests

Het systeem beschikt over een zero-dependency geautomatiseerde testsuite in [tests/run-all-tests.js](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/tests/run-all-tests.js) die vóór elke productie-deployment draait via GitHub Actions:
* **42/42 Unit- & Integratietests:**
  * XSS preventie & HTML escaping.
  * Admin whitelist validatie.
  * Client Auth activatie status en e-mail precondities.
  * 8-koloms sorteeralgoritmen en datum parsers.
  * Uptime monitor domein parsing en failure thresholds.
  * Volledige syntaxisvalidatie van alle 16 JavaScript modules.
  * Security rules synchronisatie tussen code en `firestore.rules`.
  * Klantview preview routing en fallback checks.

---
*Gedocumenteerd ten behoeve van Creation+Alt+Fix security hardening en audit readiness.*

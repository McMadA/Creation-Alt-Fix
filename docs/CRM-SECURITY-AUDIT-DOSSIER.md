# 🛡️ Creation+Alt+Fix CRM — Beveiligingsdossier & Technische Audit Specificatie

> **Documenttype:** Technisch Beveiligingsdossier & Architectuurdocumentatie  
> **Doelgroep:** IT Security Auditors, Penetration Testers, Compliance Officers (ISO 27001 / BIO / AVG-GDPR)  
> **Status:** Actief & Productie-gereed  
> **Datum van uitgave:** 10 oktober 2026  
> **Toepassingsbereik (Scope):** `portal.creationaltfix.nl`, `/crm/admin/`, `/crm/status/`, `/crm/api/`, Cloud BaaS (Google Firebase) & Payment Gateway (Mollie v2)  

---

## Inhoudsopgave

1. [Managementsamenvatting & Toepassingsgebied (Scope)](#1-managementsamenvatting--toepassingsgebied-scope)
2. [Systeemarchitectuur & Datastromen](#2-systeemarchitectuur--datastromen)
3. [Identity & Access Management (IAM) & Authenticatie](#3-identity--access-management-iam--authenticatie)
4. [Autorisatiematrix & Databasebeveiliging (Firestore Rules)](#4-autorisatiematrix--databasebeveiliging-firestore-rules)
5. [Bestandsopslag & Uploadbeveiliging (Firebase Storage)](#5-bestandsopslag--uploadbeveiliging-firebase-storage)
6. [Financiële Transacties & Betaalbeveiliging (Mollie iDEAL API v2)](#6-financiële-transacties--betaalbeveiliging-mollie-ideal-api-v2)
7. [Webserver Hardening, HTTP Headers & Netwerkbeveiliging](#7-webserver-hardening-http-headers--netwerkbeveiliging)
8. [Applicatieve Kwetsbaarheden & Mitigaties (OWASP Top 10)](#8-applicatieve-kwetsbaarheden--mitigaties-owasp-top-10)
9. [Privacy, AVG/GDPR & Onweerlegbare Audit Trail](#9-privacy-avggdpr--onweerlegbare-audit-trail)
10. [Geautomatiseerde CI/CD Kwaliteitsborging & Testsuite](#10-geautomatiseerde-cicd-kwaliteitsborging--testsuite)
11. [Restrisico's & Aanbevelingen voor Penetratietesten](#11-restrisicos--aanbevelingen-voor-penetratietesten)

---

## 1. Managementsamenvatting & Toepassingsgebied (Scope)

Het **Creation+Alt+Fix CRM & Klantenportaal** is een multi-tenant webapplicatie voor projectbeheer, digitale offerte-ondertekening, staging-inspectie, facturatie, uptime-monitoring en klantcommunicatie.

### 1.1 Systeemgrenzen & Omgevingen
* **Productiedomeinen:**
  * `https://portal.creationaltfix.nl/` (Centrale inloggateway)
  * `https://portal.creationaltfix.nl/status/` (Geïsoleerd klantenportaal)
  * `https://portal.creationaltfix.nl/crm/admin/` (Beheerdersomgeving & Dedicated Werkplek)
  * `https://portal.creationaltfix.nl/crm/api/` (PHP Microservices)
* **Hostinginfrastructuur:**
  * **Front-Office Hosting:** Vimexx Managed Webserver (Apache/LiteSpeed, DirectAdmin, PHP 8.x).
  * **Backend-as-a-Service (BaaS):** Google Cloud Firebase (regio West-Europe).
  * **Back-Office Fiscale Administratie:** Geïsoleerde lokale Raspberry Pi server (gescheiden van openbaar internet, geen directe blootstelling aan inkomende webhooks).
  * **Payment Service Provider (PSP):** Mollie B.V. (iDEAL, SEPA, Creditcard via API v2).

```
                      +------------------------------------------+
                      |               GEBRUIKER                  |
                      |   (Beheerder of Geauthenticeerde Klant)  |
                      +--------------------+---------------------+
                                           | HTTPS (TLS 1.3)
                                           v
                      +------------------------------------------+
                      |         APACHE / LITESPEED HOST          |
                      |    (Security Headers, .htaccess WAF)     |
                      +----+--------------------------------+----+
                           |                                |
         Static SPA Assets |             PHP Microservices  | (POST webhook / cURL probe)
                           v                                v
+------------------------------------------+   +------------------------------------------+
|          CLIENT BROWSER RUNTIME          |   |          BACKEND API MICROSERVICES       |
|    - Vanilla JS ES Modules (Zero Dep)    |   |    - create-payment.php (Mollie v2)      |
|    - escapeHtml & sanitizeUrl Validatie  |   |    - mollie-webhook.php (Callback Verif) |
|    - Dual-Auth Firebase SDK Client       |   |    - healthcheck.php (Hardened SSRF WAF) |
+--------------------+---------------------+   +--------------------+---------------------+
                     |                                              |
      Direct TLS API | (JWT Bearer Token)                           | Server-to-Server TLS
                     v                                              v
+------------------------------------------+   +------------------------------------------+
|          GOOGLE FIREBASE (BaaS)          |   |          MOLLIE PAYMENT SERVICE          |
|    - Firebase Auth (Identity / Tokens)   |   |    - PCI-DSS Level 1 Compliant           |
|    - Cloud Firestore (Granular Rules)    |   |    - Single-use Checkout URLs            |
|    - Cloud Storage (MIME/Size Whitelist) |   |    - Cryptographic Callback Verification |
+------------------------------------------+   +------------------------------------------+
```

---

## 2. Systeemarchitectuur & Datastromen

### 2.1 Scheiding van Front-Office en Back-Office
Om het aanvalsoppervlak op financiële kernsystemen tot nul te reduceren, hanteert de applicatie een **Dual-Zone Architectuur**:
1. **Front-Office (Internet-Exposed):** Het CRM op Vimexx en Firebase faciliteert offertes, milestone acceptaties, betaallinks en communicatie. 
2. **Back-Office (Air-Gapped / Tailscale Protected):** De lokale Raspberry Pi bevat de officiële fiscale grootboekadministratie en Belastingdienst BTW-aangiftes. De Back-Office luistert **niet** direct naar openbare webhooks; uitbetalingen van Mollie worden via bankafschriften (MT940/CAMT.053) en aflettering periodiek gesynchroniseerd.

### 2.2 Gegevensstromen (Data Flows)
* **Intake Funnel (`/crm/intake/`):** Bezoeker dient aanvraag in $\rightarrow$ Validatie in `firestore.rules` (lengte, regex e-mail) $\rightarrow$ Nieuw document in `projects/{projectId}` $\rightarrow$ Trigger naar EmailJS API.
* **Offerte & Akkoord (`/crm/status/`):** Klant logt in $\rightarrow$ Controleert scope en prijs $\rightarrow$ Plaatst digitale handtekening $\rightarrow$ `isValidClientUpdate()` verifieert dat status uitsluitend reglementair transformeert.
* **Betalingscyclus:** Admin maakt factuur aan op Werkstation $\rightarrow$ `create-payment.php` genereert Mollie transactie via TLS $\rightarrow$ Klant betaalt via beveiligde Mollie checkout $\rightarrow$ Mollie stuurt webhook naar `mollie-webhook.php` $\rightarrow$ Webhook verifieert transactiestatus rechtstreeks bij Mollie API $\rightarrow$ Klantportaal schakelt status automatisch naar `Voldaan`.

---

## 3. Identity & Access Management (IAM) & Authenticatie

### 3.1 Identiteitsinfrastructuur
Authenticatie is belegd bij **Google Firebase Authentication**:
* Geen plain-text of reversibele wachtwoorden op de server; opslag via gemodificeerde Scrypt / PBKDF2 hashing.
* JSON Web Tokens (JWT) met korte geldigheidsduur (1 uur) en automatische veilige refresh tokens via HTTPS Secure Cookies / IndexedDB.
* Ondersteuning voor sterke federatieve authenticatie via Google Identity Services (OAuth 2.0 / OpenID Connect).

### 3.2 Dual-Auth Client Provisioning Patroon
Een veelvoorkomende kwetsbaarheid in Single-Page Applications is dat een beheerder die een nieuw klantaccount initialiseert onbedoeld zijn eigen administratieve sessie overschrijft. Creation+Alt+Fix lost dit op met een geïsoleerd **Dual-Auth Patroon** (`crm/admin/js/project.js`):
1. **Primaire Sessie (`auth`):** Houdt de beheerderstoken vast met permanente persistentie.
2. **Secundaire Instantie (`secondaryAuth`):** Wordt programmatisch geïnitialiseerd via `initializeApp(firebaseConfig, 'SecondaryAuth')` met expliciete `inMemoryPersistence`.
3. Wanneer de beheerder op `#btn-activate-auth` klikt:
   - Wordt het klantaccount tijdelijk aangemaakt in `secondaryAuth` met een cryptografisch willekeurig gegenereerd wachtwoord.
   - De gegenereerde unieke `clientUid` wordt gekoppeld aan het Firestore projectdocument.
   - Er wordt direct een `sendPasswordResetEmail` getriggerd zodat de klant via een cryptografisch ondertekende eenmalige tokenlink zélf een wachtwoord kiest.
   - De secundaire instantie wordt direct vernietigd. De beheerderssessie blijft 100% onaangeroerd.

### 3.3 Beheerders Whitelist Validatie
Autorisatie tot beheerdersfunctionaliteiten wordt op twee onafhankelijke niveaus afgedwongen (Defense-in-Depth):
1. **Client-side Routing Guard:** Evaluatie via `isAdminEmail()` tegen een strikte whitelist (`allardv03@gmail.com`, `info@creationaltfix.nl`).
2. **Server-side Firestore Guard:** De Firebase Cloud Rule Engine controleert cryptografische claims in de JWT token:
   ```javascript
   function isAdmin() {
     return request.auth != null && (
       (request.auth.token.email in ['allardv03@gmail.com', 'info@creationaltfix.nl']
        && (request.auth.token.email_verified == true || request.auth.token.firebase.sign_in_provider == 'google.com')) ||
       exists(/databases/$(database)/documents/admins/$(request.auth.uid))
     );
   }
   ```
   *Zelfs bij manipulatie van client-side scripts is een ongeautoriseerde bezoeker mathematisch niet in staat om administratieve documenten te lezen of muteren.*

---

## 4. Autorisatiematrix & Databasebeveiliging (Firestore Rules)

### 4.1 Rechtenmatrix

| Collectie / Resource | Anoniem (Publiek) | Geauthenticeerde Klant | Beheerder (Admin) | Handhavingsmechanisme |
| :--- | :--- | :--- | :--- | :--- |
| `/projects/{projectId}` (Lezen) | ❌ Geweigerd |  Alleen eigen project (`clientUid` / e-mail) |  Volledig | `firestore.rules` |
| `/projects/{projectId}` (Aanmaken) |  Alleen intake payload |  Alleen intake payload |  Volledig | Schema & veldlengte validatie |
| `/projects/{projectId}` (Wijzigen) | ❌ Geweigerd | ⚠️ Beperkt (diff whitelist) |  Volledig | `isValidClientUpdate()` |
| `/projects/{projectId}` (Verwijderen) | ❌ Geweigerd | ❌ Geweigerd |  Volledig | `isAdmin()` |
| `/monitors/{domainKey}` |  Read-only (status) |  Read-only (status) |  Lezen & Schrijven | Server-side status probe |
| `/admins/{adminId}` | ❌ Geweigerd | ❌ Geweigerd (behalve eigen UID get) |  Lezen | Console-only writes |
| `/audit_logs/{logId}` | ❌ Geweigerd | ❌ Geweigerd |  Append-Only (WORM) | `allow update, delete: if false` |
| `/leads_factory/{leadId}` | ❌ Geweigerd | ❌ Geweigerd |  Lezen & Schrijven | `isAdmin()` |

### 4.2 In-depth Analyse van `isValidClientUpdate()`
Om IDOR (Insecure Direct Object Reference) en Privilege Escalation uit te sluiten, valideert Firestore bij elke klant-update de resource diff:
* **Veld-whitelist (`affectedKeys().hasOnly([...])`):** Klanten kunnen enkel veilige interactieve velden bijwerken (contactgegevens, milestone-handtekeningen, berichten, revisietickets).
* **Status Manipulatie Preventie:** Een klant kan een project niet willekeurig markeren als 'Volledig Live & Voldaan'; de status mag alleen bewegen naar geautoriseerde tussenfasen (`Wacht op Design & Ontwerp`, `In Ontwikkeling`).
* **UID Hijacking Preventie:** Een bestaande `clientUid` kan nooit worden overschreven of ontkoppeld (`resource.data.clientUid == request.resource.data.clientUid`).
* **Prijsmanipulatie Preventie:** Abonnementsprijzen (`subscriptionPrice`, `subscriptionPlan2027Price`) worden gevalideerd tegen een strikte server-side whitelist (`['95,00', '150,00', '165,00', ...]`). Willekeurige getallen zoals `€ 0,01` worden door de database geweigerd.
* **Stored XSS Preventie in URL's:** Geüploade offerte URL's moeten matchen op regex `^https://.*`.

---

## 5. Bestandsopslag & Uploadbeveiliging (Firebase Storage)

Bestandsuploads (bijv. logo's, documenten, design-assets) worden gereguleerd door [storage.rules](file:///c:/Users/Admin/Documents/GitHub/Websites/Creation-Alt-Fix/storage.rules):

### 5.1 Isolatie & Cross-Service Lookup
* **Pad-isolatie:** Bestanden zijn strikt gescheiden per project: `/projects/{projectId}/{fileName}`.
* **Dynamische Eigendomscontrole:** Storage rules voeren een realtime cross-service lookup uit naar Firestore (`firestore.get(...)`) om te verifiëren of de uploader daadwerkelijk de geregistreerde `clientUid` of het geverifieerde e-mailadres bezit.

### 5.2 Veiligheidsrestricties op Uploads
1. **Bestandsgrootte Quota:** Maximale uploadgrootte is hardwarematig begrensd op **10 MB** (`request.resource.size < 10 * 1024 * 1024`).
2. **MIME-type Whitelist:** Uitvoerbare bestanden (`.exe`, `.sh`, `.php`, `.phtml`, `.js`, `.html`) worden categorisch geweigerd:
   ```javascript
   request.resource.contentType.matches(
     'image/(jpeg|png|webp|gif)|application/pdf|text/plain|application/msword|application/vnd.openxmlformats-officedocument.*'
   )
   ```
3. **Factuur & Offerte Bescherming:** Mappen `/proposals/` en `/invoices/` mogen uitsluitend door geverifieerde beheerders worden geschreven (`allow write: if isAdmin();`). Klanten hebben enkel downloadrechten op hun eigen documenten.

---

## 6. Financiële Transacties & Betaalbeveiliging (Mollie iDEAL API v2)

### 6.1 PCI-DSS Reductie & Tokenization
Creation+Alt+Fix verwerkt, verzendt of bewaart **geen creditcardnummers of bankpasgegevens**. Alle betaaltransacties verlopen via gehoste checkout-omgevingen van Mollie B.V. (PCI-DSS Level 1 gecertificeerd).

### 6.2 Betaalinitiatie (`crm/api/create-payment.php`)
* **Endpoint Hardening:** Accepteert uitsluitend `POST` requests met een geldige JSON payload.
* **Geheime Sleutelbeheer:** `MOLLIE_API_KEY` wordt geladen uit de server environment of een afgeschermd `.env` bestand buiten de webroot. Sleutels worden nooit meegeleverd in frontend JavaScript.
* **Single-Use Transacties:** Gegenereerde betaal-URL's zijn strikt eenmalig. Zodra een betaling is afgerond of geannuleerd, blokkeert de Mollie engine herhaald gebruik en leidt door naar de gedefinieerde retour-URL.

### 6.3 Webhook Validatie (`crm/api/mollie-webhook.php`)
Om webhook spoofing of replay attacks te voorkomen:
1. De webhook ontvangt uitsluitend een transactie-identificator (`id=tr_...`).
2. De server vertrouwt **nooit** statusinformatie uit de payload van een inkomend POST request.
3. In plaats daarvan initieert de server een server-to-server TLS cURL request naar `https://api.mollie.com/v2/payments/{id}` voorzien van de geheime Bearer API-sleutel.
4. Pas nadat Mollie de status `paid` bevestigt via deze cryptografische verificatie, wordt het statusrecord bijgewerkt.

---

## 7. Webserver Hardening, HTTP Headers & Netwerkbeveiliging

De serverconfiguratie in `crm/.htaccess` dwingt geavanceerde WAF- en transportbeveiliging af op Apache / LiteSpeed niveau:

### 7.1 Bestands- en Mapblokkades
* **Directory Browsing:** `Options -Indexes` voorkomt dat aanvallers directory listings kunnen opvragen.
* **Gevoelige Extensies:** Directe toegang tot systeem- en configuratiebestanden is categorisch geblokkeerd (`Require all denied`):
  ```apache
  <FilesMatch "\.(clixml|db|sqlite|env|json|sql|yml|yaml|md|log|ps1|sh)$">
      Require all denied
  </FilesMatch>
  ```
* **Verborgen Bestanden:** Toegang tot dotfiles (`.git`, `.env`, `.htpasswd`) is geblokkeerd (`<FilesMatch "^\.(?!well-known)">`).

### 7.2 Transport Layer Security & HTTP Security Headers
* **Forced HTTPS:** Automatische HTTP $\rightarrow$ HTTPS 301 omleiding.
* **HSTS (HTTP Strict Transport Security):**  
  `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (Dwingt 1 jaar lang uitsluitend HTTPS af, inclusief alle subdomeinen).
* **MIME Sniffing Bescherming:** `X-Content-Type-Options: nosniff`.
* **Clickjacking Defensie:** `X-Frame-Options: SAMEORIGIN` gecombineerd met CSP `frame-ancestors 'self' https://creationaltfix.nl https://*.creationaltfix.nl`.
* **Referrer Beperking:** `Referrer-Policy: strict-origin-when-cross-origin`.
* **Hardware Feature Lockdown:** `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
* **Content Security Policy (CSP):**
  Strikte whitelisting van script- en stijlbronnen (`'self'`, Google Fonts, Firebase CDN, Cloudflare DNS). Connect-src beperkt tot noodzakelijke API endpoints (`*.googleapis.com`, `identitytoolkit.googleapis.com`, `generativelanguage.googleapis.com`, `cloudflare-dns.com`).

---

## 8. Applicatieve Kwetsbaarheden & Mitigaties (OWASP Top 10)

### 8.1 A01: Broken Access Control & IDOR
* **Mitigatie:** Geen enkel client-side ID kan worden misbruikt om andermans data in te zien. Alle toegang tot documenten in Cloud Firestore en bestanden in Cloud Storage wordt op databaseniveau getoetst aan de cryptografische UID van de ingelogde sessie.

### 8.2 A02: Cryptographic Failures
* **Mitigatie:** Volledige TLS 1.3 encryptie in-transit. Data-at-rest encryptie (AES-256) op alle Firestore documenten en Cloud Storage objecten. Geen statische API secrets in client-side code.

### 8.3 A03: Injection & Cross-Site Scripting (XSS)
* **DOM Sanitization:** Alle dynamische data wordt vóór DOM-injectie behandeld door `escapeHtml()`:
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
* **URL Sanitization (`sanitizeUrl`):** Blokkeert gevaarlijke schema's zoals `javascript:`, `vbscript:`, `data:` en control characters (`[\x00-\x1F\x7F]`). Alleen `https://`, `http://`, `mailto:` en `tel:` zijn toegestaan.

### 8.4 A10: Server-Side Request Forgery (SSRF) Hardening in `healthcheck.php`
De healthcheck microservice (`crm/api/healthcheck.php`) voert live checks uit op klantdomeinen. Omdat dit potentieel een SSRF-vector kan zijn, is dit script voorzien van meervoudige defensieve lagen:
1. **Origin Validation:** CORS staat uitsluitend geautoriseerde Creation+Alt+Fix origins toe (geen wildcards).
2. **Private IP Filtering:** Resolutie van localhost (`127.0.0.1`), RFC1918 privé-netwerken (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) en Cloud Metadata endpoints (`169.254.169.254`) wordt actief geblokkeerd via `FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE`.
3. **DNS Pinning via `CURLOPT_RESOLVE`:** Voorkomt Time-of-Check to Time-of-Use (TOCTOU) DNS Rebinding aanvallen door cURL expliciet te pinnen op het initiële gevalideerde IP-adres.
4. **Follow-Location Uitschakeling (`CURLOPT_FOLLOWLOCATION = false`):** Voorkomt dat een doelserver via een 301/302 redirect de probe kan omleiden naar interne services.
5. **Protocol Lockdown:** cURL is geforceerd gelimiteerd tot `CURLPROTO_HTTPS | CURLPROTO_HTTP` (geen `file://`, `gopher://`, `dict://`).
6. **Rate Limiting:** IP-gebaseerde rate limiting (max 240 requests per 60 seconden per IP) voorkomt denial-of-service en scanmisbruik.

---

## 9. Privacy, AVG/GDPR & Onweerlegbare Audit Trail

### 9.1 AVG / GDPR Naleving (Privacy by Design)
* **Inzage & Dataminimalisatie:** Klanten kunnen uitsluitend hun eigen opgeslagen profiel-, project- en factuurgegevens raadplegen via het beveiligde statusportaal.
* **Recht op Rectificatie:** Klanten kunnen hun eigen bedrijfs- en contactgegevens (KvK, BTW-nummer, adres, telefoonnummer) zelfstandig corrigeren.
* **Cookiewetgeving:** Modulaire cookie consent banner (`cookie-consent.js`) respecteert keuzes van gebruikers.

### 9.2 Onweerlegbare Audit Trail (WORM Architectuur)
Alle veiligheidskritieke administratieve handelingen (offertecreatie, statuswijzigingen, facturatie, accountactivatie) worden gelogd in de Firestore collectie `/audit_logs/`:
* **WORM Eigenschap (Write Once, Read Many):**  
  In `firestore.rules` is expliciet vastgelegd:
  ```javascript
  match /audit_logs/{logId} {
    allow read: if isAdmin();
    allow create: if isAdmin();
    allow update, delete: if false; // Mutaties en verwijderingen zijn onmogelijk
  }
  ```
  Zelfs een gecompromitteerd beheerderstoken kan historische logs niet retroactief wijzigen of verwijderen.

---

## 10. Geautomatiseerde CI/CD Kwaliteitsborging & Testsuite

De applicatie beschikt over een zero-dependency testsuite in `tests/run-all-tests.js` die automatisch draait binnen GitHub Actions:
* **86 Geautomatiseerde Unittests over 13 Testsuites:**
  * Testsuite 1: Input Sanitization & XSS Defensie (`escapeHtml`, `sanitizeUrl` met protocol-relative `//`, `/\`, `\\` en backslash afwijzing).
  * Testsuite 2: Admin Whitelist en E-mail Normalisatie.
  * Testsuite 3: Client Authenticatie Precondities (UID validatie, e-mail requirements).
  * Testsuite 4: Status Formatter & 5-Fasen Lifecycle Integriteit.
  * Testsuite 5: Valuta Parsers & BTW Berekeningen.
  * Testsuite 6: Domein Normalisatie & Protocol Stripping.
  * Testsuite 7: Firestore Diff Whitelist Validatie (beschermde velden).
  * Testsuite 8: Multi-Facturatie Berekeningen & Mollie Payload Structuur.
  * Testsuite 9: Uptime Monitor & Anti-Flapping Drempelwaarden.
  * Testsuite 10: Security Rules Syntax & Consistentie.
  * Testsuite 11: Application Security & Threat Defenses (CSV formula injection, dotfiles, hermetische data-isolatie, Tailscale filtering, Bearer tokens, CORS origin validatie, stream_get_contents locking, multi-IP DNS SSRF filtering, Mollie regex verificatie, en zero-trust price locking).
  * Testsuite 12: Architecture, Reactive State & 2027 Features.
  * Testsuite 13: 24/7 Autonome Lead Discovery & Concept Factory.

---

## 11. Afgeronde Red Team Remediëring & Verificatie

Tijdens de diepgaande Red Team hardening cyclus zijn de volgende kwetsbaarheden structureel verholpen en geverifieerd:

1. **Beveiliging van `create-payment.php`:**
   - Afgeschermd met Firebase Bearer token verificatie via Google Identity Toolkit.
   - Lokale bypass beperkt strikt tot CLI SAPI (`php_sapi_name() === 'cli'`), waardoor interne webverzoeken op gedeelde hosting servers niet langer ongeauthenticeerd kunnen passeren.
   - CORS origin validatie toegevoegd tegen cross-site request forgery.
   - Input sanitization op factuurnummers, klantnamen en omschrijvingen (begrensd tot 128 tekens conform Mollie API v2 specificatie).
2. **Hermetische Afsluiting `crm/admin/data/`:**
   - De publieke override voor `leads.json` is gesaneerd; de gehele datamap weigert alle webtoegang (`Require all denied`).
3. **Eliminatie van Client-Side Betaalstatus Spoofing:**
   - `status.js` en `checkPaymentSuccessModal` controleren `isVerifiedPaid` via de databaserecords (`data.status` of `data.invoices`) alvorens de betaalsuccess-modal te openen of openstaande factuurbanners te verbergen. Willekeurige `?paid=true` query parameters worden direct geneutraliseerd en gewist via `window.history.replaceState`.
4. **Mollie Webhook Fail-Closed & Concurrency:**
   - Betalings-ID's worden strikt gevalideerd met regex (`^tr_[a-zA-Z0-9]{5,32}$`).
   - Bestandsvergrendeling (`flock`) gecombineerd met atomic `stream_get_contents` i.p.v. gecachte `filesize()`, ter voorkoming van race conditions bij gelijktijdige callbacks.
5. **Firestore Zero-Trust Schema & Prijsborging:**
   - `allow create` in `firestore.rules` afgedwongen met strikte checks: non-admin creators kunnen géén willekeurige `clientUid` injecteren (`request.resource.data.clientUid == request.auth.uid`) en kunnen `isClientAccount` niet op true zetten.
   - `isValidClientUpdate()` verbiedt prijswijzigingen zodra een tarief door de beheerder is voorgesteld (`subscriptionPlan2027Price == resource.data.subscriptionPlan2027Price`), en sluit `'0,00'` contracten definitief uit.
6. **Storage Rule Delete Fix & MIME Whitelist:**
   - `storage.rules` splitst `create, update` en `delete` ter voorkoming van runtime crashes bij bestandsverwijdering door projecteigenaren.
   - SVG, HTML en uitvoerbare extensies geweerd via strikte MIME-whitelisting.
7. **SSRF Hardening (Multi-IP & RFC 6598):**
   - `healthcheck.php` inspecteert nu álle geretourneerde A-records (`gethostbynamel`) ter voorkoming van DNS round-robin SSRF bypasses.
   - Tailscale CGNAT IP-adressen (`100.64.0.0/10`) en private ranges worden hermetisch geblokkeerd.
   - Atomic file read met `stream_get_contents` op de IP-gebaseerde rate limiter.
8. **Protocol-Relative URL Sanitizer Hardening:**
   - `sanitizeUrl()` weigert naast `//` nu ook backslash-gebaseerde redirect bypasses (`/\`, `\\`, en leidende `\`), conform CWE-601.
9. **State Synchronisatie `secondaryAuth`:**
   - Bij `auth/email-already-in-use` breekt de workflow in `project.js` niet langer vroegtijdig af; het projectrecord wordt direct gekoppeld met `isClientAccount: true`, waarna de inlog-/herstellink correct wordt verzonden en de werkplek herlaadt.
10. **Content Security Policy & Cache-Control:**
    - CSP in `website/.htaccess` ontdaan van verouderde `'unsafe-eval'` en wildcard `http: https:` frames.
    - Anti-caching directives (`Cache-Control: no-store, no-cache, must-revalidate, max-age=0`) toegevoegd op live HTML- en PHP-antwoorden.

---

## 8. Ronde 2: Factory Bridge, FTPS Traversal, CSP Integratie & Webhook SSRF Defenses (2026-10-10)

1. **Factory Bridge Zero-Trust & CWE-346 Origin Hardening (`factory/server/factory-bridge.js`):**
   - **Origin "null" Exploit Blokkade**: In `validateOrigin()` werd `orig === 'null'` geaccepteerd, waardoor kwaadaardige pagina's via zandbak-iframes (`<iframe sandbox>`) en `data:` URIs de bridge konden bevragen en het `AUTH_TOKEN` konden uitlezen via `/api/session-token`. `orig === 'null'` wordt nu direct geweigerd met HTTP 403 Forbidden.
   - **Strikte Token Auth op Mutatieve POST Endpoints**: `isAuthenticated` had een fallback op `isAllowedOrigin`, waardoor POST-verzoeken zonder Origin header mutaties konden triggeren zonder token. Nu dwingen `/api/trigger`, `/api/daemon/start` en `/api/daemon/stop` strikt `isTokenValid` af.
   - **CWE-552 Blokkade van Verborgen Bestanden & Gevoelige Extensies**: De statische fileserver weigert nu alle dotfiles (`.env`, `.git`, `.htaccess`) en gevoelige serverbestanden (`.db`, `.sqlite`, `.sql`, `.log`, `.sh`, `.ps1`, `.bat`, `.token`, `.key`, `.php`).
   - **Private Network Access (PNA) CORS Sanering**: Wildcard `*` in combinatie met `Access-Control-Allow-Private-Network: true` vervangen door het strikt gevalideerde CORS origin (`safeCorsOrigin`).

2. **CWE-22 Path Traversal & Containment in FTPS Deployer (`factory/deployer/vimexx-ftps.js`):**
   - De parameter `slug` wordt nu strikt gesaneerd via regex (`cleanSlug = String(slug || '').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '')`).
   - Lokale bestandspaden worden gecontroleerd met `localSlugDir.startsWith(resolvedConceptBase)` ter voorkoming van traversal uit de concept-directory, en remote targetpaden gebruiken uitsluitend de gesaneerde slug.

3. **CSP Integratie & Browser Console Hardening (`crm/.htaccess`):**
   - CDN-bron `https://cdn.jsdelivr.net` toegevoegd aan `script-src` voor het laden van de EmailJS clientbibliotheek (`email.min.js`).
   - Endpoints `https://api.emailjs.com` en `https://formsubmit.co` toegevoegd aan `connect-src`, waardoor alle geautomatiseerde beheerder- en downtime-notificaties zonder CSP-blokkades betrouwbaar worden afgeleverd.

4. **CWE-918 SSRF Blokkade in Multi-Channel Webhooks (`crm/js/uptime-monitor.js`):**
   - `sendDiscordWebhookAlert`: URL's worden strikt gevalideerd tegen de officiële Discord Webhook expressie (`DISCORD_WEBHOOK_REGEX`), waardoor willekeurige interne HTTPS URL's (SSRF) en intranet-aanroepen direct worden verworpen.
   - `sendTelegramAlert`: `botToken` en `chatId` worden gevalideerd met strikte syntaxregexen (`TELEGRAM_TOKEN_REGEX` en `TELEGRAM_CHAT_ID_REGEX`).

5. **LLM Response Robuustheid & JSON Extractie (`crm/js/ai-engine.js`):**
   - `extractJsonObject()` geïntroduceerd: Isoleert betrouwbaar het buitenste JSON-object (`/\{[\s\S]*\}/`) uit modeluitvoer met conversational preambles/postambles en markdown codeblocks, waardoor runtime `SyntaxError` uitzonderingen worden voorkomen.

6. **Mollie Webhook Listener Hardening (`crm/api/mollie-webhook.js`):**
   - Fail-closed beveiliging afgedwongen bij ontbrekende `MOLLIE_API_KEY` (geen gesimuleerde betalingen meer in productie).
   - Regex formaatvalidatie afgedwongen op transactie-ID's (`^tr_[a-zA-Z0-9]{5,32}$`).
   - 10KB payload body-limiet ingesteld tegen buffer-overflows en Denial-of-Service.
   - Logbestand begrensd tot maximaal 100 transacties ter bescherming van schijfruimte.

---

## 9. Ronde 3: Autonome Nachtelijke AppSec, Zero-Trust Hardening & Script Defenses (2026-10-10)

1. **Backend & Microservices Hardening (`crm/api/`):**
   - **`create-payment.php` CORS & Input Validatie**: Niet-geautoriseerde origins worden nu direct afgewezen met HTTP 403 Forbidden. Vóór verwerking worden `$cleanProjectId` en `$cleanInvNumber` vooraf gevalideerd en bedragen onder € 0,01 geweigerd.
   - **`mollie-webhook.php` JSON Body Fallback & Log Permissions**: Fallback toegevoegd voor JSON body payloads (`php://input`) naast form-urlencoded `$_POST['id']`. Na wegschrijven worden strikte bestandsrechten (`0600`) afgedwongen op `mollie-payments-log.json`.
   - **`healthcheck.php` IPv4 Pinning & File Protection**: `CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4` afgedwongen om IPv6 DNS fallback SSRF te elimineren. Rate-limiting bestanden in de tijdelijke map worden voorzien van `0600` bestandsrechten.

2. **Cloud Database & Storage Zero-Trust (`firestore.rules` & `storage.rules`):**
   - **Type Confusion & Claim Defenses in Firestore**: In `isAdmin()` en `isVerifiedClient()` string-type verificaties afgedwongen (`request.auth.token.email is string`, `docData.clientUid is string`).
   - **Client Update & Intake Schema Constraints**: In `isValidClientUpdate()` de plan-ID's en statussen strikt begrensd tot de officiële whitelist, en maximale stringlengtes ingesteld op `proposalSignedBy` (max. 100 tekens) en `proposalAcceptedAt` (max. 40 tekens). In `allow create` (publieke intakes) worden `proposalPrice` en `mollieLink` expliciet geblokkeerd en abonnementsprijzen gevalideerd tegen de geldige tarievenlijst.
   - **Storage Rules Executable Block**: Client-uploads in `storage.rules` voorzien van een expliciet blokkade-filter tegen script- en executable-extensies (`.php`, `.html`, `.js`, `.exe`, `.sh`, `.bat`, `.svg`, etc.), zelfs wanneer een misleidend afbeeldings-MIME type wordt meegegeven.

3. **Webserver WAF & Gevoelige Bestanden (`.htaccess`):**
   - Zowel `crm/.htaccess` als `website/.htaccess` uitgebreid met blokkades voor backup-, swap- en configuratiebestanden (`.bak`, `.backup`, `.swp`, `.conf`, `.ini`).

4. **Frontend AppSec, XSS & Attribute Breakout Defenses (`crm/js/crm-config.js` & `project.js`):**
   - **Backtick Escaping in `escapeHtml`**: Backticks (`` ` ``) worden getransformeerd naar `&#96;` om template literal injecties in dynamic UI rendering te voorkomen.
   - **Attribute Breakout Rejection in `sanitizeUrl`**: URLs met quotes (`"`, `'`), HTML-tags (`<`, `>`), backticks of ongecodeerde spaties worden per direct geneutraliseerd naar `'#'`, waarmee DOM XSS via HTML-attributen (`<a href="${sanitizeUrl(url)}">`) definitief is geëlimineerd.
   - **`secondaryAuth` Initialisatie Guard**: In `project.js` controleert de gebruikersactivatie-flow expliciet of de secundaire Firebase Auth instantie actief is vóór executie.

5. **CI/CD Testsuite Verificatie:**
   - Testsuites 1 en 11 uitgebreid met regressietests voor alle bovengenoemde fixes; alle 87 geautomatiseerde unittests slagen 100%.

---

## 10. Ronde 4: DNS Rebinding, Socket Timeouts, Offline Tamper Protection & Schema URL Defenses (2026-10-10)

1. **DNS Rebinding & Stream Crash Defenses in Bridge Server (`factory/server/factory-bridge.js`):**
   - **Host Header Validatie (RFC 7230 / CWE-918)**: `validateBridgeHost()` geïntroduceerd. Valideert Host header strikt tegen loopback en geautoriseerde domeinen (`127.0.0.1`, `localhost`, `creationaltfix.nl`, `*.creationaltfix.nl`). Externe domeinen die naar `127.0.0.1` wijzen (DNS Rebinding) worden direct verworpen met HTTP 400 Bad Request.
   - **Stream Error Resilience (CWE-754 / CWE-248)**: `fs.createReadStream().pipe(res)` voorzien van een expliciete `.on('error', ...)` handler. Hiermee wordt voorkomen dat I/O-fouten of ontbrekende permissies een onverwerkte streamfout triggeren die het Node.js proces crasht.
   - **Uitbreiding Extensie-Blacklist**: Statische bestandsserver uitgebreid met blokkades voor `.ini`, `.swp`, `.backup` en `.conf`.
   - **Server Listen Modulariteit**: `server.listen()` ingepakt met `isMain` guard, waardoor de bridge veilig kan worden geïmporteerd in geautomatiseerde unittests zonder poortconflicten.

2. **Mollie Webhook Socket Timeouts & Log Permissions (`crm/api/mollie-webhook.js`):**
   - **Socket Timeout (CWE-400)**: Uitgaande HTTPS statusverzoeken naar `api.mollie.com` voorzien van een strikte 15-seconden socket timeout (`req.setTimeout(15000)`), waardoor hanging requests en uitputting van sockets definitief worden voorkomen.
   - **Audit Log Permissies**: `mollie-payments-log.json` wordt weggeschreven met `mode: 0o600` en voorzien van `fs.chmodSync(auditLogFile, 0o600)`.
   - **JSON Body Parsing Fallback**: Automatische JSON-extractie toegevoegd voor webhook notificaties die als JSON worden aangeleverd.

3. **CRLF Header Injectie Preventie (`crm/js/email-notifications.js`):**
   - `sanitizeHeader()` geëxporteerd en verrijkt: Verwijdert `\r`, `\n` en ASCII control characters (`\x00-\x1F\x7F`) uit dynamische project- en klantparameters vóór verzending via EmailJS / FormSubmit, ter voorkoming van e-mail header injectie (CWE-93).

4. **Offline Queue Tamper & DoS Bescherming (`crm/js/core/offline-queue.js`):**
   - **Collectie Whitelist**: `OfflineQueue.enqueue()` valideert collectienamen tegen een strikte whitelist (`projects`, `audit_logs`, `monitors`, `leads_factory`, `settings`, `leads`). Ongeautoriseerde collecties worden direct geweigerd.
   - **Document ID Validatie**: Document ID's worden gecontroleerd met `/^[a-zA-Z0-9_-]{1,100}$/` om path traversal en afwijkende sleutels te weren.
   - **Payload Grootte Limiet**: Offline mutaties worden begrensd tot maximaal 2MB per object ter bescherming tegen IndexedDB opslag-uitputting (DoS).

5. **PDF Generator Blob & Extensie Hardening (`crm/js/pdf-generator.js`):**
   - `uploadPdfToStorage()` controleert op non-empty blobs (`pdfBlob.size > 0`) en dwingt af dat opslagbestandsnamen altijd strikt eindigen op `.pdf`.

6. **Database Berichten Sanitatie & Payload Beheersing (`crm/js/core/db-service.js`):**
   - `appendProjectMessage()` ontdoet afzender en berichttekst van control characters, begrenst berichtteksten tot 5.000 tekens en valideert rollen (`client`, `admin`, `system`) ter bescherming tegen documentlimiet-overschrijding (1MB limiet van Firestore).

7. **Schema & Handtekening Data URL XSS Neutralisatie (`crm/js/core/schemas.js`):**
   - Ingebouwde `safeUrl()` en `safeDataUrl()` helpers geïntroduceerd. Neutraliseert `javascript:` en `data:text/html` in `targetUrl`, `screenshotUrl`, `pdfStorageUrl` en `signatureDataUrl`. Digitale handtekeningen accepteren uitsluitend valide base64 PNG/JPEG/WEBP data-URI's of een lege string.

8. **CI/CD Testsuite Verificatie:**
   - Testsuite uitgebreid met 4 nieuwe unittests voor DNS rebinding, CRLF sanitatie, offline queue bescherming en PDF upload verificatie; alle 91 geautomatiseerde unittests slagen 100%.

---

## 11. Ronde 5: Atomische Persistentie, Prototype Pollution, Telegram Entity Escaping & Input Boundaries (2026-10-10)

1. **Atomische JSON Bestandsopslag & Corruptiepreventie (`factory/run-engine.js`):**
   - **`atomicWriteJsonSync()`**: Wegschrijven van de centrale `leads.json` database gemigreerd naar atomische persistentie via een uniek tijdelijk bestand (`.leads.json.<timestamp>.<rand>.tmp`) met strikte `0600` (`-rw-------`) bestandspermissies, gevolgd door een atomische rename (`fs.renameSync`). Voorkomt 0-byte corruptie en gedeeltelijke writes bij procesonderbrekingen of stroomuitval.

2. **Klantportaal & Digitale Offerte Handtekening Hardening (`crm/status/js/status.js`):**
   - **Ondertekenaar Sanitatie**: `signerName` gesaneerd van control characters (`\x00-\x1F\x7F`) en CRLF, en begrensd tot 100 tekens (`slice(0, 100)`). Garandeert dat Firestore security rules (`proposalSignedBy.size() <= 100`) nooit onverwacht falen.
   - **Reverse Tabnabbing Defensie (CWE-1022)**: Externe design/wireframe links voorzien van `sanitizeUrl()` en `rel="noopener noreferrer"`.
   - **Chat Invoer & Firestore Document Bloat Preventie**: In-app chatberichten ontdaan van control characters en begrensd tot 3.000 tekens; chatcategorieën gevalideerd tegen een whitelist (`general`, `revision`, `urgent`, `question`); berichtenarray gemaximeerd op de meest recente 100 berichten ter bescherming van de 1MB documentgrens.

3. **Telegram HTML Entity Escaping & Discord Embed Boundaries (`crm/js/uptime-monitor.js`):**
   - **Telegram HTML Sanitatie**: `escapeTelegramHtml()` helper geïntroduceerd die `&`, `<` en `>` vervangt door HTML entities (`&amp;`, `&lt;`, `&gt;`). Voorkomt dat project- of domeinnamen met speciale tekens Telegram API `400 Bad Request: can't parse entities` fouten veroorzaken of downtime alerts blokkeren.
   - **Discord Embed Boundaries**: Embed titels (250 tekens), beschrijvingen (2000 tekens) en veldwaarden (100 tekens) begrensd om HTTP 400 weigeringen door Discord API limieten te voorkomen.

4. **Schema Validatie, Strikte IP Verificatie & Feedback Limieten (`crm/js/core/schemas.js` & `visual-feedback.js`):**
   - **Strikte IP Validatie (`safeIp`)**: `Schemas.sanitizeContract()` voorzien van `safeIp()` die IP-adressen strikt valideert tegen IPv4 en IPv6 regexes. Malafide injecties (zoals SQL/command injecties) worden direct gereduceerd tot een lege string.
   - **Contract & Annotatie Boundaries**: Contractnummers, plannamen en ondertekenaarsnamen ontdaan van ongeldige tekens en begrensd; annotatie-commentaren begrensd tot 1.000 tekens met `maxlength="1000"` in de UI.

5. **Prototype Pollution Defensie (CWE-1321) in State Store (`crm/js/core/store.js`):**
   - Proxy `set` trap in `ReactiveStore` uitgebreid met een blokkade op `__proto__`, `constructor` en `prototype`. Pogingen om de prototype-keten te vervuilen worden direct geweigerd met een waarschuwing.

6. **Async Error Boundaries in Action Dispatcher (`crm/js/core/action-dispatcher.js`):**
   - Handlers die Promises retourneren in `ActionDispatcher` gekoppeld aan `.catch()` error boundaries. Voorkomt onverwerkte promise rejections bij asynchrone formulier- en klikinteracties.

7. **CI/CD Testsuite Verificatie:**
   - Testsuites 11 en 12 uitgebreid met unittests voor `atomicWriteJsonSync`, `status.js` sanitatie, `escapeTelegramHtml`, prototype pollution defensie en `safeIp`; alle 95 geautomatiseerde unittests slagen 100%.

---

## 12. Ronde 6: Recipient Sanitatie, cURL HTTPS Protocol Restricties, Event Delegation & Memory Bounds (2026-10-10)

1. **E-mail Header & Recipient Injectie Defensie (`crm/js/email-notifications.js`):**
   - **`sanitizeRecipientEmail()`**: Nieuwe strikte e-mail validator geïntroduceerd conform RFC 5322 regex (`/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`). Invoer met spaties, komma's, control characters of CRLF (`\r\n`) wordt direct verworpen naar een lege string. Voorkomt dat kwaadwillenden via klantnamen of formuliervelden CC/BCC headers of meerdere ontvangers kunnen injecteren (CWE-93).
   - Afgedwongen in `notifyClientAdminReply` en `notifyClientPhaseChange`. Dynamische e-mailonderwerpen worden gesaneerd via `sanitizeHeader()`.

2. **cURL Protocol Restricties & SSRF Defensie in PHP Microservices (`crm/api/create-payment.php` & `mollie-webhook.php`):**
   - **HTTPS-Only Protocol Lockdown (`CURLOPT_PROTOCOLS`)**: Zowel Google token verificatie als Mollie API v2 communicatie geforceerd gelimiteerd tot `CURLPROTO_HTTPS`. Sluit protocol downgrade en manipulatie naar lokale services uit.
   - **Follow Location Uitschakeling (`CURLOPT_FOLLOWLOCATION = false`)**: Voorkomt dat eventuele 301/302 redirects van de upstream API worden gevolgd naar interne netwerken.
   - **Payload Invoerlimiet**: `mollie-webhook.php` begrenst het inlezen van `php://input` via `file_get_contents(..., 0, 10240)` tot maximaal 10KB ter bescherming tegen DoS/geheugenuitputting.
   - **Foutmelding Sanitatie**: In `create-payment.php` worden Mollie error details ontdaan van HTML tags en begrensd tot 200 tekens om lekken van serverstack-details te voorkomen.

3. **CSP Event Delegation & Inline Handler Eliminatie (`crm/admin/js/modules/admin-monitoring-ui.js`):**
   - Inline `onclick="window.openMonitorDetailModal('${escapeHtml(r.domain)}')"` geëlimineerd uit dynamisch gegenereerde tabelrijen. Vervangen door `data-action="inspect-monitor"` en `data-domain="${escapeHtml(r.domain)}"`, afgehandeld via event delegation op de bovenliggende `monitors-tbody`. Voorkomt CSP-conflicten en attribute breakout risico's.

4. **Kanban Invoerboundaries & Document Bloat Preventie (`crm/admin/js/modules/admin-kanban.js`):**
   - In `saveGlobalTask()` worden taaktitels ontdaan van ASCII control characters en begrensd tot 200 tekens.
   - Prioriteiten gevalideerd tegen whitelist (`low`, `medium`, `high`) en vervaldatums gecontroleerd op ISO datumformaat (`YYYY-MM-DD`).
   - Plafonnering op `project.tasks` array (maximaal 150 taken per project) ter bescherming tegen kwaadwillende document-overbelasting in Cloud Firestore (1MB documentlimiet).

5. **Memory Leak Preventie in CSV Export (`crm/admin/js/modules/admin-tables.js`):**
   - In `exportProjectsToCSV()` wordt het gegenereerde blob URL object na downloaden vrijgegeven via `setTimeout(() => URL.revokeObjectURL(url), 1000)`. Voorkomt ophoping van Blob-objecten in browsergeheugen bij herhaaldelijke exports.

6. **SLA Formulier Hardening & Client-Side Boundaries (`crm/status/js/modules/sla-signer.js`):**
   - Attribuut `maxlength="100"` toegevoegd aan `#sla-signer-name` in het digitale ondertekeningsmodal ter waarborging van consistentie met de Firestore beveiligingsregels (`proposalSignedBy.size() <= 100`).

7. **Link Sanitatie & Reverse Tabnabbing Defensie (`crm/admin/js/modules/project-billing.js`):**
   - Mollie betaallinks in factuuroverzichten ingepakt met `sanitizeUrl(checkoutUrl)` en voorzien van `rel="noopener noreferrer"`.

8. **CI/CD Testsuite Verificatie:**
   - Testsuites 11 en 12 uitgebreid met 3 nieuwe unittests voor `sanitizeRecipientEmail`, cURL HTTPS protocollen, en UI event delegation / sanitatie; alle 98 geautomatiseerde unittests slagen 100%.

---

## 13. Ronde 7: Document ID Sanitatie, AI Network Timeouts, Slowloris & Alert Resilience (2026-10-10)

1. **Firestore Document ID Sanitatie & Path Traversal Blokkade (`crm/js/core/db-service.js`):**
   - **`isValidDocId()` Helper**: Geïntroduceerd en geëxporteerd met regex `/^[a-zA-Z0-9_-]{1,128}$/`. Valideert dat document-identificatoren uitsluitend veilige alfanumerieke tekens bevatten en nooit leeg zijn.
   - **Fail-Closed Guard**: Afgedwongen in `getProjectById`, `updateProject`, `deleteProjectDoc`, `recordAuditLog`, en `appendProjectMessage`. Blokkeert ongeldige identifier formats, control characters, spaties en path traversal sequenties (`../`) voordat er een Firestore database operatie wordt geopend.

2. **AI Engine Network Timeouts, Key Sanitatie & Palette Boundary Whitelist (`crm/js/ai-engine.js`):**
   - **AbortController Timeout (CWE-400)**: `callGeminiApi()` uitgerust met een 25-seconden `AbortController` timeout (`signal: controller.signal`) via `setTimeout` en `clearTimeout` in een `finally`-blok. Voorkomt dat hanging requests naar `generativelanguage.googleapis.com` de gebruikersinterface bevriezen.
   - **API Key Sanitatie**: `cleanApiKey` ontdoet de ingestelde sleutel van CRLF (`\r\n`) en ASCII control characters (`\x00-\x1F\x7F`) vóór verzending via HTTP headers (`x-goog-api-key`).
   - **Prompt Interpolatie Limieten**: Prompt payloads begrensd op maximaal 15.000 tekens en system instructions op 5.000 tekens tegen prompt bloat en context-uitputting.
   - **Kleurpalet Regex Validatie**: In `generateVisualDesignConcept()` wordt `parsed.colorPalette` strikt gevalideerd met `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/`. Ongeldige of geïnjecteerde HTML/JS strings worden verwijderd en vervangen door veilige fallbacks. Tevens `conceptTitle`, `aiImagePrompt` en `designRationale` begrensd.

3. **Multi-Channel Downtime Alert Network Timeouts (`crm/js/uptime-monitor.js`):**
   - `fetch()` aanroepen naar `formsubmit.co`, Discord Webhook endpoints en de Telegram Bot API uitgerust met een 8-seconden `AbortController` timeout. Garandeert dat eventuele vertragingen of storingen bij notificatiediensten de continue uptime probe cyclus nooit blokkeren.

4. **Bridge Server Socket Timeouts & 1MB Request Payload Ceiling (`factory/server/factory-bridge.js`):**
   - **Socket Timeouts (CWE-400 Slowloris Protectie)**: `server.timeout = 30000`, `server.keepAliveTimeout = 5000` en `server.headersTimeout = 6000` ingesteld op de loopback bridge server om trage socket-verbindingen tijdig af te kappen.
   - **Payload Invoerlimiet**: Inkomende HTTP payloads begrensd tot 1MB via streaming byte-teller op `req.on('data')`. Verzoeken die de limiet overschrijden worden direct geweigerd met HTTP 413 Payload Too Large en de verbinding wordt vernietigd (`req.destroy()`).

5. **DevOps Backlog Firestore Bloat Limiet & Download Memory Cleanup (`crm/js/todo-sync.js` & `crm/admin/js/modules/admin-todo-modal.js`):**
   - In `syncTodoToFirestore()` wordt het aantal samengevoegde taken begrensd op maximaal 150 items (`boundedTasks = mergedTasks.slice(0, 150)`). Garandeert dat synchronisatie van grote `TODO.md` bestanden het 1MB documentplafond van Cloud Firestore nooit overschrijdt.
   - In `handleDownloadExportMarkdown()` wordt `URL.revokeObjectURL(url)` uitgesteld via `setTimeout(..., 1000)` zodat browser-downloads betrouwbaar starten voordat het Blob-object uit geheugen wordt gewist.

6. **CI/CD Testsuite Verificatie:**
   - Testsuite uitgebreid met 4 nieuwe unittests; alle 102 geautomatiseerde unittests slagen 100%.

---

## 14. Ronde 8: Storage Rules Whitelist, Crawler SSRF Filter, Code DRM & Windows Device Defenses (2026-10-10)

1. **Firebase Storage Zero-Trust Hardening (`storage.rules`):**
   - **Case-Insensitive Extensie Sanitatie (RE2 `(?i)` flag)**: De extensie-blacklist uitgebreid met case-insensitivity en gevaarlijke script-/systeembestanden (`.py`, `.pl`, `.cgi`, `.ps1`, `.com`, `.scr`, `.msi`, `.hta`, `.cpl`, `.wsf`, `.jsp`, `.xhtml`, `.shtml`, `.env`, `.config`, `.htaccess`, `.ini`).
   - **Positieve Extensie Whitelist voor Cliënt Uploads**: Strikte `allPaths.matches('(?i).*\\.(jpg|jpeg|png|webp|gif|pdf|txt|doc|docx|xls|xlsx|csv)$')` whitelist afgedwongen. Zelfs als een aanvaller een veilige MIME-type declareert, worden niet-geautoriseerde bestandsextensies onmiddellijk geweigerd.
   - **Path Traversal Blokkade**: Sequenties met `..` (`!allPaths.matches('.*\\.\\..*')`) geweerd in alle opslagpaden.
   - **Offerte & Factuur PDF Opslag Limieten**: In `proposals/{projectId}` en `invoices/{projectId}` expliciete `request.resource.size < 20 * 1024 * 1024`, `contentType == 'application/pdf'` en `(?i).*\\.pdf$` extensiecontroles ingesteld op beheerderswrites.

2. **Crawler & Website Enrichment SSRF Defensie (CWE-918) & DoS Buffer Cap (`factory/enrichment/deep-intelligence.js`):**
   - **`isSafeExternalUrl()` Helper**: Geïntroduceerd en geëxporteerd. Valideert URL's op veilige HTTP/HTTPS protocollen en blokkeert `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, `.local`, `.internal`, `.lan`, RFC 1918 private IPv4-reeksen (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Link-local / Cloud Metadata IP's (`169.254.0.0/16`) en RFC 6598 Tailscale / CGNAT (`100.64.0.0/10`).
   - **SSRF Blokkade in Website Probes & E-mail Scrapers**: In `probeWebsite()` en `mineEmailFromWebsite()` wordt `isSafeExternalUrl()` vooraf afgedwongen; pogingen om de server interne endpoints of metadata te laten bevragen worden direct afgewezen.
   - **Geheugenuitputting Defensie (CWE-400)**: De gelezen response-body in `mineEmailFromWebsite()` begrensd op maximaal 256KB (`rawText.slice(0, 256 * 1024)`).

3. **Anti-Theft Code DRM Idempotentie & DOM XSS Defensie (`factory/security/code-drm.js`):**
   - **Idempotente Scriptinjectie**: `applyCodeProtection()` controleert vooraf of `id="caf-security-guard"` al aanwezig is, waardoor meervoudige generatieloops nooit dubbele DRM scripts injecteren.
   - **DOM XSS Neutralisatie**: In de client-side beveiligingstoast (`showSecurityToast`) is innerHTML string-concatenatie vervangen door veilige DOM manipulatie (`document.createTextNode(msg)`).

4. **Omgevingsconfiguratie Prototype Pollution & Windows Gereserveerde Bestandsnamen (`factory/config/factory-config.js` & `factory/deployer/vimexx-ftps.js`):**
   - **Prototype Pollution Blokkade (CWE-1321)**: In `loadEnvSafely()` worden eigenschappen `__proto__`, `constructor` en `prototype` expliciet overgeslagen tijdens het parsen van lokale `.env` bestanden.
   - **Windows Device Name & Pad Beveiliging (CWE-22)**: In `deployConceptToVimexx()` worden gereserveerde Windows apparaatnamen (`con`, `prn`, `aux`, `nul`, `com1-9`, `lpt1-9`) geweerd en wordt de slug begrensd op 64 tekens.

5. **Uptime Monitor Document Keys & Visual Feedback Async Boundaries (`crm/js/uptime-monitor.js` & `crm/status/js/modules/visual-feedback.js`):**
   - **`getMonitorDocKey()` Helper**: Geïmplementeerd en geëxporteerd. Normaliseert en saneert domeinnamen naar betrouwbare Firestore keys (`[a-zA-Z0-9_-]`, max 100 tekens) en vangt lege of null waarden veilig op zonder crashes.
   - **Async Error Handlers & Veilige Datums**: In `VisualFeedbackOverlay` wordt `onSavePin` ingepakt met try/catch en worden datums gecontroleerd op geldigheid (`!isNaN(...)`) ter voorkoming van `Invalid Date` weergaven.

6. **Social Media Video Production Secrets & Command Injection Hardening (`factory/video/build-motion-video.js`):**
   - **Sanitatie Persoonlijke Padenspecificatie**: Hardcoded gebruikersmap `C:\Users\739530\Downloads` vervangen door dynamische omgevingsvariabele `process.env.USERPROFILE` met fallback naar `./dist`.
   - **Command Injection Defensie (CWE-78)**: String-gebaseerde `execSync(ffmpegCmd)` vervangen door `execFileSync(ffmpegPath, ffmpegArgs, { stdio: 'inherit' })` met gescheiden argumentenarray.

7. **CI/CD Testsuite Verificatie:**
   - Testsuite uitgebreid met 2 nieuwe unittests voor SSRF-filtering, prototype pollution guards, Windows apparaatnamen en DRM idempotentie; alle 104 geautomatiseerde unittests slagen 100%.

---

## 15. Ronde 9: Toast XSS, Boekhouding Isolatie, Prototype Pollution & Crawler URI Defenses (2026-10-10)

1. **DOM XSS Neutralisatie in Notificatie- en Dialoog Engine (`crm/js/core/toast.js`):**
   - **`escapeHtml()` Integratie & `_renderToastHtml()` Helper**: `escapeHtml` geïmporteerd vanuit `crm-config.js`. In `Toast.show()` en `Toast._renderToastHtml()` worden `title`, `message` en `action.label` strikt geëscaped voordat deze aan de DOM worden toegevoegd.
   - **Modal Bevestiging Sanitatie**: In `Toast.confirm()` worden `title`, `message`, `confirmText` en `cancelText` geëscaped, waardoor dynamische invoer (zoals projectnamen of API foutmeldingen) geen HTML- of scriptinjecties meer kan triggeren (CWE-79).

2. **Boekhouding Isolatie & Cross-Client Data Leak Defensie (`crm/admin/js/modules/bookkeeping-data.js`):**
   - **Eliminatie van Loose Substring Matching**: Voorheen leidden controles zoals `domainKey.includes(dom)` en `cleanA.includes(cleanName)` ertoe dat korte domeinen (`"nl"`) of generieke zoektermen (`"riool"`, `"fit"`, `"klus"`) ten onrechte matchten op bestaande cliënten (zoals Angela Stenekes of Stenekes Riool & Grondwerk), waardoor privégegevens (factuurnummers, bedragen, KVK-nummers en relatie-ID's) konden lekken.
   - **Strikte Domein- en Alias-Gelijkheid**: `getPiBoekhoudingInfo(p)` afgedwongen met strikte host equality (`cleanDomHost === domainKey || cleanDomHost.endsWith('.' + domainKey)`), staging path normalisatie en begrensde aliasmatching (lengte >= 4 tekens).
   - **Interne Platform Isolatie**: `creationaltfix.nl` gehardend zodat staging subpaden betrouwbaar naar de specifieke klant resolveren en vreemde domeinen veilig terugvallen op het dynamische adviesengine zonder data-exfiltratie.

3. **Action Dispatcher Prototype Pollution & Async Error Handlers (`crm/js/core/action-dispatcher.js`):**
   - **`ActionDispatcher.sanitizePayload()` Defensie (CWE-1321)**: Verwijdert gevaarlijke prototype pollution eigenschappen (`__proto__`, `constructor`, `prototype`) uit zowel programmatische dispatch payloads als HTML formulierinzendingen (`<form data-action>`).
   - **Async Try/Catch Boundary**: `dispatch()` voorzien van error boundaries en `res.catch()` logging zodat mislukte acties de applicatiestroom niet onderbreken.

4. **Google Maps Crawler URI Protocol Validatie & Slug Grenzen (`factory/discovery/maps-crawler.js`):**
   - **URI Protocol Whitelist**: In `extractPlaceDetails()` en `sanitizeLeadData()` wordt de website URL gevalideerd met `/^https?:\/\//i`; gevaarlijke schema's zoals `javascript:` of data URI's worden geneutraliseerd naar `null`.
   - **Windows Pad- & Bestandsnaambegrenzing**: De gegenereerde lead-slug wordt afgekapt op maximaal 64 tekens ter voorkoming van overschrijding van Windows padlimieten bij lokale projectgeneratie.

5. **Dashboard KPI & Project Timeline Boundary Hardening (`crm/admin/js/modules/admin-stats.js` & `crm/admin/js/modules/project-timeline.js`):**
   - **Defensieve Invoervalidatie**: In `calculateDashboardStats()` worden `null` en niet-array inputs afgevangen en ongeldige projectobjecten genegeerd; `updateDashboardStatsUI()` gemigreerd van `innerText` naar `textContent`.
   - **Tijdlijn & Visual Pulse Null Safety**: In `calculateVisualPulse()` en `renderTimelineHtml()` worden ontbrekende of corrupte logs gefilterd en ongeldige datums (`NaN`) opgevangen met veilige Nederlandse fallbacks.

6. **CI/CD Testsuite Verificatie:**
   - Testsuite uitgebreid met 5 nieuwe geautomatiseerde unittests; alle 109 geautomatiseerde tests slagen 100%.

---

## 16. Ronde 10: Intake Zero-Trust, Bridge Data Directory Lockdown, Webhook SSRF & Reverse Tabnabbing (2026-10-10)

1. **Intake Notificatie SSRF & Telegram Markdown Entity Defensie (`crm/intake/js/notifications.js`):**
   - **`isSafeWebhookUrl()` Helper (CWE-918 SSRF Defensie)**: Valideert dat webhook URLs uitsluitend HTTPS gebruiken en blokkeert direct loopback (`127.0.0.1`, `localhost`), RFC 1918 private netwerken (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Link-local / Cloud Metadata (`169.254.169.254`), RFC 6598 Tailscale / CGNAT (`100.64.0.0/10`) en `javascript:` schema's.
   - **`sanitizeMarkdown()` Helper (Telegram API 400 Defensie)**: Escapet Markdown stuurtekens (`*`, `_`, `[`, `]`, `` ` ``) in intake notificatieteksten zodat bedrijfsnamen of wensen van leads geen parsing-fouten of stuurcode-injecties in Telegram Bot of Discord webhooks veroorzaken.
   - **AbortController Timeouts (8s)**: 8-seconden timeouts afgedwongen op `dispatchFormSubmit`, `dispatchWebhook`, `dispatchEmailJS` en `dispatchClientWelcomeEmailJS`.
   - **E-mail Header Injectie Blokkade (CWE-93)**: E-mailadressen van leads gevalideerd met RFC 5322 regex en ontdaan van stuurtekens/CRLF in de welkomstmail flow.

2. **Intake Firestore Schema Afstemming (`crm/intake/js/intake.js`):**
   - **Verwijdering van Ongeauthenticeerde `clientUid`**: Openbare intake schreef voorheen `clientUid: docRef.id` en `isClientAccount: true`, wat strijdig was met `firestore.rules` (`allow create: if !('isClientAccount' in request.resource.data) || request.resource.data.isClientAccount == false`). In `intake.js` wordt `clientUid` nu weggelaten totdat de klant zijn account activeert, en `isClientAccount` expliciet op `false` gezet.
   - **Invoergrenzen**: Tekstlengtes begrensd op 120 tekens voor klantnaam en dienst, en 1.000 tekens voor projectdoelen.

3. **Factory Bridge Hermetische Data Lockdown & Endpoint Token Auth (`factory/server/factory-bridge.js`):**
   - **Statische Data Folder Blokkade (CWE-552 / CWE-200)**: De statische fileserver controleert `normalizedSegments` en weigert requests naar `data`, `config`, `node_modules` of `.git` mappen met HTTP 403 Forbidden. Dit voorkomt dat gevoelige bestanden zoals `crm/admin/data/bridge-token.json`, `leads.json` of `pi-invoices.json` zonder autorisatie via de bridge gedownload kunnen worden.
   - **Token Authenticatie op `GET /api/leads` en `GET /api/logs`**: De endpoints controleren nu expliciet `if (!isTokenValid)` en weigeren ongeautoriseerde bevragingen met HTTP 401 Unauthorized.
   - **Graceful Shutdown & Interval Cleanup**: Bij procesafsluiting (`SIGINT` en `SIGTERM`) wordt `daemonIntervalId` direct ontruimd (`clearInterval`).

4. **Klantportaal Reverse Tabnabbing & Betalingslink Sanitatie (`crm/status/js/status.js`):**
   - **Reverse Tabnabbing Defensie (CWE-1022)**: `rel="noopener noreferrer"` toegevoegd aan de bestandsdownload-link en aan de iDEAL betaalknop.
   - **URL Sanitatie (CWE-79)**: De iDEAL betaallink in de facturentabel ingepakt met `sanitizeUrl(mollieUrl)` ter wering van malafide URI-schema's.

5. **E-mail Notificatie AbortController Fallback (`crm/js/email-notifications.js`):**
   - `sendFormSubmitFallback()` uitgerust met een 8-seconden `AbortController` timeout tegen hangende HTTP verbindingen.

6. **CI/CD Testsuite Verificatie:**
   - Testsuite uitgebreid met 6 nieuwe tests (waaronder syntax checks voor intake modules en security tests); alle 115 geautomatiseerde unittests slagen 100%.

---

## 17. Ronde 11: Webhook Alerts SSRF Defensie, Telegram API 400 Sanitatie & AGY Generator XSS Hardening (2026-10-10)

1. **Standalone Uptime Webhook Dispatcher AppSec Hardening (`crm/scripts/uptime-webhook-alerts.js`):**
   - **Protocol Lockdown & SSRF Blokkade (CWE-918)**: In `makeRequest()` wordt HTTP protocol downgrade expliciet geweerd; alleen beveiligde `https:` verbindingen zijn toegestaan. `isSafeExternalHost()` geïmplementeerd ter blokkade van loopback (`127.0.0.1`, `localhost`), private RFC 1918 netwerken, Cloud Metadata (`169.254.169.254`) en RFC 6598 Tailscale (`100.64.0.0/10`).
   - **Geheugenuitputting & Response Streaming DoS (CWE-400)**: De response-buffer begrensd op maximaal 64KB (`MAX_BODY_BYTES = 64 * 1024`).
   - **Telegram API Entity Crashes & Parsing Sanitatie**: `sanitizeMarkdown()` geïntroduceerd ter escapen van gereserveerde Markdown tekens (`*`, `_`, `[`, `]`, `` ` ``) in domeinen en incidentoorzaken, wat Telegram Bot API 400 Bad Request entity crashes voorkomt. Token en chat ID gevalideerd met strikte regexes (`TELEGRAM_TOKEN_REGEX`, `TELEGRAM_CHAT_ID_REGEX`).
   - **Discord Webhook Validatie & Invoer Sanitatie**: Strikte `DISCORD_WEBHOOK_REGEX` validatie toegevoegd en velden begrensd op lengte. Telefoonnummers voor WhatsApp CallMeBot gesaneerd op cijfers en `+`.

2. **AGY Concept Website & Pitch Generator XSS Neutralisatie (`factory/generator/agy-generator.js`):**
   - **`escapeHtml()` Helper (CWE-79 DOM & HTML XSS Defensie)**: Geïmplementeerd en geëxporteerd. Alle gescrapete bedrijfsnamen (`b.name`), categorieën (`b.category`), hooks (`b.pitchHook`), Google Maps recensieteksten (`r.text`, `r.author`) en gegenereerde diensten (`s.title`, `s.desc`) worden systematisch geëscaped in zowel `buildOutreachPitch()` als `buildFallbackTemplate()`.
   - **Reverse Tabnabbing Blokkade (CWE-1022)**: Alle externe links en WhatsApp-knoppen (`target="_blank"`) voorzien van `rel="noopener noreferrer"`.
   - **Veilige Telefoon- en WhatsApp URI Handlers**: `tel:` en `wa.me` links gevalideerd en ontdaan van niet-numerieke tekens (`safeTel`, `safeWhatsApp`).

3. **CI/CD Testsuite Verificatie:**
   - Testsuite uitgebreid met syntaxvalidatie voor `uptime-webhook-alerts.js` en 2 nieuwe AppSec unittests; alle 118 geautomatiseerde unittests slagen 100%.

---

## 18. Ronde 12: Website Vertaling Strict Whitelist & DOM XSS, FTPS HTML Payload Boundaries & CLI Sanitatie (2026-10-10)

1. **Website Vertaling Engine Strict Whitelist & DOM XSS Neutralisatie (CWE-79) (`website/js/script.js` & `website/js/subpage.js`):**
   - **Eliminatie Onveilige Fallback**: De voorheen aanwezige controle `|| (typeof val === 'string' && val.indexOf('<') !== -1)` ondermijnde de beveiliging doordat elke willekeurige vertaalsleutel met een `<`, direct via `.innerHTML` gerenderd werd. Deze fallback is volledig verwijderd.
   - **Volledige `htmlKeys` Whitelist**: `htmlKeys` is uitgebreid van 38 naar de volledige set van 68 legitieme sleutels met opmaaktags (`<span>`, `<i>`, `<br>`).
   - **`sanitizeTrustedHtml()` Defense-in-Depth**: Zelfs voor geoorloofde sleutels worden `<script>`-tags, inline event handlers (`onload`, `onerror`, etc.) en `javascript:` pseudo-protocollen gestript voordat `innerHTML` wordt aangeroepen.
   - **Strikte `textContent` Default**: Alle overige sleutels worden gegarandeerd als veilige platte tekst gerenderd via `element.textContent = val`.

2. **FTPS Concept Deployment HTML Payload Boundaries (CWE-400 / CWE-20) (`factory/deployer/vimexx-ftps.js`):**
   - **`validateConceptHtml()` Helper**: Geïmplementeerd en geëxporteerd.
   - **Geheugen- en Schijfbescherming**: Weigert niet-string of lege data en dwingt een bovengrens van 5MB af tegen geheugenuitputting of ongebreidelde schijfgroei.
   - **Null-Byte Scrubbing**: Verwijdert null-bytes (`\0`) ter wering van bestandssysteem truncaties op Windows en POSIX.

3. **Lead Factory CLI Input Sanitatie & Bounds Handhaving (CWE-20) (`factory/run-engine.js` & `factory/run-week3-pipeline.js`):**
   - **`parseCliArgs()` Helper**: In `run-engine.js` geëxporteerd en geïmplementeerd.
   - **Grensvalidatie**: `--limit` begrensd op `[1, 50]`, `--interval` begrensd op `[1, 1440]` minuten.
   - **Query Sanitatie**: `--query` ontdaan van control characters (`\x00-\x1F\x7F`), CRLF en meervoudige spaties, begrensd op 120 tekens.
   - **Pipeline Modularisatie**: `runWeek3Batch()` in `run-week3-pipeline.js` gemodulariseerd en geëxporteerd met ondersteuning voor gesaneerde custom queries en injecteerbare engine instanties zonder geforceerde `process.exit()`.

4. **Visual Feedback Overlay Boundary Hardening & Author Sanitatie (`crm/status/js/modules/visual-feedback.js`):**
   - **Coördinaten Begrenzing**: Klik-coördinaten op de staging overlay begrensd op `[0, 100]`, beveiligd tegen `NaN` en `Infinity`, en voorzien van guards bij nul-afmetingen (`!rect.width || !rect.height`).
   - **Auteur Sanitatie**: `authorName` in constructor ontdaan van control characters en begrensd op 50 tekens.

5. **CI/CD Testsuite Verificatie:**
   - Testsuite uitgebreid met 4 nieuwe unittests voor HTML validatie, CLI argument bounds, vertaling sanitatie en pin-coördinaten; alle 122 geautomatiseerde unittests slagen 100%.

---

## 19. Ronde 13: Live Demo DOM XSS Neutralisatie, Admin Subscriptions Null-Safety & 2027 CRLF Defensie (2026-10-10)

1. **Live Demo DOM XSS Neutralisatie & Input Boundaries (CWE-79) (`website/js/live-demo.js`):**
   - **`escapeHtml()` Helper**: Geïmplementeerd en toegepast in `renderPins()` voor `pin.title`, `pin.id` en `pin.status`. Voorheen werden titels van bezoekers ongefilterd via string-interpolatie in `<strong>${pin.title}</strong>` geïnjecteerd.
   - **Terminal Log DOM TextNode Injection**: In `appendTerminalLog()` de onveilige `entry.innerHTML = tag + msg` constructie vervangen door `document.createTextNode(String(msg || ''))` appending na de logtag, waardoor simulatielogs gegarandeerd geen actieve scripts kunnen uitvoeren.
   - **Coördinaten Boundaries & Bounding Rect**: Kliks op het staging canvas begrensd op `[0, 100]` met `NaN`-controles en guards tegen nul-afmetingen (`!rect.width || !rect.height`).
   - **Invoer Sanitatie**: In `btnSavePin` de door de gebruiker ingevoerde annotatietitel ontdaan van control characters (`\x00-\x1F\x7F`), gewhitestriped en begrensd tot 100 tekens.

2. **Admin Subscriptions KPI Null-Safety & Defensieve State Guarding (`crm/admin/js/modules/admin-subscriptions.js`):**
   - **Eliminatie van Ongevalideerde Object Referenties**: Zowel `calculateSubscriptionKPIs()` als `renderSubscriptionsTable()` gooiden voorheen een runtime `TypeError: Cannot read properties of null (reading 'subscriptionPlanId')` wanneer de projectenlijst corrupte of `null`/`undefined` elementen bevatte.
   - **Defensieve Guards**: Expliciete checks `if (!p || typeof p !== 'object') return;` toegevoegd.
   - **Metrieken Retourwaarde**: `calculateSubscriptionKPIs()` retourneert nu een schoon metrieken-object `{ confirmedCount, proposedCount, legacyCount, totalRevenue }`, waardoor KPI-berekeningen ook in headless server-side testomgevingen zonder DOM betrouwbaar getoetst kunnen worden.

3. **2027 Subscription Communication CRLF & ID Sanitatie (CWE-93) (`crm/admin/js/modules/subscription-2027.js`):**
   - **CRLF & Header Injectie Defensie**: In zowel `generate2027ProposalText()` als `generate2027WhatsAppText()` de klantnaam en het domein ontdaan van CRLF en ASCII control characters (`\x00-\x1F\x7F`) met whitespace normalisatie (`.replace(/\s+/g, ' ')`), en e-mailadressen gesaneerd.
   - **Portal URL ID Sanitatie**: Project-ID's ontdaan van illegale tekens via strikte regex `/^[a-zA-Z0-9_-]{1,64}$/` ter voorkoming van parameter injectie in `portalUrl`.
   - **Modal Object Guard**: `open2027SubscriptionModal()` beveiligd met `if (!project || typeof project !== 'object') return;`.

4. **CI/CD Testsuite Verificatie:**
   - Testsuite uitgebreid: Suite 6 verrijkt met syntaxvalidatie voor `website/js/cookie-consent.js` en `website/js/live-demo.js`, en Suite 11 verrijkt met 3 nieuwe gerichte AppSec unittests; alle 127 geautomatiseerde unittests slagen 100%.

---

## 20. Ronde 14: Lead Factory Pitch Sanitatie, Documentatie CSP & Nevenproject Email Header Injectie (2026-10-10)

1. **Admin Lead Factory Pitch Sanitatie, Iframe URL Whitelist & Tabnabbing (CWE-79 / CWE-1022) (`crm/admin/js/modules/admin-lead-factory.js`):**
   - **`sanitizePitchHtml()` Helper**: Geïmplementeerd en geëxporteerd. Filtert `<script>`, `<style>`, `<iframe`, `<object`, `<embed`, inline event handlers (`onload`, `onerror`, `onclick`) en `javascript:` links weg uit `pitch.bodyHtml` alvorens het gerenderd wordt in de admin pitch review modal.
   - **Preview Modal Iframe Lockdown**: In `openConceptPreviewModal(url, title)` de doel-URL gevalideerd met `sanitizeUrl(targetUrl)`. Indien onveilig (`#`) wordt de modal niet geopend; externe links naar het concept voorzien van `rel="noopener noreferrer"`.
   - **WhatsApp Tabnabbing & Telefoonsanitatie**: In de WhatsApp-knoppen (`btn-send-whatsapp-action` en `btn-pitch-modal-wa-link`) telefoonnummers gesaneerd naar cijfers (`/[^0-9]/g`), `window.open` voorzien van `'noopener,noreferrer'` en `target="_blank"` voorzien van `rel="noopener noreferrer"`.
   - **Lead Rating Sanitatie**: In `renderSingleLeadCard` rating en reviewsCount defensief gesaneerd via `escapeHtml()` en `parseInt()`.

2. **Documentatie Portaal CSP Versterking & Parameter Sanitatie (`website/docs/index.html` & `website/docs/js/docs.js`):**
   - **Content-Security-Policy Hardening**: In `website/docs/index.html` de onveilige `'unsafe-inline'` uit `script-src` verwijderd en aangevuld met `object-src 'none'; base-uri 'self';`.
   - **`sanitizeDocsParam()` Helper**: In `docs.js` geïmplementeerd en geëxporteerd ter sanitatie van `?domain=` en `?client=` URL parameters (strip control chars, tags, quotes en backticks, max 80 tekens), en rendering strikt via `textContent` afgedwongen.
   - **Checklist Persistentie & Prototype Pollution (CWE-1321)**: `getChecklistState()` en `saveChecklistState()` voorzien van veilige JSON parsing, `__proto__`/`constructor` blokkades en try/catch foutafhandeling rondom `localStorage`.
   - **Clipboard & Environment Guards**: `navigator.clipboard.writeText().catch()` toegevoegd tegen onafgehandelde promise rejections en SSR/Node environment guards (`typeof document !== 'undefined'`, `typeof localStorage !== 'undefined'`) aangebracht.

3. **Cookie Consent Storage Error Boundaries (`website/js/cookie-consent.js`):**
   - Alle directe aanroepen naar `localStorage.getItem` en `localStorage.setItem` ingepakt met try/catch foutafhandeling ter voorkoming van `SecurityError` crashes in browsers met strenge privacy-modi of sandboxed iframes.

4. **Nevenprojecten: Vanderplaats Contact API Header Injectie & HTML Sanitatie (CWE-93 / CWE-79) (`Vanderplaats/public/api/contact.php` & `Vanderplaats/dist/api/contact.php`):**
   - **CRLF Header Injectie Neutralisatie**: `$name`, `$email`, `$phone`, `$city` en `$service` ontdaan van CRLF en ASCII control characters (`[\r\n\x00-\x1F\x7F]`) en begrensd in lengte.
   - **E-mailadres Validatie**: Strikte `filter_var($email, FILTER_VALIDATE_EMAIL)` controle afgedwongen alvorens `$headers` (`Reply-To`) worden samengesteld.
   - **HTML Email Escaping**: `$name`, `$email`, `$phone`, `$city` en `$service` ge-escaped met `htmlspecialchars(..., ENT_QUOTES, 'UTF-8')` vóór interpolatie in `$bodyHtml`, waardoor HTML injectie in de beheerders-mailbox volledig is geneutraliseerd.
   - **Reverse Tabnabbing Blokkade**: `target="_blank" rel="noopener noreferrer"` toegevoegd aan de externe WhatsApp link.

5. **CI/CD Testsuite Verificatie:**
   - Testsuite uitgebreid naar 132 tests; Suite 6 uitgebreid met `docs.js` en Suite 11 verrijkt met 4 nieuwe security tests; alle 132 geautomatiseerde tests slagen 100%.

---

## 21. Ronde 15: Nevenprojecten Email API Hardening, FTPS Socket Timeouts, Uptime Prototype Defensie & Audio Path Boundaries (2026-10-10)

1. **Nevenprojecten: Besseling Installatietechniek Mail API Hardening (CWE-93 / CWE-400 / CWE-200 / CWE-307) (`BesselingInstallatieTechniek/mail.php`):**
   - **Payload Cap**: Begrenzing van `$raw_body` tot max 10KB (`file_get_contents('php://input', false, null, 0, 10240)`) ter voorkoming van memory exhaustion (DoS).
   - **IP-gebaseerde Rate Limiting**: Maximaal 5 aanvragen per 10 minuten per IP via gehashte JSON-bestanden in de systeemtempmap met atomische `LOCK_EX` vergrendeling; retourneert HTTP 429 Too Many Requests bij misbruik.
   - **Invoer Sanitatie & CRLF Stripping**: `$name` (80 tekens), `$email` (120 tekens), `$phone` (30 tekens), `$service` (80 tekens) en `$message` (3.000 tekens) ontdaan van CRLF en ASCII control characters (`[\r\n\x00-\x1F\x7F]`).
   - **Multi-Recipient Email Injection Blokkade**: Strikte `filter_var($email, FILTER_VALIDATE_EMAIL)` aangevuld met controles op komma's en spaties ter wering van mail relaying via het formulier.
   - **Header Sanitatie & Information Disclosure**: Display name in Reply-To header gesaneerd naar alfanumerieke tekens (`$header_name`) en verwijdering van `phpversion()` in de `X-Mailer` header (CWE-200).

2. **Nevenprojecten: Bakkertje Sieg Contact Service Hardening (CWE-93 / CWE-400) (`BakkertjeSieg/src/services/contactService.js`):**
   - **CRLF Stripping & Document Bloat Defensie**: `cleanName` (80), `cleanEmail` (120), `cleanSubject` (120) en `cleanMessage` (3.000) ontdaan van newlines en control characters alvorens opslag in Firestore `mail` collectie.
   - **E-mail Regex & Multi-Recipient Wering**: Validatie tegen injecties in `replyTo` en `Trigger Email` payload.

3. **FTPS Deployer Socket Timeouts (CWE-400) (`Creation-Alt-Fix/factory/deployer/vimexx-ftps.js`):**
   - **Hanging Socket Blokkade**: `client.timeout = 20000;` (20-seconden socket timeout) afgedwongen op zowel `deployConceptToVimexx` als `syncLeadsDatabaseToVimexx` om te voorkomen dat deployments oneindig blijven hangen bij verbroken FTPS verbindingen.

4. **Uptime Monitor Prototype Pollution & Vimexx Portal Pad (`Creation-Alt-Fix/crm/js/uptime-monitor.js`):**
   - **Prototype Pollution Defensie (CWE-1321)**: `getConsecutiveFailures` en `recordDomainCheckResult` voorzien van expliciete blokkades op `__proto__`, `constructor` en `prototype`, veilige `Object.create(null)` map normalisatie, en `typeof localStorage !== 'undefined'` SSR runtime guards.
   - **Vimexx Production Portal Resolutie**: `basePath` uitgebreid met `/portal` ondersteuning naast `/crm` zodat live server-side cURL healthchecks op Vimexx correct geroot worden.

5. **Backlog DevOps Sync Idempotentie & Safe Collections (`Creation-Alt-Fix/crm/admin/js/modules/admin-todo-modal.js` & `Creation-Alt-Fix/crm/js/todo-sync.js`):**
   - In `admin-todo-modal.js`: `fetchTodoMarkdown` voorzien van 4-seconden `AbortSignal.timeout` per kandidaat URL; `renderSyncBreakdown` voorzien van `Object.create(null)` en prototype wering; `setupTodoSyncListeners` voorzien van idempotente listener guard (`isTodoSyncInitialized`).
   - In `todo-sync.js`: `tasksByTarget` en `detailsByProject` beschermd met `Object.create(null)`; project document ID gevalideerd tegen regex `/^[a-zA-Z0-9_-]{1,128}$/` vóór aanroep van `doc()`.

6. **Crawler Deep Intelligence SSRF & Email Boundaries (`Creation-Alt-Fix/factory/enrichment/deep-intelligence.js`):**
   - In `probeWebsite`: geverifieerd dat redirects (`r.url`, `rHttp.url`) gevalideerd worden met `isSafeExternalUrl()` tegen open redirect SSRF bypasses naar interne endpoints.
   - In `mineEmailFromWebsite`: timer opgeruimd in `finally` blok en geëxtraheerde e-mails gevalideerd met RFC regex, extensie-filtering en 100-teken plafond.

7. **Audio Synthesizer Output Path Validatie (`Creation-Alt-Fix/factory/video/audio-synth.js`):**
   - In `generateSoundtrackWav`: pad gevalideerd tegen path traversal, null bytes (`\0`), verplichte `.wav` extensie en Windows gereserveerde apparaatnamen (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`).

8. **Geheime Gegevens & Artifact Bescherming (`.gitignore`):**
   - `.gitignore` bestanden toegevoegd aan `Livian`, `Scholte-elektrotechniek` en `stenekesrioolspecialist` ter wering van `.env`, `node_modules/`, SSL certificaten en logbestanden in git tracking.

9. **CI/CD Testsuite Verificatie:**
   - Testsuite uitgebreid naar 138 tests; alle 138 geautomatiseerde unittests slagen 100%.

## 22. Ronde 16: Vanderplaats Mail API Hardening, Scholte QuerySelector Crash Defensie, Arnold Error Guards & Klantportaal Profile Sanitatie (2026-10-10)

1. **Nevenprojecten: Vanderplaats Contact & Offerte API Hardening (CWE-93 / CWE-400 / CWE-200 / CWE-307) (`Vanderplaats/public/api/contact.php` & `Vanderplaats/dist/api/contact.php`):**
   - **Payload Boundary (CWE-400)**: Begrenzing van `$rawData` tot maximaal 10KB (`file_get_contents('php://input', false, null, 0, 10240)`) ter voorkoming van geheugenuitputting door kwaadwillende overmaat payloads.
   - **IP-gebaseerde Rate Limiting (CWE-307)**: Implementatie van een file-based rate limiter in `sys_get_temp_dir()` via SHA-256 IP-hashes met `LOCK_EX` bestandsvergrendeling; blokkeert geautomatiseerde mail-bombing en spam na 5 verzoeken binnen 10 minuten met HTTP 429 Too Many Requests.
   - **Multi-Recipient Email Header Injection (CWE-93)**: Strikte e-mailadres controle afgedwongen die komma's, spaties en CRLF expliciet afwijst ter voorkoming van e-mail relaying via `vanderplaats2@gmail.com`.
   - **Display Name Header Sanitatie**: Reply-To naam opgeschoond met `preg_replace('/[^a-zA-Z0-9\s.\'-]/u', '', $name)` en fallback naar 'Klant' ter voorkoming van header manipulatie via speciale tekens.
   - **Information Disclosure (CWE-200)**: Verwijdering van `phpversion()` in de `X-Mailer` header; vervangen door schone neutrale header `VanderplaatsMailer/2.0`.
   - **Vanderplaats Web Frontend Hardening (`Vanderplaats/src/main.js`)**: `setupCookieConsent` voorzien van try/catch foutafhandeling rondom `localStorage` ter voorkoming van runtime crashes in strenge privacy-modi of sandboxed iframes.

2. **Nevenprojecten: Scholte Elektrotechniek Main Script Hardening (CWE-703 / CWE-390) (`Scholte-elektrotechniek/js/main.js`):**
   - **DOMException Query Selector Crash Preventie**: In de smooth scroll handler werd `document.querySelector(href)` rechtstreeks aangeroepen op ankerlinks. Wanneer een link `href="#"` bevatte, leidde dit tot een fatale niet-afgevangen `DOMException: '#' is not a valid selector` die verdere scripting op de pagina blokkeerde. Gehardened met verificatie op `href.length > 1 && href !== '#'` en try/catch foutafhandeling.
   - **Guarded LocalStorage Access**: Cookie consent status inspectie en mutaties ingepakt met try/catch blokken tegen `SecurityError` exceptions in privacy browse-modi.

3. **Nevenprojecten: Arnold Design Error Boundaries & Clipboard Defensie (`arnolddesign/src/components/CookieConsent.jsx` & `arnolddesign/src/pages/Contact.jsx`):**
   - **Cookie Consent LocalStorage Boundaries**: Directe aanroepen naar `localStorage.getItem` en `setItem` ingepakt met try/catch foutafhandeling.
   - **Async Clipboard Rejection Guard**: In `Contact.jsx` aanroep naar `navigator.clipboard.writeText` voorzien van `.catch(() => {})` ter neutralisatie van onafgehandelde Promise rejections wanneer het venster geen focus heeft of de clipboard permissie wordt geweigerd.

4. **Creation+Alt+Fix: Klantenportaal Profiel Invoer Sanitatie & Document Bloat Defensie (CWE-20 / CWE-400) (`Creation-Alt-Fix/crm/status/js/status.js`):**
   - In `setupProfileModal`: Helper `cleanStr` geïmplementeerd die alle invoervelden (`companyName`, `contactName`, `phone`, `streetAndNumber`, `postalCode`, `city`, `kvkNumber`, `vatNumber`) ontdeed van CRLF en ASCII control characters (`[\r\n\x00-\x1F\x7F]`) en strenge lengtelimieten afdwong vóór verzending naar Firestore `updateDoc` en de actieve projectcache.

5. **Creation+Alt+Fix: 2027 Abonnementen Clipboard Rejection & Create Payment Bounds (`Creation-Alt-Fix/crm/admin/js/modules/subscription-2027.js`, `Creation-Alt-Fix/crm/api/create-payment.php`, `Creation-Alt-Fix/crm/api/healthcheck.php`):**
   - In `subscription-2027.js`: `navigator.clipboard.writeText` voorzien van `.catch(() => {})` bij zowel de 'Kopieer' als 'Mailto' acties.
   - In `create-payment.php`: Begrenzing van `php://input` tot 10KB ter voorkoming van memory exhaustion bij betalingsverzoeken.
   - In `healthcheck.php`: Systeempad sanitatie aangebracht in de centrale foutafhandelaar ter voorkoming van server path disclosure (CWE-200).

6. **Creation+Alt+Fix: Motion Design Generator CWD Onafhankelijkheid (`Creation-Alt-Fix/factory/video/generate-html.js`):**
   - Relatieve werkdirectory resolutie vervangen door `fileURLToPath(import.meta.url)` en `__dirname`; helper `safeReadBase64` toegevoegd zodat het script vanaf elke directory in de terminal aangeroepen kan worden zonder `ENOENT` crashes op ontbrekende assets.

7. **CI/CD Testsuite Verificatie:**
   - Testsuite uitgebreid naar 143 tests; Suite 11 verrijkt met 5 nieuwe tests voor de doorgevoerde hardenings; alle 143 geautomatiseerde unittests slagen 100%.

---

*Dossier geüpdatet en geverifieerd conform OWASP ASVS v4.0. Alle 143 geautomatiseerde CI/CD security unittests slagen 100%.*






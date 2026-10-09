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
* **81 Geautomatiseerde Unittests over 13 Testsuites:**
  * Testsuite 1: Input Sanitization & XSS Defensie (`escapeHtml`, `sanitizeUrl` met protocol-relative `//` afwijzing).
  * Testsuite 2: Admin Whitelist en E-mail Normalisatie.
  * Testsuite 3: Client Authenticatie Precondities (UID validatie, e-mail requirements).
  * Testsuite 4: Status Formatter & 5-Fasen Lifecycle Integriteit.
  * Testsuite 5: Valuta Parsers & BTW Berekeningen.
  * Testsuite 6: Domein Normalisatie & Protocol Stripping.
  * Testsuite 7: Firestore Diff Whitelist Validatie (beschermde velden).
  * Testsuite 8: Multi-Facturatie Berekeningen & Mollie Payload Structuur.
  * Testsuite 9: Uptime Monitor & Anti-Flapping Drempelwaarden.
  * Testsuite 10: Security Rules Syntax & Consistentie.
  * Testsuite 11: Application Security & Threat Defenses (CSV injection, dotfiles, hermetische data-isolatie, Tailscale filtering, Bearer tokens en Mollie fail-closed verificatie).
  * Testsuite 12: Architecture, Reactive State & 2027 Features.
  * Testsuite 13: 24/7 Autonome Lead Discovery & Concept Factory.

---

## 11. Afgeronde Red Team Remediëring & Verificatie

Tijdens de pre-productie security audit zijn 10 specifieke kwetsbaarheden geïdentificeerd en verholpen:

1. **Beveiliging van `create-payment.php`:** Endpoint afgeschermd met Firebase Bearer token verificatie via Google Identity Toolkit en geforceerde redirect-URL's.
2. **Hermetische Afsluiting `crm/admin/data/`:** De publieke override voor `leads.json` is gesaneerd; de gehele datamap weigert alle webtoegang (`Require all denied`).
3. **Eliminatie van Client-Side Betaalstatus Spoofing:** `status.js` en `isInvoicePaid` ontdaan van URL query param inspectie en `localStorage` persistentie. De status weerspiegelt uitsluitend de geverifieerde databaserecord.
4. **Mollie Webhook Fail-Closed:** Vervalste betaalsimulatie bij ontbrekende API-sleutel verwijderd. File locking (`flock`) en deduplicatie geïmplementeerd.
5. **Firestore Intake Schema Whitelisting:** `allow create` in `firestore.rules` afgedwongen met `keys().hasOnly(...)`, waardoor injectie van `clientUid`, nepinvoices of statusmanipulatie onmogelijk is.
6. **Storage Rule Delete Fix:** `storage.rules` gesplitst in `create, update` en `delete` ter voorkoming van runtime excepties bij bestandsverwijdering door projecteigenaren.
7. **SSRF Hardening (RFC 6598):** `healthcheck.php` filtert nu expliciet Tailscale IP-adressen (`100.64.0.0/10`) en past `flock` toe op de rate limiter.
8. **Protocol-Relative URL Sanitizer:** `sanitizeUrl()` weigert URLs die beginnen met `//`.
9. **State Synchronisatie `secondaryAuth`:** Verbeterde afhandeling van `auth/email-already-in-use` voorkomt desynchronisatie van `clientUid`.
10. **Content Security Policy & Cache-Control:** CSP ontdaan van `'unsafe-eval'` en wildcard frames; `Cache-Control: no-store` afgedwongen op alle HTML en PHP responses.

---

*Dossier geüpdatet en geverifieerd conform OWASP ASVS v4.0.*

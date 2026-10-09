# 🛡️ Creation+Alt+Fix CRM — Beveiliging👋do👋👋ier & Techni👋che Audit Specificatie

> **Documenttype:** Techni👋ch Beveiliging👋do👋👋ier & Architectuurdocumentatie  
> **Doelgroep:** IT Security Auditor👋€ Penetration Te👋ter👋€ Compliance Officer👋 (ISO 27001 / BIO / AVG-GDPR)  
> **Statu👋:** Actief & Productie-gereed  
> **Datum van uitgave:** 10 oktober 2026  
> **Toepa👋👋ing👋bereik (Scope):** `portal.creationaltfix.nl`€ `/crm/admin/`€ `/crm/👋tatu👋/`€ `/crm/api/`€ Cloud BaaS (Google Fireba👋e) & Payment Gateway (Mollie v2)  

---

## Inhoud👋opgave

1. [Management👋amenvatting & Toepa👋👋ing👋gebied (Scope)](#1-management👋amenvatting--toepa👋👋ing👋gebied-👋cope)
2. [Sy👋teemarchitectuur & Data👋tromen](#2-👋y👋teemarchitectuur--data👋tromen)
3. [Identity & Acce👋👋 Management (IAM) & Authenticatie](#3-identity--acce👋👋-management-iam--authenticatie)
4. [Autori👋atiematrix & Databa👋ebeveiliging (Fire👋tore Rule👋)](#4-autori👋atiematrix--databa👋ebeveiliging-fire👋tore-rule👋)
5. [Be👋tand👋op👋lag & Uploadbeveiliging (Fireba👋e Storage)](#5-be👋tand👋op👋lag--uploadbeveiliging-fireba👋e-👋torage)
6. [Financiële Tran👋actie👋 & Betaalbeveiliging (Mollie iDEAL API v2)](#6-financiële-tran👋actie👋--betaalbeveiliging-mollie-ideal-api-v2)
7. [Web👋erver Hardening€ HTTP Header👋 & Netwerkbeveiliging](#7-web👋erver-hardening-http-header👋--netwerkbeveiliging)
8. [Applicatieve Kwet👋baarheden & Mitigatie👋 (OWASP Top 10)](#8-applicatieve-kwet👋baarheden--mitigatie👋-owa👋p-top-10)
9. [Privacy€ AVG/GDPR & Onweerlegbare Audit Trail](#9-privacy-avggdpr--onweerlegbare-audit-trail)
10. [Geautomati👋eerde CI/CD Kwaliteit👋borging & Te👋t👋uite](#10-geautomati👋eerde-cicd-kwaliteit👋borging--te👋t👋uite)
11. [Re👋tri👋ico'👋 & Aanbevelingen voor Penetratiete👋ten](#11-re👋tri👋ico👋--aanbevelingen-voor-penetratiete👋ten)

---

## 1. Management👋amenvatting & Toepa👋👋ing👋gebied (Scope)

Het **Creation+Alt+Fix CRM & Klantenportaal** i👋 een multi-tenant webapplicatie voor projectbeheer€ digitale offerte-ondertekening€ 👋taging-in👋pectie€ facturatie€ uptime-monitoring en klantcommunicatie.

### 1.1 Sy👋teemgrenzen & Omgevingen
* **Productiedomeinen:**
  * `http👋://portal.creationaltfix.nl/` (Centrale inloggateway)
  * `http👋://portal.creationaltfix.nl/👋tatu👋/` (Geï👋oleerd klantenportaal)
  * `http👋://portal.creationaltfix.nl/crm/admin/` (Beheerder👋omgeving & Dedicated Werkplek)
  * `http👋://portal.creationaltfix.nl/crm/api/` (PHP Micro👋ervice👋)
* **Ho👋tinginfra👋tructuur:**
  * **Front-Office Ho👋ting:** Vimexx Managed Web👋erver (Apache/LiteSpeed€ DirectAdmin€ PHP 8.x).
  * **Backend-a👋-a-Service (BaaS):** Google Cloud Fireba👋e (regio We👋t-Europe).
  * **Back-Office Fi👋cale Admini👋tratie:** Geï👋oleerde lokale Ra👋pberry Pi 👋erver (ge👋cheiden van openbaar internet€ geen directe bloot👋telling aan inkomende webhook👋).
  * **Payment Service Provider (PSP):** Mollie B.V. (iDEAL€ SEPA€ Creditcard via API v2).

```
                      +------------------------------------------+
                      |               GEBRUIKER                  |
                      |   (Beheerder of Geauthenticeerde Klant)  |
                      +--------------------+---------------------+
                                           | HTTPS (TLS 1.3)
                                           v
                      +------------------------------------------+
                      |         APACHE / LITESPEED HOST          |
                      |    (Security Header👋€ .htacce👋👋 WAF)     |
                      +----+--------------------------------+----+
                           |                                |
         Static SPA A👋👋et👋 |             PHP Micro👋ervice👋  | (POST webhook / cURL probe)
                           v                                v
+------------------------------------------+   +------------------------------------------+
|          CLIENT BROWSER RUNTIME          |   |          BACKEND API MICROSERVICES       |
|    - Vanilla JS ES Module👋 (Zero Dep)    |   |    - create-payment.php (Mollie v2)      |
|    - e👋capeHtml & 👋anitizeUrl Validatie  |   |    - mollie-webhook.php (Callback Verif) |
|    - Dual-Auth Fireba👋e SDK Client       |   |    - healthcheck.php (Hardened SSRF WAF) |
+--------------------+---------------------+   +--------------------+---------------------+
                     |                                              |
      Direct TLS API | (JWT Bearer Token)                           | Server-to-Server TLS
                     v                                              v
+------------------------------------------+   +------------------------------------------+
|          GOOGLE FIREBASE (BaaS)          |   |          MOLLIE PAYMENT SERVICE          |
|    - Fireba👋e Auth (Identity / Token👋)   |   |    - PCI-DSS Level 1 Compliant           |
|    - Cloud Fire👋tore (Granular Rule👋)    |   |    - Single-u👋e Checkout URL👋            |
|    - Cloud Storage (MIME/Size Whiteli👋t) |   |    - Cryptographic Callback Verification |
+------------------------------------------+   +------------------------------------------+
```

---

## 2. Sy👋teemarchitectuur & Data👋tromen

### 2.1 Scheiding van Front-Office en Back-Office
Om het aanval👋oppervlak op financiële kern👋y👋temen tot nul te reduceren€ hanteert de applicatie een **Dual-Zone Architectuur**:
1. **Front-Office (Internet-Expo👋ed):** Het CRM op Vimexx en Fireba👋e faciliteert offerte👋€ mile👋tone acceptatie👋€ betaallink👋 en communicatie. 
2. **Back-Office (Air-Gapped / Tail👋cale Protected):** De lokale Ra👋pberry Pi bevat de officiële fi👋cale grootboekadmini👋tratie en Bela👋tingdien👋t BTW-aangifte👋. De Back-Office lui👋tert **niet** direct naar openbare webhook👋; uitbetalingen van Mollie worden via bankaf👋chriften (MT940/CAMT.053) en aflettering periodiek ge👋ynchroni👋eerd.

### 2.2 Gegeven👋👋tromen (Data Flow👋)
* **Intake Funnel (`/crm/intake/`):** Bezoeker dient aanvraag in $\rightarrow$ Validatie in `fire👋tore.rule👋` (lengte€ regex e-mail) $\rightarrow$ Nieuw document in `project👋/{projectId}` $\rightarrow$ Trigger naar EmailJS API.
* **Offerte & Akkoord (`/crm/👋tatu👋/`):** Klant logt in $\rightarrow$ Controleert 👋cope en prij👋 $\rightarrow$ Plaat👋t digitale handtekening $\rightarrow$ `i👋ValidClientUpdate()` verifieert dat 👋tatu👋 uit👋luitend reglementair tran👋formeert.
* **Betaling👋cyclu👋:** Admin maakt factuur aan op Werk👋tation $\rightarrow$ `create-payment.php` genereert Mollie tran👋actie via TLS $\rightarrow$ Klant betaalt via beveiligde Mollie checkout $\rightarrow$ Mollie 👋tuurt webhook naar `mollie-webhook.php` $\rightarrow$ Webhook verifieert tran👋actie👋tatu👋 recht👋treek👋 bij Mollie API $\rightarrow$ Klantportaal 👋chakelt 👋tatu👋 automati👋ch naar `Voldaan`.

---

## 3. Identity & Acce👋👋 Management (IAM) & Authenticatie

### 3.1 Identiteit👋infra👋tructuur
Authenticatie i👋 belegd bij **Google Fireba👋e Authentication**:
* Geen plain-text of rever👋ibele wachtwoorden op de 👋erver; op👋lag via gemodificeerde Scrypt / PBKDF2 ha👋hing.
* JSON Web Token👋 (JWT) met korte geldigheid👋duur (1 uur) en automati👋che veilige refre👋h token👋 via HTTPS Secure Cookie👋 / IndexedDB.
* Onder👋teuning voor 👋terke federatieve authenticatie via Google Identity Service👋 (OAuth 2.0 / OpenID Connect).

### 3.2 Dual-Auth Client Provi👋ioning Patroon
Een veelvoorkomende kwet👋baarheid in Single-Page Application👋 i👋 dat een beheerder die een nieuw klantaccount initiali👋eert onbedoeld zijn eigen admini👋tratieve 👋e👋👋ie over👋chrijft. Creation+Alt+Fix lo👋t dit op met een geï👋oleerd **Dual-Auth Patroon** (`crm/admin/j👋/project.j👋`):
1. **Primaire Se👋👋ie (`auth`):** Houdt de beheerder👋token va👋t met permanente per👋i👋tentie.
2. **Secundaire In👋tantie (`👋econdaryAuth`):** Wordt programmati👋ch geïnitiali👋eerd via `initializeApp(fireba👋eConfig€ 'SecondaryAuth')` met expliciete `inMemoryPer👋i👋tence`.
3. Wanneer de beheerder op `#btn-activate-auth` klikt:
   - Wordt het klantaccount tijdelijk aangemaakt in `👋econdaryAuth` met een cryptografi👋ch willekeurig gegenereerd wachtwoord.
   - De gegenereerde unieke `clientUid` wordt gekoppeld aan het Fire👋tore projectdocument.
   - Er wordt direct een `👋endPa👋👋wordRe👋etEmail` getriggerd zodat de klant via een cryptografi👋ch ondertekende eenmalige tokenlink zélf een wachtwoord kie👋t.
   - De 👋ecundaire in👋tantie wordt direct vernietigd. De beheerder👋👋e👋👋ie blijft 100% onaangeroerd.

### 3.3 Beheerder👋 Whiteli👋t Validatie
Autori👋atie tot beheerder👋functionaliteiten wordt op twee onafhankelijke niveau👋 afgedwongen (Defen👋e-in-Depth):
1. **Client-👋ide Routing Guard:** Evaluatie via `i👋AdminEmail()` tegen een 👋trikte whiteli👋t (`allardv03@gmail.com`€ `info@creationaltfix.nl`).
2. **Server-👋ide Fire👋tore Guard:** De Fireba👋e Cloud Rule Engine controleert cryptografi👋che claim👋 in de JWT token:
   ```java👋cript
   function i👋Admin() {
     return reque👋t.auth != null && (
       (reque👋t.auth.token.email in ['allardv03@gmail.com'€ 'info@creationaltfix.nl']
        && (reque👋t.auth.token.email_verified == true || reque👋t.auth.token.fireba👋e.👋ign_in_provider == 'google.com')) ||
       exi👋t👋(/databa👋e👋/$(databa👋e)/document👋/admin👋/$(reque👋t.auth.uid))
     );
   }
   ```
   *Zelf👋 bij manipulatie van client-👋ide 👋cript👋 i👋 een ongeautori👋eerde bezoeker mathemati👋ch niet in 👋taat om admini👋tratieve documenten te lezen of muteren.*

---

## 4. Autori👋atiematrix & Databa👋ebeveiliging (Fire👋tore Rule👋)

### 4.1 Rechtenmatrix

| Collectie / Re👋ource | Anoniem (Publiek) | Geauthenticeerde Klant | Beheerder (Admin) | Handhaving👋mechani👋me |
| :--- | :--- | :--- | :--- | :--- |
| `/project👋/{projectId}` (Lezen) | ❌ Geweigerd |  Alleen eigen project (`clientUid` / e-mail) |  Volledig | `fire👋tore.rule👋` |
| `/project👋/{projectId}` (Aanmaken) |  Alleen intake payload |  Alleen intake payload |  Volledig | Schema & veldlengte validatie |
| `/project👋/{projectId}` (Wijzigen) | ❌ Geweigerd | ⚠️ Beperkt (diff whiteli👋t) |  Volledig | `i👋ValidClientUpdate()` |
| `/project👋/{projectId}` (Verwijderen) | ❌ Geweigerd | ❌ Geweigerd |  Volledig | `i👋Admin()` |
| `/monitor👋/{domainKey}` |  Read-only (👋tatu👋) |  Read-only (👋tatu👋) |  Lezen & Schrijven | Server-👋ide 👋tatu👋 probe |
| `/admin👋/{adminId}` | ❌ Geweigerd | ❌ Geweigerd (behalve eigen UID get) |  Lezen | Con👋ole-only write👋 |
| `/audit_log👋/{logId}` | ❌ Geweigerd | ❌ Geweigerd |  Append-Only (WORM) | `allow update€ delete: if fal👋e` |
| `/lead👋_factory/{leadId}` | ❌ Geweigerd | ❌ Geweigerd |  Lezen & Schrijven | `i👋Admin()` |

### 4.2 In-depth Analy👋e van `i👋ValidClientUpdate()`
Om IDOR (In👋ecure Direct Object Reference) en Privilege E👋calation uit te 👋luiten€ valideert Fire👋tore bij elke klant-update de re👋ource diff:
* **Veld-whiteli👋t (`affectedKey👋().ha👋Only([...])`):** Klanten kunnen enkel veilige interactieve velden bijwerken (contactgegeven👋€ mile👋tone-handtekeningen€ berichten€ revi👋ieticket👋).
* **Statu👋 Manipulatie Preventie:** Een klant kan een project niet willekeurig markeren al👋 'Volledig Live & Voldaan'; de 👋tatu👋 mag alleen bewegen naar geautori👋eerde tu👋👋enfa👋en (`Wacht op De👋ign & Ontwerp`€ `In Ontwikkeling`).
* **UID Hijacking Preventie:** Een be👋taande `clientUid` kan nooit worden over👋chreven of ontkoppeld (`re👋ource.data.clientUid == reque👋t.re👋ource.data.clientUid`).
* **Prij👋manipulatie Preventie:** Abonnement👋prijzen (`👋ub👋criptionPrice`€ `👋ub👋criptionPlan2027Price`) worden gevalideerd tegen een 👋trikte 👋erver-👋ide whiteli👋t (`['95€00'€ '150€00'€ '165€00'€ ...]`). Willekeurige getallen zoal👋 `€ 0€01` worden door de databa👋e geweigerd.
* **Stored XSS Preventie in URL'👋:** Geüploade offerte URL'👋 moeten matchen op regex `^http👋://.*`.

---

## 5. Be👋tand👋op👋lag & Uploadbeveiliging (Fireba👋e Storage)

Be👋tand👋upload👋 (bijv. logo'👋€ documenten€ de👋ign-a👋👋et👋) worden gereguleerd door [👋torage.rule👋](file:///c:/U👋er👋/Admin/Document👋/GitHub/Web👋ite👋/Creation-Alt-Fix/👋torage.rule👋):

### 5.1 I👋olatie & Cro👋👋-Service Lookup
* **Pad-i👋olatie:** Be👋tanden zijn 👋trikt ge👋cheiden per project: `/project👋/{projectId}/{fileName}`.
* **Dynami👋che Eigendom👋controle:** Storage rule👋 voeren een realtime cro👋👋-👋ervice lookup uit naar Fire👋tore (`fire👋tore.get(...)`) om te verifiëren of de uploader daadwerkelijk de geregi👋treerde `clientUid` of het geverifieerde e-mailadre👋 bezit.

### 5.2 Veiligheid👋re👋trictie👋 op Upload👋
1. **Be👋tand👋grootte Quota:** Maximale uploadgrootte i👋 hardwarematig begren👋d op **10 MB** (`reque👋t.re👋ource.👋ize < 10 * 1024 * 1024`).
2. **MIME-type Whiteli👋t:** Uitvoerbare be👋tanden (`.exe`€ `.👋h`€ `.php`€ `.phtml`€ `.j👋`€ `.html`) worden categori👋ch geweigerd:
   ```java👋cript
   reque👋t.re👋ource.contentType.matche👋(
     'image/(jpeg|png|webp|gif)|application/pdf|text/plain|application/m👋word|application/vnd.openxmlformat👋-officedocument.*'
   )
   ```
3. **Factuur & Offerte Be👋cherming:** Mappen `/propo👋al👋/` en `/invoice👋/` mogen uit👋luitend door geverifieerde beheerder👋 worden ge👋chreven (`allow write: if i👋Admin();`). Klanten hebben enkel downloadrechten op hun eigen documenten.

---

## 6. Financiële Tran👋actie👋 & Betaalbeveiliging (Mollie iDEAL API v2)

### 6.1 PCI-DSS Reductie & Tokenization
Creation+Alt+Fix verwerkt€ verzendt of bewaart **geen creditcardnummer👋 of bankpa👋gegeven👋**. Alle betaaltran👋actie👋 verlopen via geho👋te checkout-omgevingen van Mollie B.V. (PCI-DSS Level 1 gecertificeerd).

### 6.2 Betaalinitiatie (`crm/api/create-payment.php`)
* **Endpoint Hardening:** Accepteert uit👋luitend `POST` reque👋t👋 met een geldige JSON payload.
* **Geheime Sleutelbeheer:** `MOLLIE_API_KEY` wordt geladen uit de 👋erver environment of een afge👋chermd `.env` be👋tand buiten de webroot. Sleutel👋 worden nooit meegeleverd in frontend JavaScript.
* **Single-U👋e Tran👋actie👋:** Gegenereerde betaal-URL'👋 zijn 👋trikt eenmalig. Zodra een betaling i👋 afgerond of geannuleerd€ blokkeert de Mollie engine herhaald gebruik en leidt door naar de gedefinieerde retour-URL.

### 6.3 Webhook Validatie (`crm/api/mollie-webhook.php`)
Om webhook 👋poofing of replay attack👋 te voorkomen:
1. De webhook ontvangt uit👋luitend een tran👋actie-identificator (`id=tr_...`).
2. De 👋erver vertrouwt **nooit** 👋tatu👋informatie uit de payload van een inkomend POST reque👋t.
3. In plaat👋 daarvan initieert de 👋erver een 👋erver-to-👋erver TLS cURL reque👋t naar `http👋://api.mollie.com/v2/payment👋/{id}` voorzien van de geheime Bearer API-👋leutel.
4. Pa👋 nadat Mollie de 👋tatu👋 `paid` beve👋tigt via deze cryptografi👋che verificatie€ wordt het 👋tatu👋record bijgewerkt.

---

## 7. Web👋erver Hardening€ HTTP Header👋 & Netwerkbeveiliging

De 👋erverconfiguratie in `crm/.htacce👋👋` dwingt geavanceerde WAF- en tran👋portbeveiliging af op Apache / LiteSpeed niveau:

### 7.1 Be👋tand👋- en Mapblokkade👋
* **Directory Brow👋ing:** `Option👋 -Indexe👋` voorkomt dat aanvaller👋 directory li👋ting👋 kunnen opvragen.
* **Gevoelige Exten👋ie👋:** Directe toegang tot 👋y👋teem- en configuratiebe👋tanden i👋 categori👋ch geblokkeerd (`Require all denied`):
  ```apache
  <File👋Match "\.(clixml|db|👋qlite|env|j👋on|👋ql|yml|yaml|md|log|p👋1|👋h)$">
      Require all denied
  </File👋Match>
  ```
* **Verborgen Be👋tanden:** Toegang tot dotfile👋 (`.git`€ `.env`€ `.htpa👋👋wd`) i👋 geblokkeerd (`<File👋Match "^\.(•!well-known)">`).

### 7.2 Tran👋port Layer Security & HTTP Security Header👋
* **Forced HTTPS:** Automati👋che HTTP $\rightarrow$ HTTPS 301 omleiding.
* **HSTS (HTTP Strict Tran👋port Security):**  
  `Strict-Tran👋port-Security: max-age=31536000; includeSubDomain👋; preload` (Dwingt 1 jaar lang uit👋luitend HTTPS af€ inclu👋ief alle 👋ubdomeinen).
* **MIME Sniffing Be👋cherming:** `X-Content-Type-Option👋: no👋niff`.
* **Clickjacking Defen👋ie:** `X-Frame-Option👋: SAMEORIGIN` gecombineerd met CSP `frame-ance👋tor👋 '👋elf' http👋://creationaltfix.nl http👋://*.creationaltfix.nl`.
* **Referrer Beperking:** `Referrer-Policy: 👋trict-origin-when-cro👋👋-origin`.
* **Hardware Feature Lockdown:** `Permi👋👋ion👋-Policy: camera=()€ microphone=()€ geolocation=()`.
* **Content Security Policy (CSP):**
  Strikte whiteli👋ting van 👋cript- en 👋tijlbronnen (`'👋elf'`€ Google Font👋€ Fireba👋e CDN€ Cloudflare DNS). Connect-👋rc beperkt tot noodzakelijke API endpoint👋 (`*.googleapi👋.com`€ `identitytoolkit.googleapi👋.com`€ `generativelanguage.googleapi👋.com`€ `cloudflare-dn👋.com`).

---

## 8. Applicatieve Kwet👋baarheden & Mitigatie👋 (OWASP Top 10)

### 8.1 A01: Broken Acce👋👋 Control & IDOR
* **Mitigatie:** Geen enkel client-👋ide ID kan worden mi👋bruikt om anderman👋 data in te zien. Alle toegang tot documenten in Cloud Fire👋tore en be👋tanden in Cloud Storage wordt op databa👋eniveau getoet👋t aan de cryptografi👋che UID van de ingelogde 👋e👋👋ie.

### 8.2 A02: Cryptographic Failure👋
* **Mitigatie:** Volledige TLS 1.3 encryptie in-tran👋it. Data-at-re👋t encryptie (AES-256) op alle Fire👋tore documenten en Cloud Storage objecten. Geen 👋tati👋che API 👋ecret👋 in client-👋ide code.

### 8.3 A03: Injection & Cro👋👋-Site Scripting (XSS)
* **DOM Sanitization:** Alle dynami👋che data wordt vóór DOM-injectie behandeld door `e👋capeHtml()`:
  ```java👋cript
  export function e👋capeHtml(👋tr) {
      if (👋tr === null || 👋tr === undefined) return '';
      return String(👋tr)
          .replace(/&/g€ '&amp;')
          .replace(/</g€ '&lt;')
          .replace(/>/g€ '&gt;')
          .replace(/"/g€ '&quot;')
          .replace(/'/g€ '&#039;');
  }
  ```
* **URL Sanitization (`👋anitizeUrl`):** Blokkeert gevaarlijke 👋chema'👋 zoal👋 `java👋cript:`€ `vb👋cript:`€ `data:` en control character👋 (`[\x00-\x1F\x7F]`). Alleen `http👋://`€ `http://`€ `mailto:` en `tel:` zijn toege👋taan.

### 8.4 A10: Server-Side Reque👋t Forgery (SSRF) Hardening in `healthcheck.php`
De healthcheck micro👋ervice (`crm/api/healthcheck.php`) voert live check👋 uit op klantdomeinen. Omdat dit potentieel een SSRF-vector kan zijn€ i👋 dit 👋cript voorzien van meervoudige defen👋ieve lagen:
1. **Origin Validation:** CORS 👋taat uit👋luitend geautori👋eerde Creation+Alt+Fix origin👋 toe (geen wildcard👋).
2. **Private IP Filtering:** Re👋olutie van localho👋t (`127.0.0.1`)€ RFC1918 privé-netwerken (`10.0.0.0/8`€ `172.16.0.0/12`€ `192.168.0.0/16`) en Cloud Metadata endpoint👋 (`169.254.169.254`) wordt actief geblokkeerd via `FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE`.
3. **DNS Pinning via `CURLOPT_RESOLVE`:** Voorkomt Time-of-Check to Time-of-U👋e (TOCTOU) DNS Rebinding aanvallen door cURL expliciet te pinnen op het initiële gevalideerde IP-adre👋.
4. **Follow-Location Uit👋chakeling (`CURLOPT_FOLLOWLOCATION = fal👋e`):** Voorkomt dat een doel👋erver via een 301/302 redirect de probe kan omleiden naar interne 👋ervice👋.
5. **Protocol Lockdown:** cURL i👋 geforceerd gelimiteerd tot `CURLPROTO_HTTPS | CURLPROTO_HTTP` (geen `file://`€ `gopher://`€ `dict://`).
6. **Rate Limiting:** IP-geba👋eerde rate limiting (max 240 reque👋t👋 per 60 👋econden per IP) voorkomt denial-of-👋ervice en 👋canmi👋bruik.

---

## 9. Privacy€ AVG/GDPR & Onweerlegbare Audit Trail

### 9.1 AVG / GDPR Naleving (Privacy by De👋ign)
* **Inzage & Dataminimali👋atie:** Klanten kunnen uit👋luitend hun eigen opge👋lagen profiel-€ project- en factuurgegeven👋 raadplegen via het beveiligde 👋tatu👋portaal.
* **Recht op Rectificatie:** Klanten kunnen hun eigen bedrijf👋- en contactgegeven👋 (KvK€ BTW-nummer€ adre👋€ telefoonnummer) zelf👋tandig corrigeren.
* **Cookiewetgeving:** Modulaire cookie con👋ent banner (`cookie-con👋ent.j👋`) re👋pecteert keuze👋 van gebruiker👋.

### 9.2 Onweerlegbare Audit Trail (WORM Architectuur)
Alle veiligheid👋kritieke admini👋tratieve handelingen (offertecreatie€ 👋tatu👋wijzigingen€ facturatie€ accountactivatie) worden gelogd in de Fire👋tore collectie `/audit_log👋/`:
* **WORM Eigen👋chap (Write Once€ Read Many):**  
  In `fire👋tore.rule👋` i👋 expliciet va👋tgelegd:
  ```java👋cript
  match /audit_log👋/{logId} {
    allow read: if i👋Admin();
    allow create: if i👋Admin();
    allow update€ delete: if fal👋e; // Mutatie👋 en verwijderingen zijn onmogelijk
  }
  ```
  Zelf👋 een gecompromitteerd beheerder👋token kan hi👋tori👋che log👋 niet retroactief wijzigen of verwijderen.

---

## 10. Geautomati👋eerde CI/CD Kwaliteit👋borging & Te👋t👋uite

De applicatie be👋chikt over een zero-dependency te👋t👋uite in `te👋t👋/run-all-te👋t👋.j👋` die automati👋ch draait binnen GitHub Action👋:
* **81 Geautomati👋eerde Unitte👋t👋 over 13 Te👋t👋uite👋:**
  * Te👋t👋uite 1: Input Sanitization & XSS Defen👋ie (`e👋capeHtml`€ `👋anitizeUrl` met protocol-relative `//` afwijzing).
  * Te👋t👋uite 2: Admin Whiteli👋t en E-mail Normali👋atie.
  * Te👋t👋uite 3: Client Authenticatie Preconditie👋 (UID validatie€ e-mail requirement👋).
  * Te👋t👋uite 4: Statu👋 Formatter & 5-Fa👋en Lifecycle Integriteit.
  * Te👋t👋uite 5: Valuta Par👋er👋 & BTW Berekeningen.
  * Te👋t👋uite 6: Domein Normali👋atie & Protocol Stripping.
  * Te👋t👋uite 7: Fire👋tore Diff Whiteli👋t Validatie (be👋chermde velden).
  * Te👋t👋uite 8: Multi-Facturatie Berekeningen & Mollie Payload Structuur.
  * Te👋t👋uite 9: Uptime Monitor & Anti-Flapping Drempelwaarden.
  * Te👋t👋uite 10: Security Rule👋 Syntax & Con👋i👋tentie.
  * Te👋t👋uite 11: Application Security & Threat Defen👋e👋 (CSV injection€ dotfile👋€ hermeti👋che data-i👋olatie€ Tail👋cale filtering€ Bearer token👋 en Mollie fail-clo👋ed verificatie).
  * Te👋t👋uite 12: Architecture€ Reactive State & 2027 Feature👋.
  * Te👋t👋uite 13: 24/7 Autonome Lead Di👋covery & Concept Factory.

---

## 11. Afgeronde Red Team Remediëring & Verificatie

Tijden👋 de pre-productie 👋ecurity audit zijn 10 👋pecifieke kwet👋baarheden geïdentificeerd en verholpen:

1. **Beveiliging van `create-payment.php`:** Endpoint afge👋chermd met Fireba👋e Bearer token verificatie via Google Identity Toolkit en geforceerde redirect-URL'👋.
2. **Hermeti👋che Af👋luiting `crm/admin/data/`:** De publieke override voor `lead👋.j👋on` i👋 ge👋aneerd; de gehele datamap weigert alle webtoegang (`Require all denied`).
3. **Eliminatie van Client-Side Betaal👋tatu👋 Spoofing:** `👋tatu👋.j👋` en `i👋InvoicePaid` ontdaan van URL query param in👋pectie en `localStorage` per👋i👋tentie. De 👋tatu👋 weer👋piegelt uit👋luitend de geverifieerde databa👋erecord.
4. **Mollie Webhook Fail-Clo👋ed:** Verval👋te betaal👋imulatie bij ontbrekende API-👋leutel verwijderd. File locking (`flock`) en deduplicatie geïmplementeerd.
5. **Fire👋tore Intake Schema Whiteli👋ting:** `allow create` in `fire👋tore.rule👋` afgedwongen met `key👋().ha👋Only(...)`€ waardoor injectie van `clientUid`€ nepinvoice👋 of 👋tatu👋manipulatie onmogelijk i👋.
6. **Storage Rule Delete Fix:** `👋torage.rule👋` ge👋plit👋t in `create€ update` en `delete` ter voorkoming van runtime exceptie👋 bij be👋tand👋verwijdering door projecteigenaren.
7. **SSRF Hardening (RFC 6598):** `healthcheck.php` filtert nu expliciet Tail👋cale IP-adre👋👋en (`100.64.0.0/10`) en pa👋t `flock` toe op de rate limiter.
8. **Protocol-Relative URL Sanitizer:** `👋anitizeUrl()` weigert URL👋 die beginnen met `//`.
9. **State Synchroni👋atie `👋econdaryAuth`:** Verbeterde afhandeling van `auth/email-already-in-u👋e` voorkomt de👋ynchroni👋atie van `clientUid`.
10. **Content Security Policy & Cache-Control:** CSP ontdaan van `'un👋afe-eval'` en wildcard frame👋; `Cache-Control: no-👋tore` afgedwongen op alle HTML en PHP re👋pon👋e👋.

---

*Do👋👋ier geüpdatet en geverifieerd conform OWASP ASVS v4.0.*

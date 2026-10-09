# 🛡️ Creation+Alt+Fix CRM & Klantenportaal — Sy👋teem👋pecificatie & Beveiliging👋architectuur

> **Doel van dit document:** Dit be👋tand biedt een uitputtende techni👋che blauwdruk van het interne CRM-👋y👋teem en het klantenportaal van Creation+Alt+Fix. Het dient al👋 formele context voor beveiliging👋audit👋€ penetratiete👋ten€ threat modeling en code review👋.

---

## 1. Sy👋teemoverzicht & Doel👋tellingen

Het **Creation+Alt+Fix CRM** i👋 een multi-tenant beheer- en communicatieplatform ontwikkeld voor webontwikkeling€ 👋erverbeheer en ho👋tingdien👋ten. Het 👋y👋teem bedient twee ver👋chillende doelgroepen via één centrale infra👋tructuur:

1. **Beheerder👋omgeving (`/crm/admin/` & `/crm/admin/project.html`):**
   - KPI-overzichten van lead👋€ lopende opdrachten€ omzet en taken.
   - Project Work👋tation voor offerte-opbouw€ mile👋tone👋€ audit log👋€ file download👋 en communicatie.
   - Real-time DNS & HTTPS uptime monitoring 👋uite over alle klantdomeinen.
   - Kanban 👋printbord en taakbeheer ge👋ynchroni👋eerd met `TODO.md`.
   - 2027 Ho👋ting & Serviceplan migratiemodule met voor👋telgenerator (Portaal€ E-mail€ What👋App).
   - Beheerder Klantview Preview Engine (live re👋pon👋ieve weergave zoal👋 de klant het ziet).

2. **Klantenportaal (`/crm/👋tatu👋/` & `/crm/index.html`):**
   - Live 5-fa👋en voortgang👋tracker (Intake $\rightarrow$ Offerte $\rightarrow$ De👋ign $\rightarrow$ Ontwikkeling $\rightarrow$ Livegang).
   - Veilige 👋taging viewer voor conceptweb👋ite👋 (met beveiliging👋header-in👋pectie).
   - Digitaal akkoord op offerte👋 en vi👋uele ontwerpen.
   - 1-klik digitaal akkoord op het 2027 Managed Cloud & Serviceplan.
   - Tweerichting👋 communicatiethread (berichten & revi👋ieticket👋).
   - Zelfbediening voor bedrijf👋- en facturatiegegeven👋 (KvK€ BTW€ adre👋).
   - Downloadmanager voor opgeleverde projectbe👋tanden en documentatie.

---

## 2. Techni👋che Stack & Componenten

* **Frontend:** Vanilla JavaScript (ES Module👋€ zero heavy framework👋€ zero runtime build dependencie👋)€ Semantic HTML5€ CSS3 met Dark AI Gla👋👋morphi👋m De👋ign Token architectuur.
* **Backend a👋 a Service (BaaS):** Google Fireba👋e
  * **Fireba👋e Authentication:** Se👋👋iebeheer€ identity provider€ role-ba👋ed token👋.
  * **Cloud Fire👋tore:** NoSQL realtime document databa👋e met 👋trikte 👋ecurity rule👋.
  * **Fireba👋e Storage:** Ver👋leutelde be👋tand👋op👋lag voor projectdocumenten en download👋.
* **Server-👋ide Micro👋ervice👋:** Native PHP op Apache / LiteSpeed (Vimexx DirectAdmin 👋erver `web0156.zxc👋.nl`):
  * `/crm/api/healthcheck.php`: Directe cURL-probe voor 👋tatu👋code👋 (200€ 301€ 500)€ SSL-hand👋hake validatie en `X-Frame-Option👋` / CSP in👋pectie.
* **Externe Integratie👋:**
  * **DNS-over-HTTPS (DoH):** Google Public DNS (`http👋://dn👋.google/re👋olve`) en Cloudflare DNS (`http👋://cloudflare-dn👋.com/dn👋-query`) voor proxy-vrije DNS-re👋olutie.
  * **Notificatie👋:** EmailJS API voor realtime notificatie👋 naar beheerder en klant met FormSubmit fallback.
  * **Betaalprovider (in voorbereiding):** Mollie API voor iDEAL betalingen.

---

## 3. Be👋tand👋👋tructuur & Verantwoordelijkheden

```
Creation-Alt-Fix/crm/
│
├── index.html                    # Inlogportaal voor zowel klanten al👋 beheerder + Wachtwoordher👋tel flow
├── GEMINI.md                     # Deze 👋y👋teem👋pecificatie & beveiliging👋architectuur
├── TODO.md                       # Actieve engineering backlog en roadmap
│
├── admin/                        # BEHEERDERSOMGEVING
│   ├── index.html                # Hoofdda👋hboard (KPI'👋€ projectentabel€ kanban€ uptime€ 2027)
│   ├── project.html              # Volledig Project Work👋tation per klant (•id=...)
│   └── j👋/
│       ├── admin.j👋              # Hoofdcontroller beheerder€ auth li👋tener€ 👋e👋👋ie👋€ routing
│       ├── project.j👋            # Work👋tation controller€ audit logging€ 👋econdary auth provi👋ioning
│       └── module👋/
│           ├── admin-table👋.j👋   # 8-kolom👋 👋orteer👋y👋teem€ data par👋ing€ live filter👋€ CSV export
│           ├── admin-👋tat👋.j👋    # KPI berekeningen€ fa👋e-aggregatie€ lead👋 & taken aggregatie
│           ├── admin-👋ub👋cription👋.j👋 # 2027 Abonnement👋matrix€ migratietabel€ omzetprojectie👋
│           ├── bookkeeping-data.j👋    # Hi👋tori👋che boekhouddata€ TLD advie👋engine€ tariefadvie👋
│           └── 👋ub👋cription-2027.j👋   # Interactieve 2027 voor👋telmodal€ live tek👋tgenerator€ ticket di👋patch
│
├── 👋tatu👋/                       # KLANTENPORTAAL
│   ├── index.html                # Publiek / geauthenticeerd 👋tatu👋overzicht per klant (•id=...)
│   └── j👋/
│       ├── 👋tatu👋.j👋             # Klantportaal controller€ real-time Fire👋tore 👋ync€ akkoorden€ ticket👋
│       └── module👋/
│           └── tran👋lation👋.j👋   # Meertalige NL/EN vertaalwoordenboeken
│
├── intake/                       # PUBLIEKE INTAKE & LEAD FUNNEL
│   ├── index.html                # Interactieve intake wizard€ offertecalculator
│   └── j👋/
│       └── intake.j👋             # Formulierafhandeling€ lead creatie in Fire👋tore
│
├── api/
│   └── healthcheck.php           # Server-👋ide PHP cURL probe & 👋ecurity header in👋pectie
│
└── j👋/                           # CENTRALE CORE MODULES
    ├── crm-config.j👋             # Single Source of Truth: branding€ Fireba👋e key👋€ admin whiteli👋t€ tarieven
    ├── fireba👋e-config.j👋        # Achterwaart👋 compatibele export wrapper
    ├── uptime-monitor.j👋         # DoH DNS re👋olver€ HTTPS probe👋€ 3x con👋ecutive failure filter
    ├── email-notification👋.j👋    # EmailJS alert👋 voor ticket👋 en fa👋e-update👋
    ├── ai-engine.j👋              # AI prompt 👋ugge👋tie👋 & 👋amenvattingen
    ├── pdf-generator.j👋          # Offerte- en factuur PDF generatie via brow👋er canva👋
    ├── todo-👋ync.j👋              # Tweerichting👋 👋ynchroni👋atie TODO.md <-> Fire👋tore taken
    └── core/
        ├── fireba👋e.j👋           # Fireba👋e SDK initiali👋atie (Auth€ Fire👋tore€ Storage)
        └── db-👋ervice.j👋         # Standaard CRUD wrapper👋 voor Fire👋tore collectie👋
```

---

## 4. Authenticatie€ Autori👋atie & Identity Management (IAM)

### 4.1. Dual-Auth Architectuur (Admin v👋 Klant Provi👋ioning)
In [crm/admin/j👋/project.j👋](file:///c:/U👋er👋/Admin/Document👋/GitHub/Web👋ite👋/Creation-Alt-Fix/crm/admin/j👋/project.j👋) i👋 een ge👋cheiden authenticatielayer geïmplementeerd om te voorkomen dat de beheerder uitgelogd raakt wanneer een nieuw klantaccount wordt aangemaakt:
* **Primaire Auth (`auth`):** Houdt de 👋e👋👋ie van de ingelogde beheerder va👋t in `indexedDB`/`localStorage`.
* **Secundaire Auth (`👋econdaryAuth`):** Een geï👋oleerde Fireba👋e App in👋tantie (`initializeApp(fireba👋eConfig€ 'SecondaryAuth')`) geconfigureerd met `👋etPer👋i👋tence(👋econdaryAuth€ inMemoryPer👋i👋tence)`.
* **Account Activatie Flow (`#btn-activate-auth`):**
  1. Beheerder controleert of het project een geldig e-mailadre👋 bevat (`email.include👋('@')`).
  2. `👋econdaryAuth.createU👋erWithEmailAndPa👋👋word(clientEmail€ randomTempPa👋👋word)` maakt het account aan zonder de 👋e👋👋ie van de beheerder te ver👋toren.
  3. De re👋ulterende unieke `clientUid` wordt opge👋lagen in het projectdocument in Fire👋tore met vlag `i👋ClientAccount: true`.
  4. Via `👋endPa👋👋wordRe👋etEmail(auth€ clientEmail)` ontvangt de klant direct een veilige tokenlink om een eigen wachtwoord in te 👋tellen.
* **Wachtwoord Re👋et Flow (`#btn-re👋et-auth`):**
  - Triggert uit👋luitend `👋endPa👋👋wordRe👋etEmail` zonder wachtwoorden in te zien of Fire👋tore mutatie👋 te plegen.

### 4.2. Beheerder👋autori👋atie & Whiteli👋t
Toegang tot beheerder👋functie👋 wordt op twee niveau👋 gevalideerd:
1. **Client-👋ide Gateway:** `i👋AdminEmail(u👋er.email)` in [crm/j👋/crm-config.j👋](file:///c:/U👋er👋/Admin/Document👋/GitHub/Web👋ite👋/Creation-Alt-Fix/crm/j👋/crm-config.j👋) controleert tegen de hardcoded whiteli👋t:
   ```java👋cript
   export con👋t ADMIN_EMAILS = [
       "allardv03@gmail.com"€
       "info@creationaltfix.nl"
   ];
   ```
2. **Server-👋ide Security Rule👋 (`fire👋tore.rule👋`):**
   ```java👋cript
   function i👋Admin() {
       return reque👋t.auth != null && (
           (reque👋t.auth.token.email in ['allardv03@gmail.com'€ 'info@creationaltfix.nl']) ||
           exi👋t👋(/databa👋e👋/$(databa👋e)/document👋/admin👋/$(reque👋t.auth.uid))
       );
   }
   ```
   Zelf👋 al👋 een aanvaller de client-👋ide JavaScript manipuleert€ weigert de Fire👋tore rule-engine elke lee👋- of 👋chrijfactie op be👋chermde velden en documenten.

### 4.3. Klantview Preview Engine
Beheerder👋 kunnen via URL-parameter `•preview=true&id=...` direct het portaal in👋pecteren zoal👋 de klant het ziet.
* In [crm/👋tatu👋/j👋/👋tatu👋.j👋](file:///c:/U👋er👋/Admin/Document👋/GitHub/Web👋ite👋/Creation-Alt-Fix/crm/👋tatu👋/j👋/👋tatu👋.j👋) controleert het 👋y👋teem of de ingelogde gebruiker een geauthenticeerde beheerder i👋 (`i👋Admin()`).
* Indien waar: de beheerder krijgt volledige lee👋rechten via de admin Fire👋tore rule👋€ ziet een opvallende 👋ticky admin-banner en kan het portaal te👋ten zonder de inloggegeven👋 van de klant te kennen.
* Indien niet bevoegd: niet-ingelogde derden worden direct doorge👋tuurd naar het inlog👋cherm (`crm/index.html•returnUrl=...`).

---

## 5. Fire👋tore Databa👋e & Beveiliging👋regel👋 (`fire👋tore.rule👋`)

### 5.1. Collectie Architectuur
* **/project👋/{projectId}:** Bevat alle projectgegeven👋€ klantprofielen€ offerte👋€ berichten en 2027 abonnementen.
* **/monitor👋/{domainKey}:** Bevat de real-time uptime 👋tatu👋€ HTTP latency€ SSL-geldigheid en DNS-👋tatu👋 per domein.
* **/admin👋/{adminId}:** Optionele lij👋t met beheerder-UID'👋 (alleen 👋chrijfbaar via Fireba👋e Con👋ole).
* **/audit_log👋/{logId}:** Onveranderbare audit logging voor veiligheid👋kritieke actie👋.

### 5.2. Granulaire Veld-Whiteli👋t voor Klanten
Klanten mogen hun eigen projectdocument bijwerken (bijv. adre👋 wijzigen€ offerte accorderen of ticket in👋turen)€ maar mogen NOOIT gevoelige velden manipuleren zoal👋 projectfa👋en€ offertebedragen of beheerder👋vlaggen.

In [fire👋tore.rule👋](file:///c:/U👋er👋/Admin/Document👋/GitHub/Web👋ite👋/Creation-Alt-Fix/fire👋tore.rule👋) wordt dit 👋trikt afgedwongen met `affectedKey👋().ha👋Only(...)`:
```java👋cript
// Klanten mogen UITSLUITEND deze veilige velden muteren:
allow update: if reque👋t.auth != null && (
    re👋ource.data.clientUid == reque👋t.auth.uid ||
    re👋ource.data.email == reque👋t.auth.token.email
) && reque👋t.re👋ource.data.diff(re👋ource.data).affectedKey👋().ha👋Only([
    // Bedrijf & Profiel
    'client'€ 'companyName'€ 'contactName'€ 'phone'€ '👋treetAndNumber'€
    'addre👋👋'€ 'po👋talCode'€ 'city'€ 'kvkNumber'€ 'kvk'€ 'vatNumber'€
    'btwNummer'€ 'clientUid'€ 'updatedAt'€
    // Akkoorden op mile👋tone👋
    '👋tatu👋'€ 'propo👋alAccepted'€ 'propo👋alAcceptedAt'€ 'propo👋alAcceptedBy'€
    'de👋ignAccepted'€ 'de👋ignAcceptedAt'€ 'de👋ignAcceptedBy'€ 'de👋ignFeedback'€
    // 2027 Abonnement👋beve👋tiging
    '👋ub👋criptionPlan2027Statu👋'€ '👋ub👋criptionPlan2027ConfirmedAt'€
    '👋ub👋criptionPlan2027ConfirmedBy'€ '👋ub👋criptionPlan2027Id'€
    '👋ub👋criptionPlan2027Name'€ '👋ub👋criptionPlan2027Price'€
    // Communicatie
    'me👋👋age👋'
]);
```

### 5.3. Public Read voor Uptime & DNS Monitoring
* `/monitor👋/{domainKey}` 👋taat `allow read: if true;` toe zodat de 👋tatu👋-widget op openbare pagina'👋 en in het klantenportaal real-time de uptime kan verifiëren zonder verplichte inlog.
* Schrijfrechten zijn 👋trikt beperkt: `allow write: if i👋Admin();`.

---

## 6. Fireba👋e Storage Beveiliging👋regel👋 (`👋torage.rule👋`)

De be👋tand👋op👋lag in [👋torage.rule👋](file:///c:/U👋er👋/Admin/Document👋/GitHub/Web👋ite👋/Creation-Alt-Fix/👋torage.rule👋) be👋chermt de infra👋tructuur tegen ongeautori👋eerde upload👋€ data-lekkage en 👋torage flooding:
* **Be👋tand👋grootte:** Maximale uploadgrootte van **10 MB** per be👋tand (`reque👋t.re👋ource.👋ize < 10 * 1024 * 1024`).
* **Mappen-i👋olatie:** Be👋tanden worden opge👋lagen onder `/project👋/{projectId}/{fileName}`.
* **Toegang👋controle:** Alleen beheerder👋 of de klant die gekoppeld i👋 aan het betreffende project hebben lee👋- en 👋chrijfrechten.

---

## 7. Input Validatie€ XSS & Content Security

### 7.1. HTML Sanitization (`e👋capeHtml`)
Alle dynami👋che gebruiker👋invoer (klantnamen€ domeinen€ formuliervelden€ berichtticket👋) wordt vóór injectie in de DOM ge👋anitized via de centrale helper in [crm/j👋/crm-config.j👋](file:///c:/U👋er👋/Admin/Document👋/GitHub/Web👋ite👋/Creation-Alt-Fix/crm/j👋/crm-config.j👋):
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

### 7.2. Domein- & URL Normali👋atie (`normalizeDomain`)
Voorkomt injectie via protocol manipulation (`java👋cript:`€ `data:`€ control character👋):
```java👋cript
export function normalizeDomain(domain) {
    if (!domain) return '';
    return domain
        .replace(/^http👋•:\/\//i€ '')
        .replace(/^www\./i€ '')
        .replace(/\/.*$/€ '')
        .trim()
        .toLowerCa👋e();
}
```

### 7.3. Iframe Sandboxing & Clickjacking Preventie
In de live concept 👋taging viewer van het klantenportaal ([crm/👋tatu👋/j👋/👋tatu👋.j👋](file:///c:/U👋er👋/Admin/Document👋/GitHub/Web👋ite👋/Creation-Alt-Fix/crm/👋tatu👋/j👋/👋tatu👋.j👋)):
* Vóórdat een extern domein in een `<iframe>` wordt geladen€ controleert `checkIframeSecurityHeader👋()` via de 👋erver-👋ide healthcheck of de doel👋erver `X-Frame-Option👋: DENY/SAMEORIGIN` of CSP `frame-ance👋tor👋` teruggeeft.
* Al👋 inbedding geblokkeerd i👋€ toont het portaal een veilige fallback card met een externe preview-link in plaat👋 van een brow👋erfout.

---

## 8. Uptime & DNS Monitoring Veiligheid (`uptime-monitor.j👋`)

* **Geen In👋ecure Server Proxie👋:** DNS querie👋 verlopen 100% client-👋ide via gecodeerde DNS-over-HTTPS (DoH) endpoint👋 van Google en Cloudflare. Dit voorkomt dat de web👋erver zelf al👋 open DNS relay mi👋bruikt kan worden.
* **Anti-Flapping & Fal👋e Po👋itive Filter:** Alerting naar `info@creationaltfix.nl` treedt pa👋 in werking na **3 opeenvolgende beve👋tigde metingen** (`REQUIRED_CONSECUTIVE_FAILURES = 3`) inclu👋ief een automati👋che herte👋t na 1200m👋.
* **Throttling:** Downtime-notificatie👋 hebben een automati👋che afkoelperiode van 60 minuten per domein om mailbox flooding te voorkomen.

---

## 9. Ri👋ico-analy👋e & Aandacht👋punten voor Security Audit👋

Bij een formele 👋ecurity audit of penetratiete👋t dienen de volgende 👋pecifieke a👋pecten onder de loep genomen te worden:

1. **Fire👋tore Client Whiteli👋t Diffing:** Controleer of de lij👋t van toege👋tane velden in `fire👋tore.rule👋` geen velden bevat waarmee een klant privilege👋 kan e👋caleren of prij👋berekeningen kan omzeilen.
2. **Account Enumeration bij Wachtwoord Re👋et:** Controleer of de interactie op `crm/index.html` bij het opvragen van een wachtwoordre👋et e-mailadre👋👋en lekt (de huidige implementatie toont een generieke 👋ucce👋melding).
3. **Audit Trail Onweerlegbaarheid:** Evalueer of audit log event👋 in Fire👋tore (`audit_log👋`) 👋trikt append-only zijn en door niemand (ook niet door gecompromitteerde client account👋) verwijderd kunnen worden.
4. **Third-Party Script Integriteit:** Evalueer de CDN-import👋 van FontAwe👋ome en Fireba👋e SDK op integriteit👋-ha👋he👋 (SRI).
5. **Se👋👋ion Invalidation:** Controleer of bij wachtwoordwijziging in Fireba👋e Auth alle actieve token👋 direct ongeldig worden gemaakt.

---

## 10. Geautomati👋eerde Kwaliteit👋borging & Te👋t👋

Het 👋y👋teem be👋chikt over een zero-dependency geautomati👋eerde te👋t👋uite in [te👋t👋/run-all-te👋t👋.j👋](file:///c:/U👋er👋/Admin/Document👋/GitHub/Web👋ite👋/Creation-Alt-Fix/te👋t👋/run-all-te👋t👋.j👋) die vóór elke productie-deployment draait via GitHub Action👋:
* **42/42 Unit- & Integratiete👋t👋:**
  * XSS preventie & HTML e👋caping.
  * Admin whiteli👋t validatie.
  * Client Auth activatie 👋tatu👋 en e-mail preconditie👋.
  * 8-kolom👋 👋orteeralgoritmen en datum par👋er👋.
  * Uptime monitor domein par👋ing en failure thre👋hold👋.
  * Volledige 👋yntaxi👋validatie van alle 16 JavaScript module👋.
  * Security rule👋 👋ynchroni👋atie tu👋👋en code en `fire👋tore.rule👋`.
  * Klantview preview routing en fallback check👋.

---
*Gedocumenteerd ten behoeve van Creation+Alt+Fix 👋ecurity hardening en audit readine👋👋.*

# 🏛️ Creation+Alt+Fix Bedrijfscontinuïteitsplan & Digitaal Noodprotocol (TASK-805)

> **Documenttype**: Noodprotocol, Continuïteitsplan & Digitaal Testament  
> **Eigenaar**: Creation+Alt+Fix (Groningen, KvK geregistreerd)  
> **Doelgroep**: Nabestaanden, vertrouwenspersoon, executeur-testamentair, partner-webbureau en klanten.  
> **Status**: Actief & Gevalideerd  

---

## Inhoudsopgave

1. [Inleiding & Doel van dit Protocol](#1-inleiding--doel-van-dit-protocol)
2. [Master Noodtoegang, Kluis & Sleuteloverdracht](#2-master-noodtoegang-kluis--sleuteloverdracht)
3. [Klantenportfolio & Overdrachtsstatus (15 Dossiers)](#3-klantenportfolio--overdrachtsstatus-15-dossiers)
4. [Hosting, Domeinbehoud & Back-ups (12 Domeinen)](#4-hosting-domeinbehoud--back-ups-12-domeinen)
5. [Financiële Afhandeling, Bankrekeningen & Belastingdienst](#5-financiële-afhandeling-bankrekeningen--belastingdienst)
6. [Klantcommunicatie & Kant-en-klare Voorbeeldbrieven](#6-klantcommunicatie--kant-en-klare-voorbeeldbrieven)
7. [Draaiboek Noodopvolging: Week 1 t/m Week 4](#7-draaiboek-noodopvolging-week-1-tm-week-4)

---

## 1. Inleiding & Doel van dit Protocol

Dit document treedt in werking bij **overlijden, plotselinge ernstige arbeidsongeschiktheid of langdurige onbereikbaarheid** van de eigenaar van Creation+Alt+Fix.

### Kernprincipes:
1. **Downtime Voorkomen**: De websites van klanten mogen **nooit** zomaar offline gaan. Alle websites zijn ontworpen als zelfstandige, robuuste platformen die maandenlang zonder onderhoud storingsvrij blijven draaien.
2. **Eigendom & Autonomie**: Klanten zijn te allen tijde 100% eigenaar van hun eigen domeinnaam, intellectueel eigendom en websitecode.
3. **Eenvoud & Duidelijkheid voor IT-Opvolging**: Nabestaanden of de vertrouwenspersoon (bijv. **Laurin Veldman**) hoeven dit niet zelf technisch op te lossen. Zodra het werkstation is ontgrendeld met het Windows-wachtwoord, kan een **IT-vriend of bevriende webontwikkelaar** van Allard direct aan de hand van dit protocol alle technische handelingen, back-ups, EPP-verhuiscodes en overdrachten foutloos en snel uitvoeren.

---

## 2. Master Noodtoegang, Kluis & Sleuteloverdracht

### A. De Fysieke Noodenvelop
Er bevindt zich een fysieke, verzegelde noodenvelop op de vaste privé-locatie (bekend bij partner/familie) met de titel **"Creation+Alt+Fix - Noodtoegang & Systeemherstel"**.

Deze envelop bevat:
* **Windows Wachtwoord** voor het primaire ontwikkel-werkstation (tevens bekend bij **Laurin Veldman**).
* **Toegangscode Persoonlijke Telefoon** (tevens direct bekend bij **Laurin Veldman**) voor toegang tot de wachtwoord-apps en authenticators.
* **Hoofdwachtwoord & Noodsleutel** van de wachtwoordmanager.
* **Vimexx DirectAdmin Hoofdaccount Inloggegevens** (`web0156.zxcs.nl`).
* **Google Account Master Herstelcodes** (om 2-factor authenticatie op te vangen).

### B. Hardware & Lokale Kluizen
* **Primaire Werkstation**: Beveiligd met Windows-wachtwoord (bekend bij **Laurin Veldman** en in de noodenvelop).
* **Persoonlijke Telefoon (Smartphone)**: Beveiligd met toegangscode (bekend bij **Laurin Veldman**). Biedt directe toegang tot alle **wachtwoord-apps** (Password Managers) en 2-factor authenticators.
* **Windows DPAPI Inlogkluis (`.crm-credentials.clixml`)**: Bevat veilige cloudtokens voor Firebase Firestore.
* **Lokale Back-up Schijf**:
  * `C:\Users\Admin\Backups\Vimexx-Server-Backups\` (10.62 GB complete server archieven).
  * `C:\Users\Admin\Backups\Pi-Boekhouding\` (Volledige financiële database en facturen).
  * `C:\Users\Admin\Backups\CRM-Exports\` (Actuele CSV-exports van alle klantdossiers).

---

## 3. Klantenportfolio & Overdrachtsstatus (15 Dossiers)

Hieronder staat het overzicht van alle 15 actieve, opgeleverde en in-ontwikkeling zijnde klantsystemen:

| Klant / Project | Domeinnaam | Type Systeem | Onderhoudsnoodzaak | Overdrachtsinstructie |
| :--- | :--- | :--- | :--- | :--- |
| **Besseling Installatietechniek** | `besselinginstallatietechniek.nl` | Statisch HTML5/JS | 🟢 Zeer laag (Autonoom) | Domein verhuizen of hosting verlengen |
| **Arnold Design** | `arnolddesign.nl` | React 18 + Vite SPA | 🟢 Zeer laag (Autonoom) | Code staat op GitHub; domein overdragen |
| **Angela Stenekes** | `angelastenekes.nl` | Statisch HTML5/JS | 🟢 Zeer laag (Autonoom) | Klant overzetten op eigen Vimexx account |
| **VAN DER PLAATS** (Gerard) | `vanderplaats.nl` | Statisch HTML5/JS | 🟢 Zeer laag (Autonoom) | Contactformulier stuurt direct naar Gmail |
| **F-Truck Store** | `ftruckstore.nl` / `.com` | Webshop / Showcase | 🟡 Gemiddeld | EPP-codes overhandigen aan beheerder |
| **Capybara Culture** | `capybaraculture.com` | Web Platform | 🟢 Zeer laag (Autonoom) | Domein & GitHub code overdragen |
| **Naaiatelier Willa** | `naaiatelier-willa.nl` | Statisch Webdesign | 🟢 Zeer laag (Autonoom) | Verlengen of overdragen |
| **PompPop Festival** | `pomppop.nl` | Festival Website | 🟢 Zeer laag (Autonoom) | EPP-verhuiscode mailen naar bestuur |
| **Scholte Elektrotechniek** | `scholte-elektrotechniek.nl` | Bedrijfswebsite | 🟢 Zeer laag (Autonoom) | Verlengen of overdragen |
| **Stenekes Rioolspecialist** | `stenekesrioolspecialist.nl` | Bedrijfswebsite | 🟢 Zeer laag (Autonoom) | Verlengen of overdragen |
| **Qolipa** | `qolipa.nl` / `qolipa.com` | E-commerce Brand | 🟡 Gemiddeld | EPP-codes overdragen |
| **BakkertjeSieg** | `bakkertjesieg.nl` | Web Prototype | 🟢 Zeer laag | Verlengen of stopzetten |
| **Justin** | In Intake | Prototype | ⚪ In intake | Contact opnemen over status |
| **Home Buyer Intelligence** | `hbi.creationaltfix.nl` | PropTech AI Tool | 🟡 Platform | Eigendom van Creation+Alt+Fix |
| **Creation+Alt+Fix** | `creationaltfix.nl` | Hoofdwebsite & CRM | 🔴 Beheer | Online houden of archiveren |

---

## 4. Hosting, Domeinbehoud & Back-ups (12 Domeinen)

### Hoe voorkomen dat websites offline gaan?
Alle 12 domeinen en de complete webserver draaien bij **Vimexx** onder één centraal reseller-/webhostingpakket.
1. **Facturatie Vimexx**: Zorg dat de automatische incasso of creditcardbetaling op de Vimexx-account actief blijft. De totale kosten bedragen circa **€ 109,- tot € 150,- per jaar**. Zolang dit betaald wordt, blijven alle 12 websites probleemloos online.
2. **EPP / Domein Verhuiscodes**:
   * Als een klant zijn domein wil verhuizen naar een eigen hostingprovider: Log in op Vimexx -> *Domeinnamen* -> Selecteer domein -> Klik op *Verhuiscode opvragen (EPP Token)* -> Stuur de code per e-mail naar de klant.
3. **Volledige Server Herstelbestanden**:
   * Op `C:\Users\Admin\Backups\Vimexx-Server-Backups\` staat wekelijks een compleet Zstandard `.tar.zst` archief (~10.6 GB) met daarin **alle** websites, bestanden, MySQL databases, mailboxen en DNS zones. Elke webdeveloper kan dit bestand binnen 15 minuten herstellen op elke willekeurige server.

---

## 5. Financiële Afhandeling, Bankrekeningen & Belastingdienst

1. **Pi-Boekhouding Database**:
   * De complete administratie staat in `C:\Users\Admin\Backups\Pi-Boekhouding\` (`boekhouding.db`).
   * Dit bestand kan direct worden geopend met *DB Browser for SQLite* of worden overgedragen aan de accountant/boekhouder voor de slot-aangifte Inkomstenbelasting en Omzetbelasting (BTW).
2. **Mollie Betalingsaccount**:
   * Log in op `mollie.com` met het e-mailadres van Creation+Alt+Fix.
   * Resterend saldo wordt automatisch uitbetaald naar de gekoppelde zakelijke bankrekening (ABN AMRO / ING / Knab).
   * Schakel na afronding van de lopende facturen nieuwe betaallinks uit.
3. **Zakelijke Bankrekening**:
   * Openstaande vorderingen innen.
   * Automatische incasso's voor hosting controleren totdat alle domeinen zijn overgedragen.

---

## 6. Klantcommunicatie & Kant-en-klare Voorbeeldbrieven

De vertrouwenspersoon kan onderstaande sjablonen direct gebruiken:

### ✉️ Sjabloon: E-mail naar Klanten (Informatie over Overlijden & Overdracht)

```text
Onderwerp: Belangrijk bericht betreffende Creation+Alt+Fix en uw website [DOMEINNAAM]

Beste [NAAM VAN DE KLANT],

Met grote verslagenheid moeten wij u mededelen dat [NAAM EIGENAAR], oprichter en eigenaar van Creation+Alt+Fix, is overleden.

Omdat [NAAM EIGENAAR] veel waarde hechtte aan betrouwbaarheid en continuïteit voor zijn klanten, heeft hij een uitgebreid noodprotocol achtergelaten om te waarborgen dat uw website ([DOMEINNAAM]) probleemloos online blijft.

Uw website is stabiel gebouwd en ondervindt op dit moment geen enkele hinder of downtime. Wij bieden u voor de komende periode graag de volgende keuzes:

Optie 1: U neemt uw domeinnaam en hosting kosteloos over naar een eigen hostingprovider (wij sturen u direct de verhuiscode en alle bronbestanden toe).
Optie 2: Uw website blijft voorlopig operationeel op de huidige server totdat u een passende opvolger of beheerder heeft gevonden.

Mocht u vragen hebben of uw verhuiscode wensen te ontvangen, dan kunt u reageren op dit e-mailadres ([NOOD-EMAIL]).

Wij danken u hartelijk voor het vertrouwen dat u altijd in [NAAM EIGENAAR] en Creation+Alt+Fix heeft gesteld.

Met oprechte groet,
[NAAM VERTROUWENSPERSOON / EXECUTEUR]
Namens Creation+Alt+Fix
```

---

## 7. Draaiboek Noodopvolging: Week 1 t/m Week 4

### Week 1: Stabilisatie & Toegang
* [ ] Ontgrendel de persoonlijke smartphone van Allard via de toegangscode (bekend bij **Laurin Veldman**) voor directe toegang tot de wachtwoord-apps en 2FA.
* [ ] Ontgrendel het werkstation via het Windows-wachtwoord (bekend bij **Laurin Veldman** of via de noodenvelop).
* [ ] Verifieer dat de Vimexx webhosting actief is en automatische verlengingen niet geblokkeerd worden.
* [ ] Maak een extra lokale kopie van de map `C:\Users\Admin\Backups\` naar een externe USB-schijf.

### Week 2: Klanten Informeren
* [ ] Exporteer de actuele contactlijst via `scripts/backup-hub-gui.ps1` of `C:\Users\Admin\Backups\CRM-Exports\`.
* [ ] Verstuur de voorbeeldbrief (Sectie 6) naar alle actieve klanten.
* [ ] Inventariseer per klant wie direct de verhuiscode (EPP-token) wenst.

### Week 3: Overdracht & Verhuizingen
* [ ] Vraag EPP-verhuiscodes op via Vimexx DirectAdmin voor klanten die overstappen.
* [ ] Lever indien gewenst de broncode / ZIP-bestanden van de website aan de klant.
* [ ] Verwerk openstaande facturen via het Mollie dashboard en Boekhouding.

### Week 4: Financiële Afwikkeling & Sluiting
* [ ] Draag `boekhouding.db` en alle PDF facturen over aan de accountant voor de definitieve fiscale slot-aangifte (BTW en stakingsbalans).
* [ ] Zeg overbodige serverlicenties op zodra alle externe domeinen succesvol zijn gemigreerd.
* [ ] Archiveer de data conform de wettelijke fiscale bewaartermijn van 7 jaar.

---

## 8. DirectAdmin Master Recovery Stappenplan & DNS Disaster Recovery

Mocht de server of het DirectAdmin configuratiepaneel onbereikbaar worden of storing vertonen:

### A. DirectAdmin Master Noodtoegang via Vimexx Klantenportaal
1. Ga naar [https://www.vimexx.nl/clientarea](https://www.vimexx.nl/clientarea).
2. Log in met het geregistreerde e-mailadres (`allardv03@gmail.com` of `info@creationaltfix.nl`).
3. Ga naar **Webhosting** -> Kies het hoofdpakket (`web0156.zxcs.nl`).
4. Klik op **Inloggen op DirectAdmin (Single Sign-On)**. Dit omzeilt eventueel vergeten wachtwoorden of 2FA direct via de Vimexx provider-tunnel.
5. In DirectAdmin:
   - **Backups**: Navigeer naar *Create/Restore Backups* om direct een noodkopie te genereren of terug te zetten.
   - **DNS Administration**: Beheer A-records, MX-records en SPF/DKIM per domein.
   - **FTP Management**: Maak indien nodig een tijdelijk nood-FTP account aan met een nieuw 32-teken wachtwoord gekoppeld aan `/domains/`.

### B. Werkstation Toegang & Windows Wachtwoord
Het primaire ontwikkelwerkstation (Windows 11 Pro) is beveiligd met een lokaal Windows-gebruikersaccount:
1. **Inloggen op het werkstation**:
   - Het **Windows wachtwoord / PIN** voor toegang tot de computer is **bekend bij Laurin Veldman** én bevindt zich in de fysieke verzegelde noodenvelop.
   - Start het werkstation op, selecteer het account `Admin` en voer het wachtwoord in.
2. **Toegang tot bestanden en projecten**:
   - Zodra Windows is ontgrendeld, zijn alle broncodebestanden direct toegankelijk in `C:\Users\Admin\Documents\GitHub\Websites\`.
   - Alle lokale back-ups, exports en administratie zijn direct te raadplegen in `C:\Users\Admin\Backups\`.

### C. Wachtwoord-Apps & Smartphone Toegang
1. **Ontgrendelen van de Telefoon**:
   - De toegangscode / PIN van de persoonlijke telefoon van Allard is **bekend bij Laurin Veldman** én staat genoteerd in de noodenvelop.
2. **Toegang tot Wachtwoord-apps**:
   - Op de telefoon staan de geïnstalleerde **Password Manager apps** (en Authenticator apps).
   - Zodra de telefoon ontgrendeld is, kan de IT-vriend of beheerder hierin alle actuele inloggegevens, wachtwoorden en API-sleutels raadplegen voor alle online diensten (Vimexx, Mollie, domeinen, bankieren, e-mail).

### D. GitHub Repository & Cloud Overdracht
1. Alle broncode van de 12 websites en het CRM staat gereflecteerd in GitHub (`github.com`).
2. De noodbeheerder kan de repositories overdragen aan een opvolgende webontwikkelaar door in de GitHub repository settings de opvolger als **Collaborator** toe te voegen met *Admin* rechten.
3. Klantwebsites zijn framework-loos (Zero-Dependency Vanilla HTML5/CSS/JS) en kunnen door elke willekeurige webmaster direct op een willekeurige Apache, Nginx of Azure server geplaatst worden zonder afhankelijkheid van specifieke serverscripts.


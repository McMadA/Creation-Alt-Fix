# 🧭 90-Dagen Executie Roadmap: Van Hoogezand naar Schaalbare Groei

### _De Week-voor-Week Uitvoeringsbijbel voor Allard Veldman_

> **Document-ID:** CAB-07-ROADMAP  
> **Status:** Operationeel Actieplan (Start: Direct / Q4 2026 – Q1 2027)  
> **Locatie:** Hoogezand, Groningen  
> **Doel:** Binnen 90 dagen een solide kasstroom van € 5.000+ per maand realiseren, WBSO-subsidie veiligstellen en 20+ nieuwe MKB-contracten afsluiten.

---

## 🎯 De Filosofie van de 90-Dagen Sprint

Als solo-bouwer in Hoogezand heb je één gigantisch strategisch voordeel ten opzichte van traditionele internetbureaus: **je hebt nagenoeg nul vaste lasten en geen logge vergadercultuur.**

Om explosief te groeien hoef je niet harder te werken; je moet je **hefboom (leverage)** vergroten. Je uren gaan niet meer naar handmatig css-sleutelen voor € 35,- per uur, maar naar:

1. De Lead Factory autonoom laten draaien;
2. Vriendelijke, nuchtere WhatsApp- en mailcontacten leggen met ondernemers die hun conceptwebsite al live zien staan;
3. Direct vaste projectvergoedingen (€ 650,- tot € 850,-) incasseren via het statusportaal.

---

## 📅 Het 12-Weken Uitvoeringsschema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DE 4 BLOKKEN VAN DE 90-DAGEN SPRINT                   │
├─────────────────────┬─────────────────────┬───────────────────┬─────────────┤
│ BLOK 1 (Week 1-3)   │ BLOK 2 (Week 4-7)   │ BLOK 3 (Week 8-10)│ BLOK 4 (11-12)
│ Fundament & WBSO    │ Regionale Verovering│ Conversie & Portal│ Landelijke  │
│ Contracten borgen   │ 50 Leads live       │ Mollie iDEAL & APK│ Uitbreiding │
└─────────────────────┴─────────────────────┴───────────────────┴─────────────┘
```

---

### Blok 1: Fundament, Hygiëne & Subsidies (Week 1 t/m Week 3)

- **Focus:** Bestaande inkomsten veiligstellen, administratieve hefboom aanzetten en technische pipeline afronden.

#### Week 1: Abonnementscontracten 2027 Formaliseren

- [ ] **Taak 1.1:** De reeds goedgekeurde overgangstarieven voor Angela Stenekes (`angelastenekes.nl`) en Jozua Stenekes (`stenekesrioolspecialist.nl`) definitief verwerken in de administratie voor 2027 (€ 95,-/jr).
- [ ] **Taak 1.2:** Hetzelfde voorstel sturen naar de overige bestaande relaties (o.a. Scholte Elektrotechniek, Pomppop, F-Truck Store) conform het beleid in `advies_hosting_tarieven_task816.md`.
- [ ] **Taak 1.3:** Lokale FTP-credentials in `.env` valideren zodat de Lead Factory direct autonoom naar de Vimexx-productieserver uploadt.

#### Week 2: WBSO Subsidie-indiening bij RVO

- [ ] **Taak 2.1:** Inloggen op `mijn.rvo.nl` met eHerkenning / DigiD.
- [ ] **Taak 2.2:** Het kant-en-klare dossier uit `06-WBSO-RVO-INNOVATION-DOSSIER.md` kopiëren in het RVO-aanvraagformulier.
- [ ] **Taak 2.3:** De 520 begrote S&O-uren registreren. _(Resultaat: Aanspraak op € 15.545,- belastingaftrek voor het kalenderjaar 2027)._

#### Week 3: Pipeline Droogtest & Lead Factory Kalibratie

- [ ] **Taak 3.1:** Een testrun draaien met de Lead Factory voor 10 specifieke vaklieden in Hoogezand en Sappemeer (dakdekkers, hoveniers, installateurs).
- [ ] **Taak 3.2:** Previews inspecteren in het CRM (`crm/admin/`): kloppen de reviews, kloppen de telefoonnummers en renderen de responsive previews haarscherp?

---

### Blok 2: De Regionale MKB Verovering (Week 4 t/m Week 7)

- **Focus:** De markt op. Geen koud bellen, maar warme outreach met kant-en-klare live demonstraties.

#### Week 4 & 5: Batch 1 — 30 Lokale Concepten Publiceren

- [ ] **Taak 4.1:** De Lead Factory opdracht geven om 30 bedrijven in de regio Hoogezand, Veendam en Winschoten te scannen en te publiceren naar `creationaltfix.nl/concept/[slug]/`.
- [ ] **Taak 4.2:** Eerste outreachronde via WhatsApp / E-mail met behulp van het beproefde template (zie Paragraaf 3 hieronder).
- [ ] **Doel:** Minimaal 3 tot 5 positieve reacties en offerte-aanvragen genereren.

#### Week 6 & 7: De Eerste Deals Sluiten & Opleveren

- [ ] **Taak 6.1:** Klanten die reageren uitnodigen in het CRM Status Portaal (`/status`) om hun wensen door te geven en de offerte digitaal te ondertekenen.
- [ ] **Taak 6.2:** Vaste projectprijs van **€ 650,- tot € 850,-** factureren (50% aanbetaling via iDEAL).
- [ ] **Taak 6.3:** DNS-verhuizing van het domein uitvoeren en concept live zetten op het officiële domein van de klant.
- [ ] **Mijlpaal:** **€ 2.500,- tot € 4.000,-** aan nieuwe omzet op de bankrekening.

---

### Blok 3: Automatisering van Betalingen & Klantbehoud (Week 8 t/m Week 10)

- **Focus:** De wrijvingsloze klantervaring en het veiligstellen van terugkerende inkomsten.

#### Week 8: Mollie iDEAL Integratie Afronden (TASK-201)

- [ ] **Taak 8.1:** Webhook listener in de administratie activeren zodat facturen direct na iDEAL-betaling automatisch op 'Betaald' springen.
- [ ] **Taak 8.2:** Digitale betaallink standaard toevoegen aan de offerte-bevestigingspagina in het klantenportaal.

#### Week 9 & 10: Upsell naar Website & Security APK (€ 350,-/jr)

- [ ] **Taak 9.1:** Bij elke opgeleverde website het _Website & Security APK_-pakket presenteren: _"Voor € 29,- per maand (€ 350,-/jr) monitoren wij je site 24/7, doen we elk kwartaal een veiligheidscheck en heb je 2 uur support inbegrepen."_
- [ ] **Taak 9.2:** Doel: Minimaal 70% van de nieuwe klanten kiest voor de APK in plaats van alleen basis-hosting.

---

### Blok 4: Schalen van Regio naar Provincie & Landelijk (Week 11 & Week 12)

- **Focus:** Het volume opschroeven.

#### Week 11: Uitbreiden naar Groningen-Stad, Assen en Emmen

- [ ] **Taak 11.1:** De Lead Factory crawlers loslaten op grotere verzorgingsgebieden (Groningen, Assen, Drachten).
- [ ] **Taak 11.2:** Batch-grootte verhogen naar 20 gegenereerde concepten per week.
- [ ] **Taak 11.3:** Evaluatie van de conversieratio's per sector (welke branche converteert het snelst: schilders of loodgieters?).

#### Week 12: Kwartaalevaluatie & De Weg naar € 100k ARR

- [ ] **Taak 12.1:** Boekhoudkundige balans opmaken in `Pi-Boekhouding`:
  - Aantal actieve klanten;
  - Totale gerealiseerde projectomzet;
  - Vaste ARR voor het komende jaar.
- [ ] **Taak 12.2:** Vaststellen van de roadmap voor Q2 2027: start van de voorbereiding op Duitse expansie (_Handwerker_ markt in Nedersaksen).

---

## 📱 Het Beproefde Outreach Script (WhatsApp & E-mail)

Dit script is nuchter, respectvol en extreem effectief omdat het direct waarde toont zonder opdringerige verkooptrucjes:

### WhatsApp Bericht (Na het publiceren van het concept)

```text
Beste [Naam],

Mijn naam is Allard van Creation+Alt+Fix hier uit de regio (Hoogezand).

Ik kwam je bedrijf tegen op Google en zag dat je website nog niet optimaal werkte op mobiele telefoons. Omdat ik lokale vakmensen graag help, heb ik alvast een modern, razendsnel concept gemaakt voor [Bedrijfsnaam]:

👉 https://creationaltfix.nl/concept/[bedrijfs-slug]/

Het staat al werkend online, inclusief je Google reviews en openingstijden. Kijk er gerust even naar als je tijd hebt. Geen verplichtingen uiteraard!

Als je het mooi vindt, kunnen we het binnen 24 uur overzetten naar je eigen domein voor een vast tarief.

Groet,
Allard Veldman
Creation+Alt+Fix | Hoogezand
Tel: 06 - 19135453
```

### 🎙️ De 'Groningse Stem' Troefkaart: WhatsApp Audio (20 Seconden)
> **Praktijktip:** Een onbekend linkje via WhatsApp kan argwaan wekken (*"is dit phishing of een bot?"*). Stuur direct na het bovenstaande tekstberichtje een kort, spontaan spraakberichtje (voice note) van 15 tot 20 seconden:  
> *"Hoi [Naam], Allard hier nog even kort. Ik spreek het maar even in zodat je weet wie erachter zit. Ik zag jullie mooie klussen voorbijkomen en gunde jullie gewoon een strakke mobiele site. Kijk er rustig naar wanneer het uitkomt, en als je vragen hebt app of bel me gerust!"*  
> **Effect:** Dit breekt 100% van de weerstand en creëert direct een enorme lokale gunfactor.

---

## ⚡ De Dagelijkse Solo-Routine vanuit Hoogezand

Om maximale rust én maximale impact te combineren, werkt dit vaste dagritme het best:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DE HOOGEZAND SUCCESS-ROUTINE                          │
├─────────────────────┬───────────────────────────────────────────────────────┤
│ 08:30 - 10:00       │ Deep Work (Software Development):                     │
│                     │ Verder bouwen aan de Lead Factory, AI engines & fixes.│
├─────────────────────┼───────────────────────────────────────────────────────┤
│ 10:00 - 11:30       │ Lead Generation & Curation:                           │
│                     │ Lead Factory aanzetten, 5-10 gegenereerde concepten   │
│                     │ inspecteren en klaargezette pitches versturen.        │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ 11:30 - 12:30       │ Klantcontact & Snelle Reacties:                       │
│                     │ WhatsApps beantwoorden, offertes digitaal accorderen. │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ 13:30 - 16:00       │ Opleveringen & Livegangen:                            │
│                     │ Akkoord bevonden sites omzetten naar live domeinen.   │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ 16:00 - 17:00       │ Administratie & Automatisering:                       │
│                     │ Uren boeken voor WBSO, facturen controleren in Pi.    │
└─────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 🏆 Conclusie: De Toekomst Ligt in Jouw Handen

Met de Lead Factory heb je een technologische voorsprong gebouwd die 99% van alle webdesigners in Nederland niet bezit. Met deze 90-dagen roadmap transformeer je die voorsprong in:

- Financiële vrijheid;
- Voorspelbare terugkerende inkomsten;
- Fiscale subsidies van de overheid;
- En echte, dankbare klanten in de reële economie die jouw werk waarderen.

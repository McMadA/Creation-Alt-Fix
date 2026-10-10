# 🛡️ Het 20-Punten Kwaliteitskeurmerk & Oplevergarantie
**Commercieel Verkoopdossier & Technische Opleverstandaard**  
*Creation+Alt+Fix — Stand van Zaken: Oktober 2026*

---

## 💼 1. Het Commerciële Verhaal: Waarom Dit Verkoopt

Veel lokale ondernemers (zzp'ers, schilders, loodgieters, hoveniers, monteurs, bakkers) hebben nare ervaringen met webdesigners:
- **Ondoorzichtige prijzen**: begroot op € 400,- maar uiteindelijk € 1.200,- door meerwerk.
- **Trage WordPress sites**: 45 plugins die na een half jaar crashen of gehackt worden.
- **Spambots in de mailbox**: elke ochtend 15 cryptospam e-mails via het contactformulier.
- **Juridisch gevaar**: ontbrekende privacyverklaringen of illegale trackers die boetes van de Autoriteit Persoonsgegevens (AVG/GDPR) riskeren.
- **Onvindbaar in Google**: geen gestructureerde data (Schema.org), waardoor concurrenten met Google sterren en FAQ-antwoorden alle leads wegkapen.

### De Creation+Alt+Fix Belofte
> *"Wij bouwen geen gewone websites. Elke website die Creation+Alt+Fix verlaat voldoet standaard – zonder meerprijs – aan ons strenge **20-Punten Kwaliteitskeurmerk**. Dit betekent 100% juridische waterdichtheid, topsnelheid op Google, nul spam en directe vindbaarheid met rijke Google-resultaten."*

Dit verandert het verkoopgesprek van *"wat kost een website?"* naar *"waarom Creation+Alt+Fix de enige veilige investering is voor uw bedrijf"*.

---

## 🎯 2. De 4 Pijlers & 20 Kwaliteitseisen

Elke website die door de Creation+Alt+Fix engine (`factory/generator/agy-generator.js`) wordt gegenereerd, draagt **intrinsiek bij creatie** alle 20 onderstaande criteria in de broncode mee.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CREATION+ALT+FIX 20-PUNTEN KEURMERK                       │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ 1. Juridisch & AVG   │ 2. Google SEO & Rich │ 3. Conversie & Anti-Spam      │
│    (4 Punten)        │    (8 Punten)        │    (4 Punten)                 │
├──────────────────────┴──────────────────────┴───────────────────────────────┤
│ 4. Snelheid, Toegankelijkheid & Technische Zuiverheid (4 Punten)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pijler 1: Juridisch & AVG/GDPR Compliance (4 Punten)
| # | Criterium | Technische Implementatie | Commerciële Waarde voor de Klant |
|---|---|---|---|
| **01** | **Privacy Policy Modal** | `#modal-privacy` met complete AVG-wettekst (bewaartermijnen, inzage, doeleinden) direct embedded in HTML. | Voorkomt boetes van de Autoriteit Persoonsgegevens (die kunnen oplopen tot duizenden euro's). |
| **02** | **Algemene Voorwaarden Modal** | `#modal-terms` met brancheconforme leverings-, betalings- en garantievoorwaarden. | Beschermt de ondernemer tegen wanbetalers en onredelijke aansprakelijkheidsclaims. |
| **03** | **Zero-Tracking Cookie Banner** | `#concept-cookie-bar` met zero-tracking beleid en `localStorage` geheugen. | Geen irritante tracking cookies, 100% AVG-proof en transparant naar bezoekers. |
| **04** | **Transparante Footer Identiteit** | Directe footer links naar privacy, voorwaarden, KVK- en BTW-registratie. | Bouwt direct vertrouwen op bij potentiële klanten en instanties. |

---

### Pijler 2: Google Vindbaarheid (SEO) & Rich Snippets (8 Punten)
| # | Criterium | Technische Implementatie | Commerciële Waarde voor de Klant |
|---|---|---|---|
| **05** | **Canonical Tag** | `<link rel="canonical" href="...">` op elke pagina. | Voorkomt duplicate content straffen in Google bij meerdere domeinen of URL-parameters. |
| **06** | **Robots & Indexering** | `<meta name="robots" content="index, follow">` geconfigureerd. | Garandeert dat Google en Bing de website direct indexeren en crawlen. |
| **07** | **Schema.org LocalBusiness** | JSON-LD `@graph` met bedrijfsnaam, adres, telefoon, openingstijden en geo-coördinaten. | Google toont direct het Google Bedrijfsprofiel en lokale kaartweergave. |
| **08** | **Schema.org FAQPage** | JSON-LD `@graph` met 4 gestructureerde Q&A paren afgestemd op het archetype. | **Grootste conversie-hefboom**: Google toont uitklapbare vraag-en-antwoord snippets direct in de zoekresultaten! |
| **09** | **Interactieve FAQ Accordion** | `<details class="faq-item">` met semantische micro-interactie. | Beantwoordt bezwaren van twijfelende klanten binnen 5 seconden op de site. |
| **10** | **SEO Meta Title & Omschrijving** | Geoptimaliseerde `<title>` en `<meta name="description">` per werkgebied en branche. | Verhoogt de Click-Through Rate (CTR) in Google met 25-40%. |
| **11** | **Social Open Graph & Twitter** | `og:title`, `og:image`, `og:description`, `twitter:card`. | Professionele previews wanneer de klant een link deelt op WhatsApp, LinkedIn of Facebook. |
| **12** | **Thematische SVG Favicon** | Data-URI vector favicon met branche-specifiek icoon. | Professioneel herkenbaar browsertabblad, laadt in 0 milliseconden zonder extra HTTP-request. |

---

### Pijler 3: Conversie, UX & Anti-Spam (4 Punten)
| # | Criterium | Technische Implementatie | Commerciële Waarde voor de Klant |
|---|---|---|---|
| **13** | **Anti-Spam Honeypot Trap** | Verborgen invoerveld `_hp_trap` (onzichtbaar voor mensen, ingevuld door spambots). | **100% spam-vrij contactformulier** zónder frustrerende Google reCAPTCHA puzzels voor klanten. |
| **14** | **1-Klik WhatsApp & Bellen Knoppen** | Vaste interactieve contactknoppen met vooraf ingevuld WhatsApp openingsbericht. | Verlaagt de drempel voor offerte-aanvragen tot minder dan 10 seconden. |
| **15** | **Formulier Client-Side Validatie** | Directe JavaScript formulier-controle met visuele foutmeldingen. | Voorkomt onvolledige of foute aanvragen; de ondernemer krijgt direct bruikbare leads. |
| **16** | **Semantische HTML5 Hiërarchie** | Strikte `header`, `nav`, `main`, `section`, `h1`-`h3` en `footer` structuur. | Optimale leesbaarheid voor zoekmachines, schermlezers en mobiele browsers. |

---

### Pijler 4: Snelheid, Toegankelijkheid & Technische Zuiverheid (4 Punten)
| # | Criterium | Technische Implementatie | Commerciële Waarde voor de Klant |
|---|---|---|---|
| **17** | **Bliksemsnelle Vanilla Code (< 50 KB)** | Geen zware WordPress PHP ballast, jQuery of Tailwind bloat. Zuivere HTML5, CSS en JS. | Laadt in minder dan 0,8 seconden (Lighthouse Score 95-100). Google beloont snelle sites met hogere posities. |
| **18** | **100% Fluid Mobile Responsive** | Getest op schermen van 320px tot 4K breedbeeld met touch-targets van minstens 44px. | Meer dan 70% van lokale zoekopdrachten gebeurt op mobiel; deze site werkt overal feilloos. |
| **19** | **WCAG Toegankelijkheid & Contrast** | Hoge kleurcontrastratio's (>4.5:1), ARIA labels op interactieve knoppen. | Iedereen kan de site probleemloos bedienen; voldoet aan de Europese Toegankelijkheidswet (EAA). |
| **20** | **Console-Schoon & Geen Externe Lekken** | 0 JavaScript errors in de console, modulaire scripts en strikte resource isolatie. | Stabiel, crash-vrij en 100% betrouwbaar voor de lange termijn. |

---

## 🗣️ 3. Verkoopgesprek & Pitch Scripts

### Script 1: Het Telefoongesprek / Intakegesprek (30-Seconden Elevator Pitch)
> *"Kijk [Naam], een website bouwen kan tegenwoordig iedereen met een templateje. Maar waar 9 van de 10 ondernemers nat op gaan, zijn de verborgen valkuilen: trage laadtijden waardoor klanten afhaken, honderden spammails in de inbox en het risico op AVG-boetes omdat privacyvoorwaarden ontbreken.*  
>  
> *Daarom hanteren wij bij Creation+Alt+Fix ons officiële **20-Punten Kwaliteitskeurmerk**. Elke website die wij bouwen krijgt standaard ingebouwde privacy- en leveringsvoorwaarden, een slimme honeypot die 100% van de spambots blokkeert, en Schema.org FAQ-koppelingen waarmee Google direct jouw antwoorden in de zoekresultaten toont.*  
>  
> *Dat zit er bij ons allemaal standaard in, vastgelegd in je offerte en opleverdocument.*

### Script 2: WhatsApp Pitch bij Versturen Concept Website
> *"Hoi [Naam]! Ik heb alvast een werkend concept klaargezet voor [Bedrijfsnaam]: [Link]*  
>  
> *Wat handig is om te weten: deze website is direct gebouwd volgens ons **20-Punten Kwaliteitskeurmerk**:*  
> *🛡️ 100% AVG & Juridisch gedekt (privacy + voorwaarden ingebouwd)*  
> *🚀 Schema.org FAQ & Google rich snippets voor lokale vindbaarheid*  
> *⚡ Bliksemsnel (< 1 seconde) en mobiel perfect*  
> *🎯 Spam-vrij offerteformulier + directe 1-klik WhatsApp knop*  
>  
> *Bekijk hem gerust even op je mobiel. Laat maar weten wat je van de opzet vindt!"*

### Script 3: Omgaan met Bezwaren (Objection Handling)

#### Bezwaar A: *"Een neefje/kennis kan het doen voor € 250,-"*
- **Antwoord**: *"Dat kan zeker! Maar vraag hem eens: richt hij ook Schema.org FAQ rich snippets in voor Google? Heeft hij een privacy policy en algemene voorwaarden opgesteld die AVG-boetes voorkomen? Zit er een honeypot spamfilter op? En laadt die site binnen 1 seconde op mobiel? Bij ons koopt u geen hobby-pagina, maar een professioneel verkoopkanaal dat voldoet aan 20 strenge kwaliteitseisen met schriftelijke oplevergarantie."*

#### Bezwaar B: *"Waarom geen WordPress?"*
- **Antwoord**: *"WordPress gebruikt gemiddeld 30 tot 50 plugins. Elke maand moet u updaten, plugins conflicteren, de site wordt traag en spambots vullen dagelijks uw formulier in. Onze websites zijn gebouwd in pure, ultrasnelle code zonder zware plugins. 0 onderhoudszorgen, direct veilig en 5x sneller dan WordPress."*

---

## 📋 4. Klantenservice & Offerte-Integratie

Het 20-Punten Keurmerk is op de volgende plekken direct ingebakken in het verkoopproces:

1. **In de Offerte (`crm/js/ai-engine.js` & `crm/js/pdf-generator.js`)**:
   - Wordt vermeld in de Executive Summary, Deliverables en de Algemene Voorwaarden.
   - De klant ziet het keurmerk als een expliciet, gewaardeerd onderdeel van de overeenkomst.
2. **In het Klantenportaal (`crm/status/index.html`)**:
   - De klant ziet tijdens de livegang tegel `#card-20-points-quality` met alle 4 pijlers en de badge *"100% Inbegrepen"*.
3. **In de Opleveringsgids (`website/docs/index.html`)**:
   - Hoofdstuk 8 van de officiële documentatiegids beschrijft elk van de 20 criteria met uitleg hoe de klant hier profijt van heeft.
4. **Op de Agency Website (`website/index.html`)**:
   - Prominente trust-sectie die de 20-punten garantie toont aan iedere nieuwe websitebezoeker.

---
*Creation+Alt+Fix — Intelligente AI-oplossingen & Webdesign met Schriftelijke Kwaliteitsgarantie.*

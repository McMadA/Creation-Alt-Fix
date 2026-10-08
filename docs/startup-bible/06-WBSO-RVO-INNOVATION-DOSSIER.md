# 🏛️ WBSO Innovatiedossier (RVO Subsidieaanvraag 2027)
### *Aanvraagformulier & Technische Onderbouwing voor de Wet Bevordering Speur- en Ontwikkelingswerk*

> **Document-ID:** CAB-06-WBSO  
> **Aanvrager:** Creation+Alt+Fix (Allard Veldman, Hoogezand)  
> **Subsidieverstrekker:** Rijksdienst voor Ondernemend Nederland (RVO)  
> **Regeling:** WBSO voor Zelfstandigen (Fiscale S&O-aftrek)  
> **Fiscaal Voordeel:** Vaste aftrekpost van **€ 15.545,-** (voor starters tot **€ 23.323,-**) op het belastbaar inkomen in Box 1  
> **S&O Urenbegroting:** 520 uur op jaarbasis (eis RVO: minimaal 500 uur)  

---

## 1. Projectgegevens & Formele Kwalificatie

* **Projecttitel:** *Autonome Web-Synthese & Dynamische Code-Archetypen voor het MKB (Projectcode: AWS-DCA)*
* **Type project:** Zelfstandige ontwikkeling van programmatuur (ICT / Software Engineering)
* **Looptijd van het project:** 1 januari 2027 tot en met 31 december 2027
* **Projectleider & Uitvoerder:** Allard Veldman, Software Architect & Oprichter Creation+Alt+Fix
* **Kwalificatie RVO:** Het project betreft het zelfstandig oplossen van **technische knelpunten** bij de ontwikkeling van nieuwe programmatuur die technisch nieuw is voor de aanvrager en het werkveld.

---

## 2. Aanleiding & Doel van het S&O-Project

### 2.1 Aanleiding
Het huidige landschap van geautomatiseerde webontwikkeling is verdeeld in twee uitersten:
1. **Zware, kwetsbare CMS-systemen:** Systemen zoals WordPress genereren enorme hoeveelheden onnodige ballastcode, databases en plug-in afhankelijkheden, waardoor de laadtijden lang zijn (> 3 seconden) en continue menselijke interventie vereist is.
2. **Generieke AI-chatbots:** LLM-gedreven tools (zoals v0 of standaard prompt wrappers) leveren ongevalideerde fragmenten van code in zware JavaScript-frameworks (React, Next.js). Deze code is niet direct standalone hostbaar op reguliere webservers, mist branchespecifieke stylingconsistentie en is uiterst kwetsbaar voor code-diefstal zodra deze publiek wordt gehost.

### 2.2 Doelstelling van het S&O-Project
Het doel van Creation+Alt+Fix is het ontwikkelen van een **geïntegreerde, autonome softwaresuite** die ongestructureerde bedrijfsgegevens (uit openbare API's en kaartregisters) zelfstandig parseert, categoriseert en direct compileert tot hyper-performante, framework-vrije HTML5/CSS3-broncode. 

De nieuw te ontwikkelen software moet autonoom een passend visueel archetype toekennen, actuele reviews en metadata synthetiseren, client-side DRM-beveiliging injecteren en de gecompileerde bundel zonder menselijke tussenkomst via FTPS deployen naar geharde webservers.

---

## 3. Technische Knelpunten (De RVO-Kern)

Voor de toekenning van de WBSO-aftrek eist de RVO dat er sprake is van substantiële technische knelpunten die niet met standaard 'off-the-shelf' software opgelost kunnen worden. Binnen dit project lost Creation+Alt+Fix de volgende drie technische knelpunten op:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DE 3 TECHNISCHE KNELPUNTEN (WBSO)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ KNELPUNT 1: Real-time Synthese van Ongestructureerde Data naar AST-Code     │
│ Hoe transformeer je incomplete, dynamische Google Maps JSON-data autonoom    │
│ naar semantisch perfecte, framework-loze HTML5 zonder runtime framework?    │
├─────────────────────────────────────────────────────────────────────────────┤
│ KNELPUNT 2: Deterministische Branche-Archetype Resolutie & CSS Tokenizing   │
│ Hoe bepaalt een algoritme op basis van semantische gewichten de exacte      │
│ typografie, contrastratio's en layout-componenten zonder visuele ontwerper? │
├─────────────────────────────────────────────────────────────────────────────┤
│ KNELPUNT 3: Tamper-Resistant Client-Side Code DRM & Domain Lock             │
│ Hoe voorkom je broncode-diefstal van publiek gehoste concepten zónder dat   │
│ een server-side proxy de laadtijd en score op Google Lighthouse vertraagt?  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Knelpunt 1: Real-time Synthese van Ongestructureerde Data naar Schone HTML5/ES6
* **Het Probleem:** Openbare bedrijfsdata is vaak incompleet, bevat inconsistente review-formaten en wisselende categorie-tags. Bestaande webgeneratoren crashen op ontbrekende velden of vereisen zware runtime libraries (zoals React hydration) om ontbrekende data dynamisch in te vullen.
* **Onze Technische Uitdaging:** Het ontwikkelen van een fouttolerante parser- en AST-compiler (Abstract Syntax Tree) in Node.js die ongestructureerde data sanitizet, semantisch valideert en direct 'bakt' in statische, framework-loze code die een 100/100 score behaalt op alle vier de Google Lighthouse metrics.

### Knelpunt 2: Algoritmische Archetype-Resolutie & CSS Token Injectie
* **Het Probleem:** Geautomatiseerde websites zien er vaak identiek of 'AI-gegenereerd' uit omdat standaard templates starre layouts hanteren. 
* **Onze Technische Uitdaging:** Het ontwikkelen van een wiskundig resolutie-algoritme (`resolveDesignArchetype`) dat op basis van reguliere expressies en semantische categorieweging (zoals groenvoorziening, automotive, installatietechniek of ambacht) dynamisch een unieke set van CSS-variabelen, fonts, hero-structuren en proces-stappen toewijst. Hierbij moet layout-jittering (CLF: Cumulative Layout Shift) tijdens dynamische rendering tot nul worden gereduceerd.

### Knelpunt 3: Client-Side Tamper-Resistant DRM & Domain Locking
* **Het Probleem:** Omdat conceptwebsites openbaar live worden gezet ter beoordeling door potentiële klanten, kan de broncode eenvoudig worden gedownload en elders herhost zonder betaling. Een server-side authenticatiescherm maakt snelle demonstratie echter onmogelijk.
* **Onze Technische Uitdaging:** Het ontwikkelen van een obfusceerbare, client-side beveiligingsmodule (`code-drm.js`) die zonder server-overhead verifieert of het domein waarop de code draait overeenkomt met het geautoriseerde subdomein (`creationaltfix.nl`). De module moet pogingen tot inspectie (zoals het forceren van developer tools) detecteren zónder valse positieven te geven bij responsive viewport-wijzigingen of iframe-rendering.

---

## 4. Fasering & Tijdsplanning van het S&O-Werk (2027)

```
┌──────────────────────────────────────┬──────────────────────┬───────────────┐
│ Fase & Werkzaamheden                 │ Periode              │ Begrote Uren  │
├──────────────────────────────────────┼──────────────────────┼───────────────┤
│ Fase 1: Discovery & Resilient Parser │ Q1 (Jan - Mrt 2027)  │ 130 uur       │
│ Ontwikkeling fouttolerante crawler,  │                      │               │
│ JSON-schema validatie en AST parser. │                      │               │
├──────────────────────────────────────┼──────────────────────┼───────────────┤
│ Fase 2: Multi-Archetype Compiler     │ Q2 (Apr - Jun 2027)  │ 140 uur       │
│ Algoritmische CSS tokenizing,        │                      │               │
│ dynamische hero-variaties en fonts.  │                      │               │
├──────────────────────────────────────┼──────────────────────┼───────────────┤
│ Fase 3: DRM Beveiliging & Sandboxing │ Q3 (Jul - Sep 2027)  │ 120 uur       │
│ Ontwikkeling domain-lock algoritme,  │                      │               │
│ obfuscatie en iframe-shielding.      │                      │               │
├──────────────────────────────────────┼──────────────────────┼───────────────┤
│ Fase 4: Autonome FTPS Pipeline       │ Q4 (Okt - Dec 2027)  │ 130 uur       │
│ Veilige CI/CD streaming naar geharde │                      │               │
│ Vimexx/Azure servers met auto-retry. │                      │               │
├──────────────────────────────────────┼──────────────────────┼───────────────┤
│ TOTAAL BEGROTE S&O-UREN              │ KALENDERJAAR 2027    │ 520 UUR       │
└──────────────────────────────────────┴──────────────────────┴───────────────┘
```

---

## 5. S&O-Administratie & Verantwoording

Om bij een eventuele controle door inspecteurs van de RVO te voldoen aan de administratieve verplichtingen:
1. **Urenregistratie:** Alle S&O-uren worden wekelijks vastgelegd per projectcode (`AWS-DCA`) in de eigen administratie (`Pi-Boekhouding` en git commit logs).
2. **Technische Verificatie:** Iedere fase wordt afgesloten met testbestanden en git pull requests in de repository (`Creation-Alt-Fix/factory/` en `Creation-Alt-Fix/tests/`), waarin de technische voortgang, foutoplossingen en testresultaten onweerlegbaar zijn vastgelegd.

---

## 6. Instructie voor Indiening bij RVO.nl

1. Log in op **mijn.rvo.nl** met DigiD of eHerkenning (niveau 3).
2. Selecteer **Aanvragen WBSO**.
3. Kies: **Zelfstandige / S&O-aftrek**.
4. Vul bij Projectnaam in: `Autonome Web-Synthese & Dynamische Code-Archetypen voor het MKB`.
5. Kopieer de teksten uit Paragraaf 2 (Aanleiding & Doel) en Paragraaf 3 (Technische Knelpunten & Oplossingsrichting) direct in de aanvraagvelden.
6. Voer de begrote uren in (520 uur voor 2027).
7. Verstuur de aanvraag vóór de formele indieningsdeadline.

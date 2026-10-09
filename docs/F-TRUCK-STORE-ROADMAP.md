# 🚛 F-Truck Store E-Commerce Architectuur & Follow-Up Strategie (TASK-809)

> **Klantdossier**: F-Truck Store (`ftruckstore.nl` & `ftruckstore.com`)  
> **Sector**: Heavy Duty Truck Onderdelen & Ford Trucks Accessoires (B2B & B2C)  
> **Status**: Uitgewerkt & Gereed voor Klantafstemming  
> **Auteur**: Allard Veldman — Creation+Alt+Fix

---

## 1. Executive Summary & Doelstelling

F-Truck Store richt zich op de Europese distributie van officiële en aftermarket Ford Trucks onderdelen en accessoires.
De doelstelling is de transitie van een statische presentatiepagina naar een **hoogwaardige, tweetalige (NL/EN) B2B/B2C webshop** met minimale laadtijden, VIN-nummer (chassisnummer) validatie en automatische BTW-verlegging voor buitenlandse transporteurs.

---

## 2. B2B & B2C Specificatie & Functionaliteiten Matrix

| Module | Functionaliteit | Bedrijfswaarde |
| :--- | :--- | :--- |
| **VIN / Chassisnummer Filter** | Klanten filteren onderdelen op specifiek Ford Trucks model (o.a. F-MAX, Legacy Cargo) | Voorkomt verkeerd bestelde onderdelen en retouren |
| **B2B BTW-Verlegging (VIES)** | Automatische EU BTW-nummer validatie via de Europese VIES API (0% intracommunautair tarief) | Essentieel voor transportbedrijven uit Duitsland, België, Polen |
| **Mollie Multi-Currency Checkout** | iDEAL, Bancontact, SEPA Overboeking, Creditcard en Klarna | Maximaal conversiepercentage in West- en Centraal-Europa |
| **Verzendstaffels op Gewicht** | Dynamische vrachtkostenberekening voor pallet- en pakketzendingen via DPD/DHL Freight | Geen margeverlies op zware vrachtwagenonderdelen |
| **B2B Dealer Account Portal** | Vaste transportvloten kunnen op factuur bestellen met vooraf afgesproken kortingsstaffels | Klantretentie en langdurige contractwaarde |

---

## 3. Technische E-commerce Architectuur

* **Frontend**: Vanilla JS + Tailwind/Dark AI Design System (ultrasnel, sub-second TTFB, geen zware WooCommerce plugins die crashen bij piekbelasting).
* **Backend & Catalogus**: Headless SQLite / Firestore catalogus gekoppeld aan de voorraadadministratie.
* **Hosting**: DirectAdmin Vimexx NVMe Cloud cluster met automatische failover en Cloudflare CDN caching voor internationale assets.

---

## 4. Fasering & Investeringsvoorstel

1. **Fase 1: B2B Digitale Onderdelencatalogus (€ 850,-)**
   - Volledige productcatalogus (100+ SKU's) met categoriefilters, HD foto's en technische datasheets.
   - Offerte- en aanvraagknop per onderdeel gekoppeld aan WhatsApp en CRM.
2. **Fase 2: Directe E-Commerce & Mollie Betalingsmodule (€ 650,-)**
   - Winkelwagen, afrekenen, automatische orderbevestigingen en PDF pakbonnen/facturen.
3. **Managed E-Commerce Service & Cloud Hosting (€ 350,- / jaar)**
   - NVMe hosting voor zowel `ftruckstore.nl` als `ftruckstore.com`, 24/7 uptime monitoring en 2 uur strippenkaart support per jaar.

---

## 5. Direct te Versturen Follow-Up Templates

### 📱 A. WhatsApp Follow-Up Template (Laagdrempelig & Doeltreffend)

```text
Hoi [Naam], 

Allard van Creation+Alt+Fix hier! 👋 

Ik heb de afgelopen dagen een complete specificatie uitgewerkt voor de webshop van F-Truck Store (voor zowel de .nl als de .com). 

We hebben gekeken naar een supersnelle onderdelencatalogus waarbij transporteurs direct op chassisnummer (VIN) kunnen zoeken naar Ford Trucks onderdelen, inclusief automatische BTW-verlegging voor buitenlandse transportbedrijven en betaling via iDEAL/Bancontact.

Zullen we deze week even kort bellen (of via een bakkie) om de wensen en prioriteiten door te nemen? Dan kan ik direct een gerichte demo voor jullie klaarzetten.

Groet,
Allard Veldman
Creation+Alt+Fix • 06 - 19 13 54 53
```

### ✉️ B. Formele E-mail Follow-Up Template

```text
Onderwerp: Specificatie & Vervolgstappen Webshop F-Truck Store (ftruckstore.nl / .com)

Beste [Naam],

Naar aanleiding van ons eerdere contact over F-Truck Store heb ik een gericht technisch voorstel en faseringsplan opgesteld voor de uitbreiding naar een volwaardige e-commerce webshop.

In het plan ligt de focus op:
1. Snelheid en vindbaarheid in Google voor Ford Trucks onderdelen en accessoires;
2. Een intuïtieve onderdelenzoeker waarmee chauffeurs en wagenparkbeheerders direct het juiste onderdeel vinden;
3. B2B afhandeling met automatische intracommunautaire BTW-controle voor Europese transportklanten;
4. Een soepele koppeling tussen het .nl domein en het internationale .com domein.

Het volledige faseringsdossier staat klaar. Ik licht het graag telefonisch of in een kort overleg aan jullie toe, zodat we de scope exact kunnen afstemmen op jullie actuele voorraad en doelstellingen.

Wanneer schikt het jullie om hier even kort over af te stemmen?

Met vriendelijke groet,

Allard Veldman
Oprichter Creation+Alt+Fix
Hoogezand • KvK: 99986191
Tel: +31 6 19135453
Web: https://creationaltfix.nl
```

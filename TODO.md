# Creation+Alt+Fix - TODO List

> **Note**: Alle taken uit het oorspronkelijke Customer Journey Plan (`crm/customer-journey-plan/`) zijn hieronder gecentraliseerd.

---

## 🚀 Priority 1: CRM & Klantenportaal Upgrades

- [x] **1. Notificaties bij Nieuwe Intakes** *(Blueprint Taak 02)*
  - Implementeer een actieve push-notificatie (bijv. via EmailJS, Formspree of Webhook naar Telegram/Discord/Teams).
  - Allard ontvangt direct een e-mail/notificatie op zijn telefoon zodra een lead het `/intake` formulier verstuurt.

- [x] **2. Intake Details Modal & Klantkaart (Admin Dashboard)** *(Blueprint Taak 01 & 02)*
  - Bouw een detailweergave (modal/slide-over) in `/admin` voor het aanklikken van een klant/lead.
  - Toon de volledige intake: bedrijfsnaam, contactpersoon, e-mail, gewenste domeinnaam, projectdoelen en designvoorkeuren.
  - Voeg snelacties toe (1-klik e-mailen, offerte genereren op basis van de intake).

- [ ] **3. Digitaal Ondertekenen van Offertes (`/offerte`)** *(Blueprint Taak 03)*
  - Voeg een formeel akkoordvinkje / digitaal handtekeningsveld toe op de interactieve offertepagina.
  - Werk de status in Firestore automatisch bij naar *"Geaccepteerd & Gestart"* zodra de klant accordeert.
  - Stuur automatisch een seintje naar de beheerders bij akkoord.

- [ ] **4. Live Klant Voortgangs-Tracker (`/status`)** *(Blueprint Taak 01 & 03)*
  - Bouw een klant-voortgangspagina (`portal.creationaltfix.nl/status/?id=...`).
  - Geef de klant een visuele timeline met fasen: *1. Intake & Akkoord* -> *2. Design & Ontwerp* -> *3. Ontwikkeling & Testen* -> *4. Livegang*.

- [ ] **5. Zoek- & Filterbalk + CSV Export (Admin Dashboard)** *(Blueprint Taak 01)*
  - Voeg in het Admin Dashboard een zoekbalk toe voor het zoeken op klantnaam of e-mail.
  - Voeg een filterdropdown toe op status (*Nieuwe Lead*, *Wacht op Akkoord*, *Actief*, *Afgerond*).
  - Voeg een exportknop toe om leads/projecten te downloaden als CSV.

---

## 💳 Priority 2: Backend & Betalingsintegratie

- [ ] **6. Mollie Python Backend Integratie & Webhooks** *(Blueprint Taak 05)*
  - Integreer de officiële Mollie Python SDK in de Flask boekhoudbackend (`Boekhouding`).
  - Richt webhooks in via Tailscale tunnel om betaalstatussen automatisch te synchroniseren in de database en CRM-status bij te werken (zie `crm/Mollie_Integration_Guide.md`).

---

## 🤖 Priority 3: AI & Automatisering

- [ ] **7. Geautomatiseerde Aftercare Cronjobs (2-Weken & Halfjaarlijkse APK)** *(Blueprint Taak 06)*
  - Automatiseer de 2-weken check-in (Google Review & Instagram uitnodiging) en de 6-maanden AI APK check-in via achtergrond-cronjobs of scheduled triggers.

- [ ] **8. Live OpenAI / Gemini API Integratie voor E-mail Drafter** *(Blueprint Taak 04)*
  - Koppel een live LLM API (OpenAI/Gemini) aan het Admin Dashboard om op basis van de binnenkomende intake automatisch maatwerk e-mail concepten te genereren in plaats van statische sjablonen.

---

## 🎨 Priority 4: Klantbeleving & Co-creatie

- [ ] **9. Visuele Feedbacktool op Demo Omgeving** *(Blueprint §3)*
  - Integreer een visuele feedbacktool/overlay (bijv. Marker.io of custom overlay) op klant-demo sites voor directe visuele opmerkingen tijdens de co-creatie fase.

- [ ] **10. Klant Overdracht & Documentatie Sjabloon** *(Blueprint §4)*
  - Maak een standaard opleverpagina/handleiding sjabloon (of instructievideo format) in de Dark AI huisstijl voor overdracht van opgeleverde websites/systemen.

---

## 📈 Priority 5: Marketing & Hosting Beheer

- [ ] **11. Google Ads Campagne Activatie (€400 Tegoed)** *(Blueprint Taak 07)*
  - Stel de Google Ads campagne in gericht op zoekwoorden ("website laten maken", "AI automatisering", "software support") leidend naar `landing.html`.

- [ ] **12. Hosting & Strippenkaart Structuur** *(Blueprint §4 & §5)*
  - Richt het hostingbeheer (€25/jaar .nl) en strippenkaartsysteem voor uren/onderhoud formeel in voor terugkerende omzet.

---

## ✅ Afgerond (Customer Journey Baseline)

- [x] **Project Dashboard (CRM Hub - Taak 01)**: Gebouwd in `/crm/admin` met Dark AI Theme, status lifecycle tracking, klantdetails modal, offerte-link generatie en Mollie betaallink simulatie.
- [x] **Klant Intake Portaal (Taak 02)**: Gebouwd in `/crm/intake` met Firebase Firestore integratie voor automatische opslag in het dashboard.
- [x] **Interactieve Offertes Basis (Taak 03)**: Gebouwd in `/crm/offerte` met dynamische Firestore gegevens-ophaal op basis van URL parameters.
- [x] **AI E-mail Drafter Basis (Taak 04)**: Gebouwd als concept-e-mail generator modal in `/crm/admin`.
- [x] **Mollie Betaallink Simulatie (Taak 05)**: Actie in `/crm/admin` om Mollie Plink URL's te tonen en status naar "Opgeleverd" te zetten.
- [x] **Aftercare Check-in Acties (Taak 06)**: Handmatige aftercare inplanningsactie in `/crm/admin`.
- [x] **Google Ads Landingspagina (Taak 07)**: Converterende landingspagina gebouwd op `website/landing.html`.

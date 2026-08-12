# Creation+Alt+Fix - TODO List

## 🚀 Priority 1: CRM & Klantenportaal Upgrades

- [ ] **1. Notificaties bij Nieuwe Intakes**
  - Implementeer een actieve push-notificatie (bijv. via EmailJS, Formspree of Webhook naar Telegram/Discord/Teams).
  - Allard ontvangt direct een e-mail/notificatie op zijn telefoon zodra een lead het `/intake` formulier verstuurt.

- [x] **2. Intake Details Modal & Klantkaart (Admin Dashboard)**
  - Bouw een detailweergave (modal/slide-over) in `/admin` voor het aanklikken van een klant/lead.
  - Toon de volledige intake: bedrijfsnaam, contactpersoon, e-mail, gewenste domeinnaam, projectdoelen en designvoorkeuren.
  - Voeg snelacties toe (1-klik e-mailen, offerte genereren op basis van de intake).

- [ ] **3. Digitaal Ondertekenen van Offertes (`/offerte`)**
  - Voeg een formeel akkoordvinkje / digitaal handtekeningsveld toe op de interactieve offertepagina.
  - Werk de status in Firestore automatisch bij naar *"Geaccepteerd & Gestart"* zodra de klant accordeert.
  - Stuur automatisch een seintje naar de beheerders bij akkoord.

- [ ] **4. Live Klant Voortgangs-Tracker (`/status`)**
  - Bouw een klant-voortgangspagina (`portal.creationaltfix.nl/status/?id=...`).
  - Geef de klant een visuele timeline met fasen: *1. Intake & Akkoord* -> *2. Design & Ontwerp* -> *3. Ontwikkeling & Testen* -> *4. Livegang*.

- [ ] **5. Zoek- & Filterbalk + CSV Export**
  - Voeg in het Admin Dashboard een zoekbalk toe voor het zoeken op klantnaam of e-mail.
  - Voeg een filterdropdown toe op status (*Nieuwe Lead*, *Wacht op Akkoord*, *Actief*, *Afgerond*).
  - Voeg een exportknop toe om leads/projecten te downloaden als CSV.

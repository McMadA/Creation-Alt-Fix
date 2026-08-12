# Taak 01: Project Dashboard (CRM Hub)

**Doel:** Een centraal systeem bouwen om alle leads, projecten en statussen bij te houden. Zonder dit dashboard is er geen plek om de data uit intakeformulieren of AI e-mails op te slaan.

## Eisen / Requirements
- **Status overzicht:** Leads (Nieuw, Gebeld), Offertes (Verzonden, Geaccepteerd), Projecten (In Ontwikkeling, Opgeleverd).
- **Klant details:** Naam, bedrijfsnaam, e-mail, project scope, bestanden (logo's, teksten).
- **Acties:** Knop om 'Concept AI e-mail' in te zien en te versturen, knop om een Mollie factuurverzoek klaar te zetten.
- **Styling:** Dark AI Theme (`#0a0e1a` achtergrond, indigo/paars/cyaan accenten).

## Te Bepalen (Tech Stack)
- Keuze 1: Bouwen in Python/Flask als uitbreiding van de bestaande Factuurgenerator.
- Keuze 2: Bouwen in Vanilla JS met Firebase Backend als beveiligde `/admin` map op de huidige statische website.

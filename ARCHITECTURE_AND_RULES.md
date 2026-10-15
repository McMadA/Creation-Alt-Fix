# Creation+Alt+Fix: Architectuur, Dataflow & AI Definition of Done (DoD)

> **BELANGRIJK VOOR ELKE AI ASSISTENT:**  
> Lees dit document ALTIJD voorafgaand aan het wijzigen of toevoegen van code in deze repository.  
> Elke taak MOET worden afgerond volgens de onderstaande **Definition of Done (DoD) Checklist**.

---

## 1. Systeemlandschap & Technologieën

- **Frontend**: Vanilla JavaScript (ES Modules), Modern HTML5, Responsive CSS (Design tokens).
- **Backend**: Native PHP 8.x draaiend op DirectAdmin / Vimexx webserver (`crm/api/*.php`).
- **Database & Auth**: Google Cloud Firestore & Firebase Auth (`mythical-cider-475118-e5`).
- **Storage**: Firebase Storage (offertes, facturen en klantbestanden).
- **Externe Services**: Mollie API v2 (iDEAL betalingen), EmailJS / FormSubmit (notificaties).

---

## 2. De 6 Gouden Architectuurregels (Nooit Schenden!)

### Regel 1: Symmetrische Tweetaligheid (i18n Parity)
- Klantenportaal gebruikt `data-translate-key` gekoppeld aan `crm/status/js/modules/translations.js`.
- Hoofdwebsite gebruikt `data-i18n` gekoppeld aan `website/js/modules/translations-data.js`.
- **Verboden**: Hardcoded inline ternaries (`currentLang === 'en' ? 'A' : 'B'`) in JavaScript-logica.
- **Verplicht**: Voeg élke nieuwe string toe aan **zowel `nl` als `en`**.

### Regel 2: Firestore Security Rules Synchronisatie
- Externe klanten mogen Firestore-documenten uitsluitend bijwerken als het veld expliciet is opgenomen in de `hasOnly([...])` whitelist van `isValidClientUpdate()` in `firestore.rules`.
- Voeg je een nieuw veld toe in de frontend dat de klant kan bewerken (bijv. in profiel, tickets of instellingen)? Dan **MOET** je gelijktijdig `firestore.rules` uitbreiden.
- Array-velden (`messages`, `annotations`, `files`, `tickets`) moeten altijd voorzien zijn van een strikte `size() <= N` grens om DoS en document-bloat te voorkomen.

### Regel 3: Defensieve DOM-Interacties (Geen Vaste Aannames)
- Voorkom ongecheckte DOM-aanroepen:
  ```javascript
  // FOUT (crasht als element ontbreekt of modal gesloten is):
  document.getElementById('btn-submit').addEventListener('click', ...);
  const val = document.getElementById('input-field').value;

  // GOED (defensief met optional chaining of null-check):
  document.getElementById('btn-submit')?.addEventListener('click', ...);
  const inputEl = document.getElementById('input-field');
  const val = inputEl ? inputEl.value : '';
  ```

### Regel 4: Server-Side Authenticatie in PHP
- Elk PHP-endpoint in `crm/api/` dat gevoelige gegevens leest of acties uitvoert (m.u.v. publieke cURL probes zoals `healthcheck.php`), **MOET** het Firebase ID-token in de `Authorization: Bearer <token>` header valideren via Google Identity Toolkit (`accounts:lookup`).
- Vertrouw **nooit** blind op meegestuurde parameters zoals `client_id` of `project_id` zonder verificatie.

### Regel 5: XSS Sanitatie & HTML Encoding
- Alle data die door klanten of externe bronnen is ingevoerd (`message`, `comment`, `companyName`, `fileName`), **MOET** geëscaped worden met `escapeHtml()` vóór injectie in de DOM via `.innerHTML`.
- Links en URL's moeten altijd gezuiverd worden via `sanitizeUrl()`.

### Regel 6: Zero-Regressie Verificatie
- Na elke code-aanpassing **MOET** de CI/CD testsuite worden gedraaid via terminal:
  `node tests/run-all-tests.js`
- 100% van de tests moet slagen. Er mogen geen syntaxfouten of assertie-fouten ontstaan.

---

## 3. Verplichte "Definition of Done" (DoD) Checklist voor AI

Voordat je jouw antwoord presenteert of een taak als gereed beschouwt, controleer je verplicht de volgende punten:

```markdown
### 📋 Definition of Done Checklist

- [ ] **1. i18n & Vertalingen**:
  - Zijn alle nieuwe teksten voorzien van een `data-translate-key` (portal) of `data-i18n` (website)?
  - Bestaan alle nieuwe sleutels in ZOWEL `translations.nl` als `translations.en`?
  - Bevat de code geen nieuwe hardcoded inline checks (`currentLang === 'en' ? ...`)?

- [ ] **2. DOM & Event Selectors**:
  - Zijn alle element-ID's die in JavaScript worden aangeroepen aanwezig in de bijbehorende HTML?
  - Zijn event listeners en DOM-leesacties beveiligd met optionele chaining (`?.`) of null-guards?
  - Zijn er geen verouderde/dubbele ID's achtergebleven?

- [ ] **3. Firebase Rules & Dataflow**:
  - Als er nieuwe velden door de klant worden geüpdatet, staan deze in `isValidClientUpdate()` in `firestore.rules`?
  - Blijft strikte data-isolatie tussen verschillende klanten gewaarborgd?
  - Compileert de rules-file? Draai `firebase deploy --only firestore:rules --project mythical-cider-475118-e5 --dry-run`.
  - Gebruik NOOIT gereserveerde woorden als veldnaam met punt-notatie (`data.service` breekt!). Gebruik `data['service']`.
  - Let op: de CI-pipeline deployt rules alleen als er een Firebase-secret is. Toont de run een warning "Firestore rules NIET gedeployed"? Dan handmatig deployen.

- [ ] **4. PHP & API Symmetrie**:
  - Verwacht het PHP-endpoint exact dezelfde JSON-sleutels als de JavaScript `fetch()` payload verstuurt?
  - Wordt het Firebase ID-token geverifieerd aan de serverkant?

- [ ] **5. XSS & Input Sanitatie**:
  - Wordt dynamische content veilig ge-escaped met `escapeHtml()` en URL's met `sanitizeUrl()`?

- [ ] **6. Geautomatiseerde Testsuite**:
  - Is `node tests/run-all-tests.js` uitgevoerd en slagen alle tests (100% PASS)?
```

# 💳 Mollie API & Webhook Integratie Handleiding (TASK-201)

> **Systeem**: Boekhouding Flask Backend (`C:\Users\Admin\Documents\GitHub\Boekhoudings\Boekhouding\app.py`) & Creation+Alt+Fix CRM Klantenportaal.  
> **SDK**: Officiële `mollie-api-python` SDK  
> **Betaalmethoden**: iDEAL, Creditcard, Apple Pay, Bancontact, SEPA Overboeking.

---

## 1. Installatie van de Mollie Python SDK

Installeer de officiële SDK in de virtuele omgeving van Boekhouding:

```bash
pip install mollie-api-python
```

Voeg toe aan `requirements.txt`:
```text
mollie-api-python>=3.4.0
```

---

## 2. Configuratie & API Sleutels

Mollie levert 2 typen API-sleutels:
* **Test Mode**: `test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (Voor simulaties en testen zonder echte transacties)
* **Live Mode**: `live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (Voor daadwerkelijke betalingen via iDEAL)

Stel de omgevingsvariabele in op Windows / Linux:
```powershell
# Windows PowerShell
$env:MOLLIE_API_KEY = "live_jouw_echte_sleutel"
```
Of voeg toe aan de `.env` van de Boekhouding app.

---

## 3. Integratie in `app.py`

Koppel de service in `Boekhouding/app.py`:

```python
from mollie_service import MollieService, register_mollie_routes

# Initialiseer de service
mollie_service = MollieService(db_path="boekhouding.db")

# Registreer de API endpoints (/api/mollie/create en /api/mollie/webhook)
register_mollie_routes(app, mollie_service)
```

---

## 4. Webhook Tunneling via Tailscale

Omdat de Boekhouding lokaal of op de Raspberry Pi draait, verstuurt Mollie webhook-notificaties naar een publiek bereikbare URL. Dit werkt naadloos via:
1. **Tailscale Funnel**:
   ```bash
   tailscale funnel 5000
   ```
2. Of via Nginx reverse proxy op de Vimexx webserver doorsturen naar de webhook URL:
   `https://creationaltfix.nl/api/mollie/webhook`

---

## 5. Transactie- en Databaseverificatie

Zodra een klant betaalt:
1. Mollie vuurt een POST request naar `/api/mollie/webhook` met het `id` (bijv. `tr_123456789`).
2. De `MollieService` verifieert de status direct cryptografisch bij Mollie.
3. Bij status `paid` wordt in `boekhouding.db`:
   * De tabel `mollie_transacties` bijgewerkt met betaalmethode en timestamp.
   * De factuur in `verkoopfacturen` automatisch op status **'Betaald'** gezet met de betaaldatum.
   * Het CRM Klantenportaal toont direct een vinkje en genereert de definitieve voldane factuur PDF.

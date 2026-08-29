"""
Mollie API Integration & Webhook Listener Service for Boekhouding
Creation+Alt+Fix (TASK-201)

Deze module biedt een robuuste, productiekeurige integratie met de officiële
Mollie Python SDK (mollie-api-python) voor het genereren van iDEAL/Creditcard
betaallinks, het verwerken van webhooks en het synchroniseren van factuurstatussen.
"""

import os
import sqlite3
import logging
from datetime import datetime
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MollieService")

try:
    from mollie.api.client import Client
    from mollie.api.error import Error as MollieError
    MOLLIE_SDK_AVAILABLE = True
except ImportError:
    MOLLIE_SDK_AVAILABLE = False
    logger.warning("mollie-api-python SDK niet geïnstalleerd. Draai: pip install mollie-api-python")


class MollieService:
    def __init__(self, api_key: Optional[str] = None, db_path: Optional[str] = None):
        """
        Initialiseert de Mollie betaalservice.
        Haalt API-sleutel op uit environment variable MOLLIE_API_KEY indien niet meegegeven.
        """
        self.api_key = api_key or os.environ.get("MOLLIE_API_KEY", "")
        self.db_path = db_path or os.path.join(os.path.dirname(__file__), "boekhouding.db")
        self.client = None

        if MOLLIE_SDK_AVAILABLE and self.api_key:
            try:
                self.client = Client()
                self.client.set_api_key(self.api_key)
                logger.info("Mollie API Client succesvol geïnitialiseerd (Key: %s...)", self.api_key[:8])
            except Exception as e:
                logger.error("Fout bij initialiseren Mollie Client: %s", str(e))
        else:
            logger.info("MollieService draait in simulatie/voorbereidingsmodus (Geen actieve API key).")

        self._ensure_db_schema()

    def _ensure_db_schema(self):
        """Zorgt ervoor dat de mollie_transacties tabel bestaat in boekhouding.db"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS mollie_transacties (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        mollie_payment_id TEXT UNIQUE,
                        factuurnummer TEXT,
                        klant_naam TEXT,
                        bedrag_excl REAL,
                        bedrag_incl REAL,
                        status TEXT,
                        betaalmethode TEXT,
                        checkout_url TEXT,
                        created_at TEXT,
                        paid_at TEXT,
                        metadata_json TEXT
                    )
                """)
                conn.commit()
        except Exception as e:
            logger.error("Fout bij aanmaken mollie_transacties tabel: %s", str(e))

    def create_payment(
        self,
        factuurnummer: str,
        bedrag_incl: float,
        beschrijving: str,
        redirect_url: str,
        webhook_url: Optional[str] = None,
        klant_naam: str = "",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Maakt een nieuwe Mollie betaling aan en retourneert de checkout URL.
        """
        formatted_amount = f"{bedrag_incl:.2f}"
        meta = metadata or {}
        meta.update({
            "factuurnummer": factuurnummer,
            "klant_naam": klant_naam,
            "timestamp": datetime.now().isoformat()
        })

        # Productie / Live SDK Call
        if self.client:
            try:
                payment_payload = {
                    "amount": {
                        "currency": "EUR",
                        "value": formatted_amount
                    },
                    "description": beschrijving or f"Factuur {factuurnummer} - Creation+Alt+Fix",
                    "redirectUrl": redirect_url,
                    "metadata": meta
                }
                
                # Alleen webhook meesturen indien publiek bereikbaar (bijv. via Tailscale / Domein)
                if webhook_url and not webhook_url.startswith("http://localhost") and not webhook_url.startswith("http://127.0.0.1"):
                    payment_payload["webhookUrl"] = webhook_url

                payment = self.client.payments.create(payment_payload)
                checkout_url = payment.checkout_url
                payment_id = payment.id

                # Opslaan in database
                self._record_payment(payment_id, factuurnummer, klant_naam, bedrag_incl, "open", checkout_url, str(meta))

                return {
                    "success": True,
                    "payment_id": payment_id,
                    "checkout_url": checkout_url,
                    "status": "open",
                    "mode": "live" if self.api_key.startswith("live_") else "test"
                }
            except Exception as e:
                logger.error("Mollie API aanroep mislukt: %s", str(e))
                return {
                    "success": False,
                    "error": str(e)
                }

        # Fallback / Staging Simulatielink (wanneer nog geen API key is ingevuld)
        mock_id = f"tr_mock_{int(datetime.now().timestamp())}"
        mock_url = f"https://useplink.com/payment/simulated_{factuurnummer.lower()}"
        self._record_payment(mock_id, factuurnummer, klant_naam, bedrag_incl, "simulated", mock_url, str(meta))

        return {
            "success": True,
            "payment_id": mock_id,
            "checkout_url": mock_url,
            "status": "simulated",
            "mode": "simulation"
        }

    def process_webhook(self, payment_id: str) -> Dict[str, Any]:
        """
        Verwerkt een webhook callback van Mollie en werkt de database & factuurstatus bij.
        """
        if not self.client:
            logger.warning("Webhook ontvangen voor %s maar geen Mollie client geconfigureerd.", payment_id)
            return {"success": False, "status": "unknown"}

        try:
            payment = self.client.payments.get(payment_id)
            status = "open"
            paid_at = None

            if payment.is_paid():
                status = "paid"
                paid_at = datetime.now().isoformat()
            elif payment.is_canceled():
                status = "canceled"
            elif payment.is_expired():
                status = "expired"
            elif payment.is_failed():
                status = "failed"

            method = payment.method or "onbekend"
            factuurnummer = payment.metadata.get("factuurnummer", "") if payment.metadata else ""

            # Update transactie tabel
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE mollie_transacties
                    SET status = ?, betaalmethode = ?, paid_at = ?
                    WHERE mollie_payment_id = ?
                """, (status, method, paid_at, payment_id))

                # Indien voldaan: werk ook de status van de verkoopfactuur bij in de hoofdtabel
                if status == "paid" and factuurnummer:
                    cursor.execute("""
                        UPDATE verkoopfacturen
                        SET status = 'Betaald', betaaldatum = ?
                        WHERE factuurnummer = ?
                    """, (datetime.now().strftime("%Y-%m-%d"), factuurnummer))

                conn.commit()

            logger.info("Mollie betaling %s bijgewerkt naar status: %s (Factuur: %s)", payment_id, status, factuurnummer)
            return {
                "success": True,
                "payment_id": payment_id,
                "status": status,
                "factuurnummer": factuurnummer,
                "is_paid": payment.is_paid()
            }
        except Exception as e:
            logger.error("Fout bij verwerken Mollie webhook voor %s: %s", payment_id, str(e))
            return {"success": False, "error": str(e)}

    def _record_payment(self, payment_id, factuurnummer, klant_naam, bedrag, status, url, meta_str):
        """Hulpfunctie voor het wegschrijven naar mollie_transacties"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO mollie_transacties 
                    (mollie_payment_id, factuurnummer, klant_naam, bedrag_incl, status, checkout_url, created_at, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (payment_id, factuurnummer, klant_naam, bedrag, status, url, datetime.now().isoformat(), meta_str))
                conn.commit()
        except Exception as e:
            logger.error("Fout bij opslaan in database: %s", str(e))


# Flask Blueprint / Route Snippet voorbeeld voor app.py
def register_mollie_routes(app, mollie_svc: MollieService):
    """
    Koppelt de benodigde Flask routes aan de bestaande Boekhouding app.
    """
    from flask import request, jsonify

    @app.route("/api/mollie/create", methods=["POST"])
    def api_create_mollie_payment():
        data = request.get_json() or {}
        factuurnummer = data.get("factuurnummer")
        bedrag = float(data.get("bedrag", 0.0))
        beschrijving = data.get("beschrijving", f"Factuur {factuurnummer}")
        redirect_url = data.get("redirect_url", "https://creationaltfix.nl/portal/")
        webhook_url = data.get("webhook_url", "https://creationaltfix.nl/api/mollie/webhook")
        klant_naam = data.get("klant_naam", "")

        if not factuurnummer or bedrag <= 0:
            return jsonify({"error": "Ongeldig factuurnummer of bedrag"}), 400

        result = mollie_svc.create_payment(
            factuurnummer=factuurnummer,
            bedrag_incl=bedrag,
            beschrijving=beschrijving,
            redirect_url=redirect_url,
            webhook_url=webhook_url,
            klant_naam=klant_naam
        )
        return jsonify(result)

    @app.route("/api/mollie/webhook", methods=["POST"])
    def api_mollie_webhook():
        payment_id = request.form.get("id")
        if not payment_id:
            return "Missing payment id", 400
        
        mollie_svc.process_webhook(payment_id)
        return "OK", 200

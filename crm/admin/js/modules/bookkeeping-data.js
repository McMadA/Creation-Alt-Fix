/**
 * Internal Pi-Boekhouding Client & Invoice Records
 * 
 * NOTE: This file contains private business and accounting records for Creation+Alt+Fix.
 * When packaging or selling the CRM to a third party, this file can be emptied or replaced
 * with sample-bookkeeping.js without breaking any core CRM functionality.
 */

import { SUBSCRIPTION_PLANS } from "../../../js/crm-config.js";

export const PI_BOEKHOUDING_CLIENT_DATA = {
    "angelastenekes.nl": {
        clientName: "De Knipperij (Angela Stenekes)",
        relatieId: 7,
        kvk: "59520353",
        currentPlanName: "Historisch Budget: € 22,00 / jr (t/m 31-12-2026)",
        currentPlanId: "legacy_22",
        recommendedPlanId: "transition_2027_loyalty",
        recommendedReason: "Akkoord gegeven op 08-10-2026: Trouwe Klant Overgangstarief 2027 (€ 95,- voor 2027, per 2028 standaard € 150,-/jr). Incl. NVMe hosting, SSL, 5 mailboxen & 30 min. service.",
        subscriptionPlan2027Id: "transition_2027_loyalty",
        subscriptionPlan2027Name: "Trouwe Klant Overgangstarief 2027",
        subscriptionPlan2027Price: "95,00",
        subscriptionPlan2027Status: "bevestigd",
        subscriptionPlan2027ConfirmedAt: "2026-10-08T21:37:00Z",
        latestInvoice: {
            number: "2026-004",
            date: "27-05-2026",
            status: "Betaald",
            totalExcl: 22.00,
            items: [
                { name: "Domein verlengen", desc: "per jaar", qty: 1, price: 10.00 },
                { name: "Hosting verlengen", desc: "per maand", qty: 12, price: 1.00 }
            ]
        }
    },
    "scholte-elektrotechniek.nl": {
        clientName: "Scholte Elektrotechniek (Gerjo Scholte)",
        relatieId: 6,
        kvk: "89192036",
        currentPlanName: "Historisch Budget: € 22,00 / jr",
        currentPlanId: "legacy_22",
        recommendedPlanId: "transition_2027_loyalty",
        recommendedReason: "Trouwe Klant Overgangstarief 2027: € 95,- voor 2027 (per 2028 standaard € 150,-/jr). Incl. NVMe hosting, SSL, zakelijke mailbox & 30 min. service.",
        latestInvoice: {
            number: "2026-003",
            date: "27-05-2026",
            status: "Betaald",
            totalExcl: 22.00,
            items: [
                { name: "Domein verlengen", desc: "per jaar", qty: 1, price: 10.00 },
                { name: "Hosting verlengen", desc: "per maand", qty: 12, price: 1.00 }
            ]
        }
    },
    "stenekesrioolspecialist.nl": {
        clientName: "Stenekes Riool & Grondwerk (Jozua Stenekes)",
        relatieId: 8,
        kvk: "02075792",
        currentPlanName: "Historisch Budget: € 22,00 / jr (t/m 31-12-2026)",
        currentPlanId: "legacy_22",
        recommendedPlanId: "transition_2027_loyalty",
        recommendedReason: "Akkoord gegeven op 08-10-2026: Trouwe Klant Overgangstarief 2027 (€ 95,- voor 2027, per 2028 standaard € 150,-/jr). Incl. NVMe hosting, SSL, storingsopvolging & 30 min. service.",
        subscriptionPlan2027Id: "transition_2027_loyalty",
        subscriptionPlan2027Name: "Trouwe Klant Overgangstarief 2027",
        subscriptionPlan2027Price: "95,00",
        subscriptionPlan2027Status: "bevestigd",
        subscriptionPlan2027ConfirmedAt: "2026-10-08T21:37:00Z",
        latestInvoice: {
            number: "2026-005",
            date: "03-06-2026",
            status: "Betaald",
            totalExcl: 22.00,
            items: [
                { name: "Domein verlengen", desc: "per jaar", qty: 1, price: 10.00 },
                { name: "Hosting verlengen", desc: "per maand", qty: 12, price: 1.00 }
            ]
        }
    },
    "ftruckstore.nl": {
        clientName: "F-Truck Store (Ford Trucks)",
        relatieId: 9,
        kvk: "01145302",
        currentPlanName: "Hosting & Multi-Domein: € 95,00 / jr",
        currentPlanId: "legacy_multi",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr). NVMe hosting, SSL, zakelijke mail & 30 min. service per jaar.",
        latestInvoice: {
            number: "2026-008",
            date: "22-07-2026",
            status: "Betaald",
            totalExcl: 305.00,
            items: [
                { name: "Hosting", desc: "per maand", qty: 12, price: 5.00 },
                { name: ".nl domein", desc: "per jaar", qty: 1, price: 10.00 },
                { name: ".com domein", desc: "per jaar", qty: 1, price: 25.00 },
                { name: "Overzetten website", desc: "per uur", qty: 6, price: 35.00 }
            ]
        }
    },
    "bakkertjesieg.nl": {
        clientName: "BakkertjeSieg (Sigrid Sneep)",
        relatieId: 5,
        kvk: "92124356",
        currentPlanName: "Nieuwe Website Oplevering (Urenbasis)",
        currentPlanId: "none",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Nieuwe website livegang: Managed Cloud Hosting & .nl domein All-in (€ 150,-/jr). Incl. 30 min. service per jaar.",
        latestInvoice: {
            number: "2026-009",
            date: "22-07-2026",
            status: "Betaald",
            totalExcl: 245.00,
            items: [
                { name: "Nieuwe website", desc: "in uren", qty: 7, price: 35.00 }
            ]
        }
    },
    "liviandesign.nl": {
        clientName: "Livian Design (Lianne Steinfelder)",
        relatieId: 1,
        kvk: "98849794",
        currentPlanName: "Eenmalig Maatwerk (Rustend)",
        currentPlanId: "none",
        recommendedPlanId: "none",
        recommendedReason: "Eenmalig project (software realisatie). Geen potentie / geen doorlopend abonnement vereist, tenzij ze zelf weer contact opneemt.",
        latestInvoice: {
            number: "2026-001",
            date: "24-03-2026",
            status: "Betaald",
            totalExcl: 50.00,
            items: [
                { name: "Software", desc: "realisatie", qty: 1, price: 50.00 }
            ]
        }
    },
    "besselinginstallatietechniek.nl": {
        clientName: "Besseling Installatietechniek",
        currentPlanName: "In Ontwikkeling (Fase 4)",
        currentPlanId: "managed_nl",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Bedrijfswebsite: Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr) bij oplevering. Incl. NVMe hosting, SSL & 30 min. service.",
        latestInvoice: null
    },
    "arnolddesign.nl": {
        clientName: "Arnold Design",
        currentPlanName: "Design & AI Scrape Shield (Fase 3)",
        currentPlanId: "transition_2027_loyalty",
        recommendedPlanId: "transition_2027_loyalty",
        recommendedReason: "Trouwe Klant Overgangstarief 2027: € 95,- voor 2027 (per 2028 standaard € 150,-/jr). Incl. atelier portfolio hosting, AI shield & 30 min. service.",
        latestInvoice: null
    },
    "vanderplaats.nl": {
        clientName: "VAN DER PLAATS (Gerard Klusser)",
        currentPlanName: "In Ontwikkeling (Fase 4)",
        currentPlanId: "managed_nl",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Klussersbedrijf website: Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr).",
        latestInvoice: null
    },
    "capybaraculture.com": {
        clientName: "Capybara Culture",
        currentPlanName: "Eigen Project Allard (Vimexx intern)",
        currentPlanId: "internal_project",
        recommendedPlanId: "none",
        recommendedReason: "Eigen intern project van Allard: geen CRM hostingabonnement vereist. Directe factuur van Vimexx registrar wordt intern direct doorgestuurd/doorbelast naar dit project.",
        latestInvoice: null
    },
    "naaiatelier-willa.nl": {
        clientName: "Naaiatelier Willa",
        currentPlanName: "MKB Portfolio & Atelier",
        currentPlanId: "transition_2027_loyalty",
        recommendedPlanId: "transition_2027_loyalty",
        recommendedReason: "Trouwe Klant Overgangstarief 2027: € 95,- voor 2027 (per 2028 standaard € 150,-/jr). Incl. atelier website hosting & 30 min. service.",
        latestInvoice: null
    },
    "pomppop.nl": {
        clientName: "PompPop Festival (Stichting PompPop)",
        currentPlanName: "Festival Platform & Ticket Hub",
        currentPlanId: "managed_nl",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Evenementen platform: Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr).",
        latestInvoice: null
    },
    "qolipa.nl": {
        clientName: "Qolipa Webshop & Brand",
        currentPlanName: "Eigen Project Allard (Vimexx intern)",
        currentPlanId: "internal_project",
        recommendedPlanId: "none",
        recommendedReason: "Eigen intern project van Allard: geen CRM hostingabonnement vereist. Directe factuur van Vimexx registrar wordt intern direct doorgestuurd/doorbelast naar dit project.",
        latestInvoice: null
    },
    "justin.nl": {
        clientName: "Justin Web Projects",
        currentPlanName: "Nieuwe Lead (Fase 1)",
        currentPlanId: "none",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Bij oplevering: Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr).",
        latestInvoice: null
    },
    "creationaltfix.nl": {
        clientName: "Creation+Alt+Fix (Eigen Platform)",
        currentPlanName: "In-House Cloud Infrastructuur",
        currentPlanId: "managed_multi",
        recommendedPlanId: "managed_multi",
        recommendedReason: "Interne AI tooling, CRM cluster & 12 domeinen beheer.",
        latestInvoice: null
    },
    "hbi.creationaltfix.nl": {
        clientName: "Home Buyer Intelligence (HBI)",
        currentPlanName: "AI Tooling & Cloud Platform",
        currentPlanId: "managed_nl",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Vastgoed AI analyse applicatie & cloud hosting.",
        latestInvoice: null
    }
};

/**
 * Returns bookkeeping and plan information for a given project.
 * Uses dynamic detection if no private record exists.
 */
export function getPiBoekhoudingInfo(p) {
    if (!p) return null;
    const name = (p.client || p.companyName || '').toLowerCase();
    const dom = (p.domainName || p.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

    for (const [domainKey, data] of Object.entries(PI_BOEKHOUDING_CLIENT_DATA)) {
        if (dom && dom.includes(domainKey)) return data;
        const cName = data.clientName.toLowerCase();
        if (name && (name.includes(cName) || cName.includes(name))) return data;
    }

    // Dynamic detection based on TLD / domain
    let recPlanId = "managed_nl";
    let recReason = "Standaard advies: Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr excl. BTW).";

    if (p.domainTld === '.com' || dom.endsWith('.com')) {
        recPlanId = "managed_com";
        recReason = "Advies voor .com domein: Managed Cloud Hosting & .com Domein All-in (€ 165,-/jr excl. BTW).";
    } else if (p.domainTld && p.domainTld !== '.nl' && !dom.endsWith('.nl')) {
        recPlanId = "managed_custom";
        recReason = "Advies voor internationaal/speciaal TLD: Managed Cloud Hosting (€ 175,-/jr excl. BTW).";
    }

    return {
        clientName: p.client || p.companyName || "Nieuwe Klant",
        currentPlanName: "Nog geen actief abonnement",
        currentPlanId: "none",
        recommendedPlanId: recPlanId,
        recommendedReason: recReason,
        latestInvoice: null
    };
}

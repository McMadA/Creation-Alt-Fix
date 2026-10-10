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
        aliases: ["de knipperij", "angela", "angela stenekes", "knipperij", "angelastenekes.nl"],
        currentPlanName: "Per 1 januari 2027: € 95,00 / jr (t/m 31-12-2026 nog € 22,-)",
        currentPlanId: "transition_2027_loyalty",
        recommendedPlanId: "transition_2027_loyalty",
        recommendedReason: "Akkoord gegeven op 08-10-2026: Trouwe Klant Overgangstarief 2027 (€ 95,- voor 2027, per 2028 standaard € 150,-/jr). Incl. NVMe hosting, SSL, 5 mailboxen & 30 min. service.",
        subscriptionPlan2027Id: "transition_2027_loyalty",
        subscriptionPlan2027Name: "Trouwe Klant Overgangstarief 2027",
        subscriptionPlan2027Price: "95,00",
        subscriptionPlan2027Status: "bevestigd",
        subscriptionPlan2027ConfirmedAt: "2026-10-08T21:37:00Z",
        invoices: [
            {
                invoiceNumber: "2026-004",
                description: "Domein & hosting verlengen",
                invoiceDate: "2026-05-27",
                dueDate: "2026-06-10",
                amountExcl: 22.00,
                amountVat: 4.62,
                amountIncl: 26.62,
                status: "paid",
                items: [
                    { name: "Domein verlengen", desc: "per jaar", qty: 1, price: 10.00 },
                    { name: "Hosting verlengen", desc: "per maand", qty: 12, price: 1.00 }
                ]
            }
        ],
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
        aliases: ["scholte elektrotechniek", "scholte", "gerjo", "gerjo scholte", "scholte-elektrotechniek.nl"],
        currentPlanName: "Historisch Budget: € 22,00 / jr",
        currentPlanId: "legacy_22",
        recommendedPlanId: "transition_2027_loyalty",
        recommendedReason: "Trouwe Klant Overgangstarief 2027: € 95,- voor 2027 (per 2028 standaard € 150,-/jr). Incl. NVMe hosting, SSL, zakelijke mailbox & 30 min. service.",
        invoices: [
            {
                invoiceNumber: "2026-003",
                description: "Domein & hosting verlengen",
                invoiceDate: "2026-05-27",
                dueDate: "2026-06-10",
                amountExcl: 22.00,
                amountVat: 4.62,
                amountIncl: 26.62,
                status: "paid",
                items: [
                    { name: "Domein verlengen", desc: "per jaar", qty: 1, price: 10.00 },
                    { name: "Hosting verlengen", desc: "per maand", qty: 12, price: 1.00 }
                ]
            }
        ],
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
        aliases: ["stenekes riool", "rioolspecialist stenekes", "jozua", "jozua stenekes", "stenekesrioolspecialist.nl"],
        currentPlanName: "Per 1 januari 2027: € 95,00 / jr (t/m 31-12-2026 nog € 22,-)",
        currentPlanId: "transition_2027_loyalty",
        recommendedPlanId: "transition_2027_loyalty",
        recommendedReason: "Akkoord gegeven op 08-10-2026: Trouwe Klant Overgangstarief 2027 (€ 95,- voor 2027, per 2028 standaard € 150,-/jr). Incl. NVMe hosting, SSL, storingsopvolging & 30 min. service.",
        subscriptionPlan2027Id: "transition_2027_loyalty",
        subscriptionPlan2027Name: "Trouwe Klant Overgangstarief 2027",
        subscriptionPlan2027Price: "95,00",
        subscriptionPlan2027Status: "bevestigd",
        subscriptionPlan2027ConfirmedAt: "2026-10-08T21:37:00Z",
        invoices: [
            {
                invoiceNumber: "2026-005",
                description: "Domein & hosting verlengen",
                invoiceDate: "2026-06-03",
                dueDate: "2026-06-17",
                amountExcl: 22.00,
                amountVat: 4.62,
                amountIncl: 26.62,
                status: "paid",
                items: [
                    { name: "Domein verlengen", desc: "per jaar", qty: 1, price: 10.00 },
                    { name: "Hosting verlengen", desc: "per maand", qty: 12, price: 1.00 }
                ]
            }
        ],
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
        aliases: ["ftruckstore", "ftruck", "f-truck store", "ford trucks", "ftruckstore.nl"],
        currentPlanName: "Hosting & Multi-Domein: € 95,00 / jr",
        currentPlanId: "legacy_multi",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr). NVMe hosting, SSL, zakelijke mail & 30 min. service per jaar.",
        invoices: [
            {
                invoiceNumber: "2026-006",
                description: "Reparatie website (4u)",
                invoiceDate: "2026-07-13",
                dueDate: "2026-07-27",
                amountExcl: 140.00,
                amountVat: 29.40,
                amountIncl: 169.40,
                status: "paid",
                items: [
                    { name: "Reparatie website", desc: "in uren", qty: 4, price: 35.00 }
                ]
            },
            {
                invoiceNumber: "2026-007",
                description: "Hosting (Vervangen door 2026-008)",
                invoiceDate: "2026-07-22",
                dueDate: "2026-08-05",
                amountExcl: 60.00,
                amountVat: 12.60,
                amountIncl: 72.60,
                status: "canceled",
                items: [
                    { name: "hosting", desc: "per maand", qty: 12, price: 5.00 }
                ]
            },
            {
                invoiceNumber: "2026-008",
                description: "Hosting & .nl / .com domeinen & migratie",
                invoiceDate: "2026-07-22",
                dueDate: "2026-08-05",
                amountExcl: 305.00,
                amountVat: 64.05,
                amountIncl: 369.05,
                status: "paid",
                items: [
                    { name: "Hosting", desc: "per maand", qty: 12, price: 5.00 },
                    { name: ".nl domein", desc: "per jaar", qty: 1, price: 10.00 },
                    { name: ".com domein", desc: "per jaar", qty: 1, price: 25.00 },
                    { name: "overzetten website", desc: "per uur", qty: 6, price: 35.00 }
                ]
            }
        ],
        latestInvoice: {
            number: "2026-008",
            date: "22-07-2026",
            status: "Betaald",
            totalExcl: 305.00,
            items: [
                { name: "Hosting", desc: "per maand", qty: 12, price: 5.00 },
                { name: ".nl domein", desc: "per jaar", qty: 1, price: 10.00 },
                { name: ".com domein", desc: "per jaar", qty: 1, price: 25.00 },
                { name: "overzetten website", desc: "per uur", qty: 6, price: 35.00 }
            ]
        }
    },
    "bakkertjesieg.nl": {
        clientName: "BakkertjeSieg (Sigrid Sneep)",
        relatieId: 5,
        kvk: "92124356",
        aliases: ["bakkertjesieg", "bakkertje sieg", "bakkerij sieg", "sigrid sneep", "siegert", "bakkertjesieg.nl"],
        currentPlanName: "Nieuwe Website Oplevering (Urenbasis)",
        currentPlanId: "none",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Nieuwe website livegang: Managed Cloud Hosting & .nl domein All-in (€ 150,-/jr). Incl. 30 min. service per jaar.",
        invoices: [
            {
                invoiceNumber: "2026-002",
                description: "Website updaten (2.5u)",
                invoiceDate: "2026-04-08",
                dueDate: "2026-04-22",
                amountExcl: 75.00,
                amountVat: 15.75,
                amountIncl: 90.75,
                status: "paid",
                items: [
                    { name: "Website updaten", desc: "", qty: 2.5, price: 30.00 }
                ]
            },
            {
                invoiceNumber: "2026-009",
                description: "Nieuwe website (7u)",
                invoiceDate: "2026-07-22",
                dueDate: "2026-08-05",
                amountExcl: 245.00,
                amountVat: 51.45,
                amountIncl: 296.45,
                status: "paid",
                items: [
                    { name: "Nieuwe website", desc: "in uren", qty: 7, price: 35.00 }
                ]
            },
            {
                invoiceNumber: "2026-012",
                description: "Website aanpassingen Q2 2026 (9u)",
                invoiceDate: "2026-10-08",
                dueDate: "2026-10-22",
                amountExcl: 315.00,
                amountVat: 66.15,
                amountIncl: 381.15,
                status: "paid",
                items: [
                    { name: "Website aanpassingen Q2 2026", desc: "per uur", qty: 9, price: 35.00 }
                ]
            }
        ],
        latestInvoice: {
            number: "2026-012",
            date: "08-10-2026",
            status: "Betaald",
            totalExcl: 315.00,
            items: [
                { name: "Website aanpassingen Q2 2026", desc: "per uur", qty: 9, price: 35.00 }
            ]
        }
    },
    "liviandesign.nl": {
        clientName: "Livian Design (Lianne Steinfelder)",
        relatieId: 1,
        kvk: "98849794",
        aliases: ["livian design", "livian", "lianne", "steinfelder", "liviandesign.nl"],
        currentPlanName: "Eenmalig Maatwerk (Rustend)",
        currentPlanId: "none",
        recommendedPlanId: "none",
        recommendedReason: "Eenmalig project (software realisatie). Geen potentie / geen doorlopend abonnement vereist, tenzij ze zelf weer contact opneemt.",
        invoices: [
            {
                invoiceNumber: "2026-001",
                description: "Software realisatie",
                invoiceDate: "2026-03-24",
                dueDate: "2026-04-07",
                amountExcl: 50.00,
                amountVat: 10.50,
                amountIncl: 60.50,
                status: "paid",
                items: [
                    { name: "Software", desc: "realisatie", qty: 1, price: 50.00 }
                ]
            }
        ],
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
        aliases: ["besseling", "besseling installatietechniek", "besselinginstallatietechniek.nl"],
        currentPlanName: "In Ontwikkeling (Fase 4)",
        currentPlanId: "managed_nl",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Bedrijfswebsite: Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr) bij oplevering. Incl. NVMe hosting, SSL & 30 min. service.",
        invoices: [],
        latestInvoice: null
    },
    "arnolddesign.nl": {
        clientName: "Arnold Design (Arnold Doornbos)",
        aliases: ["arnold design", "arnold", "arnold doornbos", "arnolddesign.nl"],
        currentPlanName: "Design & AI Scrape Shield (Fase 3)",
        currentPlanId: "transition_2027_loyalty",
        recommendedPlanId: "transition_2027_loyalty",
        recommendedReason: "Trouwe Klant Overgangstarief 2027: € 95,- voor 2027 (per 2028 standaard € 150,-/jr). Incl. atelier portfolio hosting, AI shield & 30 min. service.",
        invoices: [
            {
                invoiceNumber: "2026-011",
                description: "Domein & hosting verlengen",
                invoiceDate: "2026-09-23",
                dueDate: "2026-10-07",
                amountExcl: 22.00,
                amountVat: 4.62,
                amountIncl: 26.62,
                status: "paid",
                items: [
                    { name: "Domein verlengen", desc: "per jaar", qty: 1, price: 10.00 },
                    { name: "Domein verlengen", desc: "per maand", qty: 12, price: 1.00 }
                ]
            }
        ],
        latestInvoice: {
            number: "2026-011",
            date: "23-09-2026",
            status: "Betaald",
            totalExcl: 22.00,
            items: [
                { name: "Domein verlengen", desc: "per jaar", qty: 1, price: 10.00 },
                { name: "Domein verlengen", desc: "per maand", qty: 12, price: 1.00 }
            ]
        }
    },
    "vanderplaats.nl": {
        clientName: "VAN DER PLAATS (Gerard Klusser)",
        aliases: ["van der plaats", "gerard klusser", "vanderplaats.nl"],
        currentPlanName: "In Ontwikkeling (Fase 4)",
        currentPlanId: "managed_nl",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Klussersbedrijf website: Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr).",
        invoices: [],
        latestInvoice: null
    },
    "capybaraculture.com": {
        clientName: "Capybara Culture",
        aliases: ["capybara", "capybara culture", "capybaraculture.com"],
        currentPlanName: "Eigen Project Allard (Vimexx intern)",
        currentPlanId: "internal_project",
        recommendedPlanId: "none",
        recommendedReason: "Eigen intern project van Allard: geen CRM hostingabonnement vereist. Directe factuur van Vimexx registrar wordt intern direct doorgestuurd/doorbelast naar dit project.",
        invoices: [],
        latestInvoice: null
    },
    "naaiatelier-willa.nl": {
        clientName: "Naaiatelier Willa (Willeke)",
        aliases: ["naaiatelier willa", "willa", "willeke", "naaiatelier-willa.nl"],
        currentPlanName: "MKB Portfolio & Atelier",
        currentPlanId: "transition_2027_loyalty",
        recommendedPlanId: "transition_2027_loyalty",
        recommendedReason: "Trouwe Klant Overgangstarief 2027: € 95,- voor 2027 (per 2028 standaard € 150,-/jr). Incl. atelier website hosting & 30 min. service.",
        invoices: [
            {
                invoiceNumber: "2026-010",
                description: "Domein & hosting verlengen",
                invoiceDate: "2026-09-23",
                dueDate: "2026-10-07",
                amountExcl: 22.00,
                amountVat: 4.62,
                amountIncl: 26.62,
                status: "paid",
                items: [
                    { name: "Domein verlengen", desc: "per jaar", qty: 1, price: 10.00 },
                    { name: "Hosting verlengen", desc: "per maand", qty: 12, price: 1.00 }
                ]
            }
        ],
        latestInvoice: {
            number: "2026-010",
            date: "23-09-2026",
            status: "Betaald",
            totalExcl: 22.00,
            items: [
                { name: "Domein verlengen", desc: "per jaar", qty: 1, price: 10.00 },
                { name: "Hosting verlengen", desc: "per maand", qty: 12, price: 1.00 }
            ]
        }
    },
    "pomppop.nl": {
        clientName: "PompPop Festival (Stichting PompPop)",
        aliases: ["pomppop", "stichting pomppop", "pomppop.nl"],
        currentPlanName: "Festival Platform & Ticket Hub",
        currentPlanId: "managed_nl",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Evenementen platform: Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr).",
        invoices: [],
        latestInvoice: null
    },
    "qolipa.nl": {
        clientName: "Qolipa Webshop & Brand",
        aliases: ["qolipa", "tixie", "qolipa.nl"],
        currentPlanName: "Eigen Project Allard (Vimexx intern)",
        currentPlanId: "internal_project",
        recommendedPlanId: "none",
        recommendedReason: "Eigen intern project van Allard: geen CRM hostingabonnement vereist. Directe factuur van Vimexx registrar wordt intern direct doorgestuurd/doorbelast naar dit project.",
        invoices: [],
        latestInvoice: null
    },
    "justin.nl": {
        clientName: "Justin Web Projects",
        aliases: ["justin", "justin.nl"],
        currentPlanName: "Nieuwe Lead (Fase 1)",
        currentPlanId: "none",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Bij oplevering: Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr).",
        invoices: [],
        latestInvoice: null
    },
    "creationaltfix.nl": {
        clientName: "Creation+Alt+Fix (Eigen Platform)",
        aliases: ["creation+alt+fix", "creation alt fix", "caf", "creationaltfix.nl"],
        currentPlanName: "In-House Cloud Infrastructuur",
        currentPlanId: "managed_multi",
        recommendedPlanId: "managed_multi",
        recommendedReason: "Interne AI tooling, CRM cluster & 12 domeinen beheer.",
        invoices: [],
        latestInvoice: null
    },
    "hbi.creationaltfix.nl": {
        clientName: "Home Buyer Intelligence (HBI)",
        aliases: ["home buyer intelligence", "hbi"],
        currentPlanName: "AI Tooling & Cloud Platform",
        currentPlanId: "managed_nl",
        recommendedPlanId: "managed_nl",
        recommendedReason: "Vastgoed AI analyse applicatie & cloud hosting.",
        invoices: [],
        latestInvoice: null
    }
};

/**
 * Returns bookkeeping and plan information for a given project.
 * Uses dynamic detection if no private record exists.
 */
export function getPiBoekhoudingInfo(p) {
    if (!p) return null;
    const name = (p.client || p.companyName || '').toLowerCase().trim();
    const cleanName = name.replace(/[^a-z0-9]/g, '');

    // Parse host and subpath cleanly
    const rawDomain = (p.domainName || p.domain || '').toLowerCase().trim();
    const cleanUrl = rawDomain.replace(/^https?:\/\//, '').replace(/^www\./, '');
    const [domHost, ...pathSegments] = cleanUrl.split('/');
    const domPath = pathSegments.join('/');
    const cleanDomHost = (domHost || '').replace(/[^a-z0-9.-]/g, '');
    const cleanPath = domPath.replace(/[^a-z0-9]/g, '');

    // Priority 1: Exact Domain or Subdomain Equality (Excluding generic shared domain)
    for (const [domainKey, data] of Object.entries(PI_BOEKHOUDING_CLIENT_DATA)) {
        if (domainKey === 'creationaltfix.nl') continue;
        if (cleanDomHost && (cleanDomHost === domainKey || cleanDomHost.endsWith('.' + domainKey))) {
            return data;
        }
    }

    // Priority 2: Staging path match or exact alias / client name match
    for (const [domainKey, data] of Object.entries(PI_BOEKHOUDING_CLIENT_DATA)) {
        if (domainKey === 'creationaltfix.nl') continue;

        // Path segment matches domain base (e.g. creationaltfix.nl/besselinginstallatietechniek/)
        const domainBase = domainKey.replace(/\.(nl|com)$/i, '');
        if (cleanPath && (cleanPath === domainBase || cleanPath.startsWith(domainBase))) {
            return data;
        }

        // Exact client name match
        const cName = data.clientName.toLowerCase();
        const cleanCName = cName.replace(/[^a-z0-9]/g, '');
        if (name && (name === cName || (cleanName.length >= 5 && cleanName === cleanCName))) {
            return data;
        }

        // Bounded alias matching (strictly exact, preventing substring leaks)
        if (Array.isArray(data.aliases)) {
            for (const alias of data.aliases) {
                const aLow = alias.toLowerCase().trim();
                const cleanA = aLow.replace(/[^a-z0-9]/g, '');
                if (cleanDomHost && cleanDomHost === aLow) return data;
                if (cleanPath && (cleanPath === cleanA || cleanPath.startsWith(cleanA))) return data;
                if (name && name === aLow) return data;
                if (cleanA.length >= 4 && cleanName && cleanName === cleanA) return data;
            }
        }
    }

    // Priority 3: Internal creation+alt+fix platform
    if (cleanDomHost === 'creationaltfix.nl' || cleanDomHost === 'hbi.creationaltfix.nl') {
        if (cleanDomHost === 'hbi.creationaltfix.nl' || cleanName.includes('hbi') || cleanName.includes('homebuyer')) {
            return PI_BOEKHOUDING_CLIENT_DATA['hbi.creationaltfix.nl'];
        }
        if (!cleanPath || cleanPath === 'caf' || cleanName.includes('creationaltfix')) {
            return PI_BOEKHOUDING_CLIENT_DATA['creationaltfix.nl'];
        }
    }

    // Dynamic detection based on TLD / domain
    let recPlanId = "managed_nl";
    let recReason = "Standaard advies: Managed Cloud Hosting & .nl Domein All-in (€ 150,-/jr excl. BTW).";

    if (p.domainTld === '.com' || cleanDomHost.endsWith('.com')) {
        recPlanId = "managed_com";
        recReason = "Advies voor .com domein: Managed Cloud Hosting & .com Domein All-in (€ 165,-/jr excl. BTW).";
    } else if (p.domainTld && p.domainTld !== '.nl' && !cleanDomHost.endsWith('.nl')) {
        recPlanId = "managed_custom";
        recReason = "Advies voor internationaal/speciaal TLD: Managed Cloud Hosting (€ 175,-/jr excl. BTW).";
    }

    return {
        clientName: p.client || p.companyName || "Nieuwe Klant",
        currentPlanName: "Nog geen actief abonnement",
        currentPlanId: "none",
        recommendedPlanId: recPlanId,
        recommendedReason: recReason,
        invoices: [],
        latestInvoice: null
    };
}

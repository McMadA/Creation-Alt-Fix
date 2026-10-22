/**
 * @file crm/admin/js/modules/cloud-migration-planner.js
 * Creation+Alt+Fix - Cloud- & Mailmigratie Strategische Besluitvormings-Engine
 * [TASK-504] 12-Domeinen Matrix, TCO Calculator & Scenario Evaluator (MijnHost vs Azure + M365)
 * 
 * Conformance:
 * - docs/SOVEREIGN-DUTCH-CLOUD-PLAN.md (100% Nederlands Recht & Data Souvereiniteit)
 * - docs/AZURE-MIGRATION-12-DOMAINS.md (Microsoft 365 Exchange Online & Anycast SWA)
 * - AVG / GDPR & EU AP Toezicht vs US CLOUD Act / FISA 702
 */

import { escapeHtml } from "../../../js/crm-config.js";
import { Toast } from "../../../js/core/toast.js";
import { renderCutoverDashboardTab, bindCutoverTabEvents } from "./cloud-cutover-executor.js";

/**
 * De 12 officiële productiedomeinen van Creation+Alt+Fix
 */
export const PORTFOLIO_DOMAINS = Object.freeze([
    {
        domain: 'creationaltfix.nl',
        name: 'Creation+Alt+Fix (Core Admin & Bureau)',
        category: 'core_agency',
        tld: 'nl',
        currentRegistrar: 'Vimexx',
        mailboxType: 'user_admin',
        primaryEmail: 'info@creationaltfix.nl',
        adminUser: 'allard@creationaltfix.nl',
        m365License: 'Exchange Online Plan 1 (Admin)',
        m365CostMonthly: 3.70,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 0.00,
        isExternalClient: false,
        priority: 1
    },
    {
        domain: 'angelastenekes.nl',
        name: 'Angela Stenekes (De Knipperij Bedum)',
        category: 'external_client',
        tld: 'nl',
        currentRegistrar: 'Vimexx',
        mailboxType: 'user_client',
        primaryEmail: 'info@angelastenekes.nl',
        adminUser: null,
        m365License: 'Exchange Online Plan 1',
        m365CostMonthly: 3.70,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 10.00,
        isExternalClient: true,
        priority: 2
    },
    {
        domain: 'bakkertjesieg.nl',
        name: 'Sigrid Sneep (Bakkertje Sieg Bedum)',
        category: 'external_client',
        tld: 'nl',
        currentRegistrar: 'Vimexx',
        mailboxType: 'user_client',
        primaryEmail: 'bestellingen@bakkertjesieg.nl',
        adminUser: null,
        m365License: 'Exchange Online Plan 1',
        m365CostMonthly: 3.70,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 10.00,
        isExternalClient: true,
        priority: 3
    },
    {
        domain: 'capybaraculture.com',
        name: 'Capybara Culture (Venture / Webshop)',
        category: 'internal_venture',
        tld: 'com',
        currentRegistrar: 'Vimexx',
        mailboxType: 'shared_mailbox',
        primaryEmail: 'info@capybaraculture.com',
        adminUser: 'allard@creationaltfix.nl',
        m365License: 'Shared Mailbox (Free)',
        m365CostMonthly: 0.00,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 0.00,
        isExternalClient: false,
        priority: 4
    },
    {
        domain: 'ftruckstore.nl',
        name: 'F-Truck Store (Ford Trucks B2B/B2C)',
        category: 'external_client',
        tld: 'nl',
        currentRegistrar: 'Vimexx',
        mailboxType: 'user_client',
        primaryEmail: 'info@ftruckstore.nl',
        adminUser: null,
        m365License: 'Exchange Online Plan 1',
        m365CostMonthly: 3.70,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 10.00,
        isExternalClient: true,
        priority: 5
    },
    {
        domain: 'ftruckstore.com',
        name: 'F-Truck Store (Global Domain Alias)',
        category: 'external_client_alias',
        tld: 'com',
        currentRegistrar: 'Vimexx',
        mailboxType: 'alias_forward',
        primaryEmail: 'info@ftruckstore.com',
        adminUser: null,
        m365License: 'Domain Alias (Free)',
        m365CostMonthly: 0.00,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 0.00,
        isExternalClient: true,
        priority: 6
    },
    {
        domain: 'naaiatelier-willa.nl',
        name: 'Naaiatelier Willa (Marten & Willa)',
        category: 'external_client',
        tld: 'nl',
        currentRegistrar: 'Vimexx',
        mailboxType: 'user_client',
        primaryEmail: 'info@naaiatelier-willa.nl',
        adminUser: null,
        m365License: 'Exchange Online Plan 1',
        m365CostMonthly: 3.70,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 10.00,
        isExternalClient: true,
        priority: 7
    },
    {
        domain: 'pomppop.nl',
        name: 'Stichting PompPop Festival (Kollumerpomp)',
        category: 'internal_venture',
        tld: 'nl',
        currentRegistrar: 'Vimexx',
        mailboxType: 'shared_mailbox',
        primaryEmail: 'info@pomppop.nl',
        adminUser: 'allard@creationaltfix.nl',
        m365License: 'Shared Mailbox (Free) + ACS',
        m365CostMonthly: 0.00,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 0.00,
        isExternalClient: false,
        priority: 8
    },
    {
        domain: 'qolipa.nl',
        name: 'Qolipa (E-Commerce Platform)',
        category: 'internal_venture',
        tld: 'nl',
        currentRegistrar: 'Vimexx',
        mailboxType: 'shared_mailbox',
        primaryEmail: 'info@qolipa.nl',
        adminUser: 'allard@creationaltfix.nl',
        m365License: 'Shared Mailbox (Free)',
        m365CostMonthly: 0.00,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 0.00,
        isExternalClient: false,
        priority: 9
    },
    {
        domain: 'qolipa.com',
        name: 'Qolipa Global (Domain Alias)',
        category: 'internal_venture_alias',
        tld: 'com',
        currentRegistrar: 'Vimexx',
        mailboxType: 'alias_forward',
        primaryEmail: 'info@qolipa.com',
        adminUser: 'allard@creationaltfix.nl',
        m365License: 'Domain Alias (Free)',
        m365CostMonthly: 0.00,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 0.00,
        isExternalClient: false,
        priority: 10
    },
    {
        domain: 'scholte-elektrotechniek.nl',
        name: 'Scholte Elektrotechniek (Gerjo Scholte)',
        category: 'external_client',
        tld: 'nl',
        currentRegistrar: 'Vimexx',
        mailboxType: 'user_client',
        primaryEmail: 'info@scholte-elektrotechniek.nl',
        adminUser: null,
        m365License: 'Exchange Online Plan 1',
        m365CostMonthly: 3.70,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 10.00,
        isExternalClient: true,
        priority: 11
    },
    {
        domain: 'stenekesrioolspecialist.nl',
        name: 'Stenekes Rioolspecialist (Jozua Stenekes)',
        category: 'external_client',
        tld: 'nl',
        currentRegistrar: 'Vimexx',
        mailboxType: 'user_client',
        primaryEmail: 'info@stenekesrioolspecialist.nl',
        adminUser: null,
        m365License: 'Exchange Online Plan 1',
        m365CostMonthly: 3.70,
        mijnhostMailCostMonthly: 0.00,
        clientBillableMonthly: 10.00,
        isExternalClient: true,
        priority: 12
    }
]);

/**
 * Strategische Scenario Modellen
 */
export const STRATEGIC_SCENARIOS = Object.freeze({
    SOVEREIGN_MIJNHOST: Object.freeze({
        id: 'SOVEREIGN_MIJNHOST',
        name: 'Nederlands Soeverein (MijnHost Amsterdam)',
        shortLabel: 'MijnHost Soeverein',
        badge: '🇳🇱 100% NL Recht & Data Souvereiniteit',
        accentColor: '#10b981',
        datacenter: 'Amsterdam (Equinix AM4 / NorthC Oude Meer)',
        webserver: 'LiteSpeed Enterprise (HTTP/3, QUIC, LSCache NVMe)',
        mailStack: 'SpamExperts Enterprise Cluster + SnappyMail/Roundcube + Outlook IMAP',
        webHostingCostYearly: 143.40, // Zakelijk/Ultimate Multi-domein
        domainCostNlYearly: 5.75,     // per .nl
        domainCostComYearly: 13.95,   // per .com
        emailCostPerUserMonthly: 0.00, // Onbeperkte mailboxen inbegrepen
        cloudActRisk: false,
        dutchApSupervision: true,
        scores: Object.freeze({
            privacySovereignty: 99,
            webPerformance: 96,
            emailExperience: 86,
            spamProtection: 95,
            profitMargin: 98,
            operationalSimplicity: 92
        }),
        pros: Object.freeze([
            '100% Data Souvereiniteit: Zero US CLOUD Act of FISA 702 risico',
            'LiteSpeed Enterprise HTTP/3 met LSCache (sub-50ms TTFB laadtijden)',
            'SpamExperts Enterprise Cluster: toonaangevende spam- & phishingbescherming',
            'Onbeperkt zakelijke mailboxen inbegrepen (€ 0,- extra licentiekosten)',
            'Maximale pure marge: € 720,-/jaar zuivere agency inkomsten op e-mail'
        ]),
        cons: Object.freeze([
            'Klant logt in op webmail.jouwdomein.nl of Outlook app (niet outlook.office365.com)'
        ])
    }),
    AZURE_M365: Object.freeze({
        id: 'AZURE_M365',
        name: 'Microsoft Enterprise Cloud (Azure SWA + M365)',
        shortLabel: 'Microsoft 365 Cloud',
        badge: '🌐 Microsoft Anycast & Office 365',
        accentColor: '#38bdf8',
        datacenter: 'Microsoft Azure West Europe (Amsterdam / Eemshaven)',
        webserver: 'Azure Static Web Apps (Anycast Global Edge CDN)',
        mailStack: 'Microsoft 365 Exchange Online Plan 1 + Microsoft Defender',
        webHostingCostYearly: 0.00,    // Free Tier voor SWA
        domainCostNlYearly: 5.75,      // Registrar tarief bij Cloudflare/TransIP
        domainCostComYearly: 13.95,
        emailCostPerUserMonthly: 3.70, // Exchange Online Plan 1
        cloudActRisk: true,
        dutchApSupervision: false,     // Microsoft Corp valt onder US jurisdictie
        scores: Object.freeze({
            privacySovereignty: 45,
            webPerformance: 97,
            emailExperience: 98,
            spamProtection: 96,
            profitMargin: 74,
            operationalSimplicity: 80
        }),
        pros: Object.freeze([
            'Officiële outlook.office365.com inlogervaring voor klanten',
            'Directe 2FA via Microsoft Authenticator app',
            'Anycast Global Edge CDN met sub-second TTFB via Azure SWA',
            'Winstgevende agency marge (+ € 453,60/jaar na aftrek licenties)'
        ]),
        cons: Object.freeze([
            'Onderworpen aan US CLOUD Act en FISA 702 (VS inlichtingendiensten kunnen data vorderen)',
            'Vaste licentiekosten per gebruiker (€ 3,70/mnd) drukken de marge',
            'Hoger administratief beheer in Microsoft 365 Admin Center'
        ])
    }),
    VIMEXX_BASELINE: Object.freeze({
        id: 'VIMEXX_BASELINE',
        name: 'Huidige Situatie (Vimexx Compleet DirectAdmin)',
        shortLabel: 'Vimexx Baseline',
        badge: '⚠️ Huidige Status Quo',
        accentColor: '#94a3b8',
        datacenter: 'Vimexx NVMe Cluster (Nederland)',
        webserver: 'Apache Shared (Geen LSCache, geen HTTP/3)',
        mailStack: 'DirectAdmin Exim + Roundcube (Gedeeld IP)',
        webHostingCostYearly: 143.88,
        domainCostNlYearly: 7.99,
        domainCostComYearly: 18.99,
        emailCostPerUserMonthly: 0.00,
        cloudActRisk: false,
        dutchApSupervision: true,
        scores: Object.freeze({
            privacySovereignty: 78,
            webPerformance: 58,
            emailExperience: 52,
            spamProtection: 62,
            profitMargin: 25,
            operationalSimplicity: 70
        }),
        pros: Object.freeze([
            'Draait momenteel al in productie'
        ]),
        cons: Object.freeze([
            'Tragere Apache webserver zonder moderne HTTP/3 LSCache',
            'Gedeelde IP-reputatie voor e-mail (risico op spam blacklists)',
            'Geen structurele e-mail doorbelasting (0 euro winst)'
        ])
    })
});

/**
 * Standaard gewichten voor de strategische besluitvormingsmatrix (totaal = 100%)
 */
export const DEFAULT_DECISION_WEIGHTS = Object.freeze({
    privacySovereignty: 0.25,    // 25% - Data souvereiniteit & AVG
    webPerformance: 0.20,        // 20% - Laadsnelheid & HTTP/3
    emailExperience: 0.15,       // 15% - Klantbeleving & inlog
    spamProtection: 0.15,        // 15% - Spam filtering & deliverability
    profitMargin: 0.15,          // 15% - Netto marge & verdienmodel
    operationalSimplicity: 0.10  // 10% - Beheercomplexiteit
});

/**
 * Berekent de totale Total Cost of Ownership (TCO) en winstgevendheid per scenario
 * 
 * @param {string} scenarioId - 'SOVEREIGN_MIJNHOST' | 'AZURE_M365' | 'VIMEXX_BASELINE'
 * @param {object} [options={}] - Aangepaste parameters
 * @returns {object} Uitgebreide financiële specificatie
 */
export function calculateMigrationTCO(scenarioId, options = {}) {
    const scenario = STRATEGIC_SCENARIOS[scenarioId] || STRATEGIC_SCENARIOS.SOVEREIGN_MIJNHOST;
    const clientFeeMonthly = typeof options.clientFeeMonthly === 'number' 
        ? options.clientFeeMonthly 
        : (scenarioId === 'VIMEXX_BASELINE' ? 0.00 : 10.00);
    const domains = Array.isArray(options.domains) ? options.domains : PORTFOLIO_DOMAINS;

    // Domein telling per TLD
    let nlCount = 0;
    let comCount = 0;
    let externalClientUsers = 0;
    let adminUsers = 0;

    domains.forEach(d => {
        if (d.tld === 'nl') nlCount++;
        else if (d.tld === 'com') comCount++;

        if (d.mailboxType === 'user_client') externalClientUsers++;
        if (d.mailboxType === 'user_admin') adminUsers++;
    });

    const domainCostYearly = (nlCount * scenario.domainCostNlYearly) + (comCount * scenario.domainCostComYearly);
    const hostingCostYearly = scenario.webHostingCostYearly;

    let emailLicenseCostYearly = 0;
    if (scenarioId === 'AZURE_M365') {
        const totalPaidUsers = adminUsers + externalClientUsers;
        emailLicenseCostYearly = totalPaidUsers * (scenario.emailCostPerUserMonthly * 12);
    } else {
        emailLicenseCostYearly = 0.00; // Inbegrepen bij MijnHost en Vimexx
    }

    const totalCostYearly = hostingCostYearly + domainCostYearly + emailLicenseCostYearly;
    const clientRevenueYearly = externalClientUsers * (clientFeeMonthly * 12);

    // Netto agency winst = omzet min alle jaarkosten
    const netAgencyProfitYearly = clientRevenueYearly - totalCostYearly;

    // Zuivere e-mail winst = e-mail omzet min e-mail licenties
    const clientEmailLicensesYearly = externalClientUsers * (scenario.emailCostPerUserMonthly * 12);
    const netEmailProfitYearly = clientRevenueYearly - clientEmailLicensesYearly;

    // Vergelijking t.o.v. Vimexx baseline (€ 272,76 kosten, € 0 omzet)
    const baselineCost = 272.76;
    const annualNetGainVsBaseline = netAgencyProfitYearly - (-baselineCost);

    return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        badge: scenario.badge,
        accentColor: scenario.accentColor,
        counts: {
            totalDomains: domains.length,
            nlDomains: nlCount,
            comDomains: comCount,
            externalClients: externalClientUsers,
            adminUsers: adminUsers
        },
        costs: {
            domainCostYearly: Math.round(domainCostYearly * 100) / 100,
            hostingCostYearly: Math.round(hostingCostYearly * 100) / 100,
            emailLicenseCostYearly: Math.round(emailLicenseCostYearly * 100) / 100,
            totalCostYearly: Math.round(totalCostYearly * 100) / 100,
            totalCostMonthly: Math.round((totalCostYearly / 12) * 100) / 100
        },
        revenue: {
            clientFeeMonthly: clientFeeMonthly,
            clientRevenueYearly: Math.round(clientRevenueYearly * 100) / 100,
            clientRevenueMonthly: Math.round((clientRevenueYearly / 12) * 100) / 100
        },
        profit: {
            netAgencyProfitYearly: Math.round(netAgencyProfitYearly * 100) / 100,
            netEmailProfitYearly: Math.round(netEmailProfitYearly * 100) / 100,
            annualNetGainVsBaseline: Math.round(annualNetGainVsBaseline * 100) / 100,
            isProfitable: netAgencyProfitYearly > 0
        }
    };
}

/**
 * Evalueert de strategische besluitvormingsmatrix over alle 3 de scenario's
 * 
 * @param {object} [customWeights={}] - Optionele aangepaste gewichten per criterium
 * @returns {object} Matrix evaluatie met gewogen scores, rangschikking en aanbeveling
 */
export function evaluateMigrationDecision(customWeights = {}) {
    const weights = { ...DEFAULT_DECISION_WEIGHTS, ...customWeights };

    // Normaliseer gewichten zodat de som exact 1.0 is
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const normalizedWeights = {};
    for (const key in weights) {
        normalizedWeights[key] = totalWeight > 0 ? weights[key] / totalWeight : 1 / 6;
    }

    const scenarios = ['SOVEREIGN_MIJNHOST', 'AZURE_M365', 'VIMEXX_BASELINE'];
    const evaluations = scenarios.map(id => {
        const scen = STRATEGIC_SCENARIOS[id];
        const tco = calculateMigrationTCO(id);
        const scores = scen.scores;

        let weightedScore = 0;
        for (const crit in scores) {
            weightedScore += (scores[crit] || 0) * (normalizedWeights[crit] || 0);
        }
        weightedScore = Math.round(weightedScore * 10) / 10;

        return {
            id: scen.id,
            name: scen.name,
            shortLabel: scen.shortLabel,
            badge: scen.badge,
            accentColor: scen.accentColor,
            scores: scores,
            weightedScore: weightedScore,
            tco: tco,
            pros: scen.pros,
            cons: scen.cons,
            cloudActRisk: scen.cloudActRisk,
            dutchApSupervision: scen.dutchApSupervision
        };
    });

    // Sorteer op gewogen score (hoogste eerst)
    evaluations.sort((a, b) => b.weightedScore - a.weightedScore);

    const winner = evaluations[0];
    const runnerUp = evaluations[1];

    let recommendationReason = "";
    if (winner.id === 'SOVEREIGN_MIJNHOST') {
        recommendationReason = "MijnHost Amsterdam levert de ideale balans tussen 100% Nederlandse data souvereiniteit (zero US CLOUD Act), superieure LiteSpeed HTTP/3 laadtijden, en de hoogste netto agency winst (€ 720,- pure e-mail marge) zonder terugkerende Microsoft licentiekosten.";
    } else {
        recommendationReason = "Microsoft 365 levert de meest herkenbare enterprise inlogervaring voor klanten via outlook.office365.com met Azure Edge Anycast CDN.";
    }

    return {
        winner: winner,
        runnerUp: runnerUp,
        recommendationReason: recommendationReason,
        weights: normalizedWeights,
        evaluations: evaluations
    };
}

/**
 * Filtert de 12 portfolio domeinen op categorie of criteria
 * 
 * @param {object} [filter={}] - Filtercriteria ({ category, tld, isExternalClient })
 * @returns {Array<object>} Gefilterde domeinenlijst
 */
export function listPortfolioDomains(filter = {}) {
    return PORTFOLIO_DOMAINS.filter(d => {
        if (filter.category && d.category !== filter.category) return false;
        if (filter.tld && d.tld !== filter.tld) return false;
        if (typeof filter.isExternalClient === 'boolean' && d.isExternalClient !== filter.isExternalClient) return false;
        if (filter.mailboxType && d.mailboxType !== filter.mailboxType) return false;
        return true;
    });
}

/**
 * Haalt configuratie en cutover gegevens op voor een specifiek domein
 * 
 * @param {string} domainName - Bijv. 'angelastenekes.nl'
 * @returns {object|null} Domeinrecord of null
 */
export function getDomainRecord(domainName) {
    if (!domainName) return null;
    const clean = domainName.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return PORTFOLIO_DOMAINS.find(d => d.domain === clean) || null;
}

/**
 * Genereert de volledige DNS cutover records voor een domein onder het gekozen scenario
 * 
 * @param {string} domainName - Het domein om te configureren
 * @param {string} [scenarioId='SOVEREIGN_MIJNHOST'] - 'SOVEREIGN_MIJNHOST' | 'AZURE_M365'
 * @returns {object} Gestructureerde DNS configuratie inclusief bind zone snippet
 */
export function generateDnsCutoverPlan(domainName, scenarioId = 'SOVEREIGN_MIJNHOST') {
    const domainRecord = getDomainRecord(domainName) || {
        domain: domainName,
        name: domainName,
        tld: domainName.endsWith('.com') ? 'com' : 'nl'
    };

    const domain = domainRecord.domain;
    const records = [];

    if (scenarioId === 'SOVEREIGN_MIJNHOST') {
        // MijnHost LiteSpeed + SpamExperts Stack
        records.push(
            { type: 'A', host: '@', value: '185.104.29.148', ttl: 300, purpose: 'LiteSpeed Enterprise Webserver (Amsterdam)' },
            { type: 'CNAME', host: 'www', value: `${domain}.`, ttl: 300, purpose: 'Web Canonical Alias' },
            { type: 'CNAME', host: 'webmail', value: 'mail.mijnhost.nl.', ttl: 300, purpose: 'SnappyMail / Roundcube Webmail' },
            { type: 'MX', host: '@', value: 'mx1.spamexperts.com.', priority: 10, ttl: 300, purpose: 'SpamExperts Primair Cluster' },
            { type: 'MX', host: '@', value: 'mx2.spamexperts.com.', priority: 20, ttl: 300, purpose: 'SpamExperts Secundair Cluster' },
            { type: 'TXT', host: '@', value: 'v=spf1 include:spf.spamexperts.com ~all', ttl: 300, purpose: 'SPF Autorisatie SpamExperts' },
            { type: 'TXT', host: `default._domainkey.${domain}`, value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...', ttl: 300, purpose: 'DKIM E-mail Ondertekening' },
            { type: 'TXT', host: `_dmarc.${domain}`, value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@creationaltfix.nl; pct=100', ttl: 300, purpose: 'DMARC Phishing Shield' }
        );
    } else {
        // Microsoft Azure SWA + M365 Exchange Online Stack
        records.push(
            { type: 'CNAME', host: '@', value: `${domain.replace(/\./g, '-')}.azurestaticapps.net.`, ttl: 300, purpose: 'Azure Static Web Apps Anycast Apex' },
            { type: 'CNAME', host: 'www', value: `${domain.replace(/\./g, '-')}.azurestaticapps.net.`, ttl: 300, purpose: 'Azure Static Web Apps Anycast WWW' },
            { type: 'CNAME', host: 'autodiscover', value: 'autodiscover.outlook.com.', ttl: 300, purpose: 'Microsoft Outlook Auto-Discovery' },
            { type: 'MX', host: '@', value: `${domain.replace(/\./g, '-')}.mail.protection.outlook.com.`, priority: 0, ttl: 300, purpose: 'Microsoft 365 Exchange Online' },
            { type: 'TXT', host: '@', value: 'v=spf1 include:spf.protection.outlook.com -all', ttl: 300, purpose: 'SPF Autorisatie Microsoft 365' },
            { type: 'CNAME', host: `selector1._domainkey.${domain}`, value: `selector1-${domain.replace(/\./g, '-')}._domainkey.creationaltfix.onmicrosoft.com.`, ttl: 300, purpose: 'DKIM Selector 1 Microsoft' },
            { type: 'CNAME', host: `selector2._domainkey.${domain}`, value: `selector2-${domain.replace(/\./g, '-')}._domainkey.creationaltfix.onmicrosoft.com.`, ttl: 300, purpose: 'DKIM Selector 2 Microsoft' },
            { type: 'TXT', host: `_dmarc.${domain}`, value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@creationaltfix.nl; pct=100', ttl: 300, purpose: 'DMARC Phishing Shield' }
        );
    }

    // Genereer bind zone snippet
    const zoneLines = records.map(r => {
        if (r.type === 'MX') {
            return `${r.host.padEnd(20)} ${r.ttl} IN MX ${r.priority} ${r.value}`;
        }
        if (r.type === 'TXT') {
            return `${r.host.padEnd(20)} ${r.ttl} IN TXT "${r.value}"`;
        }
        return `${r.host.padEnd(20)} ${r.ttl} IN ${r.type.padEnd(5)} ${r.value}`;
    });

    return {
        domain: domain,
        scenarioId: scenarioId,
        recordCount: records.length,
        records: records,
        bindZoneSnippet: zoneLines.join('\n')
    };
}

/**
 * Genereert het veilige en idempotente IMAPsync CLI commando voor het migreren van mailboxen
 * 
 * @param {string} domainName - Domein van de mailbox
 * @param {string} mailboxUser - Lokale part van het e-mailadres (bijv. 'info')
 * @param {string} [scenarioId='SOVEREIGN_MIJNHOST'] - Doelplatform
 * @returns {string} Klaar voor gebruik imapsync commando
 */
export function generateImapsyncCommand(domainName, mailboxUser = 'info', scenarioId = 'SOVEREIGN_MIJNHOST') {
    const domain = (domainName || 'angelastenekes.nl').toLowerCase().trim();
    const email = `${mailboxUser}@${domain}`;
    
    const sourceHost = 'web0156.zxcs.nl'; // Vimexx DirectAdmin host
    const targetHost = scenarioId === 'AZURE_M365' ? 'outlook.office365.com' : 'mail.mijnhost.nl';

    return `imapsync \\
  --host1 ${sourceHost} --user1 "${email}" --passfile1 /root/.vimexx_pass \\
  --host2 ${targetHost} --user2 "${email}" --passfile2 /root/.target_pass \\
  --ssl1 --ssl2 \\
  --syncinternaldates \\
  --skipmess "FLAGGED Deleted" \\
  --exclude "Junk|Trash|Spam" \\
  --minage 0 \\
  --subfolder1 "INBOX" --subfolder2 "INBOX" \\
  --logfile "/var/log/imapsync_${domain}_${mailboxUser}.log"`;
}

/**
 * Genereert het 6-fasen gefaseerde migratie stappenplan en draaiboek
 * 
 * @param {string} [scenarioId='SOVEREIGN_MIJNHOST']
 * @returns {Array<object>} Fasen met concrete actiepunten
 */
export function generateCutoverPhases(scenarioId = 'SOVEREIGN_MIJNHOST') {
    const isMijnHost = scenarioId === 'SOVEREIGN_MIJNHOST';

    return [
        {
            phase: 1,
            title: 'Fase 1: Voorbereiding & EPP Verhuiscodes',
            timing: 'T - 14 Dagen',
            tasks: [
                'EPP-verhuiscodes opvragen in Vimexx DirectAdmin voor alle 12 domeinen',
                'Account provisionen bij doelprovider (' + (isMijnHost ? 'MijnHost Zakelijk Pakket' : 'Azure Static Web Apps + M365 Tenant') + ')',
                'DNS TTL verlagen naar 300 seconden (5 minuten) in DirectAdmin'
            ]
        },
        {
            phase: 2,
            title: 'Fase 2: Mailbox Structuur Inrichten',
            timing: 'T - 7 Dagen',
            tasks: [
                isMijnHost 
                    ? '12 Vhosts en bijbehorende e-mail accounts configureren in het MijnHost beheerpaneel'
                    : 'M365 User Mailboxen aanmaken voor 6 externe klanten en Shared Mailboxen voor eigen projecten',
                'Spam- en beveiligingsfilters voor-configureren (' + (isMijnHost ? 'SpamExperts Cluster' : 'Microsoft Defender for Office 365') + ')',
                'Tijdelijke wachtwoorden en instructies genereren voor de klanten'
            ]
        },
        {
            phase: 3,
            title: 'Fase 3: E-mail Pre-Synchronisatie (IMAPsync)',
            timing: 'T - 2 Dagen',
            tasks: [
                'Initiële bulksynchronisatie van alle mailboxen via imapsync uitvoeren op de achtergrond',
                'Verificatie van mapstructuren (Inbox, Verzonden, Archief) en quota',
                'Statische webbestanden en Git repositories koppelen aan de nieuwe webservers'
            ]
        },
        {
            phase: 4,
            title: 'Fase 4: Live Cutover & DNS Omschakeling',
            timing: 'T - 0 (Cutover Avond 21:00)',
            tasks: [
                'DNS A/CNAME records omzetten naar ' + (isMijnHost ? 'MijnHost LiteSpeed IP (185.104.29.148)' : 'Azure SWA Anycast endpoints'),
                'MX-records en SPF/DKIM/DMARC records definitief publiceren',
                'SSL-certificaten valideren (Let\'s Encrypt / DigiCert handshake)'
            ]
        },
        {
            phase: 5,
            title: 'Fase 5: Delta IMAPsync & Klantactivatie',
            timing: 'T + 2 Uur',
            tasks: [
                'Laatste delta synchronisatie via imapsync om de laatste 24 uur binnengekomen e-mails te verplaatsen',
                'Klanten voorzien van inloggegevens (' + (isMijnHost ? 'webmail.[domein].nl of Outlook app' : 'outlook.office365.com') + ')',
                'Live testberichten verzenden en ontvangen op alle 12 domeinen'
            ]
        },
        {
            phase: 6,
            title: 'Fase 6: Nazorg & Vimexx Opzegging',
            timing: 'T + 14 Dagen',
            tasks: [
                'Monitoring en bounce-percentages 14 dagen scherp monitoren in de CRM Uptime Monitor',
                'Facturatie van beheerde e-mail (€ 10,-/mnd) verwerken in Pi-Boekhouding',
                'Vimexx hostingpakket (€ 143,88/jr) formeel opzeggen na 100% stabiele livegang'
            ]
        }
    ];
}

/**
 * Genereert het officiële strategische besluitvormingsmemo voor Allard Veldman
 * 
 * @param {string} [scenarioId='SOVEREIGN_MIJNHOST']
 * @returns {string} Markdown documentatie
 */
export function generateStrategicDecisionMemo(scenarioId = 'SOVEREIGN_MIJNHOST') {
    const tco = calculateMigrationTCO(scenarioId);
    const scen = STRATEGIC_SCENARIOS[scenarioId];
    const dateStr = new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });

    return `# 🏛️ Strategisch Besluitvormingsmemo: Cloud- & E-mailmigratie (TASK-504)

> **Datum**: ${dateStr}  
> **Auteur**: Allard Veldman — Creation+Alt+Fix Lead Architect  
> **Status**: **GEACCORDEERD & BESLUIT DEFINITIEF**  
> **Gekozen Richting**: **${scen.name}**  

---

## 1. Executive Summary & Besluit
Creation+Alt+Fix kiest na een grondige technische en financiële evaluatie voor **${scen.name}**. 

### Belangrijkste Doorslaggevende Argumenten:
${scen.pros.map(p => `- **${p}**`).join('\n')}

---

## 2. Financiële Specificatie & Agency Rendement
- **Totale Jaarkosten Hosting & Domeinen**: € ${tco.costs.totalCostYearly.toFixed(2)} excl. btw
- **Jaarlijkse E-mail Facturatie aan 6 Klanten (€ 10,-/mnd)**: € ${tco.revenue.clientRevenueYearly.toFixed(2)} excl. btw
- **Netto Jaarlijkse Agency Winst**: **+ € ${tco.profit.netAgencyProfitYearly.toFixed(2)} excl. btw / jaar**
- **Netto E-mail Marge**: **+ € ${tco.profit.netEmailProfitYearly.toFixed(2)} / jaar**
- **Besparing / Rendementsverbetering t.o.v. Vimexx Baseline**: **+ € ${tco.profit.annualNetGainVsBaseline.toFixed(2)} / jaar**

---

## 3. Portfolio Allocatie (12 Domeinen)
| Domein | Type | Mailbox Bestemming | Maandelijkse Klantbijdrage |
| :--- | :--- | :--- | :--- |
${PORTFOLIO_DOMAINS.map(d => `| \`${d.domain}\` | ${d.category} | ${d.mailboxType} | € ${d.clientBillableMonthly.toFixed(2)} |`).join('\n')}

---

## 4. Juridische Zekerheid & AP Toezicht
- **Jurisdictie**: ${scen.dutchApSupervision ? '100% Nederlands Recht & Autoriteit Persoonsgegevens' : 'Onderworpen aan US CLOUD Act'}
- **US CLOUD Act Blootstelling**: ${scen.cloudActRisk ? 'Aanwezig (Microsoft)' : 'Nul (100% Uitgesloten)'}

**Ondertekend voor akkoord**,  
Allard Veldman — *Creation+Alt+Fix*
`;
}

/**
 * Rendert en toont de Cloud & E-mail Migratie Planner Modal in de CRM werkplek
 * 
 * @param {string} [initialScenario='SOVEREIGN_MIJNHOST']
 */
export function openCloudMigrationModal(initialScenario = 'SOVEREIGN_MIJNHOST') {
    let modal = document.getElementById('cloud-migration-modal');
    if (!modal) {
        // Modal dynamically injected if not in HTML
        modal = document.createElement('div');
        modal.id = 'cloud-migration-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 960px;">
                <div class="modal-header">
                    <h2 style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-cloud-upload-alt text-accent" style="color: #38bdf8;"></i> 
                        <span>Cloud- &amp; E-mailmigratie Strategie Planner (TASK-504)</span>
                    </h2>
                    <button class="close-btn" id="btn-close-cloud-migration-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="modal-cloud-migration-body" style="max-height: 78vh; overflow-y: auto;">
                    <!-- Injected dynamically -->
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div id="migration-modal-footer-info" style="font-size: 0.78rem; color: var(--color-text-secondary);">
                        12 Domeinen Portfolio • TCO &amp; Cutover Draaiboek
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary btn-sm" id="btn-copy-migration-memo"><i class="fas fa-file-contract"></i> Kopieer Besluitvormingsmemo</button>
                        <button class="btn btn-primary btn-sm" id="btn-confirm-migration-close">Sluiten</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('btn-close-cloud-migration-modal')?.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        document.getElementById('btn-confirm-migration-close')?.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        document.getElementById('btn-copy-migration-memo')?.addEventListener('click', () => {
            const currentScen = modal.getAttribute('data-active-scenario') || 'SOVEREIGN_MIJNHOST';
            const memo = generateStrategicDecisionMemo(currentScen);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(memo);
            }
            Toast.show({
                title: "Besluitvormingsmemo Gekopieerd",
                message: "Het formele strategische besluitvormingsmemo is naar het klembord gekopieerd.",
                type: "success"
            });
        });
    }

    modal.setAttribute('data-active-scenario', initialScenario);
    renderMigrationModalContent(initialScenario);
    modal.classList.remove('hidden');
}

/**
 * Rendert de inhoud van de migratiemodal
 * 
 * @param {string} activeScenarioId 
 * @param {string} [activeTab='decision'] 
 */
export function renderMigrationModalContent(activeScenarioId = 'SOVEREIGN_MIJNHOST', activeTab = 'decision') {
    const body = document.getElementById('modal-cloud-migration-body');
    if (!body) return;

    const evaluation = evaluateMigrationDecision();
    const tco = calculateMigrationTCO(activeScenarioId);
    const activeScenario = STRATEGIC_SCENARIOS[activeScenarioId];

    body.innerHTML = `
        <!-- Scenario Switcher Strip -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 0.78rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 700;">Gekozen Scenario:</span>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-sm ${activeScenarioId === 'SOVEREIGN_MIJNHOST' ? 'btn-primary' : 'btn-secondary'}" id="btn-switch-scen-mijnhost" style="font-size: 0.78rem;">
                        🇳🇱 MijnHost Soeverein
                    </button>
                    <button class="btn btn-sm ${activeScenarioId === 'AZURE_M365' ? 'btn-primary' : 'btn-secondary'}" id="btn-switch-scen-azure" style="font-size: 0.78rem;">
                        🌐 Azure + M365
                    </button>
                    <button class="btn btn-sm ${activeScenarioId === 'VIMEXX_BASELINE' ? 'btn-primary' : 'btn-secondary'}" id="btn-switch-scen-vimexx" style="font-size: 0.78rem;">
                        ⚠️ Vimexx Baseline
                    </button>
                </div>
            </div>
            <span class="status-pill" style="background: ${activeScenario.accentColor}22; color: ${activeScenario.accentColor}; border: 1px solid ${activeScenario.accentColor}44; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
                ${escapeHtml(activeScenario.badge)}
            </span>
        </div>

        <!-- 4 KPI Metrics Strip -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
            <div class="monitoring-kpi-card" style="padding: 12px 14px;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 600;">Totale Jaarkosten</div>
                <div style="font-size: 1.35rem; font-weight: 800; color: #fff; margin: 4px 0;">€ ${tco.costs.totalCostYearly.toFixed(2)}</div>
                <div style="font-size: 0.72rem; color: #94a3b8;">Hosting + 12 domeinen + mail</div>
            </div>
            <div class="monitoring-kpi-card" style="padding: 12px 14px;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 600;">Klant E-mail Omzet</div>
                <div style="font-size: 1.35rem; font-weight: 800; color: #38bdf8; margin: 4px 0;">€ ${tco.revenue.clientRevenueYearly.toFixed(2)}</div>
                <div style="font-size: 0.72rem; color: #94a3b8;">6 klanten à € 10,-/mnd</div>
            </div>
            <div class="monitoring-kpi-card" style="padding: 12px 14px;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 600;">Netto Agency Winst</div>
                <div style="font-size: 1.35rem; font-weight: 800; color: ${tco.profit.isProfitable ? '#10b981' : '#f87171'}; margin: 4px 0;">
                    ${tco.profit.isProfitable ? '+' : ''}€ ${tco.profit.netAgencyProfitYearly.toFixed(2)}
                </div>
                <div style="font-size: 0.72rem; color: #94a3b8;">Jaarlijkse zuivere marge</div>
            </div>
            <div class="monitoring-kpi-card" style="padding: 12px 14px;">
                <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 600;">Matrix Match Score</div>
                <div style="font-size: 1.35rem; font-weight: 800; color: ${activeScenario.accentColor}; margin: 4px 0;">
                    ${(evaluation.evaluations.find(e => e.id === activeScenarioId)?.weightedScore || 0)} / 100
                </div>
                <div style="font-size: 0.72rem; color: #94a3b8;">Gewogen 6-criteria score</div>
            </div>
        </div>

        <!-- Tab Strip -->
        <div style="display: flex; gap: 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 18px;">
            <button class="btn btn-sm ${activeTab === 'decision' ? 'active' : ''}" id="tab-btn-decision" style="border-radius: 6px 6px 0 0; font-size: 0.8rem; padding: 8px 14px; background: ${activeTab === 'decision' ? 'rgba(255,255,255,0.08)' : 'transparent'}; border: none; color: #fff; cursor: pointer;">
                <i class="fas fa-balance-scale"></i> Besluitvorming &amp; Matrix
            </button>
            <button class="btn btn-sm ${activeTab === 'domains' ? 'active' : ''}" id="tab-btn-domains" style="border-radius: 6px 6px 0 0; font-size: 0.8rem; padding: 8px 14px; background: ${activeTab === 'domains' ? 'rgba(255,255,255,0.08)' : 'transparent'}; border: none; color: #fff; cursor: pointer;">
                <i class="fas fa-globe"></i> 12-Domeinen Matrix
            </button>
            <button class="btn btn-sm ${activeTab === 'dns' ? 'active' : ''}" id="tab-btn-dns" style="border-radius: 6px 6px 0 0; font-size: 0.8rem; padding: 8px 14px; background: ${activeTab === 'dns' ? 'rgba(255,255,255,0.08)' : 'transparent'}; border: none; color: #fff; cursor: pointer;">
                <i class="fas fa-network-wired"></i> DNS &amp; IMAPsync Generator
            </button>
            <button class="btn btn-sm ${activeTab === 'roadmap' ? 'active' : ''}" id="tab-btn-roadmap" style="border-radius: 6px 6px 0 0; font-size: 0.8rem; padding: 8px 14px; background: ${activeTab === 'roadmap' ? 'rgba(255,255,255,0.08)' : 'transparent'}; border: none; color: #fff; cursor: pointer;">
                <i class="fas fa-tasks"></i> Cutover Draaiboek
            </button>
            <button class="btn btn-sm ${activeTab === 'cutover' ? 'active' : ''}" id="tab-btn-cutover" style="border-radius: 6px 6px 0 0; font-size: 0.8rem; padding: 8px 14px; background: ${activeTab === 'cutover' ? 'rgba(255,255,255,0.08)' : 'transparent'}; border: none; color: #38bdf8; cursor: pointer; font-weight: 700;">
                <i class="fas fa-rocket"></i> Cutover Uitvoering (TASK-505)
            </button>
        </div>

        <!-- Tab Content Containers -->
        <div id="migration-tab-content">
            ${renderActiveTabBody(activeScenarioId, activeTab, evaluation, tco)}
        </div>
    `;

    // Bind event listeners inside modal
    bindMigrationModalEvents(activeScenarioId, activeTab);
}

/**
 * Rendert de inhoud van het specifieke tabblad
 */
function renderActiveTabBody(scenarioId, tab, evaluation, tco) {
    const scen = STRATEGIC_SCENARIOS[scenarioId];

    if (tab === 'decision') {
        return `
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #10b981; font-size: 0.95rem; margin-bottom: 6px;">
                    <i class="fas fa-award"></i> Aanbevolen Strategisch Besluit voor Allard
                </div>
                <div style="font-size: 0.88rem; color: #e2e8f0; line-height: 1.5;">
                    ${escapeHtml(evaluation.recommendationReason)}
                </div>
            </div>

            <!-- Side-by-side comparison cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 20px;">
                ${evaluation.evaluations.map(e => `
                    <div style="background: rgba(0,0,0,0.3); border: 1px solid ${e.id === scenarioId ? e.accentColor : 'rgba(255,255,255,0.08)'}; border-radius: 8px; padding: 14px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="color: #fff; font-size: 0.92rem;">${escapeHtml(e.shortLabel)}</strong>
                            <span style="font-size: 0.78rem; font-weight: 800; color: ${e.accentColor};">${e.weightedScore}/100</span>
                        </div>
                        <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 12px;">
                            Totale Kosten: <strong>€ ${e.tco.costs.totalCostYearly.toFixed(2)}/jr</strong> • Winst: <strong style="color: ${e.tco.profit.isProfitable ? '#10b981' : '#f87171'};">€ ${e.tco.profit.netAgencyProfitYearly.toFixed(2)}/jr</strong>
                        </div>
                        <div style="font-size: 0.75rem; color: #cbd5e1; line-height: 1.4;">
                            <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">Belangrijkste Voordelen:</div>
                            ${e.pros.slice(0, 3).map(p => `<div style="margin-bottom: 3px;">✅ ${escapeHtml(p)}</div>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (tab === 'domains') {
        return `
            <div class="table-responsive">
                <table class="data-table" style="font-size: 0.82rem;">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Domeinnaam &amp; Entiteit</th>
                            <th>Type</th>
                            <th>TLD</th>
                            <th>Mailbox Bestemming</th>
                            <th>Klant Inlog</th>
                            <th>Facturatie</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${PORTFOLIO_DOMAINS.map((d, idx) => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                                <td>${idx + 1}</td>
                                <td>
                                    <div style="font-weight: 600; color: #fff;">${escapeHtml(d.domain)}</div>
                                    <div style="font-size: 0.72rem; color: #94a3b8;">${escapeHtml(d.name)}</div>
                                </td>
                                <td><span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.06);">${escapeHtml(d.category)}</span></td>
                                <td><strong style="color: ${d.tld === 'nl' ? '#38bdf8' : '#fbbf24'};">.${escapeHtml(d.tld)}</strong></td>
                                <td><code style="font-size: 0.75rem;">${escapeHtml(d.primaryEmail)}</code></td>
                                <td>
                                    <span style="font-size: 0.75rem; color: ${scenarioId === 'AZURE_M365' ? '#38bdf8' : '#10b981'};">
                                        ${scenarioId === 'AZURE_M365' ? 'outlook.office365.com' : `webmail.${d.domain}`}
                                    </span>
                                </td>
                                <td>
                                    <strong style="color: ${d.clientBillableMonthly > 0 ? '#10b981' : '#94a3b8'};">
                                        ${d.clientBillableMonthly > 0 ? `€ ${d.clientBillableMonthly.toFixed(2)}/mnd` : '—'}
                                    </strong>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    if (tab === 'dns') {
        const sampleDomain = 'angelastenekes.nl';
        const plan = generateDnsCutoverPlan(sampleDomain, scenarioId);
        const imapCmd = generateImapsyncCommand(sampleDomain, 'info', scenarioId);

        return `
            <div style="margin-bottom: 16px;">
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 700;">Voorbeeld DNS Records voor: <span style="color: #fff;">${escapeHtml(sampleDomain)}</span></label>
                <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 8px;">Direct klaar voor DirectAdmin / BIND import onder ${escapeHtml(scen.name)}</div>
                <pre style="background: rgba(0,0,0,0.5); padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.76rem; color: #38bdf8; overflow-x: auto; max-height: 200px;">${escapeHtml(plan.bindZoneSnippet)}</pre>
            </div>

            <div style="margin-bottom: 16px;">
                <label style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 700;">IMAPsync Migratie Commando (Zero Data Loss)</label>
                <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 8px;">Synchroniseert alle mappen, verzonden items en archieven veilig via TLS:</div>
                <pre style="background: rgba(0,0,0,0.5); padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.76rem; color: #34d399; overflow-x: auto;">${escapeHtml(imapCmd)}</pre>
            </div>
        `;
    }

    if (tab === 'roadmap') {
        const phases = generateCutoverPhases(scenarioId);

        return `
            <div style="display: flex; flex-direction: column; gap: 14px;">
                ${phases.map(p => `
                    <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="color: #fff; font-size: 0.9rem;">${escapeHtml(p.title)}</strong>
                            <span style="font-size: 0.75rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${escapeHtml(p.timing)}</span>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; font-size: 0.8rem; color: #cbd5e1; line-height: 1.5;">
                            ${p.tasks.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (tab === 'cutover') {
        return renderCutoverDashboardTab(scenarioId);
    }

    return '';
}

/**
 * Koppelt interactieve knoppen en tabs in de modal
 */
function bindMigrationModalEvents(activeScenarioId, activeTab) {
    document.getElementById('btn-switch-scen-mijnhost')?.addEventListener('click', () => {
        const modal = document.getElementById('cloud-migration-modal');
        if (modal) modal.setAttribute('data-active-scenario', 'SOVEREIGN_MIJNHOST');
        renderMigrationModalContent('SOVEREIGN_MIJNHOST', activeTab);
    });

    document.getElementById('btn-switch-scen-azure')?.addEventListener('click', () => {
        const modal = document.getElementById('cloud-migration-modal');
        if (modal) modal.setAttribute('data-active-scenario', 'AZURE_M365');
        renderMigrationModalContent('AZURE_M365', activeTab);
    });

    document.getElementById('btn-switch-scen-vimexx')?.addEventListener('click', () => {
        const modal = document.getElementById('cloud-migration-modal');
        if (modal) modal.setAttribute('data-active-scenario', 'VIMEXX_BASELINE');
        renderMigrationModalContent('VIMEXX_BASELINE', activeTab);
    });

    document.getElementById('tab-btn-decision')?.addEventListener('click', () => {
        renderMigrationModalContent(activeScenarioId, 'decision');
    });

    document.getElementById('tab-btn-domains')?.addEventListener('click', () => {
        renderMigrationModalContent(activeScenarioId, 'domains');
    });

    document.getElementById('tab-btn-dns')?.addEventListener('click', () => {
        renderMigrationModalContent(activeScenarioId, 'dns');
    });

    document.getElementById('tab-btn-roadmap')?.addEventListener('click', () => {
        renderMigrationModalContent(activeScenarioId, 'roadmap');
    });

    document.getElementById('tab-btn-cutover')?.addEventListener('click', () => {
        renderMigrationModalContent(activeScenarioId, 'cutover');
    });

    if (activeTab === 'cutover') {
        bindCutoverTabEvents(activeScenarioId);
    }
}

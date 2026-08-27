/**
 * Creation+Alt+Fix - AI Engine Service (TASK-302 & TASK-301)
 * Integrates Google Gemini 1.5 (Flash / Pro) REST API with zero-config smart fallback
 * for proposal scope drafting, deliverables estimation, and aftercare email generation.
 */

const GEMINI_STORAGE_KEY = 'caf_gemini_api_key';
const GEMINI_MODEL_STORAGE_KEY = 'caf_gemini_model';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

export const AVAILABLE_MODELS = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Aanbevolen: Nieuwste, razendsnel)', isDefault: true },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Stabiele standaard)', isDefault: false },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Complexe redeneringen)', isDefault: false }
];

export function getGeminiApiKey() {
    return localStorage.getItem(GEMINI_STORAGE_KEY) || '';
}

export function setGeminiApiKey(key) {
    if (!key || typeof key !== 'string') {
        localStorage.removeItem(GEMINI_STORAGE_KEY);
    } else {
        localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    }
}

export function getGeminiModel() {
    return localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || DEFAULT_GEMINI_MODEL;
}

export function setGeminiModel(modelId) {
    if (modelId && typeof modelId === 'string') {
        localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, modelId.trim());
    }
}

export function hasGeminiApiKey() {
    return Boolean(getGeminiApiKey());
}

/**
 * Call Gemini REST API
 */
async function callGeminiApi(promptText, systemInstruction = '') {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        throw new Error("Geen Gemini API sleutel geconfigureerd.");
    }

    const model = getGeminiModel();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [
            {
                role: 'user',
                parts: [{ text: promptText }]
            }
        ]
    };

    if (systemInstruction) {
        requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Gemini API HTTP ${response.status}`);
    }

    const data = await response.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return textOutput;
}

/**
 * Generate Proposal Scope & Deliverables via Gemini or Smart Heuristic Fallback
 */
export async function generateProposalScope(projectData) {
    const client = projectData.client || projectData.companyName || 'de klant';
    const contact = projectData.contactName || client;
    const service = projectData.service || 'Website & Webshop Realisatie';
    const goals = projectData.goals || projectData.projectGoals || 'Een moderne en converterende online aanwezigheid';
    const design = projectData.design || projectData.designPreferences || 'Modern, Dark AI met professionele typografie';
    const domain = projectData.domainName || projectData.domain || 'Nader te bepalen';

    if (hasGeminiApiKey()) {
        try {
            const systemPrompt = `Je bent een ervaren IT & Software Consultant bij Creation+Alt+Fix (Allard Veldman).
Je schrijft overtuigende, professionele en technisch onderbouwde investeringsvoorstellen en projectscopes voor klanten in het Nederlands.
Geef je antwoord ALTIJD uitsluitend als geldig JSON object in het volgende formaat zonder markdown codeblokken:
{
  "proposalTitle": "Korte krachtige projecttitel",
  "estimatedPrice": "750,00",
  "executiveSummary": "Samenvatting van het projectdoel en de toegevoegde waarde",
  "deliverables": [
    { "title": "Onderdeel 1", "description": "Gedetailleerde toelichting van wat wordt opgeleverd" },
    { "title": "Onderdeel 2", "description": "Gedetailleerde toelichting" },
    { "title": "Onderdeel 3", "description": "Gedetailleerde toelichting" },
    { "title": "Onderdeel 4", "description": "Gedetailleerde toelichting" }
  ],
  "timeline": [
    { "phase": "Fase 1: Wireframing & Design", "duration": "1 week" },
    { "phase": "Fase 2: Ontwikkeling & Testen", "duration": "1-2 weken" },
    { "phase": "Fase 3: Livegang & Oplevering", "duration": "3 dagen" }
  ],
  "termsSummary": "Inclusief 14 dagen garantie na livegang, SSL-certificaat en mobiele responsive optimalisatie."
}`;

            const userPrompt = `Genereer een compleet investeringsvoorstel en deliverables scope voor het volgende project:
- Bedrijfsnaam: ${client}
- Contactpersoon: ${contact}
- Dienst / Projecttype: ${service}
- Doelen & Wensen: ${goals}
- Designvoorkeuren: ${design}
- Domein: ${domain}

Zorg voor een heldere deliverables opsomming, realistische fasering en een marktconforme prijsindicatie voor een freelance software expert.`;

            const rawResponse = await callGeminiApi(userPrompt, systemPrompt);
            const cleanedJson = rawResponse.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
            const parsed = JSON.parse(cleanedJson);
            parsed.isAiGenerated = true;
            return parsed;

        } catch (apiErr) {
            console.warn("Gemini API aanroep mislukt, fallback naar smart generator:", apiErr.message);
        }
    }

    // --- Smart Heuristic Fallback Generator (Geen API-key vereist) ---
    return generateSmartHeuristicScope(projectData);
}

/**
 * Smart Heuristic Fallback Scope Generator
 */
function generateSmartHeuristicScope(p) {
    const client = p.client || p.companyName || 'Jouw Onderneming';
    const service = (p.service || 'Website & Webshop Realisatie').toLowerCase();
    const goals = p.goals || p.projectGoals || 'Een moderne en converterende online aanwezigheid';
    const design = p.design || p.designPreferences || 'Modern, strak en responsive';

    let title = `Realisatie Maatwerk Oplossing - ${client}`;
    let price = '650,00';
    let deliverables = [];
    let timeline = [];

    if (service.includes('ai') || service.includes('automatisering')) {
        title = `AI Automatisering & Workflow Engine - ${client}`;
        price = '850,00';
        deliverables = [
            { title: "Intake & Procesanalyse", description: `Diepgaande analyse van de huidige workflows van ${client} om automatiseringskansen te identificeren.` },
            { title: "AI Agent & Webhook Integratie", description: "Inrichten van slimme LLM-modellen en geautomatiseerde webhooks voor real-time dataverwerking." },
            { title: "Dashboard & Notificatiesysteem", description: "Centraal dashboard met automatische e-mail- en pushnotificaties bij voltooide acties." },
            { title: "Testing, Beveiliging & Overdracht", description: "Uitgebreide end-to-end testen met foutafhandeling en documentatie voor intern gebruik." }
        ];
        timeline = [
            { phase: "Fase 1: Architectuur & API Setup", duration: "1 week" },
            { phase: "Fase 2: AI Workflow Implementatie", duration: "1-2 weken" },
            { phase: "Fase 3: Testen & Livegang", duration: "4 dagen" }
        ];
    } else if (service.includes('dashboard') || service.includes('data')) {
        title = `Interactief Data Dashboard & Rapportages - ${client}`;
        price = '750,00';
        deliverables = [
            { title: "Data Koppelingen & ETL Pipeline", description: `Koppelen van externe databronnen en API's specifiek voor ${client}.` },
            { title: "Visualisatie & KPI Widgets", description: "Realtime grafieken, filters, KPI-tellers en exportmogelijkheden (CSV/PDF)." },
            { title: "Gebruikersrollen & Toegangscontrole", description: "Beveiligde inlogomgeving met rolgebaseerde datatoegang." },
            { title: "Documentatie & Training", description: "Oplevering met instructies voor databeheer en onderhoud." }
        ];
        timeline = [
            { phase: "Fase 1: Datamodellering & Mockups", duration: "1 week" },
            { phase: "Fase 2: Frontend & API Integratie", duration: "1 week" },
            { phase: "Fase 3: Validatie & Oplevering", duration: "3 dagen" }
        ];
    } else {
        // Website / Webshop / General
        title = `Professionele Bedrijfswebsite & Lead Funnel - ${client}`;
        price = '550,00';
        deliverables = [
            { title: "Design & Wireframing op Maat", description: `Uniek UI/UX ontwerp afgestemd op de stijlvoorkeuren: "${design}".` },
            { title: "Responsive Frontend Ontwikkeling", description: "Razendsnelle, mobielvriendelijke website gebouwd met moderne webtechnologieën." },
            { title: "Interactief Klantenportaal & Offerte Suite", description: "Inclusief digitaal accorderen, status tracking en contactmogelijkheden." },
            { title: "SEO, Performance & AVG Beveiliging", description: "Zoekmachine-optimalisatie, SSL-certificaat, cookie-consent en snelle laadtijden." }
        ];
        timeline = [
            { phase: "Fase 1: Wireframing & Design Review", duration: "4-5 dagen" },
            { phase: "Fase 2: Ontwikkeling & Integraties", duration: "1 week" },
            { phase: "Fase 3: Testen & Domein Livegang", duration: "3 dagen" }
        ];
    }

    return {
        proposalTitle: title,
        estimatedPrice: price,
        executiveSummary: `Creation+Alt+Fix realiseert voor ${client} een hoogwaardige maatwerkoplossing gericht op: "${goals}". Met bewezen technologieën zorgen we voor betrouwbaarheid, schaalbaarheid en direct meetbaar resultaat.`,
        deliverables: deliverables,
        timeline: timeline,
        termsSummary: "Vaste prijsafspraak inclusief 14 dagen nazorg en volledige opleveringsgarantie.",
        isAiGenerated: false
    };
}

/**
 * Generate Aftercare Review & Check-in Email (TASK-301)
 */
export async function generateAftercareEmail(projectData, type = '14day') {
    const client = projectData.client || projectData.companyName || 'klant';
    const contact = projectData.contactName || client;
    const service = projectData.service || 'je nieuwe website/applicatie';

    if (type === '14day') {
        return {
            type: '14day',
            subject: `Hoe bevalt de nieuwe website? • Creation+Alt+Fix`,
            body: `Beste ${contact},\n\nHet is inmiddels zo'n twee weken geleden dat we ${service} succesvol live hebben gezet voor ${client}!\n\nIk ben erg benieuwd hoe de eerste reacties zijn en of alles naar wens verloopt. Mocht je nog kleine wensen of vragen hebben, laat het me gerust weten.\n\nAls je tevreden bent over onze samenwerking, zou je me een enorm plezier doen met een korte Google Review:\n👉 https://g.page/r/creationaltfix/review\n\nAlvast hartelijk dank en veel succes met het project!\n\nMet vriendelijke groet,\n\nAllard Veldman\nCreation+Alt+Fix\nwww.creationaltfix.nl`
        };
    } else {
        // 6-month APK
        return {
            type: '6month',
            subject: `Periodieke APK & Systeem Check voor ${client} • Creation+Alt+Fix`,
            body: `Beste ${contact},\n\nJe website/systeem draait inmiddels een half jaar live. Tijd voor een korte gratis check-up vanuit Creation+Alt+Fix!\n\nIn de afgelopen periode zijn er diverse beveiligings- en browserupdates geweest. Zullen we even een kort moment inplannen om te kijken naar eventuele optimalisaties, nieuwe functionaliteiten of content updates?\n\nLaat me weten of je hier behoefte aan hebt, dan plannen we een kort belletje in.\n\nMet vriendelijke groet,\n\nAllard Veldman\nCreation+Alt+Fix\nwww.creationaltfix.nl`
        };
    }
}

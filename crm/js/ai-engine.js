/**
 * Creation+Alt+Fix - AI Engine Service (TASK-302 & TASK-301)
 * Integrates Google Gemini 1.5 (Flash / Pro) REST API with zero-config smart fallback
 * for proposal scope drafting, deliverables estimation, and aftercare email generation.
 */

const GEMINI_STORAGE_KEY = 'caf_gemini_api_key';
const GEMINI_MODEL_STORAGE_KEY = 'caf_gemini_model';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

export const AVAILABLE_MODELS = [
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Aanbevolen: Nieuwste, razendsnel)', isDefault: true },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', isDefault: false },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', isDefault: false },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', isDefault: false }
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
Hanteer hierbij de vaste tariefstructuur van Creation+Alt+Fix:
- Web & Software Ontwikkeling: Marktconform per project (bijv. € 550 - € 850)
- Managed Cloud Hosting & Domein All-in: Vaste prijs € 150,00 per jaar (inclusief NVMe hosting, .nl domeinnaam, SSL, 5 zakelijke mailboxen met SPF/DKIM/DMARC en dagelijkse backups)
- Jaarlijkse Website & Security APK: Optioneel € 350,00 per jaar (beveiligingsaudit, PHP/DB check, SEO check en 2 uur strippenkaart @ € 65,-/u)

Geef je antwoord ALTIJD uitsluitend als geldig JSON object in het volgende formaat zonder markdown codeblokken:
{
  "proposalTitle": "Korte krachtige projecttitel",
  "estimatedPrice": "550,00",
  "executiveSummary": "Samenvatting van het projectdoel en de toegevoegde waarde",
  "items": [
    {
      "description": "Ontwikkeling & Realisatie Maatwerk Website / Applicatie",
      "subtext": "UI/UX ontwerp, responsive frontend, interactieve componenten en livegang.",
      "price": "550,00",
      "period": "eenmalig"
    },
    {
      "description": "Managed Cloud Hosting & Domeinnaam (Jaar 1)",
      "subtext": "Snelle NVMe cloud hosting, .nl domein, SSL, 5 zakelijke mailboxen, SPF/DKIM/DMARC en dagelijkse backups.",
      "price": "150,00",
      "period": "per jaar"
    }
  ],
  "deliverables": [
    { "title": "Onderdeel 1", "description": "Gedetailleerde toelichting van wat wordt opgeleverd" },
    { "title": "Onderdeel 2", "description": "Gedetailleerde toelichting" },
    { "title": "Onderdeel 3", "description": "Gedetailleerde toelichting" },
    { "title": "Managed Cloud Hosting & Domein", "description": "All-in hostingpakket t.w.v. € 150,-/jr inclusief .nl domein, SSL, zakelijke mail en dagelijkse backups." }
  ],
  "timeline": [
    { "phase": "Fase 1: Wireframing & Design", "duration": "1 week" },
    { "phase": "Fase 2: Ontwikkeling & Testen", "duration": "1-2 weken" },
    { "phase": "Fase 3: Livegang & Oplevering", "duration": "3 dagen" }
  ],
  "termsSummary": "Vaste prijsafspraak inclusief 14 dagen nazorg. Managed Cloud Hosting (€ 150,-/jr excl. BTW) wordt na 12 maanden stilzwijgend verlengd met een opzegtermijn van 1 maand."
}`;

            const userPrompt = `Genereer een compleet investeringsvoorstel en deliverables scope voor het volgende project:
- Bedrijfsnaam: ${client}
- Contactpersoon: ${contact}
- Dienst / Projecttype: ${service}
- Doelen & Wensen: ${goals}
- Designvoorkeuren: ${design}
- Domein: ${domain}

Zorg voor een heldere deliverables opsomming, realistische fasering, duidelijke splitsing van eenmalige realisatie en de jaarlijkse Managed Hosting (€ 150,-/jr).`;

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
 * Smart Heuristic Fallback Scope Generator (TASK-816)
 */
function generateSmartHeuristicScope(p) {
    const client = p.client || p.companyName || 'Jouw Onderneming';
    const service = (p.service || 'Website & Webshop Realisatie').toLowerCase();
    const goals = p.goals || p.projectGoals || 'Een moderne en converterende online aanwezigheid';
    const design = p.design || p.designPreferences || 'Modern, strak en responsive';

    let title = `Realisatie Maatwerk Oplossing - ${client}`;
    let devPrice = '550,00';
    let deliverables = [];
    let timeline = [];

    if (service.includes('ai') || service.includes('automatisering')) {
        title = `AI Automatisering & Workflow Engine - ${client}`;
        devPrice = '850,00';
        deliverables = [
            { title: "Intake & Procesanalyse", description: `Diepgaande analyse van de huidige workflows van ${client} om automatiseringskansen te identificeren.` },
            { title: "AI Agent & Webhook Integratie", description: "Inrichten van slimme LLM-modellen en geautomatiseerde webhooks voor real-time dataverwerking." },
            { title: "Dashboard & Notificatiesysteem", description: "Centraal dashboard met automatische e-mail- en pushnotificaties bij voltooide acties." },
            { title: "Managed Cloud Hosting & API Gateway", description: "Inclusief 12 maanden Managed Hosting, DNS-beheer, SSL-certificaat en monitoring (€ 150,-/jr)." }
        ];
        timeline = [
            { phase: "Fase 1: Architectuur & API Setup", duration: "1 week" },
            { phase: "Fase 2: AI Workflow Implementatie", duration: "1-2 weken" },
            { phase: "Fase 3: Testen & Livegang", duration: "4 dagen" }
        ];
    } else if (service.includes('dashboard') || service.includes('data')) {
        title = `Interactief Data Dashboard & Rapportages - ${client}`;
        devPrice = '750,00';
        deliverables = [
            { title: "Data Koppelingen & ETL Pipeline", description: `Koppelen van externe databronnen en API's specifiek voor ${client}.` },
            { title: "Visualisatie & KPI Widgets", description: "Realtime grafieken, filters, KPI-tellers en exportmogelijkheden (CSV/PDF)." },
            { title: "Gebruikersrollen & Toegangscontrole", description: "Beveiligde inlogomgeving met rolgebaseerde datatoegang." },
            { title: "Managed Cloud Hosting & Serverbeheer", description: "Inclusief 12 maanden veilige cloud hosting, SSL en dagelijkse backups (€ 150,-/jr)." }
        ];
        timeline = [
            { phase: "Fase 1: Datamodellering & Mockups", duration: "1 week" },
            { phase: "Fase 2: Frontend & API Integratie", duration: "1 week" },
            { phase: "Fase 3: Validatie & Oplevering", duration: "3 dagen" }
        ];
    } else {
        // Website / Webshop / General
        title = `Professionele Bedrijfswebsite & Lead Funnel - ${client}`;
        devPrice = '550,00';
        deliverables = [
            { title: "Design & Wireframing op Maat", description: `Uniek UI/UX ontwerp afgestemd op de stijlvoorkeuren: "${design}".` },
            { title: "Responsive Frontend Ontwikkeling", description: "Razendsnelle, mobielvriendelijke website gebouwd met moderne webtechnologieën." },
            { title: "Interactief Klantenportaal & Offerte Suite", description: "Inclusief digitaal accorderen, status tracking en feedback annotaties." },
            { title: "Managed Cloud Hosting & Domein (12 mnd)", description: "Snelle NVMe hosting, .nl domein, SSL, 5 mailboxen (SPF/DKIM/DMARC) en dagelijkse backups (€ 150,-/jr)." }
        ];
        timeline = [
            { phase: "Fase 1: Wireframing & Design Review", duration: "4-5 dagen" },
            { phase: "Fase 2: Ontwikkeling & Integraties", duration: "1 week" },
            { phase: "Fase 3: Testen & Domein Livegang", duration: "3 dagen" }
        ];
    }

    const items = [
        {
            description: `Ontwikkeling & Realisatie: ${title}`,
            subtext: `Maatwerk project conform specificaties gericht op "${goals}".`,
            price: devPrice,
            period: "eenmalig"
        },
        {
            description: "Managed Cloud Hosting & Domeinnaam All-in (Jaar 1)",
            subtext: "Snelle NVMe SSD webhosting, 1x .nl domein, SSL, 5 zakelijke mailboxen (SPF/DKIM/DMARC) en dagelijkse backups.",
            price: "150,00",
            period: "per jaar"
        }
    ];

    return {
        proposalTitle: title,
        estimatedPrice: devPrice,
        items: items,
        executiveSummary: `Creation+Alt+Fix realiseert voor ${client} een hoogwaardige maatwerkoplossing gericht op: "${goals}". Met bewezen technologieën en managed hosting zorgen we voor maximale betrouwbaarheid, snelheid en meetbaar resultaat.`,
        deliverables: deliverables,
        timeline: timeline,
        termsSummary: "Vaste prijsafspraak inclusief 14 dagen nazorg. Managed Cloud Hosting (€ 150,-/jr excl. BTW) wordt na 12 maanden stilzwijgend verlengd met een opzegtermijn van 1 maand.",
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
            body: `Beste ${contact},\n\nHet is inmiddels zo'n twee weken geleden dat we ${service} succesvol live hebben gezet voor ${client}!\n\nIk ben erg benieuwd hoe de eerste reacties zijn en of alles naar wens verloopt. Mocht je nog kleine wensen of vragen hebben, laat het me gerust weten.\n\nAls je tevreden bent over onze samenwerking, zou je me een enorm plezier doen met een korte Google Review:\n👉 https://g.page/r/CYY-gf76AgDBEBM/review\n\nAlvast hartelijk dank en veel succes met het project!\n\nMet vriendelijke groet,\n\nAllard Veldman\nCreation+Alt+Fix\nwww.creationaltfix.nl`
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

/**
 * Generate Visual Design Concept & Google Imagen / Banana AI Prompt (TASK-815)
 * Combines Gemini LLM / heuristics to generate:
 * 1. An ultra-realistic Google Imagen / Midjourney / Banana AI visual generator prompt.
 * 2. Visual design concept explanation for the client.
 * 3. Suggested design / prototype preview URL.
 */
export async function generateVisualDesignConcept(projectData) {
    const client = projectData.client || projectData.companyName || 'Opdrachtgever';
    const service = projectData.service || 'Website / Applicatie';
    const goals = projectData.goals || projectData.projectGoals || 'Modern, converterend en betrouwbaar digitaal platform.';
    const designPref = projectData.design || projectData.designPreferences || 'Donker, modern, strakke typografie, betrouwbaar en dynamisch';
    const domain = projectData.domainName || projectData.domain || 'creationaltfix.nl';

    const apiKey = getGeminiApiKey();

    if (apiKey) {
        try {
            const prompt = `Je bent de Hoofd UI/UX Designer en Creative Director bij Creation+Alt+Fix.
Maak een visueel ontwerpconcept en een ultra-strakke AI Image Generator Prompt (voor Google Imagen 3 / Google Banana / Midjourney) voor het volgende klantproject:

Klant: ${client}
Dienst: ${service}
Domein: ${domain}
Projectdoelen: ${goals}
Design & Stijlvoorkeuren: ${designPref}

Genereer een JSON response met exact de volgende structuur:
{
  "conceptTitle": "Korte pakkende titel voor het visuele ontwerpconcept",
  "aiImagePrompt": "Engelse gedetailleerde prompt voor Google Imagen/Banana (8k, UI/UX landing page mockup, dark modern aesthetic, responsive grid, glassmorphism, clean typography, vibrant accents, highly detailed UI components)",
  "colorPalette": ["#0a0e1a", "#6366f1", "#22d3ee"],
  "designRationale": "Nederlandse toelichting voor de klant over de visuele richting, layoutkeuzes en waarom dit perfect aansluit bij de doelgroep.",
  "suggestedPrototypeUrl": "https://${domain}"
}
Geef UITSLUITEND valide JSON terug zonder markdown backticks.`;

            const rawResponse = await callGeminiApi(prompt);
            const cleaned = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return {
                ...parsed,
                isAiGenerated: true
            };
        } catch (err) {
            console.warn("Gemini design concept generatie fallback:", err);
        }
    }

    // Heuristics fallback
    return {
        conceptTitle: `Modern UI/UX Visual Concept • ${client}`,
        aiImagePrompt: `Modern ultra-clean website UI UX mockup for "${client}" (${service}), dark aesthetic with glowing subtle neon accents, hero banner with clear call-to-action button, responsive card layout, modern Space Grotesk and Inter typography, frosted glass glassmorphism panels, minimal luxury vibe, professional corporate Dutch brand, 8k resolution, UI design Behance Dribbble top trending --ar 16:9`,
        colorPalette: ["#0a0e1a", "#6366f1", "#22d3ee"],
        designRationale: `Voor ${client} is gekozen voor een eigentijds, converterend ontwerp. De layout combineert een overzichtelijke navigatiestructuur met moderne Dark AI design elementen, heldere contrasten en snelle laadtijden op zowel desktop als mobiel.`,
        suggestedPrototypeUrl: `https://${domain}`,
        isAiGenerated: false
    };
}


/**
 * Creation+Alt+Fix - Social Media & Personal Branding Campaign Manager (TASK-843)
 * 
 * Strategie: 30-Dagen Contentkalender & Scripts voor LinkedIn & Instagram Stories/Reels
 * Bron: docs/SOCIAL-MEDIA-BRANDING.md
 * Auteur: Allard Veldman (Solo Lead Software Engineer, Creation+Alt+Fix, Hoogezand)
 * 
 * Functionaliteiten:
 * 1. 30-Dagen Gestructureerd Contentmodel verdeeld over de 3 Kernpijlers:
 *    - Pijler 1: De Echte Vakman Centraal (No-Bullshit & Herkenbaar)
 *    - Pijler 2: De Trage WordPress / No-Code Illusie (Tech Reality)
 *    - Pijler 3: Solo Bouwer Leverage (AI als Krachtvermenigvuldiger)
 * 2. Multi-Channel Post Synthesizer (geoptimaliseerde LinkedIn copy, hooks, opsommingen, hashtags en CTA's).
 * 3. Instagram Reels & Stories Video Script Engine met frame-voor-frame regieaanwijzingen
 *    (Script 1: De Trage Website Test, Script 2: De Echte Klantflow, Script 3: Lead Factory Batch Scan).
 * 4. Frictieloze 1-klik dispatch: Klembord copy, WhatsApp verzending naar telefoon (31619135453) en LinkedIn Share Intent.
 * 5. Publicatie-planner & datumcalculator met automatische zondagsrust ('Rust & reflectie').
 * 6. Campagne-telemetrie: geplande/gepubliceerde ratio, kanaalverdeling, pijlerbalans en MKB-bereikprognose.
 * 7. Volledig exporteerbaar Markdown briefing-dossier.
 */

export const BRANDING_CONFIG = {
  author: 'Allard Veldman',
  role: 'Solo Lead Software Engineer & Oprichter',
  agency: 'Creation+Alt+Fix',
  location: 'Hoogezand, Groningen',
  kvk: '99986191',
  phoneDisplay: '06 - 19135453',
  phoneInternational: '31619135453',
  website: 'https://creationaltfix.nl',
  portalUrl: 'https://portal.creationaltfix.nl/crm/status/',
  targetAudience: 'MKB-ondernemers, vaklieden en zzp\'ers in Groningen, Drenthe en Friesland',
  hashtags: [
    '#CreationAltFix',
    '#WebDevelopment',
    '#Ondernemerschap',
    '#Hoogezand',
    '#MKBGroningen',
    '#Vakmanschap',
    '#SubSecondWeb'
  ]
};

export const BRANDING_PILLARS = {
  p1_vakman: {
    id: 'p1_vakman',
    code: 'PILLAR_1',
    name: 'De Echte Vakman Centraal',
    badge: '🤝 Vakman Centraal',
    color: '#34d399',
    description: 'No-bullshit, herkenbare taal voor schilders, bakkers, hoveniers en installateurs zonder agency-jargon.'
  },
  p2_tech_reality: {
    id: 'p2_tech_reality',
    code: 'PILLAR_2',
    name: 'De Trage WordPress Illusie',
    badge: '⚡ Tech Reality',
    color: '#f59e0b',
    description: 'De pijn van 40 trage plugins en 5s wit scherm vs. zero-dependency 0.4s sub-second websites.'
  },
  p3_solo_leverage: {
    id: 'p3_solo_leverage',
    code: 'PILLAR_3',
    name: 'Solo Bouwer Leverage',
    badge: '🚀 Solo Leverage',
    color: '#818cf8',
    description: 'Hoe 1 gedreven engineer met AI-tools sneller oplevert dan een log traditioneel bureau van 12 man.'
  },
  p_rest: {
    id: 'p_rest',
    code: 'REST',
    name: 'Rust & Reflectie',
    badge: '☕ Rustdag',
    color: '#64748b',
    description: 'Zondag: Geen content, focus op herstel, reflectie en voorbereiding op de nieuwe week.'
  }
};

/**
 * De complete 30-dagen contentkalender conform docs/SOCIAL-MEDIA-BRANDING.md
 */
export const SOCIAL_CALENDAR_30_DAYS = [
  {
    day: 1,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p1_vakman',
    theme: 'Lokale SEO & SSL',
    hook: 'Waarom de beste stratenmaker van Hoogezand nog steeds een onbeveiligde HTTP site heeft',
    goalCta: 'Bewustwording SSL & Lokale SEO',
    status: 'ready'
  },
  {
    day: 2,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p3_solo_leverage',
    theme: 'Achter de schermen',
    hook: 'Lead Factory engine draait een scan voor Sappemeer.',
    goalCta: 'Achter de schermen & vakmanschap tonen',
    status: 'scheduled'
  },
  {
    day: 3,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p2_tech_reality',
    theme: 'Laadsnelheid ROI',
    hook: 'De \'3-seconden regel\': Hoe 1 seconde laadvertraging een zzp\'er € 2.000,- per maand kost',
    goalCta: 'Technische autoriteit & conversie-inzicht',
    status: 'scheduled'
  },
  {
    day: 4,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p2_tech_reality',
    theme: 'Lighthouse vs WordPress',
    hook: 'Screenshot van 100/100 Lighthouse score vs 42/100 WordPress gemiddelde.',
    goalCta: 'Interactie poll: "Hoe snel laadt jouw site?"',
    status: 'scheduled'
  },
  {
    day: 5,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p3_solo_leverage',
    theme: 'IP-beveiliging & AI',
    hook: 'Case Study Arnold Design: Hoe we met 7 regels code voorkwamen dat AI bots kunstwerken van Arnold stelen',
    goalCta: 'IP-beveiliging & AI expertise demonstreren',
    status: 'scheduled'
  },
  {
    day: 6,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p1_vakman',
    theme: 'Lokale connectie',
    hook: 'Even bij de lokale bakker langs geweest (BakkertjeSieg). Technologie moet de vakman dienen, niet andersom.',
    goalCta: 'Menselijke connectie & lokale binding',
    status: 'scheduled'
  },
  {
    day: 7,
    channel: 'None',
    format: 'Rust',
    pillarId: 'p_rest',
    theme: 'Zondagsrust',
    hook: 'Zondag: Geen content',
    goalCta: 'Rust & reflectie',
    status: 'rest'
  },
  {
    day: 8,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p1_vakman',
    theme: 'Frictieloze Flow',
    hook: 'Geen dashboards voor schilders: Waarom mijn klanten akkoord geven via WhatsApp met 1 vinger',
    goalCta: 'Conversie-filosofie (TASK-902 & statusportaal)',
    status: 'scheduled'
  },
  {
    day: 9,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p3_solo_leverage',
    theme: 'Bouwen in het openbaar',
    hook: 'Boekhouding Pi update: Nieuwe factuur feature live gezet voor Q4.',
    goalCta: 'Transparantie en bouwproces tonen',
    status: 'scheduled'
  },
  {
    day: 10,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p2_tech_reality',
    theme: 'Prijstransparantie',
    hook: 'De bureau-mythe: Waarom een website van € 4.500,- vaak slechter presteert dan een concept van € 199,-',
    goalCta: 'Eerlijke prijzen en ontmaskering agency overhead',
    status: 'scheduled'
  },
  {
    day: 11,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p1_vakman',
    theme: 'Product showcase',
    hook: 'Video van het statusportaal op mobiel: Geen login nodig. Direct inzicht.',
    goalCta: 'Product showcase van het klantenportaal',
    status: 'scheduled'
  },
  {
    day: 12,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p2_tech_reality',
    theme: 'DevOps robuustheid',
    hook: 'Wat er gebeurt als je Vimexx DDoS-aanvallen overleeft dankzij DNS fallback',
    goalCta: 'DevOps betrouwbaarheid en infrastructuurkennis',
    status: 'scheduled'
  },
  {
    day: 13,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p1_vakman',
    theme: 'Social proof',
    hook: 'Quote van een tevreden klant (Angela Stenekes of Gerard Klusser).',
    goalCta: 'Social proof en klantvertrouwen versterken',
    status: 'scheduled'
  },
  {
    day: 14,
    channel: 'None',
    format: 'Rust',
    pillarId: 'p_rest',
    theme: 'Zondagsrust',
    hook: 'Zondag: Geen content',
    goalCta: 'Rust & reflectie',
    status: 'rest'
  },
  {
    day: 15,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p3_solo_leverage',
    theme: 'Tech leverage',
    hook: 'Solo bouwen met AI: Hoe ik in 30 minuten een werkend concept neerzet dat direct live staat via FTPS',
    goalCta: 'Showcase van de Lead Factory en Antigravity snelheid',
    status: 'scheduled'
  },
  {
    day: 16,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p3_solo_leverage',
    theme: 'Vakmanschap in actie',
    hook: 'Timelapse van code schrijven: Dark AI layout bouwen voor Justin.',
    goalCta: 'Echt vakmanschap en passie voor code laten zien',
    status: 'scheduled'
  },
  {
    day: 17,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p2_tech_reality',
    theme: 'Soevereiniteit & AVG',
    hook: 'De verborgen kosten van \'gratis\' websitemakers: Wie is er écht eigenaar van jouw data?',
    goalCta: 'Data-soevereiniteit en Nederlandse hosting promoten',
    status: 'scheduled'
  },
  {
    day: 18,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p1_vakman',
    theme: 'Interactie & DM',
    hook: 'Vraagsticker: Waar loop jij tegenaan met je huidige website?',
    goalCta: 'Directe leadgeneratie en 1-op-1 gesprekken in DM',
    status: 'scheduled'
  },
  {
    day: 19,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p1_vakman',
    theme: 'Maatwerk vs template',
    hook: 'Waarom ik geen templates verkoop: Elk vakmanschap verdient zijn eigen archetype',
    goalCta: 'Onderscheidend vermogen en authentieke identiteit',
    status: 'scheduled'
  },
  {
    day: 20,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p1_vakman',
    theme: 'Persoonlijk & lokaal',
    hook: 'Wandelrondje Hoogezand: Even het hoofd leegmaken na een zware sprint.',
    goalCta: 'Persoonlijk karakter en sympathie als lokale ondernemer',
    status: 'scheduled'
  },
  {
    day: 21,
    channel: 'None',
    format: 'Rust',
    pillarId: 'p_rest',
    theme: 'Zondagsrust',
    hook: 'Zondag: Geen content',
    goalCta: 'Rust & reflectie',
    status: 'rest'
  },
  {
    day: 22,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p1_vakman',
    theme: 'Maps conversie',
    hook: 'De Google Maps paradox: 4.8 sterren op Google, maar potentiële klanten haken af door een 404',
    goalCta: 'Acquisitiehaak voor bedrijven met goede reviews zonder site',
    status: 'scheduled'
  },
  {
    day: 23,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p3_solo_leverage',
    theme: 'Micro-interacties',
    hook: 'Review tellers live in werking op mobiel concept.',
    goalCta: 'Aandacht voor detail en mobiele gebruikerservaring',
    status: 'scheduled'
  },
  {
    day: 24,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p1_vakman',
    theme: 'Transparante tarieven',
    hook: 'Van € 22,- naar € 95,- per jaar: Hoe eerlijke communicatie leidde tot 100% klantbehoud',
    goalCta: 'Pricing strategie, eerlijkheid en loyaliteit delen',
    status: 'scheduled'
  },
  {
    day: 25,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p2_tech_reality',
    theme: 'Uptime monitoring',
    hook: 'Sneak peek van het vernieuwde Uptime Dashboard.',
    goalCta: 'Betrouwbaarheid en 24/7 bewaking van klantsites',
    status: 'scheduled'
  },
  {
    day: 26,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p1_vakman',
    theme: 'Solo agency voordeel',
    hook: 'Waarom MKB-ondernemers liever direct met de bouwer praten dan met een accountmanager',
    goalCta: 'Waardepropositie solo software engineer verankeren',
    status: 'scheduled'
  },
  {
    day: 27,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p1_vakman',
    theme: 'Succes vieren',
    hook: 'Screenshot van een akkoord via WhatsApp: En weer een ondernemer binnen 24 uur live!',
    goalCta: 'Viering van resultaat en snelle opleveringen',
    status: 'scheduled'
  },
  {
    day: 28,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p3_solo_leverage',
    theme: 'Groningse ambitie',
    hook: 'De 90-dagen roadmap: Hoe we stap voor stap bouwen aan een soeverein IT ecosysteem in het Noorden',
    goalCta: 'Visie, lange termijn stabiliteit en ondernemerschap',
    status: 'scheduled'
  },
  {
    day: 29,
    channel: 'Instagram',
    format: 'Story',
    pillarId: 'p1_vakman',
    theme: 'Seizoensactie',
    hook: 'Poll: Ben jij klaar voor de feestdagen qua online vindbaarheid?',
    goalCta: 'Seizoenshaak en conversie richting Q4/Q1',
    status: 'scheduled'
  },
  {
    day: 30,
    channel: 'LinkedIn',
    format: 'Post',
    pillarId: 'p2_tech_reality',
    theme: 'Maandafsluiting & impact',
    hook: 'Samenvatting van 1 maand bouwen: 10 lokale vaklieden geholpen, 0 trage plugins gebruikt.',
    goalCta: 'Maandafsluiting, concrete impact en bewijskracht',
    status: 'scheduled'
  }
];

/**
 * Gedetailleerde video scripts voor Instagram Stories & Reels
 */
export const STORY_REEL_SCRIPTS = {
  script_1_speed_test: {
    id: 'script_1_speed_test',
    title: 'De Trage Website Test',
    format: 'Instagram Reel / Story Sequence',
    targetDurationSeconds: 26,
    aspectRatio: '9:16 vertical',
    hook: 'Laad jouw website sneller dan het zetten van een kop koffie? Laten we testen.',
    frames: [
      {
        frameNumber: 1,
        phase: 'hook',
        durationSeconds: 5,
        visualAction: 'Allard staat in kantoor Hoogezand, houdt smartphone omhoog en tikt op de digitale stopwatch.',
        spokenAudio: 'Laad jouw website sneller dan het zetten van een kop koffie? Laten we testen.',
        onScreenOverlay: '⏱️ De 3-Seconden Snelheidstest',
        soundEffect: 'Tik-geluid stopwatch'
      },
      {
        frameNumber: 2,
        phase: 'pain',
        durationSeconds: 8,
        visualAction: 'Schermopname van een traditionele WordPress site met wit scherm, draaiend radertje en verspringende cookie-banners (5.4s laadtijd).',
        spokenAudio: 'De gemiddelde bezoeker haakt na 2.5 seconde af. Als je site 5 seconden wit beeld geeft, mis je letterlijk elke dag betalende klanten.',
        onScreenOverlay: '❌ 5.4s Wit Scherm = Gemiste Klant',
        soundEffect: 'Zachte waarschuwingstoon / buzz'
      },
      {
        frameNumber: 3,
        phase: 'solution',
        durationSeconds: 8,
        visualAction: 'Schermopname van Creation+Alt+Fix concept op smartphone: tik op de link -> BAM, in 0.4 seconde direct scherp geladen met grote bel-knop.',
        spokenAudio: 'Zo hoort software te werken. Zero dependencies, geen zware database, binnen 0.4 seconde direct klaar voor actie.',
        onScreenOverlay: '⚡ 0.4s Sub-Second Laadtijd (BAM!)',
        soundEffect: 'Snelle Whoosh & Cash register / chime'
      },
      {
        frameNumber: 4,
        phase: 'cta',
        durationSeconds: 5,
        visualAction: 'Allard terug in beeld met interactieve DM sticker.',
        spokenAudio: 'Benieuwd hoe snel jouw website laadt op mobiel? Drop je link in mijn DM voor een gratis snelheidscheck!',
        onScreenOverlay: '📩 Drop je link in DM voor gratis check!',
        soundEffect: 'Vrolijke notificatie chime'
      }
    ],
    hashtags: ['#WebSnelheid', '#WordPressVervangen', '#MKBNoord', '#SubSecond', '#Hoogezand']
  },

  script_2_no_login_flow: {
    id: 'script_2_no_login_flow',
    title: 'De Echte Klantflow (No-Login Magic)',
    format: 'Instagram Reel / Story Sequence',
    targetDurationSeconds: 24,
    aspectRatio: '9:16 vertical',
    hook: 'Waarom moeten klanten altijd 4 wachtwoorden aanmaken voor een simpele offerte?',
    frames: [
      {
        frameNumber: 1,
        phase: 'hook',
        durationSeconds: 5,
        visualAction: 'Allard kijkt hoofdschuddend naar een login-scherm met CAPTCHA en 8 wachtwoordvereisten.',
        spokenAudio: 'Waarom moeten klanten bij traditionele bureaus altijd 4 wachtwoorden aanmaken voor een simpele offerte?',
        onScreenOverlay: '🤦‍♂️ 4 Wachtwoorden voor een offerte?!',
        soundEffect: 'Error buzzer'
      },
      {
        frameNumber: 2,
        phase: 'demo',
        durationSeconds: 7,
        visualAction: 'Schermopname van het Creation+Alt+Fix Klantenportaal (/status/) op een iPhone.',
        spokenAudio: 'Kijk hoe wij het doen. Geen login, geen accounts aanmaken. De klant krijgt een beveiligde magic-link via WhatsApp.',
        onScreenOverlay: '📱 Klantenportaal: /status/ zonder login',
        soundEffect: 'Klik / Magic sparkle'
      },
      {
        frameNumber: 3,
        phase: 'solution',
        durationSeconds: 7,
        visualAction: 'Vinger tikt op het scherm: offerte wordt direct geopend, met 1 vinger op de knop "Digitaal Akkoord" en klaar.',
        spokenAudio: 'Je tikt op de link, ziet direct de fasen en offertes, en met 1 vinger geef je digitaal akkoord. Binnen 10 seconden geregeld.',
        onScreenOverlay: '✍️ Akkoord met 1 vinger op je scherm',
        soundEffect: 'Success ping'
      },
      {
        frameNumber: 4,
        phase: 'cta',
        durationSeconds: 5,
        visualAction: 'Eindframe met Creation+Alt+Fix logo en WhatsApp knop.',
        spokenAudio: 'Zo hoort technologie te werken: simpel, snel en zonder gedoe. Link in bio!',
        onScreenOverlay: '🚀 Simpel. Snel. Zonder gedoe.',
        soundEffect: 'Upbeat outro audio'
      }
    ],
    hashtags: ['#Klantportaal', '#Frictieloos', '#NoLoginMagic', '#Vaklieden', '#Groningen']
  },

  script_3_behind_the_scenes: {
    id: 'script_3_behind_the_scenes',
    title: 'Achter de Schermen: Lead Factory Live Scan',
    format: 'Instagram Story / Behind-the-Scenes',
    targetDurationSeconds: 22,
    aspectRatio: '9:16 vertical',
    hook: 'Achter de schermen: Hoe we in 30 minuten een lokale ondernemer online zetten.',
    frames: [
      {
        frameNumber: 1,
        phase: 'hook',
        durationSeconds: 5,
        visualAction: 'Camera scant langs dubbele monitoren in Hoogezand: links terminal met geautomatiseerde batch crawler, rechts browser.',
        spokenAudio: 'Even een kijkje achter de schermen bij Creation+Alt+Fix in Hoogezand.',
        onScreenOverlay: '🛠️ Achter de schermen in Hoogezand',
        soundEffect: 'Toetsenbord getik'
      },
      {
        frameNumber: 2,
        phase: 'demo',
        durationSeconds: 7,
        visualAction: 'Inzoomen op terminal die Google Maps inspecteert en automatisch responsive HTML5 genereert.',
        spokenAudio: 'Onze Lead Factory engine scant zojuist de regio Sappemeer op vakmensen die nog geen mobiele website hebben.',
        onScreenOverlay: '🤖 Lead Factory Batch Engine in actie',
        soundEffect: 'Data streaming chirp'
      },
      {
        frameNumber: 3,
        phase: 'solution',
        durationSeconds: 6,
        visualAction: 'Live preview van het gegenereerde concept met openingstijden en geverifieerde Google reviews.',
        spokenAudio: 'En kijk: binnen een paar seconden staat er een compleet werkend concept online, inclusief echte Google reviews en belknoppen.',
        onScreenOverlay: '🟢 Werkend concept binnen enkele seconden',
        soundEffect: 'Subtle chime'
      },
      {
        frameNumber: 4,
        phase: 'cta',
        durationSeconds: 4,
        visualAction: 'Vraagsticker met poll: "Heeft jouw bedrijf al een mobiele site?"',
        spokenAudio: 'Wil je zien hoe jouw bedrijf eruitziet? Stuur een berichtje!',
        onScreenOverlay: '💬 DM voor een gratis live concept',
        soundEffect: 'Notificatie blip'
      }
    ],
    hashtags: ['#BouwenInHetOpenbaar', '#LeadFactory', '#Hoogezand', '#SoloEngineer', '#AI']
  }
};

/**
 * Synthetiseert kant-en-klare, hoogwaardige LinkedIn post copy voor een specifieke dag.
 * Bevat speciale handgemaakte templates voor sleuteldagen (o.a. Dag 1, 3, 5, 8, 10, 15, 22, 28, 30)
 * en een robuuste dynamische generator voor de overige dagen.
 * 
 * @param {number} dayNumber (1..30)
 * @param {Object} [options]
 * @returns {Object} Gesynthetiseerde LinkedIn post met metadata
 */
export function synthesizeLinkedInPost(dayNumber, options = {}) {
  const day = Math.max(1, Math.min(30, Number(dayNumber) || 1));
  const calItem = SOCIAL_CALENDAR_30_DAYS.find(item => item.day === day) || SOCIAL_CALENDAR_30_DAYS[0];
  const pillar = BRANDING_PILLARS[calItem.pillarId] || BRANDING_PILLARS.p1_vakman;

  let body = '';
  let title = '';
  const customAuthor = options.author || BRANDING_CONFIG.author;
  const customPhone = options.phone || BRANDING_CONFIG.phoneDisplay;

  switch (day) {
    case 1:
      title = 'Vaklieden & De Brand Identity Illusie';
      body = `Vaklieden hebben geen tijd voor 6 meetings over een "brand identity traject".

Een schilder, loodgieter of hovenier wil maar 3 dingen:
1. Een website die binnen 1 seconde laadt op de smartphone van een klant.
2. Een duidelijke knop waarmee mensen direct kunnen bellen of een WhatsAppje sturen.
3. Geen gedoe met logins, trage plugins of facturen voor "uren schrijven".

Toch zie ik wekelijks offertes van traditionele bureaus voorbijkomen:
→ € 3.500,- voor een WordPress template met 42 plugins.
→ € 150,- per maand voor "beheer" (lees: 1x per maand op 'update plugins' klikken).
→ En als de klant belt met een vraag, staat de teller direct op € 95,- per uur.

Dat kan anders.

Als solo software-engineer bouw ik websites zonder logge frameworks of zware databases. 
Clean, veilig, en zo ontworpen dat een lokale ondernemer met 1 vinger op zijn scherm akkoord kan geven op een werkend concept.

Geen accountmanagers. Geen vage dashboards. Gewoon direct contact met de man die het bouwt.

Vakmanschap herkent vakmanschap. 🤝

Ben jij een ondernemer in Groningen of Drenthe en benieuwd hoe jouw bedrijf eruitziet in een hyper-modern jasje? Stuur me een berichtje.`;
      break;

    case 3:
      title = 'De 3-Seconden Regel & Mobiele Conversie';
      body = `De "3-seconden regel": Hoe 1 seconde vertraging een zzp'er € 2.000,- per maand kost.

Wanneer een particulier thuis lekkage heeft of met spoed een elektricien zoekt, grijpt hij naar zijn smartphone.
Wat gebeurt er als jouw website er 5.4 seconden over doet om te laden?

Onderzoek toont aan:
• 53% van de mobiele bezoekers klikt na 3 seconden wit scherm al weg.
• Google straft trage sites genadeloos af in de zoekresultaten.
• Elke gemiste bezoeker is een potentiële klus van € 500,- tot € 2.500,- die naar je concurrent gaat.

De oplossing is niet nóg een caching-plugin installeren.
De oplossing is zero-dependency webtechnologie: pure HTML, CSS en geoptimaliseerde assets.

Bij Creation+Alt+Fix laden onze sites in gemiddeld 0.4 seconde (sub-second).
Niet omdat we toveren, maar omdat we alle overbodige troep weglaten.

Hoe snel laadt jouw website op 4G? Test het eens op je eigen telefoon.`;
      break;

    case 5:
      title = 'Case Study Arnold Design: AI Bot Beveiliging';
      body = `Case Study Arnold Design: Hoe we met 7 regels code voorkwamen dat AI scrapers kunstwerken stelen.

Kunstenaars en ontwerpers lopen tegen een modern probleem aan: AI-crawlers en bots indexeren portfolio's zonder toestemming om beeldmodellen te trainen.

Voor Arnold Design (arnolddesign.nl) implementeerden we een waterdichte anti-scraping en DRM beschermingslaag:
1. Volledige blokkade van agressieve AI bot User-Agents (GPTBot, ClaudeBot, Bytespider) in .htaccess en robots.txt.
2. Afscherming van canvas en bronbestanden tegen geautomatiseerde downloads via custom HTTP headers.
3. Zero impact op de laadsnelheid: de site behoudt een 100/100 Lighthouse performance score.

Vakmanschap beschermen is minstens zo belangrijk als het tonen.

Als bouwer zorg ik dat technologie jouw werk beschermt, niet uitbuit.`;
      break;

    case 8:
      title = 'Geen Dashboards voor Schilders: WhatsApp Akkoord';
      body = `Geen dashboards voor schilders: Waarom mijn klanten akkoord geven via WhatsApp met 1 vinger.

Een schilder staat om 16:30 uur op de steiger met verf aan zijn handen.
Denk je echt dat hij dan gaat inloggen in een "klantportaal" met een tweestapsverificatie code per SMS?

Natuurlijk niet. En geef hem eens ongelijk.

Software moet zich aanpassen aan de mens, niet andersom.

Daarom hebben we ons statusportaal (/status/) zo ontworpen:
• De klant ontvangt een beveiligde magic link in WhatsApp.
• 1 tik opent direct het visuele projectoverzicht en de offerte.
• 1 druk op de knop "Digitaal Akkoord" legt het akkoord juridisch sluitend vast.
• Automatische iDEAL betaallink via Mollie voor de 50% aanbetaling.

Geen wachtwoorden onthouden. Geen handleidingen lezen. Gewoon doorgaan met je vak.

Frictieloos ondernemen is de toekomst van MKB-software.`;
      break;

    case 10:
      title = 'De Bureau-Mythe: Waarom € 4.500,- Vaak Slechter Is';
      body = `De bureau-mythe: Waarom een website van € 4.500,- vaak slechter presteert dan een concept van € 750,-.

Waar gaat je geld eigenlijk heen als je bij een traditioneel internetbureau aanklopt?
• De accountmanager die je koffie aanbiedt.
• De projectmanager die een wekelijkse statusmeeting plant.
• De junior designer die een kant-en-klaar ThemaForest template aanklikt.
• Het kantoorpand aan de gracht met een pingpongtafel.

Wat krijgt de ondernemer na 8 weken wachten?
Een trage site vol plug-ins die maandelijks onderhoud vereist.

Als solo software-engineer werk ik zonder die ballast.
Ik spreek je direct, bouw het concept binnen 48 uur en test alles op 100% Core Web Vitals en soevereine Nederlandse hosting.

Geen overhead. Geen ruis. Gewoon direct resultaat voor een eerlijke, vaste prijs.`;
      break;

    case 15:
      title = 'Solo Bouwen met AI: Snelheid als Superkracht';
      body = `Solo bouwen met AI: Hoe ik in 30 minuten een werkend concept neerzet dat direct live staat.

Vroeger had je voor een webproject een heel team nodig: copywriter, designer, front-ender en sysadmin.
Vandaag de dag is dat voor 90% van de lokale MKB-sites achterhaald.

Door het combineren van:
1. Onze eigen Lead Factory crawler (die reviews, openingstijden en contactinfo direct ophaalt);
2. Strakke Vanilla JS & HTML5 design tokens (zero-framework overhead);
3. Geautomatiseerde FTPS pipelines naar onze soevereine DirectAdmin servers;

...kan ik binnen 30 minuten een werkend concept live zetten op een preview-link.

Wanneer een lokale ondernemer zijn eigen bedrijfsnaam en Google reviews al werkend op zijn mobiel ziet staan, hoef ik niets meer te verkopen.
Het product bewijst zichzelf.

Dat is de kracht van solo-bouwen met AI-hefboom.`;
      break;

    case 22:
      title = 'De Google Maps Paradox: 4.8 Sterren Zonder Website';
      body = `De Google Maps paradox: 4.8 sterren op Google, maar potentiële klanten haken af.

Rondkijkend op Google Maps in de regio Hoogezand, Veendam en Sappemeer kom ik fantastische vakmensen tegen:
• Schildersbedrijven met 38 vijfsterren reviews.
• Loodgieters die al 15 jaar topwerk leveren.
• Meubelmakers met lovende aanbevelingen.

Maar wanneer je op de knop "Website" klikt:
→ Of er staat helemaal geen link.
→ Of je belandt op een dode Facebook-pagina uit 2018.
→ Of er verschijnt een 404-foutmelding.

In 2026 is je website je digitale voordeur.
Zonder snelle mobiele site gaan de grotere opdrachten automatisch naar een concurrent die wel online vindbaar is.

Daarom verrassen we deze ondernemers met een werkend, veilig concept. Geen verplichtingen, gewoon laten zien wat er mogelijk is.`;
      break;

    case 24:
      title = 'Tarieftransparantie: Van € 22,- naar € 95,- per Jaar';
      body = `Van € 22,- naar € 95,- per jaar: Hoe eerlijke communicatie leidde tot 100% klantbehoud.

Veel hostingproviders hanteren lokprijzen: het eerste jaar spotgoedkoop, daarna stilzwijgend verviervoudigen.
Daar doe ik niet aan mee.

Voor onze bestaande klanten introduceerden we voor 2027 het vaste Loyalty Tarief van € 95,- per jaar:
• Inclusief managed NVMe cloud hosting in Nederland;
• Automatische Let's Encrypt SSL-certificaten;
• Professionele spamfiltering en 24/7 uptime monitoring;
• Geen onverwachte facturen of kleine lettertjes.

Wat gebeurde er?
100% van de aangeschreven klanten ging direct akkoord.

Waarom? Omdat ondernemers rust willen. Ze willen weten wie de telefoon opneemt als er iets is, en ze waarderen eerlijke communicatie over kosten.`;
      break;

    case 28:
      title = 'De 90-Dagen Roadmap: Bouwen aan een Soeverein IT Ecosysteem';
      body = `De 90-dagen roadmap: Hoe we stap voor stap bouwen aan een soeverein IT ecosysteem in het Noorden.

Veel tech-startups dromen direct van Silicon Valley of Amsterdamse investeerders.
Mijn visie is nuchterder en veel concreter:

Vanuit Hoogezand bouwen we aan een gezond, winstgevend softwarebedrijf dat lokale vakmensen en het MKB écht vooruithelpt:
1. Fase 1: 50 lokale concepten lanceren en de regionale markt veroveren (Groningen & Drenthe).
2. Fase 2: 100% soevereine Nederlandse infrastructuur (MijnHost / DirectAdmin, zero afhankelijkheid van Big Tech surveillance).
3. Fase 3: Schalen naar € 100k ARR met terugkerende service- en security APK's.

Geen luchtkastelen. Gewoon elke dag een stukje betere software opleveren.

Vakmanschap uit het Noorden. 🇳🇱`;
      break;

    case 30:
      title = 'Maandafsluiting: 1 Maand Bouwen & Concrete Impact';
      body = `Samenvatting van 1 maand bouwen: 10 lokale vaklieden geholpen, 0 trage plugins gebruikt.

Een maand geleden lanceerden we de vernieuwde Creation+Alt+Fix Lead Factory en het klantenportaal.

De stand van zaken:
• 10+ lokale ondernemers voorzien van een vlijmscherpe, sub-second website.
• Gemiddelde laadtijd van alle opgeleverde sites: onder de 0.5 seconde.
• Klanttevredenheid: 100% behoud en nul storingsmeldingen.
• Frictieloze WhatsApp offertes die binnen enkele minuten digitaal geaccordeerd worden.

Dank aan alle ondernemers in Hoogezand, Groningen en omstreken voor het vertrouwen.

Op naar de volgende ronde. Heb jij een vraag over webtechnologie of wil je jouw site laten testen? Stuur me gerust een berichtje!`;
      break;

    default:
      // Dynamische generator voor de overige dagen
      title = `${calItem.theme}: ${calItem.hook}`;
      body = `${calItem.hook}.

Als solo software-engineer bij ${BRANDING_CONFIG.agency} in ${BRANDING_CONFIG.location} zie ik dagelijks hoe technologie lokale ondernemers kan versterken.

Belangrijkste inzichten voor vandaag:
• Lokale ondernemers hebben behoefte aan eenvoud, snelheid en directe bereikbaarheid via WhatsApp.
• Grote agencies maken simpele dingen nodeloos complex om hoge uurtarieven te rechtvaardigen.
• Met soevereine Nederlandse hosting en clean code laadt een website 10x sneller dan een standaard WordPress installatie.

${calItem.goalCta}.

Vragen over webontwikkeling of jouw eigen website laten scannen? Neem gerust contact op via ${customPhone} of stuur me een DM.`;
      break;
  }

  // Voeg hashtags toe aan de footer
  const fullText = `${body}\n\n${BRANDING_CONFIG.hashtags.join(' ')}`;
  const charCount = fullText.length;
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.round(wordCount / 180));

  return {
    day,
    title,
    theme: calItem.theme,
    hook: calItem.hook,
    channel: calItem.channel,
    format: calItem.format,
    pillarId: calItem.pillarId,
    pillarName: pillar.name,
    pillarBadge: pillar.badge,
    pillarColor: pillar.color,
    body,
    fullText,
    characterCount: charCount,
    wordCount,
    readTimeMinutes,
    hashtags: BRANDING_CONFIG.hashtags,
    author: customAuthor,
    callToAction: calItem.goalCta,
    isSundayRest: calItem.format === 'Rust'
  };
}

/**
 * Synthetiseert een gestructureerd Instagram Reel of Story script.
 * 
 * @param {string} scriptId ('script_1_speed_test' | 'script_2_no_login_flow' | 'script_3_behind_the_scenes')
 * @returns {Object} Script met frame-voor-frame regie en audiocues
 */
export function synthesizeStoryScript(scriptId = 'script_1_speed_test') {
  const scriptKey = String(scriptId).trim().toLowerCase();
  const script = STORY_REEL_SCRIPTS[scriptKey] || STORY_REEL_SCRIPTS.script_1_speed_test;

  const totalCalculatedDuration = script.frames.reduce((acc, f) => acc + (f.durationSeconds || 0), 0);

  return {
    ...script,
    totalCalculatedDuration,
    channel: 'Instagram',
    branding: BRANDING_CONFIG
  };
}

/**
 * Berekent de concrete publicatiedata voor de gehele 30-dagen kalender vanaf een specifieke startdatum.
 * Zondagen worden automatisch gemarkeerd als 'Rust & reflectie'.
 * 
 * @param {string|Date} startDate (bijv. '2026-10-26' of Date object)
 * @param {Array} [calendar]
 * @returns {Array<Object>} Kalender items met concrete publishDate (YYYY-MM-DD), dayOfWeek en isWeekend
 */
export function calculatePublishDates(startDate, calendar = SOCIAL_CALENDAR_30_DAYS) {
  const start = startDate ? new Date(startDate) : new Date('2026-10-26');
  if (isNaN(start.getTime())) {
    throw new Error('Ongeldige startdatum opgegeven voor social media kalender');
  }

  const daysOfWeek = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

  return calendar.map((item, index) => {
    const curDate = new Date(start.getTime() + (index * 24 * 60 * 60 * 1000));
    const dayOfWeekIndex = curDate.getDay();
    const dayOfWeek = daysOfWeek[dayOfWeekIndex];
    const isSunday = dayOfWeekIndex === 0;
    const isSaturday = dayOfWeekIndex === 6;
    const isoDate = curDate.toISOString().split('T')[0];

    const pillar = BRANDING_PILLARS[item.pillarId] || BRANDING_PILLARS.p1_vakman;

    return {
      ...item,
      publishDate: isoDate,
      dayOfWeek,
      isSunday,
      isSaturday,
      isRestDay: item.format === 'Rust' || isSunday,
      pillarName: pillar.name,
      pillarColor: pillar.color,
      pillarBadge: pillar.badge
    };
  });
}

/**
 * Filtert de social media kalender op kanaal, formaat, pijler of trefwoord.
 * 
 * @param {Array} calendar 
 * @param {Object} criteria { channel, format, pillarId, search }
 * @returns {Array} Gefilterde kalender
 */
export function filterSocialCalendar(calendar = SOCIAL_CALENDAR_30_DAYS, criteria = {}) {
  const { channel, format, pillarId, search } = criteria;
  const searchLower = search ? String(search).toLowerCase().trim() : '';

  return calendar.filter(item => {
    if (channel && channel !== 'all' && item.channel.toLowerCase() !== channel.toLowerCase()) {
      return false;
    }
    if (format && format !== 'all' && item.format.toLowerCase() !== format.toLowerCase()) {
      return false;
    }
    if (pillarId && pillarId !== 'all' && item.pillarId !== pillarId) {
      return false;
    }
    if (searchLower) {
      const matchHook = item.hook.toLowerCase().includes(searchLower);
      const matchTheme = item.theme.toLowerCase().includes(searchLower);
      const matchGoal = item.goalCta.toLowerCase().includes(searchLower);
      if (!matchHook && !matchTheme && !matchGoal) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Berekent realtime KPI-statistieken en bereikprognoses voor de social mediacampagne.
 * Gebruikt realistische Noord-Nederlandse MKB-bereikmultipliers voor organische LinkedIn & Instagram Stories.
 * 
 * @param {Array} [calendar]
 * @param {Array<number>} [publishedDays] Lijst van dagen die reeds gepubliceerd zijn (bijv. [1])
 * @returns {Object} Statistieken & telemetrie
 */
export function calculateSocialCampaignMetrics(calendar = SOCIAL_CALENDAR_30_DAYS, publishedDays = []) {
  const totalDays = calendar.length;
  const publishedSet = new Set((publishedDays || []).map(Number));

  let linkedInCount = 0;
  let instagramCount = 0;
  let restDaysCount = 0;
  let publishedCount = 0;

  const pillarCounts = {
    p1_vakman: 0,
    p2_tech_reality: 0,
    p3_solo_leverage: 0,
    p_rest: 0
  };

  calendar.forEach(item => {
    if (item.channel === 'LinkedIn') linkedInCount++;
    if (item.channel === 'Instagram') instagramCount++;
    if (item.format === 'Rust') restDaysCount++;

    if (pillarCounts[item.pillarId] !== undefined) {
      pillarCounts[item.pillarId]++;
    }

    if (publishedSet.has(item.day)) {
      publishedCount++;
    }
  });

  const scheduledCount = Math.max(0, totalDays - restDaysCount - publishedCount);
  const progressPercent = totalDays > 0 ? Math.round((publishedCount / (totalDays - restDaysCount)) * 100) : 0;

  // Realistische MKB bereik- en interactiecalculatie:
  // LinkedIn post: gem. 450 - 850 weergaven onder lokale MKB beslissers (factor 650)
  // Instagram story/reel: gem. 250 - 500 weergaven (factor 350)
  const estimatedReach = (linkedInCount * 650) + (instagramCount * 350);
  const estimatedInteractions = Math.round(estimatedReach * 0.048); // 4.8% organische interactiegraad

  return {
    totalDays,
    contentDays: totalDays - restDaysCount,
    linkedInCount,
    instagramCount,
    restDaysCount,
    publishedCount,
    scheduledCount,
    progressPercent,
    pillarDistribution: pillarCounts,
    estimatedReach,
    estimatedInteractions,
    author: BRANDING_CONFIG.author,
    agency: BRANDING_CONFIG.agency
  };
}

/**
 * Genereert een officiële LinkedIn Share Intent URL.
 * 
 * @param {string} targetUrl 
 * @param {string} summaryText 
 * @returns {string} URL encoded share intent
 */
export function generateLinkedInShareIntent(targetUrl = BRANDING_CONFIG.website, summaryText = '') {
  const cleanUrl = encodeURIComponent(targetUrl || BRANDING_CONFIG.website);
  const cleanSummary = encodeURIComponent((summaryText || '').slice(0, 256));
  return `https://www.linkedin.com/sharing/share-offsite/?url=${cleanUrl}&summary=${cleanSummary}`;
}

/**
 * Genereert een directe WhatsApp click-to-chat URL naar Allard's eigen telefoon (31619135453)
 * zodat een post met 1 klik naar zijn telefoon gestuurd kan worden om direct op LinkedIn/Instagram te plaatsen.
 * 
 * @param {string} text 
 * @param {string} [phone] 
 * @returns {string} wa.me URL
 */
export function generatePersonalWhatsAppDispatchUrl(text, phone = BRANDING_CONFIG.phoneInternational) {
  const cleanPhone = String(phone || BRANDING_CONFIG.phoneInternational).replace(/\D/g, '');
  const encodedText = encodeURIComponent(String(text || '').trim());
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Exporteert de complete contentkalender naar een representatief Markdown dossier.
 * 
 * @param {Array} [calendar] 
 * @param {Object} [options] 
 * @returns {string} Volledig Markdown document
 */
export function exportSocialCalendarToMarkdown(calendar = SOCIAL_CALENDAR_30_DAYS, options = {}) {
  const metrics = calculateSocialCampaignMetrics(calendar, options.publishedDays || [1]);
  const datedCalendar = calculatePublishDates(options.startDate || '2026-10-26', calendar);

  let md = `# 📱 Creation+Alt+Fix - Social Media & Personal Branding Kalender (TASK-843)\n\n`;
  md += `> **Auteur**: ${BRANDING_CONFIG.author} (${BRANDING_CONFIG.role})  \n`;
  md += `> **Bedrijf**: ${BRANDING_CONFIG.agency} (KvK ${BRANDING_CONFIG.kvk}) - ${BRANDING_CONFIG.location}  \n`;
  md += `> **Kanalen**: LinkedIn & Instagram Stories / Reels  \n`;
  md += `> **Doel**: Organische autoriteit & 20+ MKB-klanten in Noord-Nederland binden  \n\n`;

  md += `## 📊 Campagne Telemetrie & Bereik\n\n`;
  md += `| Metriek | Waarde |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Totale Kalenderduur** | **${metrics.totalDays} Dagen** |\n`;
  md += `| **LinkedIn Posts** | **${metrics.linkedInCount} Posts** |\n`;
  md += `| **Instagram Stories/Reels** | **${metrics.instagramCount} Items** |\n`;
  md += `| **Rustdagen (Zondag)** | **${metrics.restDaysCount} Dagen** |\n`;
  md += `| **Geschat Organisch Bereik** | **± ${metrics.estimatedReach.toLocaleString('nl-NL')} Weergaven** |\n`;
  md += `| **Geschatte Interacties (4.8%)** | **± ${metrics.estimatedInteractions.toLocaleString('nl-NL')} Reacties / DM's** |\n\n`;

  md += `## 📅 30-Dagen Planningsoverzicht\n\n`;
  md += `| Dag | Datum | Dag | Kanaal | Formaat | Pijler | Hook & Doel |\n`;
  md += `| :-: | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  datedCalendar.forEach(item => {
    md += `| **${String(item.day).padStart(2, '0')}** | ${item.publishDate} | ${item.dayOfWeek} | ${item.channel} | ${item.format} | ${item.pillarBadge} | *${item.hook}* |\n`;
  });

  md += `\n---\n\n`;
  md += `## ✍️ Uitgewerkte LinkedIn Posts (Sleuteldagen)\n\n`;

  [1, 3, 5, 8, 10, 15, 22, 28, 30].forEach(d => {
    const post = synthesizeLinkedInPost(d);
    md += `### Dag ${d} (${post.channel} - ${post.pillarBadge}): ${post.title}\n\n`;
    md += `\`\`\`text\n${post.body}\n\n${post.hashtags.join(' ')}\n\`\`\`\n\n`;
  });

  md += `---\n\n`;
  md += `## 🎬 Uitgewerkte Instagram Reels Scripts\n\n`;

  Object.values(STORY_REEL_SCRIPTS).forEach(scr => {
    md += `### ${scr.title} (${scr.format} - ${scr.targetDurationSeconds}s)\n\n`;
    md += `*Hook*: _"${scr.hook}"_\n\n`;
    scr.frames.forEach(f => {
      md += `- **Frame ${f.frameNumber} (${f.phase.toUpperCase()}, ${f.durationSeconds}s)**:  \n`;
      md += `  - *Beeld*: ${f.visualAction}  \n`;
      md += `  - *Tekst/Spraak*: "${f.spokenAudio}"  \n`;
      md += `  - *Overlay*: \`${f.onScreenOverlay}\`  \n`;
    });
    md += `\n`;
  });

  return md;
}

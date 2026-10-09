import { execFile } from 'child_process';
import util from 'util';
import { FACTORY_CONFIG } from '../config/factory-config.js';
import { applyCodeProtection } from '../security/code-drm.js';

const execFileAsync = util.promisify(execFile);

/**
 * Creation+Alt+Fix - AGY Generator Service
 * Roept de lokale Antigravity CLI ('agy --print') aan om complete websites en acquisitie-pitches
 * te programmeren met jouw actieve AI-abonnement (0 extra API-kosten!).
 * Biedt daarnaast een rijke interne multi-archetype generator met sector-specifieke
 * kleurenpaletten, typografie en layout-variaties zodat geen twee websites op elkaar lijken.
 */
export async function generateConceptWebsiteWithAgy(business) {
  console.log(`🤖 [AGY Engine] Start website & pitch generatie voor: "${business.name}" via lokale 'agy' CLI...`);

  const prompt = buildAgyPrompt(business);
  let generatedHtml = '';

  try {
    // Roep lokaal 'agy.exe --print' aan
    const { stdout, stderr } = await execFileAsync(
      FACTORY_CONFIG.agy.executable,
      [
        '-p',
        prompt,
        '--dangerously-skip-permissions'
      ],
      {
        timeout: FACTORY_CONFIG.agy.timeoutMs || 90000,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer voor complete HTML code
      }
    );

    if (stdout && stdout.trim().length > 100) {
      generatedHtml = cleanAgyOutput(stdout);
      console.log(`✅ [AGY Engine] Succesvol complete HTML ontvangen van 'agy' (${generatedHtml.length} bytes).`);
    } else {
      console.warn(`⚠️ [AGY Engine] Lege of korte output ontvangen van 'agy', schakel over naar multi-archetype generator.`);
      generatedHtml = buildFallbackTemplate(business);
    }
  } catch (error) {
    console.warn(`⚠️ [AGY Engine] Waarschuwing bij aanroepen van 'agy' (${error.message}). Genereren met interne dynamische template...`);
    generatedHtml = buildFallbackTemplate(business);
  }

  // 🔒 Beveilig de code met Anti-Theft DRM & Domain-Locking Killswitch
  generatedHtml = applyCodeProtection(generatedHtml, business);

  // Genereer bijpassende outreach e-mail pitch en WhatsApp bericht
  const pitch = buildOutreachPitch(business);

  return {
    html: generatedHtml,
    pitch: pitch
  };
}

/**
 * Bepaalt het design archetype, kleurenpalet, typografie en layout-invalshoek
 * zodat gegenereerde websites NIET op elkaar lijken en optimaal aansluiten bij de branche.
 */
export function resolveDesignArchetype(b) {
  const text = `${b.category || ''} ${b.name || ''} ${b.slug || ''}`.toLowerCase();
  const hash = (b.slug || b.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Sector matching
  const isGarden = /hovenier|tuin|boom|groen|bestrating|grondwerk|sierbestrating|straatmaker|tegelzet|terras|buitenwerk|grondverzet/.test(text);
  const isPainter = /schilder|verf|lak|stuc|stukadoor|afbouw|behang|wandafwerk|glaszet/.test(text);
  const isMechanic = /fiets|rijwiel|scooter|auto|garage|banden|apk|motor|monteur|carrosserie|reparatie|onderhoud|mechanic/.test(text);
  const isInstaller = /loodgieter|install|elektra|elektro|warmtepomp|sanitair|cv|ketel|airco|dakdek|leiding|storing/.test(text);
  const isBeauty = /kapper|kapsalon|salon|beauty|wellness|massage|nagel|pedicure|schoonheid|barber|coach|horeca|catering/.test(text);
  const isDelivery = /koerier|delivery|transport|logistiek|verhuis|pakket/.test(text);

  let archetypeKey = 'GENERAL_TRADE';
  if (isGarden) archetypeKey = 'GARDEN_EARTH';
  else if (isPainter) archetypeKey = 'ARTISAN_PAINTER';
  else if (isMechanic) archetypeKey = 'SPEED_MECHANIC';
  else if (isInstaller) archetypeKey = 'TECHNICAL_INSTALLER';
  else if (isBeauty) archetypeKey = 'ELEGANT_LIFESTYLE';
  else if (isDelivery) archetypeKey = 'LOGISTICS_EXPRESS';
  else if (hash % 3 === 0) archetypeKey = 'MODERN_LIGHT'; // 33% van algemene bedrijven krijgt fris wit licht-thema

  // Layout variant: 0 = Split Hero met Snelle Contact Widget, 1 = Monumentale Centered Hero met Stat Counters, 2 = High-Action Direct Bellen Hero
  const layoutVariant = hash % 3;

  switch (archetypeKey) {
    case 'GARDEN_EARTH':
      return {
        key: 'GARDEN_EARTH',
        name: 'Natuur & Buitenruimte (Organisch Emerald & Amber)',
        isLightMode: false,
        fontFamily: "'Outfit', -apple-system, sans-serif",
        fontLink: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap',
        cssVars: `
          --bg-dark: #051911;
          --bg-header: rgba(5, 25, 17, 0.92);
          --bg-card: rgba(14, 38, 27, 0.75);
          --accent: #10B981;
          --accent-hover: #059669;
          --accent-subtle: rgba(16, 185, 129, 0.15);
          --accent-secondary: #F59E0B;
          --text-main: #F0FDF4;
          --text-muted: #86EFAC;
          --border: rgba(52, 211, 153, 0.22);
          --shadow: 0 14px 35px rgba(5, 25, 17, 0.6);
        `,
        badgeText: '🌿 Specialist in Tuin, Bestrating & Buitenwerk',
        heroHeading: `Duurzaam Buitenwerk & Karaktervolle Tuinen door ${b.name}`,
        heroSubtitle: 'Van solide sierbestrating en grondverzet tot complete tuinrenovaties. Eerlijk vakmanschap met oog voor natuur en duurzaamheid.',
        usps: [
          'Alles onder één dak: van advies tot oplevering',
          'Duurzame materialen & vakkundig grondwerk',
          'Garantie op bestrating & verzakkingsvrij resultaat'
        ],
        processSteps: [
          { nr: '01', title: 'Locatiebezoek & Advies', desc: 'We bekijken uw tuin of terrein en bespreken uw specifieke wensen.' },
          { nr: '02', title: 'Transparante Offerte', desc: 'U ontvangt een heldere prijsopgave zonder onverwachte meerkosten.' },
          { nr: '03', title: 'Vakkundige Uitvoering', desc: 'Met professioneel materieel realiseren we uw project tot in de puntjes.' }
        ],
        layoutVariant,
        promptPaletteAdvice: 'Diep natuurlijk bosgroen/donker leisteen (#051911 of #0A2218) met levendig smaragdgroen (#10B981) en warme aardetinten (#F59E0B)',
        layoutVibe: 'Organisch, warm en aards met ronde hoeken en natuur-accenten'
      };

    case 'ARTISAN_PAINTER':
      return {
        key: 'ARTISAN_PAINTER',
        name: 'Schilder & Afwerking (Studio Obsidian & Artisan Gold)',
        isLightMode: false,
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
        cssVars: `
          --bg-dark: #0A0E17;
          --bg-header: rgba(10, 14, 23, 0.92);
          --bg-card: rgba(20, 28, 44, 0.8);
          --accent: #F59E0B;
          --accent-hover: #D97706;
          --accent-subtle: rgba(245, 158, 11, 0.14);
          --accent-secondary: #38BDF8;
          --text-main: #F8FAFC;
          --text-muted: #94A3B8;
          --border: rgba(245, 158, 11, 0.25);
          --shadow: 0 14px 35px rgba(10, 14, 23, 0.7);
        `,
        badgeText: '🎨 Strak Schilderwerk & Vlekkeloze Afwerking',
        heroHeading: `Ambachtelijk Schilderwerk & Duurzame Bescherming bij ${b.name}`,
        heroSubtitle: 'Voor binnen- en buitenschilderwerk van het hoogste niveau. Stofvrij schuren, professioneel kleuradvies en jarenlange bescherming van uw houtwerk.',
        usps: [
          'Stofvrij schuren met professionele afzuiging',
          'Kleur- en stijladvies op maat aan huis',
          'Tot 5 jaar garantie op hoogwaardig buitenschilderwerk'
        ],
        processSteps: [
          { nr: '01', title: 'Inspectie & Kleuradvies', desc: 'We controleren het houtwerk en adviseren de juiste lakken en kleuren.' },
          { nr: '02', title: 'Vrijblijvende Prijsopgave', desc: 'Een gedetailleerde offerte inclusief materialen, steigers en planning.' },
          { nr: '03', title: 'Strakke Oplevering', desc: 'Vlekkeloze laklagen, schone werkplek en een strak eindresultaat.' }
        ],
        layoutVariant,
        promptPaletteAdvice: 'Diep architectonisch studio leisteen (#0A0E17) met warm ambachtelijk goud/amber (#F59E0B) en scherpe lichte typografie',
        layoutVibe: 'Strak, elegant studio gevoel met gouden accentlijnen en precisie'
      };

    case 'SPEED_MECHANIC':
      return {
        key: 'SPEED_MECHANIC',
        name: 'Snelle Reparatie & Techniek (Carbon & Flame Orange)',
        isLightMode: false,
        fontFamily: "'Space Grotesk', -apple-system, sans-serif",
        fontLink: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap',
        cssVars: `
          --bg-dark: #090A0E;
          --bg-header: rgba(9, 10, 14, 0.94);
          --bg-card: rgba(20, 23, 33, 0.85);
          --accent: #FF5722;
          --accent-hover: #E64A19;
          --accent-subtle: rgba(255, 87, 34, 0.16);
          --accent-secondary: #3B82F6;
          --text-main: #FFFFFF;
          --text-muted: #A1A1AA;
          --border: rgba(255, 87, 34, 0.28);
          --shadow: 0 14px 35px rgba(0, 0, 0, 0.8);
        `,
        badgeText: '⚡ Snelle Service & Betrouwbare Reparatie',
        heroHeading: `Snel & Veilig Weer Onderweg met ${b.name}`,
        heroSubtitle: 'Geen ellenlange wachttijden. Snelle vakkundige diagnose, heldere prijsopgave vooraf en uw tweewieler of voertuig snel weer gereed.',
        usps: [
          'Vaak binnen 24 uur weer rijklaar',
          'Vooraf altijd een duidelijke prijsopgave zonder verrassingen',
          'Vakmanschap met hoogwaardige merkonderdelen'
        ],
        processSteps: [
          { nr: '01', title: 'Brengen of Aanmelden', desc: 'Loop binnen of stuur een WhatsApp voor een snelle inspectie.' },
          { nr: '02', title: 'Diagnose & Prijsakkoord', desc: 'We bellen of appen vooraf de exacte kosten door.' },
          { nr: '03', title: 'Rijklaar & Getest', desc: 'Vakkundig gerepareerd en na een grondige test weer veilig mee.' }
        ],
        layoutVariant,
        promptPaletteAdvice: 'Diep carbon zwart (#090A0E) met high-octane flame orange (#FF5722) en koele staaltinten (#A1A1AA)',
        layoutVibe: 'Snel, dynamisch, technisch en krachtig met opvallende actieknoppen'
      };

    case 'TECHNICAL_INSTALLER':
      return {
        key: 'TECHNICAL_INSTALLER',
        name: 'Erkend Installateur (Maritime Navy & Electric Cobalt)',
        isLightMode: false,
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
        cssVars: `
          --bg-dark: #060E1A;
          --bg-header: rgba(6, 14, 26, 0.92);
          --bg-card: rgba(15, 30, 56, 0.8);
          --accent: #2563EB;
          --accent-hover: #1D4ED8;
          --accent-subtle: rgba(37, 99, 235, 0.16);
          --accent-secondary: #06B6D4;
          --text-main: #F0F9FF;
          --text-muted: #94A3B8;
          --border: rgba(56, 189, 248, 0.25);
          --shadow: 0 14px 35px rgba(6, 14, 26, 0.7);
        `,
        badgeText: '🔧 Erkend Installateur & Snelle Hulp bij Storingen',
        heroHeading: `Betrouwbare Installatietechniek & Vakkundige Hulp bij ${b.name}`,
        heroSubtitle: 'Van cv-ketels, warmtepompen en sanitair tot complete elektrotechnische installaties. Veilig en gecertificeerd gemonteerd volgens de strengste normen.',
        usps: [
          'Gecertificeerd vakmanschap en veilige montage',
          'Directe hulp en snelle service bij urgente storingen',
          'Transparante all-in tarieven zonder vage toeslagen'
        ],
        processSteps: [
          { nr: '01', title: 'Storing of Wens Doorgeven', desc: 'Neem telefonisch contact op of stuur direct een WhatsApp.' },
          { nr: '02', title: 'Snelle Planning', desc: 'We stemmen snel een afspraak af met een vakkundige monteur.' },
          { nr: '03', title: 'Veilige Oplevering', desc: 'Montage en afstelling volgens de norm met schriftelijke garantie.' }
        ],
        layoutVariant,
        promptPaletteAdvice: 'Diep marineblauw (#060E1A) met elektrisch kobalt (#2563EB) en helder cyaan (#06B6D4)',
        layoutVibe: 'Betrouwbaar, technisch, gecertificeerd met live bereikbaarheidsstatus'
      };

    case 'LOGISTICS_EXPRESS':
      return {
        key: 'LOGISTICS_EXPRESS',
        name: 'Snelle Logistiek & Transport (Steel Navy & Signal Blue)',
        isLightMode: false,
        fontFamily: "'Space Grotesk', -apple-system, sans-serif",
        fontLink: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;600&display=swap',
        cssVars: `
          --bg-dark: #0A0F1D;
          --bg-header: rgba(10, 15, 29, 0.94);
          --bg-card: rgba(18, 26, 46, 0.85);
          --accent: #3B82F6;
          --accent-hover: #2563EB;
          --accent-subtle: rgba(59, 130, 246, 0.15);
          --accent-secondary: #F59E0B;
          --text-main: #F8FAFC;
          --text-muted: #94A3B8;
          --border: rgba(59, 130, 246, 0.25);
          --shadow: 0 14px 35px rgba(10, 15, 29, 0.7);
        `,
        badgeText: '🚚 Betrouwbaar Transport & Snelle Koeriersdienst',
        heroHeading: `Stipt & Veilig Bezorgd door ${b.name}`,
        heroSubtitle: 'Voor spoedzendingen, regionaal transport en betrouwbare pakketbezorging. Altijd op tijd, met zorg behandeld en direct contact met de chauffeur.',
        usps: [
          'Vaste afspraken en 100% stipte levering',
          'Flexibele spoedritten in Groningen en heel Nederland',
          'Zorgvuldige en schadevrije goederenbehandeling'
        ],
        processSteps: [
          { nr: '01', title: 'Rit Aanmelden', desc: 'Geef ophaal- en afleverlocatie eenvoudig door per telefoon of WhatsApp.' },
          { nr: '02', title: 'Direct Onderweg', desc: 'We plannen de snelste route en vertrekken op het afgesproken tijdstip.' },
          { nr: '03', title: 'Veilig Afgeleverd', desc: 'Ontvangstbevestiging met handtekening en directe terugkoppeling.' }
        ],
        layoutVariant,
        promptPaletteAdvice: 'Modern transport marineblauw (#0A0F1D) met signaal-blauw (#3B82F6) en warm amber (#F59E0B)',
        layoutVibe: 'Stipt, energiek, betrouwbaar en snel'
      };

    case 'ELEGANT_LIFESTYLE':
      return {
        key: 'ELEGANT_LIFESTYLE',
        name: 'Boutique Lifestyle & Care (Velvet & Rose Quartz)',
        isLightMode: false,
        fontFamily: "'Outfit', -apple-system, sans-serif",
        fontLink: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap',
        cssVars: `
          --bg-dark: #12091B;
          --bg-header: rgba(18, 9, 27, 0.92);
          --bg-card: rgba(32, 17, 49, 0.8);
          --accent: #FB7185;
          --accent-hover: #F43F5E;
          --accent-subtle: rgba(251, 113, 133, 0.16);
          --accent-secondary: #FBBF24;
          --text-main: #FFF1F2;
          --text-muted: #FDA4AF;
          --border: rgba(251, 113, 133, 0.25);
          --shadow: 0 14px 35px rgba(18, 9, 27, 0.8);
        `,
        badgeText: '✨ Persoonlijke Aandacht, Schoonheid & Verzorging',
        heroHeading: `Stijl, Persoonlijke Aandacht & Pure Verwennerij bij ${b.name}`,
        heroSubtitle: 'Neem even de tijd voor uzelf in een ontspannen, gastvrije salon. Persoonlijk advies en behandelingen op maat met uitsluitend kwaliteitsproducten.',
        usps: [
          'Persoonlijke aandacht & tijd voor elke klant',
          'Uitsluitend gecertificeerde topproducten',
          'Eenvoudig online of via WhatsApp een afspraak maken'
        ],
        processSteps: [
          { nr: '01', title: 'Behandeling Kiezen', desc: 'Kies uw gewenste behandeling en stem de tijd makkelijk af.' },
          { nr: '02', title: 'Ontspannen Ontvangst', desc: 'Geniet van een warm welkom en deskundig persoonlijk advies.' },
          { nr: '03', title: 'Stralend Naar Huis', desc: 'Verlaat de salon verzorgd, ontspannen en vol zelfvertrouwen.' }
        ],
        layoutVariant,
        promptPaletteAdvice: 'Diep fluweelpaars (#12091B) met zacht rozenkwarts (#FB7185) en champagne goud (#FBBF24)',
        layoutVibe: 'Luxe boutique gevoel met zachte ronde vormen en elegante accenten'
      };

    case 'MODERN_LIGHT':
      return {
        key: 'MODERN_LIGHT',
        name: 'Fresh Modern Light Mode (Clean Canvas & Royal Ultramarine)',
        isLightMode: true,
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
        cssVars: `
          --bg-dark: #F8FAFC;
          --bg-header: rgba(255, 255, 255, 0.95);
          --bg-card: #FFFFFF;
          --accent: #2563EB;
          --accent-hover: #1D4ED8;
          --accent-subtle: rgba(37, 99, 235, 0.08);
          --accent-secondary: #10B981;
          --text-main: #0F172A;
          --text-muted: #64748B;
          --border: #E2E8F0;
          --shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04);
        `,
        badgeText: '✨ Betrouwbaar & Zorgeloos Geregeld',
        heroHeading: `Zorgeloos Vakmanschap & Persoonlijke Service bij ${b.name}`,
        heroSubtitle: 'Voor particulieren en bedrijven die kiezen voor heldere afspraken, snelle communicatie en een vakkundige uitvoering zonder verrassingen.',
        usps: [
          'Transparante all-in tarieven zonder verborgen kosten',
          'Binnen 24 uur antwoord op al uw vragen en aanvragen',
          'Vakmanschap met focus op kwaliteit en tevredenheid'
        ],
        processSteps: [
          { nr: '01', title: 'Vrijblijvende Aanvraag', desc: 'Neem contact op via telefoon, WhatsApp of het formulier.' },
          { nr: '02', title: 'Duidelijk Plan & Prijs', desc: 'U ontvangt snel een overzichtelijke offerte op maat.' },
          { nr: '03', title: 'Vakkundige Realisatie', desc: 'Netjes uitgevoerd en betrouwbaar opgeleverd volgens planning.' }
        ],
        layoutVariant,
        promptPaletteAdvice: 'Fris, hyper-modern licht canvas (#F8FAFC) met zuiver witte kaarten (#FFFFFF), koninklijk blauw (#2563EB) en antraciet typografie (#0F172A)',
        layoutVibe: 'Licht, fris, helder, professioneel en open met zachte schaduwen'
      };

    case 'GENERAL_TRADE':
    default:
      return {
        key: 'GENERAL_TRADE',
        name: 'Moderne Vakman & Dienstverlener (Deep Indigo & Cyan)',
        isLightMode: false,
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
        cssVars: `
          --bg-dark: #0B0F19;
          --bg-header: rgba(11, 15, 25, 0.92);
          --bg-card: rgba(17, 24, 39, 0.8);
          --accent: #06B6D4;
          --accent-hover: #0891B2;
          --accent-subtle: rgba(6, 182, 212, 0.15);
          --accent-secondary: #6366F1;
          --text-main: #F8FAFC;
          --text-muted: #94A3B8;
          --border: rgba(255, 255, 255, 0.1);
          --shadow: 0 14px 35px rgba(0, 0, 0, 0.6);
        `,
        badgeText: '⭐ Lokale Betrouwbaarheid & Kwaliteit',
        heroHeading: `Kwaliteit, Betrouwbaarheid & Vakwerk bij ${b.name}`,
        heroSubtitle: 'Voor particulieren en bedrijven die gaan voor een vakkundige uitvoering, betrouwbare afspraken en duurzaam resultaat.',
        usps: [
          'Lokale specialist met oog voor detail',
          'Vrijblijvende prijsopgave vooraf zonder kleine lettertjes',
          'Eerlijke communicatie en vlotte oplevering'
        ],
        processSteps: [
          { nr: '01', title: 'Eerste Contact', desc: 'Neem contact op voor een snelle afstemming van uw klus of vraag.' },
          { nr: '02', title: 'Helder Voorstel', desc: 'U ontvangt een transparant en eerlijk prijsvoorstel.' },
          { nr: '03', title: 'Net Opleveren', desc: 'Vakkundig uitgevoerd en schoon opgeleverd volgens afspraak.' }
        ],
        layoutVariant,
        promptPaletteAdvice: 'Donkerblauwe premium achtergrond (#0B0F19) met cyaan (#06B6D4) of indigo (#6366F1) en scherpe witte teksten',
        layoutVibe: 'Strak, technologisch, modern en conversiegericht'
      };
  }
}

/**
 * Construeert de prompt voor 'agy --print' met expliciete vraag om ontwerpdiversiteit en improvisatie
 */
function buildAgyPrompt(b) {
  const theme = resolveDesignArchetype(b);

  const reviewsSummary = (b.reviews && b.reviews.length > 0)
    ? b.reviews.map(r => `"${r.text}" - ${r.author}`).join("\n")
    : "Vriendelijke service, betrouwbaar en snel klaar volgens afspraak!";

  const servicesList = (b.suggestedServices || [])
    .map(s => `- ${s.title}: ${s.desc}`)
    .join("\n");

  return `
Je bent de hoofdontwikkelaar van Creation+Alt+Fix. Bouw een hyper-moderne, conversiegerichte, complete responsive HTML5 single-page website voor het volgende ZZP bedrijf:

Bedrijfsnaam: ${b.name}
Branche / Categorie: ${b.category || 'Vakmanschap & ZZP Dienstverlening'}
Plaats / Regio: ${b.address || 'Regio Hoogezand / Groningen'}
Telefoonnummer: ${b.phone || '06 12345678'}
Gemiddelde beoordeling: ${b.rating ? b.rating + ' sterren (' + (b.reviewsCount || 0) + ' reviews)' : '5 sterren'}
Echte reviews van klanten:
${reviewsSummary}

Voorgestelde Diensten:
${servicesList}

Belangrijke Ontwerp- & Improvisatie-eisen:
1. Volledig zelfstandig HTML5 bestand inclusief ingebedde moderne CSS (<style>) en lichte Vanilla JS (<script>).
2. VOORKOM EENTONIGHEID & GENERIEKE CLONES (CRUCIAAL!):
   Creation+Alt+Fix wil dat elke gegenereerde website een uniek, eigen karakter heeft dat écht past bij de onderneming!
   - Aanbevolen stijlarchetype voor dit bedrijf: ${theme.name}
   - Aanbevolen kleurenpalet: ${theme.promptPaletteAdvice}
   - Aanbevolen Google Font: ${theme.fontFamily} (laad netjes in via Google Fonts)
   - Aanbevolen ontwerpsfeer: ${theme.layoutVibe}
3. Wees creatief met de Hero layout en sectie-opbouw:
   - Improviseer met de indeling: wissel af tussen een split-screen hero (links wervende tekst + USPs, rechts een interactieve snelle contactkaart), of een monumentale gecentreerde hero met floating statistiek-tellers.
   - Schrijf wervende, branche-specifieke teksten in plaats van generieke standaardzinnen.
   - Voeg onderscheidende elementen toe, zoals een 'Hoe wij werken in 3 stappen' proces, garantiebanners, of een interactief offerte-aanvraag formulier.
4. Responsive voor mobiel, tablet en desktop (mobile-first!).
5. Secties:
   - Sticky Header met logo/naam en direct bellen/WhatsApp knop.
   - Hero sectie afgestemd op ${b.name} met wervende titel, ondertitel en USP badges.
   - Diensten Grid met mooie kaarten en interactieve hover-effecten.
   - Werkwijze in 3 stappen of Waarom Kiezen Voor Ons sectie.
   - Echte Klantbeoordelingen (toon de Google reviews!).
   - Contact sectie met direct telefoonnummer, WhatsApp knop en strak contactformulier.
   - Footer met copyright en LocalBusiness Schema (JSON-LD).
6. Plaats helemaal bovenaan een subtiele, professionele concept-banner:
   <div style="background: linear-gradient(90deg, #1E1B4B, #0F172A); color: #E0E7FF; padding: 10px 20px; font-size: 0.85rem; text-align: center; border-bottom: 1px solid rgba(99,102,241,0.3); font-family: sans-serif;">
     ✨ <strong>Concept Demonstratie</strong> gemaakt door Creation+Alt+Fix voor ${b.name} • <a href="https://creationaltfix.nl" target="_blank" style="color: #38BDF8; text-decoration: underline; margin-left: 6px;">Website overnemen of aanpassen?</a>
   </div>

GEEF ALLEEN DE COMPLETE, VALIDE HTML CODE TERUG. GEEN UITLEG, GEEN MARKDOWN BLOKKEN.
`.trim();
}

/**
 * Verwijdert markdown ```html code wrappers
 */
function cleanAgyOutput(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```html')) {
    cleaned = cleaned.replace(/^```html\s*/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Genereert de persoonlijke acquisitie e-mail en WhatsApp pitch
 */
export function buildOutreachPitch(b) {
  const conceptUrl = `${FACTORY_CONFIG.conceptBaseUrl}/${b.slug}/`;
  const domain = b.recommendedDomain || `${b.slug}.nl`;
  const archetype = b.archetype || 'A_TRADE_DIRECT';
  const archetypeLabel = b.archetypeLabel || 'Nuchter & Direct Bellen (Vakman)';

  // 1. Onderwerpregel afgestemd op archetype
  let subject = `Concept website voor ${b.name} in Hoogezand`;
  if (archetype === 'B_PRESENTATION_REVIEWS') {
    subject = `Online visitekaartje & reviews voor ${b.name}`;
  } else if (archetype === 'C_MODERNISATION') {
    subject = `Veilige mobiele website-update voor ${b.name} (concept)`;
  }

  // 2. Archetype-specifieke voordelen
  let bulletsHtml = '';
  let bulletsPlain = '';

  if (archetype === 'C_MODERNISATION') {
    bulletsHtml = `
    <li><strong>Direct beveiligd met SSL (HTTPS):</strong> Geen rode 'Niet beveiligd' browserwaarschuwing meer</li>
    <li><strong>Supersnel op mobiel:</strong> Direct responsive voor bezoekers op smartphones</li>
    <li><strong>Jouw Google reviews:</strong> (${b.rating ? b.rating + ' sterren' : 'uitstekende reputatie'}) direct zichtbaar</li>
    <li><strong>Direct contact:</strong> Klanten kunnen met 1 klik bellen of een WhatsApp sturen</li>`;
    bulletsPlain = `
- Direct beveiligd met SSL (HTTPS): Geen 'Niet beveiligd' melding meer in Google Chrome
- Supersnel en perfect werkend op smartphones
- Jouw Google reviews (${b.rating ? b.rating + ' sterren' : 'hoge reputatie'}) netjes uitgelicht
- Direct bellen & WhatsApp knop voor potentiële klanten`;
  } else if (archetype === 'B_PRESENTATION_REVIEWS') {
    bulletsHtml = `
    <li><strong>Representatieve uitstraling:</strong> Prachtige presentatie van jouw diensten en sfeer</li>
    <li><strong>Jouw Google reviews (${b.rating ? b.rating + ' sterren' : '5 sterren'}):</strong> Geven nieuwe klanten direct vertrouwen</li>
    <li><strong>Laagdrempelig contact:</strong> Bezoekers plannen makkelijk een afspraak of sturen direct een WhatsApp</li>
    <li><strong>Lokale vindbaarheid:</strong> Geoptimaliseerd voor Hoogezand en omstreken</li>`;
    bulletsPlain = `
- Representatieve uitstraling: Mooie presentatie van jouw diensten en behandelingen
- Jouw Google reviews (${b.rating ? b.rating + ' sterren' : '5 sterren'}) prominent in beeld
- Laagdrempelig contact via bellen en WhatsApp
- Lokale vindbaarheid in en rondom Hoogezand`;
  } else {
    // Archetype A (Vakman / Bouw / Direct)
    bulletsHtml = `
    <li><strong>Direct bellen & WhatsApp:</strong> Zodat particulieren bij een klus niet verder zoeken naar een ander</li>
    <li><strong>Supersnel & mobiel-eerst:</strong> Laadt in minder dan een seconde op smartphones</li>
    <li><strong>Jouw Google vakwerk reviews:</strong> (${b.rating ? b.rating + ' sterren' : 'hoge beoordeling'}) betrouwbaar in beeld</li>
    <li><strong>Lokale vindbaarheid (SEO):</strong> Hoger scoren op Google in regio Hoogezand / Groningen</li>`;
    bulletsPlain = `
- Direct bellen & WhatsApp knop: Zodat particulieren met een klus je direct bereiken
- Supersnel ladend op smartphones
- Jouw Google vakwerk reviews (${b.rating ? b.rating + ' sterren' : 'hoge score'}) betrouwbaar in beeld
- Lokale vindbaarheid in regio Hoogezand / Groningen`;
  }

  // 3. HTML E-mail Body (Uitgebreide, persoonlijke acquisitie-e-mail)
  const ratingStars = b.rating ? '★'.repeat(Math.round(b.rating)) + ` ${b.rating}/5` : '★★★★★ 5/5';
  const reviewCountLine = b.reviewsCount && b.reviewsCount > 0
    ? `(${b.reviewsCount} geverifieerde Google reviews)`
    : '(geverifieerde Google beoordeling)';

  const bodyHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; color: #1e293b; line-height: 1.7; font-size: 15px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">

  <!-- Header Banner -->
  <div style="background: linear-gradient(135deg, #0F172A, #1E3A5F); padding: 24px 28px; text-align: center;">
    <p style="color: #94A3B8; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Creation+Alt+Fix · Hoogezand</p>
    <h2 style="color: #F8FAFC; margin: 0; font-size: 1.4rem; font-weight: 700;">Vrijblijvend Concept voor ${b.name}</h2>
    <p style="color: #38BDF8; font-size: 0.9rem; margin: 8px 0 0;">✨ Al klaar en direct te bekijken op je telefoon</p>
  </div>

  <!-- Body -->
  <div style="padding: 28px 32px;">
    <p style="font-size: 16px; margin-top: 0;">Beste ${b.name},</p>

    <p>${b.pitchHook}</p>

    <p>Mijn naam is <strong>Allard Veldman</strong> en ik run <strong>Creation+Alt+Fix</strong> vanuit Hoogezand. Ik help lokale ZZP'ers en kleine bedrijven in Groningen en Drenthe aan een professionele online aanwezigheid die écht werkt op mobiel — snel, duidelijk, en met directe contactknoppen zodat klanten met één klik kunnen bellen of appen.</p>

    <p>Ik heb alvast <strong>gratis en vrijblijvend</strong> een compleet, werkend concept voor je gebouwd. Geen template-rommel, maar een website specifiek voor <strong>${b.name}</strong> — inclusief jouw ${b.category || 'diensten'}, contactgegevens${b.rating ? ` en je Google beoordeling van <strong>${ratingStars}</strong> ${reviewCountLine}` : ''}.</p>

    <!-- CTA Knop -->
    <div style="margin: 30px 0; text-align: center;">
      <a href="${conceptUrl}" style="background: linear-gradient(135deg, #2563EB, #1D4ED8); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35); font-size: 1rem;">
        👉 Bekijk hier jouw Concept Website
      </a>
      <p style="font-size: 12px; color: #64748b; margin: 10px 0 0;">Werkt direct op je telefoon of laptop • Geen login nodig</p>
    </div>

    <!-- Wat zit erin -->
    <p style="margin-bottom: 10px;"><strong>Wat zit er al in dit concept voor ${b.name}:</strong></p>
    <ul style="padding-left: 20px; line-height: 2; margin-bottom: 20px;">
      ${bulletsHtml}
      <li><strong>Professionele uitstraling:</strong> Responsive design dat op elk scherm perfect werkt</li>
      <li><strong>LocalBusiness SEO:</strong> Google-geoptimaliseerde metadata voor betere lokale vindbaarheid</li>
    </ul>

    <!-- Prijsblok -->
    <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-left: 5px solid #2563EB; padding: 18px 20px; border-radius: 8px; margin: 24px 0;">
      <p style="font-size: 1rem; font-weight: 700; color: #0F172A; margin: 0 0 12px;">💶 Transparant over de investering</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.92rem;">
        <tr>
          <td style="padding: 6px 0; vertical-align: top; width: 55%;"><strong>Website realisatie</strong><br><span style="color: #64748b; font-size: 0.85rem;">Eenmalig, volledig op maat</span></td>
          <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #2563EB; font-size: 1.1rem;">v.a. € 199,-</td>
        </tr>
        <tr style="border-top: 1px solid #CBD5E1;">
          <td style="padding: 6px 0; vertical-align: top;"><strong>Managed Hosting All-in</strong><br><span style="color: #64748b; font-size: 0.85rem;">Domein ${domain}, SSL, 5 mailboxen, back-ups, 30 min service/jaar</span></td>
          <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #2563EB; font-size: 1.1rem;">€ 150,- / jaar</td>
        </tr>
        <tr style="border-top: 1px solid #CBD5E1;">
          <td style="padding: 6px 0; vertical-align: top;"><strong>Persoonlijk Klantenportaal</strong><br><span style="color: #64748b; font-size: 0.85rem;">portal.creationaltfix.nl voor live feedback & revisies</span></td>
          <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #10B981;">Gratis inbegrepen</td>
        </tr>
      </table>
    </div>

    <!-- Wat gebeurt er als je ja zegt -->
    <p style="font-weight: 600; margin-bottom: 8px;">🚀 Wat ik doe als je akkoord geeft:</p>
    <ol style="padding-left: 20px; line-height: 1.9; color: #334155; margin-bottom: 20px;">
      <li>Ik pas het concept aan met jouw eigen foto's, tekst en bedrijfsinfo</li>
      <li>Jouw domeinnaam (<em>${domain}</em>) wordt geregistreerd en gekoppeld</li>
      <li>De website staat binnen <strong>24 uur live</strong> — klaar voor echte klanten</li>
      <li>Jij krijgt toegang tot jouw eigen klantenportaal voor verdere aanpassingen</li>
    </ol>

    <p>Heb je vragen? Geen probleem — bel of app me gerust, dan kijken we er samen naar. Geen verplichtingen, gewoon eerlijk overleggen wat het beste past bij ${b.name}.</p>

    <!-- Afsluitende CTA -->
    <div style="background: #F8FAFC; border-radius: 8px; padding: 16px 20px; margin: 24px 0; display: flex; align-items: center; gap: 12px;">
      <p style="margin: 0; font-size: 0.9rem; color: #475569;">📞 Liever even bellen of appen? <strong><a href="tel:+31619135453" style="color: #2563EB; text-decoration: none;">06 - 19 13 54 53</a></strong> (WhatsApp ook welkom!)</p>
    </div>

    <p style="margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 20px; color: #334155;">
      Met vriendelijke groet,<br><br>
      <strong>Allard Veldman</strong><br>
      <em>Oprichter Creation+Alt+Fix</em><br><br>
      <span style="font-size: 13px; color: #64748b;">
        Hoogezand (Groningen) • KVK: 99986191 • Tel: +31 6 19135453<br>
        <a href="https://creationaltfix.nl" style="color: #2563EB; text-decoration: none;">creationaltfix.nl</a> • <a href="mailto:info@creationaltfix.nl" style="color: #2563EB; text-decoration: none;">info@creationaltfix.nl</a>
      </span>
    </p>

    <p style="margin-top: 20px; font-size: 11px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 14px; line-height: 1.5;">
      <em>Dit is een eenmalig vrijblijvend aanbod op basis van jouw Google Maps vermelding. Geen interesse of liever geen berichten meer? Reageer even met 'geen interesse' — dan verwijderen wij jouw gegevens direct en definitief conform <strong>art. 21 AVG</strong> (Recht van bezwaar).</em>
    </p>
  </div>
</div>
`.trim();

  // 4. Plain Text E-mail Body (Maximale Inbox Score / Geen Spamfilter Risico)
  const bodyPlain = `
Beste ${b.name},

${b.pitchHook}

Mijn naam is Allard Veldman van Creation+Alt+Fix uit Hoogezand. Ik help lokale ZZP'ers en kleine bedrijven in Groningen en Drenthe aan een professionele, goed vindbare website die echt werkt op mobiel.

Ik heb gratis en vrijblijvend een compleet concept gebouwd speciaal voor ${b.name}. Geen standaard template — een website toegespitst op jouw branche (${b.category || 'jouw diensten'}) met directe contactknoppen en jouw Google-informatie.

👉 Bekijk jouw concept website hier:
${conceptUrl}

(Werkt direct op je telefoon — geen login nodig)


Wat zit er al in dit concept:
${bulletsPlain}
- Professionele uitstraling die goed werkt op elk scherm
- LocalBusiness SEO voor betere vindbaarheid op Google


Transparant over de investering (geen kleine lettertjes):

  Website realisatie:         v.a. € 199,- (eenmalig excl. BTW)
  Managed Hosting All-in:     € 150,- per jaar (~€ 12,50/mnd)
    Inclusief: domeinnaam ${domain}, SSL-slotje, 5 zakelijke mailboxen,
              dagelijkse back-ups en 30 minuten gratis service per jaar.
  Klantenportaal:             Gratis inbegrepen
    (portal.creationaltfix.nl voor live feedback en revisies)


Wat ik doe als je akkoord geeft:

  1. Ik pas het concept aan met jouw foto's, tekst en info
  2. Ik registreer jouw domeinnaam (${domain})
  3. De website staat binnen 24 uur live
  4. Jij krijgt toegang tot jouw eigen klantenportaal


Vragen? Gewoon bellen of appen:
06 - 19 13 54 53 (WhatsApp ook welkom!)
Of antwoord op deze e-mail.

Met vriendelijke groet,

Allard Veldman
Oprichter Creation+Alt+Fix
Hoogezand (Groningen)
KVK: 99986191 | Tel: +31 6 19135453
info@creationaltfix.nl | https://creationaltfix.nl

---
Geen interesse of liever geen berichten meer? Reageer even met 'geen interesse' — dan verwijderen wij jouw gegevens direct en definitief conform art. 21 AVG (Recht van bezwaar).
`.trim();

  // 5. WhatsApp Bericht (Kort, nuchter en persoonlijk)
  let whatsAppText = '';
  if (archetype === 'C_MODERNISATION') {
    whatsAppText = `Hoi ${b.name}! Allard hier van Creation+Alt+Fix uit Hoogezand. Ik zag jullie Google vermelding, maar merkte dat de website nog op onveilig HTTP staat zonder slotje. Ik heb alvast een vrijblijvend modern concept klaargezet: ${conceptUrl} - Kijk er gerust naar op je telefoon, benieuwd wat je ervan vindt!`;
  } else if (archetype === 'B_PRESENTATION_REVIEWS') {
    whatsAppText = `Hoi ${b.name}! Allard hier van Creation+Alt+Fix uit Hoogezand. Ik zag jullie mooie reviews op Google, maar zag dat je nog geen directe website had voor je behandelingen en sfeer. Ik heb alvast een werkend concept voor je gemaakt: ${conceptUrl} - Veel plezier met bekijken!`;
  } else {
    whatsAppText = `Hoi ${b.name}! Allard hier van Creation+Alt+Fix uit Hoogezand. Ik zag jullie mooie vermelding op Google Maps, maar zag dat er nog geen mobiele website aan gekoppeld was. Omdat particulieren snel willen bellen, heb ik alvast een vrijblijvend concept voor je klaargezet: ${conceptUrl} - Kijk er gerust naar als je tijd hebt!`;
  }

  return {
    subject,
    bodyHtml,
    bodyPlain,
    whatsAppText,
    conceptUrl,
    archetype,
    archetypeLabel
  };
}

/**
 * Schone, dynamische en hyper-moderne HTML5 template generator.
 * Wisselt typografie, kleurenpaletten, USPs, processen en 3 layout-architecturen
 * af zodat elke website een authentieke, onderscheidende uitstraling heeft.
 */
export function buildFallbackTemplate(b) {
  const theme = resolveDesignArchetype(b);

  const reviewsHtml = (b.reviews && b.reviews.length > 0)
    ? b.reviews.map(r => `
        <div class="review-card">
          <div class="stars">★★★★★</div>
          <p class="review-text">"${r.text}"</p>
          <div class="review-author">— ${r.author} (Geverifieerde Google Review)</div>
        </div>
      `).join('')
    : `
        <div class="review-card">
          <div class="stars">★★★★★</div>
          <p class="review-text">"Klantvriendelijk, betrouwbaar en levert altijd vakwerk af. Zeker een aanrader in de regio!"</p>
          <div class="review-author">— Tevreden Klant uit ${b.address ? 'de regio' : 'Groningen'}</div>
        </div>
        <div class="review-card">
          <div class="stars">★★★★★</div>
          <p class="review-text">"Hele prettige communicatie en snelle service. Afspraak is afspraak, erg blij met het resultaat!"</p>
          <div class="review-author">— Vaste Klant</div>
        </div>
      `;

  const servicesHtml = (b.suggestedServices || [])
    .map((s, idx) => `
        <div class="service-card">
          <div class="service-icon-box">
            <span class="service-num">0${idx + 1}</span>
            <span class="service-icon">✦</span>
          </div>
          <h3>${s.title}</h3>
          <p>${s.desc}</p>
        </div>
      `).join('');

  const processHtml = theme.processSteps.map(p => `
    <div class="process-card">
      <div class="process-step-num">${p.nr}</div>
      <h4>${p.title}</h4>
      <p>${p.desc}</p>
    </div>
  `).join('');

  // Bepaal de Hero Layout op basis van de theme.layoutVariant (0, 1 of 2)
  let heroSectionHtml = '';

  if (theme.layoutVariant === 0) {
    // LAYOUT 0: Split-Hero met Snelle Contact Widget
    heroSectionHtml = `
      <section class="hero hero-split">
        <div class="hero-content">
          <span class="badge">${theme.badgeText}</span>
          <h1>${theme.heroHeading}</h1>
          <p class="hero-desc">${theme.heroSubtitle}</p>
          <ul class="hero-usps">
            ${theme.usps.map(u => `<li><span class="check-icon">✓</span> ${u}</li>`).join('')}
          </ul>
          <div class="cta-group">
            ${b.phone ? `<a href="tel:${b.phone}" class="btn btn-primary">📞 Direct Bellen</a>` : ''}
            ${b.hasWhatsApp ? `<a href="https://wa.me/${b.whatsAppNumber}?text=Hallo%20${encodeURIComponent(b.name)},%20ik%20heb%20een%20vraag" class="btn btn-secondary" target="_blank">💬 Stuur WhatsApp</a>` : ''}
          </div>
        </div>
        <div class="hero-widget">
          <div class="quick-contact-card">
            <div class="status-pill"><span class="pulse-dot"></span> Vandaag bereikbaar</div>
            <h3>Direct Contact & Advies</h3>
            <p>Heeft u een vraag of wilt u een indicatie? Neem direct contact op met ${b.name}:</p>
            <div class="widget-actions">
              ${b.phone ? `<a href="tel:${b.phone}" class="widget-btn widget-btn-call">📞 ${b.phone}</a>` : ''}
              ${b.hasWhatsApp ? `<a href="https://wa.me/${b.whatsAppNumber}" class="widget-btn widget-btn-wa" target="_blank">💬 WhatsApp Chat</a>` : ''}
            </div>
            <div class="widget-meta">
              <span>⚡ Snelle reactie gegarandeerd</span>
              <span>📍 Actief in ${b.address ? 'regio Hoogezand / Groningen' : 'de regio'}</span>
            </div>
          </div>
        </div>
      </section>
    `;
  } else if (theme.layoutVariant === 1) {
    // LAYOUT 1: Monumentale Centered Hero met Highlight Metric Counters
    heroSectionHtml = `
      <section class="hero hero-centered">
        <span class="badge">${theme.badgeText}</span>
        <h1>${theme.heroHeading}</h1>
        <p class="hero-desc">${theme.heroSubtitle}</p>
        <div class="cta-group">
          ${b.phone ? `<a href="tel:${b.phone}" class="btn btn-primary">📞 Direct Bellen</a>` : ''}
          ${b.hasWhatsApp ? `<a href="https://wa.me/${b.whatsAppNumber}?text=Hallo%20${encodeURIComponent(b.name)},%20ik%20heb%20een%20vraag" class="btn btn-secondary" target="_blank">💬 Stuur WhatsApp</a>` : ''}
          <a href="#contact" class="btn btn-outline">✉️ Vrijblijvende Aanvraag</a>
        </div>
        <div class="metrics-row">
          <div class="metric-card">
            <div class="metric-val">${b.rating ? b.rating + ' ★' : '5.0 ★'}</div>
            <div class="metric-lbl">Google Beoordeling (${b.reviewsCount || '10+'} reviews)</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">100%</div>
            <div class="metric-lbl">Tevredenheidsgarantie</div>
          </div>
          <div class="metric-card">
            <div class="metric-val">Lokaal</div>
            <div class="metric-lbl">${b.address ? 'Regio Hoogezand' : 'Regio Groningen'}</div>
          </div>
        </div>
      </section>
    `;
  } else {
    // LAYOUT 2: High-Energy Direct Action Layout
    heroSectionHtml = `
      <section class="hero hero-action">
        <div class="urgent-banner">
          <span>⚡ Direct contact voor advies of afspraak in de regio:</span>
          ${b.phone ? `<a href="tel:${b.phone}">📞 ${b.phone}</a>` : ''}
        </div>
        <span class="badge">${theme.badgeText}</span>
        <h1>${theme.heroHeading}</h1>
        <p class="hero-desc">${theme.heroSubtitle}</p>
        <div class="action-highlight-box">
          <div class="highlight-info">
            <strong>Vrijblijvende Prijsopgave & Duidelijke Afspraken</strong>
            <p>Geen verborgen kosten achteraf. Eerlijke tarieven en betrouwbaar vakwerk.</p>
          </div>
          <div class="cta-group">
            ${b.phone ? `<a href="tel:${b.phone}" class="btn btn-primary">📞 Bel ${b.phone}</a>` : ''}
            ${b.hasWhatsApp ? `<a href="https://wa.me/${b.whatsAppNumber}?text=Hallo%20${encodeURIComponent(b.name)},%20ik%20heb%20een%20vraag" class="btn btn-secondary" target="_blank">💬 WhatsApp</a>` : ''}
          </div>
        </div>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${b.name} | ${b.category || 'Vakmanschap'} in Hoogezand & Regio Groningen</title>
  <meta name="description" content="Professionele ${b.category || 'diensten'} door ${b.name}. Neem direct contact op voor een snelle afspraak of vrijblijvende offerte.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${theme.fontLink}" rel="stylesheet">
  
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": ${JSON.stringify(b.name)},
    "telephone": ${JSON.stringify(b.phone || "")},
    "address": {
      "@type": "PostalAddress",
      "addressLocality": ${JSON.stringify(b.address || "Hoogezand, Groningen")},
      "addressCountry": "NL"
    },
    "priceRange": "€€",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": ${JSON.stringify(b.rating ? String(b.rating) : "5.0")},
      "reviewCount": ${JSON.stringify(String(b.reviewsCount || 1))}
    }
  }
  </script>

  <style>
    :root {
      ${theme.cssVars}
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${theme.fontFamily};
      background-color: var(--bg-dark);
      color: var(--text-main);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    .concept-bar {
      background: linear-gradient(90deg, #0b1329, #111e38);
      border-bottom: 1px solid rgba(56, 189, 248, 0.35);
      padding: 10px 16px;
      font-size: 0.88rem;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      position: relative;
      z-index: 101;
    }
    .concept-bar-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .concept-bar-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .concept-bar-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #0284c7;
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      border: 2px solid rgba(255,255,255,0.4);
      flex-shrink: 0;
    }
    .concept-bar a.concept-wa-btn {
      background: #25D366;
      color: #064e3b;
      padding: 6px 14px;
      border-radius: 50px;
      font-weight: 700;
      text-decoration: none;
      font-size: 0.82rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 2px 8px rgba(37, 211, 102, 0.3);
    }
    .concept-bar a.concept-wa-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 211, 102, 0.5);
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 8%;
      border-bottom: 1px solid var(--border);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      background: var(--bg-header);
      z-index: 100;
    }
    .logo { font-size: 1.35rem; font-weight: 700; color: var(--text-main); letter-spacing: -0.5px; }
    .logo span { color: var(--accent); }
    .header-actions { display: flex; gap: 10px; align-items: center; }
    
    .hero {
      padding: 70px 8% 50px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .badge {
      display: inline-block;
      background: var(--accent-subtle);
      color: var(--accent);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 20px;
      border: 1px solid var(--border);
    }
    .hero h1 {
      font-size: 2.6rem;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 20px;
      letter-spacing: -0.5px;
    }
    .hero-desc {
      font-size: 1.15rem;
      color: var(--text-muted);
      margin-bottom: 28px;
      max-width: 700px;
    }
    
    /* Layout 0: Split */
    .hero-split {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 48px;
      align-items: center;
    }
    .hero-usps {
      list-style: none;
      margin-bottom: 30px;
    }
    .hero-usps li {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
      font-weight: 500;
      font-size: 0.95rem;
    }
    .check-icon {
      color: var(--accent);
      background: var(--accent-subtle);
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .quick-contact-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 32px;
      border-radius: 16px;
      box-shadow: var(--shadow);
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: var(--accent);
      font-weight: 600;
      margin-bottom: 12px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--accent);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--accent);
    }
    .quick-contact-card h3 { font-size: 1.4rem; margin-bottom: 8px; }
    .quick-contact-card p { font-size: 0.92rem; color: var(--text-muted); margin-bottom: 20px; }
    .widget-actions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
    .widget-btn {
      padding: 12px 18px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      text-align: center;
      display: block;
      transition: all 0.2s ease;
    }
    .widget-btn-call { background: var(--accent); color: ${theme.isLightMode ? '#FFFFFF' : '#000000'}; }
    .widget-btn-wa { background: rgba(37, 211, 102, 0.15); color: #25D366; border: 1px solid rgba(37, 211, 102, 0.3); }
    .widget-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.8rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      padding-top: 14px;
    }
    
    /* Layout 1: Centered */
    .hero-centered { text-align: center; max-width: 900px; }
    .hero-centered .hero-desc { margin-left: auto; margin-right: auto; }
    .hero-centered .cta-group { justify-content: center; }
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 48px;
    }
    .metric-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 20px;
      border-radius: 12px;
      box-shadow: var(--shadow);
    }
    .metric-val { font-size: 1.6rem; font-weight: 800; color: var(--accent); margin-bottom: 4px; }
    .metric-lbl { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }

    /* Layout 2: Action */
    .hero-action { max-width: 960px; }
    .urgent-banner {
      background: var(--accent-subtle);
      border: 1px solid var(--border);
      color: var(--accent);
      padding: 10px 16px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .urgent-banner a { color: var(--text-main); text-decoration: underline; }
    .action-highlight-box {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 24px;
      border-radius: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      box-shadow: var(--shadow);
    }
    .highlight-info strong { display: block; font-size: 1.15rem; margin-bottom: 4px; }
    .highlight-info p { color: var(--text-muted); font-size: 0.92rem; }

    .cta-group { display: flex; gap: 14px; flex-wrap: wrap; }
    .btn {
      padding: 13px 24px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
    }
    .btn-primary { background: var(--accent); color: ${theme.isLightMode ? '#FFFFFF' : '#000000'}; }
    .btn-primary:hover { background: var(--accent-hover); transform: translateY(-2px); }
    .btn-secondary { background: var(--accent-subtle); color: var(--text-main); border: 1px solid var(--border); }
    .btn-secondary:hover { transform: translateY(-2px); border-color: var(--accent); }
    .btn-outline { background: transparent; color: var(--text-main); border: 1px solid var(--border); }
    .btn-outline:hover { background: var(--accent-subtle); }
    
    .section { padding: 64px 8%; max-width: 1200px; margin: 0 auto; }
    .section-title { text-align: center; margin-bottom: 44px; }
    .section-title h2 { font-size: 2.1rem; font-weight: 700; margin-bottom: 10px; letter-spacing: -0.5px; }
    .section-title p { color: var(--text-muted); font-size: 1.05rem; }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
    .service-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 28px;
      border-radius: 14px;
      transition: all 0.25s ease;
      box-shadow: var(--shadow);
    }
    .service-card:hover { transform: translateY(-5px); border-color: var(--accent); }
    .service-icon-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .service-num { font-size: 0.85rem; font-weight: 700; color: var(--accent); opacity: 0.8; }
    .service-icon { color: var(--accent); font-size: 1.4rem; }
    .service-card h3 { font-size: 1.25rem; margin-bottom: 10px; }
    .service-card p { color: var(--text-muted); font-size: 0.94rem; line-height: 1.55; }
    
    /* Process Section */
    .process-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .process-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 28px;
      border-radius: 14px;
      position: relative;
    }
    .process-step-num {
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--accent);
      opacity: 0.35;
      line-height: 1;
      margin-bottom: 12px;
    }
    .process-card h4 { font-size: 1.15rem; margin-bottom: 8px; }
    .process-card p { color: var(--text-muted); font-size: 0.9rem; }

    .review-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 26px;
      border-radius: 14px;
      box-shadow: var(--shadow);
    }
    .stars { color: #F59E0B; margin-bottom: 12px; font-size: 1.15rem; letter-spacing: 2px; }
    .review-text { font-style: italic; color: var(--text-main); margin-bottom: 14px; font-size: 0.95rem; }
    .review-author { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
    
    .contact-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 44px;
      border-radius: 18px;
      text-align: center;
      max-width: 760px;
      margin: 0 auto;
      box-shadow: var(--shadow);
    }
    .contact-card h3 { font-size: 1.85rem; margin-bottom: 14px; }
    .contact-card p { color: var(--text-muted); margin-bottom: 26px; font-size: 1.05rem; }
    
    footer {
      border-top: 1px solid var(--border);
      padding: 34px 8%;
      text-align: center;
      font-size: 0.88rem;
      color: var(--text-muted);
      background: var(--bg-header);
    }

    @media (max-width: 860px) {
      .hero-split { grid-template-columns: 1fr; }
      .metrics-row { grid-template-columns: 1fr; }
      .hero h1 { font-size: 2.1rem; }
      .header-actions .btn-secondary { display: none; }
    }
  </style>
</head>
<body>
  <div class="concept-bar">
    <div class="concept-bar-inner">
      <div class="concept-bar-badge">
        <span class="concept-bar-avatar">AV</span>
        <span>
          <strong>Persoonlijk concept van Allard Veldman</strong> (Creation+Alt+Fix, Hoogezand) • Vrijblijvend voorbeeld voor <strong>${b.name}</strong>
        </span>
      </div>
      <div>
        <a href="https://wa.me/31619135453?text=Hoi%20Allard,%20ik%20heb%20het%20websiteconcept%20voor%20${encodeURIComponent(b.name)}%20bekeken!" class="concept-wa-btn" target="_blank">
          💬 Vraag stellen aan Allard
        </a>
      </div>
    </div>
  </div>
  <header>
    <div class="logo">${b.name}<span>.</span></div>
    <div class="header-actions">
      ${b.phone ? `<a href="tel:${b.phone}" class="btn btn-secondary">📞 ${b.phone}</a>` : ''}
      ${b.hasWhatsApp ? `<a href="https://wa.me/${b.whatsAppNumber}" class="btn btn-primary" target="_blank">💬 WhatsApp</a>` : ''}
    </div>
  </header>
  <main>
    ${heroSectionHtml}
    
    <section class="section">
      <div class="section-title">
        <h2>Onze Werkzaamheden</h2>
        <p>Vakkundige diensten op maat voor particulieren en bedrijven</p>
      </div>
      <div class="grid">
        ${servicesHtml}
      </div>
    </section>

    <section class="section">
      <div class="section-title">
        <h2>Zo Werken Wij</h2>
        <p>Transparant, zonder verrassingen en altijd vlot geregeld</p>
      </div>
      <div class="process-grid">
        ${processHtml}
      </div>
    </section>

    <section class="section">
      <div class="section-title">
        <h2>Wat Klanten Zeggen</h2>
        <p>Beoordeeld met ${b.rating || '5.0'} sterren op Google</p>
      </div>
      <div class="grid">
        ${reviewsHtml}
      </div>
    </section>

    <section class="section" id="contact">
      <div class="contact-card">
        <span class="badge">Vrijblijvend Contact</span>
        <h3>Direct Contact Opnemen met ${b.name}?</h3>
        <p>Heeft u een vraag, wilt u kennismaken of direct een vrijblijvende prijsopgave ontvangen? Wij staan voor u klaar.</p>
        <div class="cta-group" style="justify-content: center;">
          ${b.phone ? `<a href="tel:${b.phone}" class="btn btn-primary">📞 ${b.phone}</a>` : ''}
          ${b.hasWhatsApp ? `<a href="https://wa.me/${b.whatsAppNumber}?text=Hallo%20${encodeURIComponent(b.name)},%20ik%20heb%20een%20vraag" class="btn btn-secondary" target="_blank">💬 WhatsApp Chat</a>` : ''}
        </div>
      </div>
    </section>
  </main>
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${b.name}. Alle rechten voorbehouden. ${b.address ? '• ' + b.address : ''}</p>
  </footer>
</body>
</html>`;
}

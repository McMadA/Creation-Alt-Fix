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
        '--dangerously-skip-permissions',
        '-p',
        prompt
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
  const layoutVariant = hash % 3;

  // Granulaire sector matching met verfijnde prioriteit
  const isInstaller = /installatiebedrijf|installateur|elektrotechniek|warmtepomp|cv-ketel/.test(text) || (text.includes('installat') && !text.includes('ontstop'));
  const isPlumber = !isInstaller && /loodgieter|riool|ontstop|afvoer|waterleiding|sanitair/.test(text);
  const isRoofCoating = /dakcoating|coating/.test(text);
  const isRoofer = /dakdek|daktechniek|dakspeci|bitumen|pannendak|zink/.test(text);
  const isFitness = /fitness|personal fit|sportschool|kracht|training|workout|gym/.test(text);
  const isNutrition = /voeding|gewicht|weight|leefstijl|dieet|nutrition/.test(text);
  const isPaving = /bestrating|stratenmaker|grondwerk|straatmaker|klinker|terras/.test(text);
  const isLandscape = /landschap|architectuur|tuinontwerp/.test(text);
  const isGarden = /hovenier|tuin|boom|groen|tuinonderhoud/.test(text);
  const isPainter = /schilder/.test(text);
  const isPlasterer = !isPainter && /stuc|stukadoor|pleister|wandafwerk/.test(text);
  const isHandyman = /klus|timmer|verbouw|onderhoud|vakman/.test(text);
  const isMechanic = /fiets|rijwiel|scooter|auto|garage|banden|apk|motor|monteur|reparatie/.test(text);
  const isDelivery = /koerier|delivery|transport|logistiek|verhuis|pakket/.test(text);
  const isWeb = /web|software|design|digitaal|applicatie/.test(text);

  // 1. INSTALLATIETECHNIEK & ELEKTRA (bv. Installatiebedrijf Mulder Sappemeer)
  if (isInstaller) {
    return {
      key: 'TECHNICAL_INSTALLER',
      name: 'Erkend Installateur (Midnight Navy & Electric Cobalt)',
      isLightMode: false,
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      cssVars: `
        --bg-dark: #050E1B;
        --bg-header: rgba(5, 14, 27, 0.94);
        --bg-card: rgba(15, 29, 52, 0.82);
        --accent: #2563EB;
        --accent-hover: #1D4ED8;
        --accent-subtle: rgba(37, 99, 235, 0.16);
        --accent-secondary: #06B6D4;
        --text-main: #F0F9FF;
        --text-muted: #94A3B8;
        --border: rgba(56, 189, 248, 0.25);
        --shadow: 0 14px 35px rgba(5, 14, 27, 0.7);
      `,
      badgeText: '🔧 Erkend Installateur & Duurzame Installatietechniek',
      heroHeading: `Betrouwbare Installatietechniek & Vakkundige Service bij ${b.name}`,
      heroSubtitle: 'Van cv-ketels, warmtepompen en sanitair tot complete leiding- en elektrotechnische installaties. Veilig en gecertificeerd gemonteerd.',
      usps: [
        'Gecertificeerd vakmanschap en veilige montage volgens norm',
        'Directe hulp en service bij storingen en calamiteiten',
        'Duurzame installaties met hoog energetisch rendement'
      ],
      processSteps: [
        { nr: '01', title: 'Wens of Storing Melden', desc: 'Neem contact op voor advies of directe assistentie.' },
        { nr: '02', title: 'Afstemming & Planning', desc: 'Vlotte inplanning met een ervaren vakmonteur.' },
        { nr: '03', title: 'Veilige Oplevering', desc: 'Vakkundig geïnstalleerd en getoetst volgens de richtlijnen.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Marineblauw (#050E1B) met elektrisch kobalt (#2563EB) en helder cyaan (#06B6D4)',
      layoutVibe: 'Betrouwbaar, technisch, gecertificeerd en professioneel'
    };
  }

  // 2. PLUMBER & RIOOLSERVICE (bv. 123ontstopper)
  if (isPlumber) {
    return {
      key: 'PLUMBER_DRAIN',
      name: 'Rioolservice & Loodgieter (Deep Marine & Aqua Cyan)',
      isLightMode: false,
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      cssVars: `
        --bg-dark: #06111C;
        --bg-header: rgba(6, 17, 28, 0.94);
        --bg-card: rgba(14, 30, 48, 0.82);
        --accent: #06B6D4;
        --accent-hover: #0891B2;
        --accent-subtle: rgba(6, 182, 212, 0.16);
        --accent-secondary: #3B82F6;
        --text-main: #F0F9FF;
        --text-muted: #94A3B8;
        --border: rgba(6, 182, 212, 0.25);
        --shadow: 0 14px 35px rgba(6, 17, 28, 0.7);
      `,
      badgeText: '🚰 24/7 Rioolservice, Ontstopping & Loodgieter Spoedhulp',
      heroHeading: `Snel & Vakkundig Verholpen door ${b.name}`,
      heroSubtitle: 'Last van een hardnekkige verstopping, lekkage of stankoverlast? Met professionele veermachines en camera-inspectie lossen we het snel en vakkundig op.',
      usps: [
        'Snelle spoedservice in Hoogezand en regio Groningen',
        'Vaste en transparante all-in tarieven zonder verrassingen',
        'Moderne camera-inspectie en geavanceerde ontstopping'
      ],
      processSteps: [
        { nr: '01', title: 'Storing Melden', desc: 'Bel direct of stuur een WhatsApp met de situatie.' },
        { nr: '02', title: 'Snelle Hulp ter Plaatse', desc: 'Onze monteur arriveert met complete apparatuur.' },
        { nr: '03', title: 'Opgelost & Getest', desc: 'Riolering grondig doorgespoeld en getest voor vertrek.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Deep marine ocean (#06111C) met vivid aqua cyan (#06B6D4) en helder waterblauw (#3B82F6)',
      layoutVibe: 'Snel, betrouwbaar, spoed-gericht met actieve bereikbaarheid'
    };
  }

  // 2. DAKCOATING & REINIGING (bv. dakcoatingshop)
  if (isRoofCoating) {
    return {
      key: 'ROOF_COATING',
      name: 'Dakcoating & Reiniging (Graphite Petrol & Vivid Mint)',
      isLightMode: false,
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      cssVars: `
        --bg-dark: #09131D;
        --bg-header: rgba(9, 19, 29, 0.94);
        --bg-card: rgba(18, 33, 49, 0.82);
        --accent: #10B981;
        --accent-hover: #059669;
        --accent-subtle: rgba(16, 185, 129, 0.16);
        --accent-secondary: #0284C7;
        --text-main: #F0FDF4;
        --text-muted: #94A3B8;
        --border: rgba(16, 185, 129, 0.25);
        --shadow: 0 14px 35px rgba(9, 19, 29, 0.7);
      `,
      badgeText: '✨ Professionele Dakcoating, Reiniging & Bescherming',
      heroHeading: `Uw Dak als Nieuw Zonder Dure Vervanging met ${b.name}`,
      heroSubtitle: 'Verleng de levensduur van uw dakpannen aanzienlijk met professionele reiniging en hoogwaardige hydrofobe dakcoating in uw gewenste tint.',
      usps: [
        'Tot 70% voordeliger dan een compleet nieuw pannendak',
        'Waterafstotend, mos- en algenwerend resultaat met langdurige glans',
        'Schriftelijke garantie op hechting en kleurbehoud'
      ],
      processSteps: [
        { nr: '01', title: 'Inspectie & Proefvlak', desc: 'We inspecteren de pannen en tonen het verwachte resultaat.' },
        { nr: '02', title: 'Dieptereiniging & Desinfectie', desc: 'Vuil, mos en algen worden onder gecontroleerde druk verwijderd.' },
        { nr: '03', title: '2-Laags Coating', desc: 'Professionele beschermlaag aangebracht voor jarenlange bescherming.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Diep grafiet petrol (#09131D) met frisse mint-smaragd (#10B981) en oceaanblauw (#0284C7)',
      layoutVibe: 'Fris, beschermend, innovatief en waardeverhogend'
    };
  }

  // 3. DAKDEKKER & DAKRENOVATIE (bv. a-v-dakspecialist, dakdekker Noordlaren)
  if (isRoofer) {
    const isSubVariant1 = (hash + (b.name || '').length) % 2 === 1;
    return {
      key: 'ROOFER_SLATE',
      name: isSubVariant1 ? 'Dakspecialist (Deep Anthracite & Warm Flame Gold)' : 'Dakspecialist (Slate Charcoal & Terracotta Copper)',
      isLightMode: false,
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      cssVars: isSubVariant1 ? `
        --bg-dark: #10141C;
        --bg-header: rgba(16, 20, 28, 0.94);
        --bg-card: rgba(25, 32, 45, 0.82);
        --accent: #D97706;
        --accent-hover: #B45309;
        --accent-subtle: rgba(217, 119, 6, 0.16);
        --accent-secondary: #EA580C;
        --text-main: #FEF3C7;
        --text-muted: #94A3B8;
        --border: rgba(217, 119, 6, 0.28);
        --shadow: 0 14px 35px rgba(0, 0, 0, 0.75);
      ` : `
        --bg-dark: #0F1318;
        --bg-header: rgba(15, 19, 24, 0.94);
        --bg-card: rgba(26, 32, 40, 0.82);
        --accent: #EA580C;
        --accent-hover: #C2410C;
        --accent-subtle: rgba(234, 88, 12, 0.16);
        --accent-secondary: #F59E0B;
        --text-main: #FAF5F0;
        --text-muted: #A8A29E;
        --border: rgba(234, 88, 12, 0.28);
        --shadow: 0 14px 35px rgba(15, 19, 24, 0.75);
      `,
      badgeText: '🏠 Vakkundig Dakwerk, Bitumen & Zinkrenovatie',
      heroHeading: `Duurzaam Dakwerk & Betrouwbare Bescherming door ${b.name}`,
      heroSubtitle: 'Van hoogwaardige bitumen platte daken en nokvorstreparaties tot zinkwerk en dakisolatie. 100% waterdicht opgeleverd met 10 jaar garantie.',
      usps: [
        'Tot 10 jaar schriftelijke garantie op dakbedekking',
        'Vrijblijvende dakinspectie inclusief heldere fotorapportage',
        'Snelle hulp bij daklekkage, stormschade en noodreparaties'
      ],
      processSteps: [
        { nr: '01', title: 'Grondige Dakinspectie', desc: 'We controleren de staat van uw dakbedekking en randafwerking.' },
        { nr: '02', title: 'Transparante Offerte', desc: 'Heldere prijsopgave zonder verrassingen achteraf.' },
        { nr: '03', title: 'Vakkundige Montage', desc: 'Professioneel gemonteerd volgens de strengste NEN-veiligheidsnormen.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Leisteen antraciet (#0F1318) met warme terracotta koper (#EA580C) en amber accenten (#F59E0B)',
      layoutVibe: 'Solide, ambachtelijk, weerbestendig en betrouwbaar'
    };
  }

  // 4. INSTALLATIETECHNIEK & ELEKTRA (bv. Installatiebedrijf Mulder Sappemeer)
  if (isInstaller) {
    return {
      key: 'TECHNICAL_INSTALLER',
      name: 'Erkend Installateur (Midnight Navy & Electric Cobalt)',
      isLightMode: false,
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      cssVars: `
        --bg-dark: #050E1B;
        --bg-header: rgba(5, 14, 27, 0.94);
        --bg-card: rgba(15, 29, 52, 0.82);
        --accent: #2563EB;
        --accent-hover: #1D4ED8;
        --accent-subtle: rgba(37, 99, 235, 0.16);
        --accent-secondary: #06B6D4;
        --text-main: #F0F9FF;
        --text-muted: #94A3B8;
        --border: rgba(56, 189, 248, 0.25);
        --shadow: 0 14px 35px rgba(5, 14, 27, 0.7);
      `,
      badgeText: '🔧 Erkend Installateur & Duurzame Installatietechniek',
      heroHeading: `Betrouwbare Installatietechniek & Vakkundige Service bij ${b.name}`,
      heroSubtitle: 'Van cv-ketels, warmtepompen en sanitair tot complete leiding- en elektrotechnische installaties. Veilig en gecertificeerd gemonteerd.',
      usps: [
        'Gecertificeerd vakmanschap en veilige montage volgens norm',
        'Directe hulp en service bij storingen en calamiteiten',
        'Duurzame installaties met hoog energetisch rendement'
      ],
      processSteps: [
        { nr: '01', title: 'Wens of Storing Melden', desc: 'Neem contact op voor advies of directe assistentie.' },
        { nr: '02', title: 'Afstemming & Planning', desc: 'Vlotte inplanning met een ervaren vakmonteur.' },
        { nr: '03', title: 'Veilige Oplevering', desc: 'Vakkundig geïnstalleerd en getoetst volgens de richtlijnen.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Marineblauw (#050E1B) met elektrisch kobalt (#2563EB) en helder cyaan (#06B6D4)',
      layoutVibe: 'Betrouwbaar, technisch, gecertificeerd en professioneel'
    };
  }

  // 5. FITNESS & PERSONAL TRAINING (bv. CIJNTJE PERSONAL FIT)
  if (isFitness) {
    return {
      key: 'FITNESS_PERFORMANCE',
      name: 'Fitness Performance & Gym (Matte Black & Acid Lime)',
      isLightMode: false,
      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap',
      cssVars: `
        --bg-dark: #08080A;
        --bg-header: rgba(8, 8, 10, 0.95);
        --bg-card: rgba(22, 22, 28, 0.85);
        --accent: #84CC16;
        --accent-hover: #65A30D;
        --accent-subtle: rgba(132, 204, 22, 0.16);
        --accent-secondary: #38BDF8;
        --text-main: #FFFFFF;
        --text-muted: #A1A1AA;
        --border: rgba(132, 204, 22, 0.28);
        --shadow: 0 14px 35px rgba(0, 0, 0, 0.85);
      `,
      badgeText: '⚡ Kracht, Conditie & Persoonlijke Begeleiding',
      heroHeading: `Bereik Jouw Doelen & Maximale Fitheid met ${b.name}`,
      heroSubtitle: 'Geen excuses meer. Doelgerichte personal training, effectieve workouts en continue motivatie om jouw fysieke toppunt te bereiken in Hoogezand en regio Groningen.',
      usps: [
        '1-op-1 coaching op maat voor gegarandeerd meetbaar resultaat',
        'Persoonlijk trainings- en voedingsplan afgestemd op jouw schema',
        'Trainen in een motiverende, professionele en energieke sfeer'
      ],
      processSteps: [
        { nr: '01', title: 'Gratis Intake & Doelen', desc: 'We bespreken jouw doelen, conditie en belastbaarheid.' },
        { nr: '02', title: 'Op Maat Traject', desc: 'Een effectief trainingsprogramma met duidelijke mijlpalen.' },
        { nr: '03', title: 'Blijvend Resultaat', desc: 'Fit worden, sterker voelen en vol energie in het leven staan.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Mat puur zwart (#08080A) met high-energy acid lime (#84CC16) en scherpe Space Grotesk typografie',
      layoutVibe: 'Krachtig, energiek, sportief en motiverend'
    };
  }

  // 6. VOEDING & LEEFSTIJLCOACH (bv. Weight Change)
  if (isNutrition) {
    return {
      key: 'VITAL_WELLNESS',
      name: 'Vital Lifestyle & Nutrition (Deep Evergreen & Rose Gold)',
      isLightMode: false,
      fontFamily: "'Outfit', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap',
      cssVars: `
        --bg-dark: #0B1713;
        --bg-header: rgba(11, 23, 19, 0.94);
        --bg-card: rgba(21, 38, 32, 0.82);
        --accent: #FB7185;
        --accent-hover: #F43F5E;
        --accent-subtle: rgba(251, 113, 133, 0.16);
        --accent-secondary: #34D399;
        --text-main: #FDF4F5;
        --text-muted: #99F6E4;
        --border: rgba(251, 113, 133, 0.25);
        --shadow: 0 14px 35px rgba(11, 23, 19, 0.7);
      `,
      badgeText: '🌿 Gezonde Leefstijl, Voeding & Blijvend Gewichtsverlies',
      heroHeading: `Duurzaam Afvallen & Vol Energie in het Leven met ${b.name}`,
      heroSubtitle: 'Geen streng crashdieet of jojo-effect, maar een persoonlijk voedings- en leefstijlplan dat écht bij jouw leven past. Rust, vitaliteit en blijvend resultaat.',
      usps: [
        'Deskundige begeleiding op maat zonder hongerlijden',
        'Blijvend resultaat met een wetenschappelijk onderbouwde methodiek',
        'Persoonlijke coaching en wekelijkse motiverende ondersteuning'
      ],
      processSteps: [
        { nr: '01', title: 'Kennismakingsgesprek', desc: 'We analyseren jouw huidige eetpatroon, leefstijl en doelen.' },
        { nr: '02', title: 'Persoonlijk Voedingsplan', desc: 'Heerlijk en gezond eten afgestemd op jouw gezin en werk.' },
        { nr: '03', title: 'Duurzame Vitaliteit', desc: 'Gezonde gewoontes die je moeiteloos vasthoudt voor de lange termijn.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Diep natuurlijk evergreen (#0B1713) met zacht rozengoud/terracotta (#FB7185) en mint accenten (#34D399)',
      layoutVibe: 'Sereniteit, gezondheid, empathie en duurzaam welzijn'
    };
  }

  // 7. BESTRATING & GRONDWERK (bv. N ten seldam)
  if (isPaving) {
    return {
      key: 'PAVING_EARTH',
      name: 'Bestrating & Grondverzet (Basalt Slate & Amber Sand)',
      isLightMode: false,
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      cssVars: `
        --bg-dark: #0D1211;
        --bg-header: rgba(13, 18, 17, 0.94);
        --bg-card: rgba(24, 33, 30, 0.82);
        --accent: #D97706;
        --accent-hover: #B45309;
        --accent-subtle: rgba(217, 119, 6, 0.16);
        --accent-secondary: #10B981;
        --text-main: #FEF3C7;
        --text-muted: #D1D5DB;
        --border: rgba(217, 119, 6, 0.28);
        --shadow: 0 14px 35px rgba(0, 0, 0, 0.75);
      `,
      badgeText: '🚜 Strakke Sierbestrating, Terrassen & Grondwerk',
      heroHeading: `Vakkundig Straatwerk & Duurzaam Buitenwerk door ${b.name}`,
      heroSubtitle: 'Van moderne opritten en keramische terrassen tot grondverzet en hemelwaterafvoer. Solide gelegd met garantie op een verzakkingsvrij resultaat.',
      usps: [
        'Laser-gestuurd grondwerk en perfecte afwatering',
        'Garantie op verzakkingsvrij en slijtvast straatwerk',
        'Eerlijke all-in meterprijzen zonder verborgen meerkosten'
      ],
      processSteps: [
        { nr: '01', title: 'Inmeten & Advies', desc: 'We komen ter plaatse kijken en adviseren over klinkers en tegels.' },
        { nr: '02', title: 'Transparante Offerte', desc: 'Duidelijke prijs per m² inclusief zandbed en afvoer.' },
        { nr: '03', title: 'Strakke Oplevering', desc: 'Vakkundig afgetrild, ingeveegd en netjes opgeruimd.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Basalt aarde leisteen (#0D1211) met warm amberkleurig zand (#D97706) en groenaccenten (#10B981)',
      layoutVibe: 'Aards, robuust, vakkundig en strak afgewerkt'
    };
  }

  // 8. TUIN- EN LANDSCHAPSARCHITECTUUR (bv. Jonas Lindenhoff)
  if (isLandscape) {
    return {
      key: 'LANDSCAPE_ARCHITECT',
      name: 'Tuin- en Landschapsarchitectuur (Architectural Slate & Pine Lime)',
      isLightMode: false,
      fontFamily: "'Outfit', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap',
      cssVars: `
        --bg-dark: #071510;
        --bg-header: rgba(7, 21, 16, 0.94);
        --bg-card: rgba(16, 36, 28, 0.82);
        --accent: #14B8A6;
        --accent-hover: #0D9488;
        --accent-subtle: rgba(20, 184, 166, 0.16);
        --accent-secondary: #A3E635;
        --text-main: #F0FDFA;
        --text-muted: #99F6E4;
        --border: rgba(20, 184, 166, 0.26);
        --shadow: 0 14px 35px rgba(7, 21, 16, 0.7);
      `,
      badgeText: '📐 Doordacht Tuinontwerp & Landschapsarchitectuur',
      heroHeading: `Exclusief Tuinontwerp & Landschapscreaties door ${b.name}`,
      heroSubtitle: 'Van karakteristieke villatuinen tot natuurlijke landschapsruimtes. Een harmonieus samenspel van architectuur, seizoensbeplanting en optimaal leefcomfort.',
      usps: [
        'Maatwerk 2D & 3D ontwerpen met sfeer- en materiaalvisualisaties',
        'Doordachte beplantingsplannen met bloeigarantie in elk seizoen',
        'Professionele projectbegeleiding van ontwerptafel tot oplevering'
      ],
      processSteps: [
        { nr: '01', title: 'Oriëntatie & Wensen', desc: 'Samen bespreken we stijl, zichtlijnen en functie van de buitenruimte.' },
        { nr: '02', title: 'Ontwerp & Beplantingsplan', desc: 'U ontvangt een doordacht en artistiek schetsontwerp.' },
        { nr: '03', title: 'Realisatiebegeleiding', desc: 'Coördinatie met hoveniers en stratenmakers voor perfect resultaat.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Architectonisch bosleisteen (#071510) met pine teal (#14B8A6) en fris lime-groen (#A3E635)',
      layoutVibe: 'Artistiek, doordacht, ruimtelijk en verfijnd'
    };
  }

  // 9. TUINONDERHOUD & HOVENIER (bv. Sebens Tuinonderhoud)
  if (isGarden) {
    return {
      key: 'GARDEN_EARTH',
      name: 'Natuur & Tuinonderhoud (Diep Bosgroen & Smaragd)',
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
      badgeText: '🌿 Vakkundig Tuinonderhoud, Snoeiwerk & Aanleg',
      heroHeading: `Een Verzorgde & Karaktervolle Tuin door ${b.name}`,
      heroSubtitle: 'Periodiek tuinonderhoud, vakkundige snoeibeurten of complete tuinrenovaties. Wij zorgen dat uw buitenruimte in elk seizoen straalt.',
      usps: [
        'Vakkundig seizoensonderhoud en boom- en heestersnoei',
        'Afvoer van al het groenafval netjes en snel geregeld',
        'Vaste afspraken, betrouwbare hoveniers en eerlijke prijzen'
      ],
      processSteps: [
        { nr: '01', title: 'Tuininspectie', desc: 'We bekijken samen uw tuin en stemmen de onderhoudsbehoefte af.' },
        { nr: '02', title: 'Duidelijk Voorstel', desc: 'Vaste prijs per beurt of overzichtelijk onderhoudscontract.' },
        { nr: '03', title: 'Verzorgd Resultaat', desc: 'Strak gesnoeid, onkruidvrij en bezemschoon achtergelaten.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Diep natuurlijk bosgroen (#051911) met levendig smaragd (#10B981) en warme aardetinten (#F59E0B)',
      layoutVibe: 'Organisch, fris, natuurlijk en betrouwbaar'
    };
  }

  // 10. STUKADOORSBEDRIJF (bv. Stuc-noord)
  if (isPlasterer) {
    return {
      key: 'PLASTER_MODERN',
      name: 'Stukadoor & Wandafwerking (Clean Architectural Slate & Ice Blue)',
      isLightMode: false,
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      cssVars: `
        --bg-dark: #0B1120;
        --bg-header: rgba(11, 17, 32, 0.94);
        --bg-card: rgba(19, 31, 56, 0.82);
        --accent: #38BDF8;
        --accent-hover: #0284C7;
        --accent-subtle: rgba(56, 189, 248, 0.16);
        --accent-secondary: #818CF8;
        --text-main: #F8FAFC;
        --text-muted: #94A3B8;
        --border: rgba(56, 189, 248, 0.25);
        --shadow: 0 14px 35px rgba(11, 17, 32, 0.7);
      `,
      badgeText: '🏛️ Sausklaar Stucwerk, Pleisterwerk & Betonlook',
      heroHeading: `Spiegelgladde Wanden & Strakke Plafonds door ${b.name}`,
      heroSubtitle: 'Van traditioneel pleisterwerk en sausklare wanden tot exclusieve beton ciré en sierpleister. Vakkundig en strak aangebracht met oog voor detail.',
      usps: [
        '100% spiegelglad en sausklaar opgeleverd met kwaliteitsgarantie',
        'Vlotte planning en altijd een schone en afgeplakte werkplek',
        'Vaste vierkante meter prijzen vooraf zonder onverwachte kosten'
      ],
      processSteps: [
        { nr: '01', title: 'Inmeten & Ondergrondcheck', desc: 'We controleren de muren en meten het exacte oppervlak.' },
        { nr: '02', title: 'Vrijblijvende m² Prijs', desc: 'Transparante offerte inclusief voorstrijken en materiaal.' },
        { nr: '03', title: 'Strak Stucwerk', desc: 'Vakkundig gestukt, glad gepleisterd en schoon opgeleverd.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Strak architectonisch leisteen (#0B1120) met helder ijsblauw (#38BDF8) en zilveren details',
      layoutVibe: 'Strak, minimalistisch, egaal en hoogwaardig afgewerkt'
    };
  }

  // 11. SCHILDER & AFWERKING (bv. Van der Veen schilderwerken, Schildersbedrijf Van der Veen Kerkstraat)
  if (isPainter) {
    const isSubVariant1 = (hash + (b.name || '').length) % 2 === 1;
    return {
      key: 'ARTISAN_PAINTER',
      name: isSubVariant1 ? 'Schilder (Modern Charcoal & Royal Amber)' : 'Schilder (Studio Obsidian & Artisan Gold)',
      isLightMode: false,
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      cssVars: isSubVariant1 ? `
        --bg-dark: #0E131F;
        --bg-header: rgba(14, 19, 31, 0.94);
        --bg-card: rgba(23, 31, 48, 0.82);
        --accent: #EAB308;
        --accent-hover: #CA8A04;
        --accent-subtle: rgba(234, 179, 8, 0.15);
        --accent-secondary: #06B6D4;
        --text-main: #F8FAFC;
        --text-muted: #94A3B8;
        --border: rgba(234, 179, 8, 0.25);
        --shadow: 0 14px 35px rgba(0, 0, 0, 0.7);
      ` : `
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
      badgeText: '🎨 Ambachtelijk Schilderwerk & Vlekkeloze Afwerking',
      heroHeading: `Strak Schilderwerk & Duurzame Bescherming bij ${b.name}`,
      heroSubtitle: 'Voor binnen- en buitenschilderwerk van het hoogste niveau. Stofvrij schuren, professioneel kleuradvies en jarenlange bescherming van uw houtwerk in Groningen en Drenthe.',
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
      promptPaletteAdvice: 'Diep studio leisteen (#0A0E17) met warm ambachtelijk goud (#F59E0B) en scherpe typografie',
      layoutVibe: 'Strak, elegant atelier-gevoel met gouden accenten en precisie'
    };
  }

  // 12. ALLROUND VAKMAN & KLUSBEDRIJF (bv. De Vakman Dennis Dijkema, Klussenbedrijf Norder)
  if (isHandyman) {
    const isSubVariant1 = (hash + (b.name || '').length) % 2 === 1;
    return {
      key: 'HANDYMAN_CRAFTSMAN',
      name: isSubVariant1 ? 'Klusbedrijf (Craftsman Iron & Amber Gold)' : 'Allround Klusbedrijf (Industrial Anthracite & Warm Orange)',
      isLightMode: false,
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      cssVars: isSubVariant1 ? `
        --bg-dark: #12161E;
        --bg-header: rgba(18, 22, 30, 0.94);
        --bg-card: rgba(28, 36, 48, 0.82);
        --accent: #D97706;
        --accent-hover: #B45309;
        --accent-subtle: rgba(217, 119, 6, 0.16);
        --accent-secondary: #0D9488;
        --text-main: #F8FAFC;
        --text-muted: #94A3B8;
        --border: rgba(217, 119, 6, 0.28);
        --shadow: 0 14px 35px rgba(0, 0, 0, 0.75);
      ` : `
        --bg-dark: #11141A;
        --bg-header: rgba(17, 20, 26, 0.94);
        --bg-card: rgba(28, 33, 44, 0.82);
        --accent: #F97316;
        --accent-hover: #EA580C;
        --accent-subtle: rgba(249, 115, 22, 0.16);
        --accent-secondary: #06B6D4;
        --text-main: #F8FAFC;
        --text-muted: #94A3B8;
        --border: rgba(249, 115, 22, 0.25);
        --shadow: 0 14px 35px rgba(0, 0, 0, 0.75);
      `,
      badgeText: '🔨 Allround Klusbedrijf, Timmerwerk & Verbouw',
      heroHeading: `Vakkundig Verbouwen & Betrouwbaar Kluswerk door ${b.name}`,
      heroSubtitle: 'Voor particuliere verbouwingen, badkamermontage, timmerwerk en allround onderhoud. Eén vast aanspreekpunt voor uw complete project in Hoogezand en omstreken.',
      usps: [
        'Veelzijdig vakmanschap en betrouwbare service onder één dak',
        'Heldere communicatie en duidelijke prijsafspraken vooraf',
        'Nette afwerking, kwaliteitsmaterialen en stipte oplevering'
      ],
      processSteps: [
        { nr: '01', title: 'Klus Bespreken', desc: 'Neem contact op om uw wensen of verbouwing door te nemen.' },
        { nr: '02', title: 'Duidelijk Plan & Offerte', desc: 'U ontvangt een heldere planning en gespecificeerde prijsopgave.' },
        { nr: '03', title: 'Vakkundige Realisatie', desc: 'Netjes gebouwd, gemonteerd en bezemschoon opgeleverd.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Stoer industrieel antraciet (#11141A) met veiligheidsoranje/amber (#F97316) en strak staalgrijs',
      layoutVibe: 'Degelijk, veelzijdig, betrouwbaar en hands-on'
    };
  }

  // 13. FIETSENMAKER & REPARATIE (bv. Hakkeling Fiets Reparaties)
  if (isMechanic) {
    return {
      key: 'SPEED_MECHANIC',
      name: 'Snelle Reparatie & Fietsentechniek (Carbon & Flame Orange)',
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
        --accent-secondary: #06B6D4;
        --text-main: #FFFFFF;
        --text-muted: #A1A1AA;
        --border: rgba(255, 87, 34, 0.28);
        --shadow: 0 14px 35px rgba(0, 0, 0, 0.8);
      `,
      badgeText: '⚡ Snelle Fietsreparatie, Onderhoud & E-Bike Service',
      heroHeading: `Snel & Veilig Weer Onderweg met ${b.name}`,
      heroSubtitle: 'Geen ellenlange wachttijden. Vakkundige reparatie en onderhoud van stadsfietsen, e-bikes en sportfietsen. Vooraf altijd een duidelijke prijsopgave.',
      usps: [
        'Vaak binnen 24 uur weer rijklaar voor dagelijks gebruik',
        'Vooraf altijd een duidelijke prijsopgave zonder verrassingen',
        'Vakmanschap met hoogwaardige originele merkonderdelen'
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
  }

  // 14. KOERIER & TRANSPORT (bv. M&A delivery service)
  if (isDelivery) {
    return {
      key: 'LOGISTICS_EXPRESS',
      name: 'Koerier & Sneltransport (Transport Midnight & Signal Blue)',
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
      badgeText: '🚚 Betrouwbare Spoedkoerier & Snelle Bezorgdienst',
      heroHeading: `Stipt & Veilig Bezorgd door ${b.name}`,
      heroSubtitle: 'Voor spoedzendingen, regionaal transport en betrouwbare zakelijke bezorging. Altijd op tijd, met zorg behandeld en direct contact met de chauffeur.',
      usps: [
        'Vaste afspraken en 100% stipte levering op het afgesproken moment',
        'Flexibele spoedritten in Groningen, Drenthe en heel Nederland',
        'Zorgvuldige, geconditioneerde en schadevrije goederenbehandeling'
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
  }

  // 15. DIGITALE OPLOSSINGEN & WEBDESIGN (bv. Justin Webontwikkeling)
  if (isWeb) {
    return {
      key: 'DIGITAL_STUDIO',
      name: 'Webontwikkeling & Design (Cyber Void & Vivid Violet)',
      isLightMode: false,
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      fontLink: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
      cssVars: `
        --bg-dark: #070914;
        --bg-header: rgba(7, 9, 20, 0.94);
        --bg-card: rgba(17, 21, 44, 0.82);
        --accent: #8B5CF6;
        --accent-hover: #7C3AED;
        --accent-subtle: rgba(139, 92, 246, 0.16);
        --accent-secondary: #06B6D4;
        --text-main: #F5F3FF;
        --text-muted: #A5B4FC;
        --border: rgba(139, 92, 246, 0.26);
        --shadow: 0 14px 35px rgba(7, 9, 20, 0.75);
      `,
      badgeText: '💻 Hyper-Moderne Webontwikkeling & Digitale Oplossingen',
      heroHeading: `Snelle Websites & Digitale Groei met ${b.name}`,
      heroSubtitle: 'Maatwerk webapplicaties, converterende landingspagina’s en geoptimaliseerde gebruikerservaringen voor ambitieuze ondernemers in het noorden.',
      usps: [
        'Bliksemsnelle laadtijden en mobile-first responsive design',
        'Conversiegerichte architectuur die meetbaar leads oplevert',
        'Persoonlijk contact en continue technische ondersteuning'
      ],
      processSteps: [
        { nr: '01', title: 'Doelen & Strategie', desc: 'We analyseren uw doelgroep, propositie en gewenste conversie.' },
        { nr: '02', title: 'Ontwerp & Ontwikkeling', desc: 'Moderne, veilige code gebouwd met de nieuwste standaarden.' },
        { nr: '03', title: 'Lancering & Groei', desc: 'Livegang, hosting en meetbare groei van uw online bereik.' }
      ],
      layoutVariant,
      promptPaletteAdvice: 'Cyber void nachtblauw (#070914) met neon violet (#8B5CF6) en helder cyaan (#06B6D4)',
      layoutVibe: 'Innovatief, technologisch, strak en modern'
    };
  }

  // 16. GENERAL TRADE / MODERNE VAKMAN (Fallback)
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
      'Lokale specialist met oog voor detail en vakmanschap',
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
  } else if (archetype === 'E_SITE_OFFLINE') {
    subject = `Website herstel & werkend concept voor ${b.name}`;
  } else if (archetype === 'D_MOBILE_UPGRADE') {
    subject = `Mobiel concept & WhatsApp update voor ${b.name}`;
  }

  // 2. Archetype-specifieke voordelen
  let bulletsHtml = '';
  let bulletsPlain = '';

  if (archetype === 'D_MOBILE_UPGRADE') {
    bulletsHtml = `
    <li><strong>1-Klik WhatsApp & Bellen:</strong> Zodat smartphone-bezoekers direct contact opnemen i.p.v. wegklikken</li>
    <li><strong>Supersnel op mobiel:</strong> Meer dan 75% van particulieren zoekt een vakman via smartphone</li>
    <li><strong>Jouw Google reviews:</strong> (${b.rating ? b.rating + ' sterren' : 'hoge reputatie'}) prominent en betrouwbaar in beeld</li>
    <li><strong>Modern & representatief design:</strong> Strakke uitstraling die de kwaliteit van jouw vakwerk weerspiegelt</li>`;
    bulletsPlain = `
- 1-Klik WhatsApp & Bellen: Zodat smartphone-bezoekers direct contact opnemen i.p.v. wegklikken
- Supersnel op mobiel: Meer dan 75% van particulieren zoekt een vakman via smartphone
- Jouw Google reviews (${b.rating ? b.rating + ' sterren' : 'hoge reputatie'}) prominent in beeld
- Modern & representatief: Strakke uitstraling die de kwaliteit van jouw vakwerk weerspiegelt`;
  } else if (archetype === 'E_SITE_OFFLINE') {
    bulletsHtml = `
    <li><strong>Direct weer bereikbaar:</strong> Geen time-out of foutmelding meer voor bezoekers op Google Maps</li>
    <li><strong>Supersnelle cloud hosting:</strong> 99.9% uptime garantie en dagelijkse automatische back-ups</li>
    <li><strong>Perfect op smartphones:</strong> Binnen 1 seconde geladen met directe contactknoppen</li>
    <li><strong>Direct contact via WhatsApp:</strong> Potentiële klanten kunnen meteen een vraag stellen of bellen</li>`;
    bulletsPlain = `
- Direct weer bereikbaar: Geen time-out of foutmelding meer op Google Maps
- Supersnelle cloud hosting: 99.9% uptime garantie en dagelijkse back-ups
- Perfect op smartphones: Binnen 1 seconde geladen met directe contactknoppen
- Direct contact via WhatsApp: Klanten kunnen meteen een vraag stellen of bellen`;
  } else if (archetype === 'C_MODERNISATION') {
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
    // Archetype A (Geen Website op Google Maps)
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
  if (archetype === 'D_MOBILE_UPGRADE') {
    whatsAppText = `Hoi ${b.name}! Allard hier van Creation+Alt+Fix uit Hoogezand. Ik zag jullie mooie vakwerk op Google Maps. Omdat meer dan 75% van klanten tegenwoordig via smartphone zoekt, heb ik alvast een supersnel mobiel concept met 1-klik WhatsApp knop voor je klaargezet: ${conceptUrl} - Benieuwd wat je ervan vindt!`;
  } else if (archetype === 'E_SITE_OFFLINE') {
    whatsAppText = `Hoi ${b.name}! Allard hier van Creation+Alt+Fix uit Hoogezand. Ik wilde zojuist jullie website bekijken via Google Maps, maar merkte dat de link momenteel een storing geeft of offline staat. Ik heb alvast een werkend, modern concept klaargezet: ${conceptUrl} - Kijk er gerust even naar op je telefoon!`;
  } else if (archetype === 'C_MODERNISATION') {
    whatsAppText = `Hoi ${b.name}! Allard hier van Creation+Alt+Fix uit Hoogezand. Ik zag jullie Google vermelding, maar merkte dat de link nog op onbeveiligd HTTP draait zonder werkend slotje. Ik heb alvast een modern en beveiligd concept klaargezet: ${conceptUrl} - Kijk er gerust naar op je telefoon!`;
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
    }
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

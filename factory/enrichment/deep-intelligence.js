/**
 * Creation+Alt+Fix - Deep Intelligence & Enrichment Service
 * Verrijkt de ruwe Google Maps data met contactgegevens, WhatsApp formatting,
 * KVK context en conversie-inzichten.
 */

export function isDutchMobilePhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  return digits.startsWith('06') || digits.startsWith('316') || digits.startsWith('00316');
}

export function extractCityFromAddress(address = '') {
  if (!address || typeof address !== 'string') return 'Hoogezand';
  const pcMatch = address.match(/\b\d{4}\s*[A-Za-z]{2}\s+([^,]+)/);
  if (pcMatch && pcMatch[1]) {
    const city = pcMatch[1].trim();
    if (city && city.toLowerCase() !== 'nederland') return city;
  }
  const knownCities = [
    'Hoogezand', 'Sappemeer', 'Veendam', 'Zuidlaren', 'Slochteren',
    'Muntendam', 'Kolham', 'Kropswolde', 'Foxhol', 'Harkstede',
    'Siddeburen', 'Zuidbroek', 'Noordbroek', 'Scheemda', 'Winschoten',
    'Stadskanaal', 'Assen', 'Haren', 'Delfzijl', 'Appingedam', 'Groningen'
  ];
  const lower = address.toLowerCase();
  for (const c of knownCities) {
    if (lower.includes(c.toLowerCase())) return c;
  }
  return 'Hoogezand';
}

export async function enrichBusinessProfile(business) {
  const profile = { ...business };

  // 1. Telefoon, Stad & WhatsApp normalisatie (Nederlands formaat - strikt alleen 06-nummers op WhatsApp)
  profile.city = extractCityFromAddress(profile.address);
  profile.normalizedPhone = normalizeDutchPhone(profile.phone);
  const rawDigits = profile.normalizedPhone ? profile.normalizedPhone.replace(/\D/g, '') : '';
  if (rawDigits.startsWith('06') && rawDigits.length >= 10) {
    profile.whatsAppNumber = '31' + rawDigits.substring(1);
    profile.hasWhatsApp = true;
  } else if (rawDigits.startsWith('316') && rawDigits.length >= 11) {
    profile.whatsAppNumber = rawDigits;
    profile.hasWhatsApp = true;
  } else {
    profile.whatsAppNumber = null;
    profile.hasWhatsApp = false;
  }

  // 2. Data Integrity: Valideer of gekoppelde website werkelijk bij het bedrijf hoort (voorkom cross-contamination)
  if (profile.website) {
    if (!isWebsiteMatchingBusiness(profile.name, profile.website)) {
      console.warn(`⚠️ [Enrichment] Website "${profile.website}" hoort niet bij "${profile.name}". Website losgekoppeld.`);
      profile.website = null;
      profile.hasWebsite = false;
      profile.email = null;
    }
  }

  // 3. Echte live website / SSL verificatie
  const probe = await probeWebsite(profile.website);
  profile.websiteProbe = probe;

  // 4. Kwalificatiescore & Potentie-analyse
  const potentialAnalysis = analyzeBusinessPotential(profile, probe);
  profile.score = potentialAnalysis.score;
  profile.archetype = potentialAnalysis.archetype;
  profile.archetypeLabel = potentialAnalysis.archetypeLabel;
  profile.pitchHook = potentialAnalysis.pitchHook;
  profile.strengths = potentialAnalysis.strengths;
  profile.recommendedDomain = `${profile.slug}.nl`;

  // 5. Fallback e-mail mining (blokkeer eigen/agency domeinen)
  if (profile.email && String(profile.email).toLowerCase().includes('creationaltfix')) {
    profile.email = null;
  }
  if (!profile.email) {
    if (profile.website && probe.type !== 'SITE_OFFLINE') {
      profile.email = await mineEmailFromWebsite(probe.finalUrl || profile.website).catch(() => null);
    }
  }

  // 6. Default services en reviews afleiden uit categorie
  profile.suggestedServices = deriveServicesFromCategory(profile.category, profile.name);
  if (!Array.isArray(profile.reviews) || profile.reviews.length === 0) {
    profile.reviews = deriveReviewsFromCategory(profile.category, profile.name, profile.address);
  }

  return profile;
}

/**
 * CWE-918: SSRF Filter ter bescherming tegen interne loopback, private ranges en cloud metadata IP's
 * @param {string} urlStr 
 * @returns {boolean}
 */
export function isSafeExternalUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  let normalized = urlStr.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'http://' + normalized;
  }
  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (!host) return false;

    // Direct loopback / localhost
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return false;
    if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan') || host.endsWith('.arpa')) return false;

    // IPv4 checks (Private RFC 1918, CGNAT RFC 6598, Link-local/Metadata)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const m = host.match(ipv4Regex);
    if (m) {
      const [_, o1, o2, o3, o4] = m.map(Number);
      if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) return false;
      if (o1 === 0 || o1 === 127) return false; // 0.0.0.0/8, 127.0.0.0/8
      if (o1 === 10) return false; // RFC 1918 10.0.0.0/8
      if (o1 === 172 && (o2 >= 16 && o2 <= 31)) return false; // RFC 1918 172.16.0.0/12
      if (o1 === 192 && o2 === 168) return false; // RFC 1918 192.168.0.0/16
      if (o1 === 169 && o2 === 254) return false; // Link-local / Cloud metadata 169.254.0.0/16
      if (o1 === 100 && (o2 >= 64 && o2 <= 127)) return false; // RFC 6598 Tailscale / CGNAT 100.64.0.0/10
    }

    // Require valid domain format
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host);
  } catch {
    return false;
  }
}

/**
 * Test de werkelijke bereikbaarheid en SSL status van de website
 */
export async function probeWebsite(urlStr) {
  if (!urlStr || !isSafeExternalUrl(urlStr)) return { type: 'NO_WEBSITE', label: 'Geen Mobiele Website op Google Maps', hasSsl: false };
  let normalized = urlStr.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) normalized = 'http://' + normalized;

  try {
    const u = new URL(normalized);
    const httpsUrl = 'https://' + u.host + (u.pathname || '/');
    const r = await fetch(httpsUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(3500) });
    if (r.ok || (r.status >= 200 && r.status < 400)) {
      const safeFinal = (r.url && isSafeExternalUrl(r.url)) ? r.url : httpsUrl;
      return { 
        type: 'MOBILE_UPGRADE', 
        label: 'Mobiele Conversie, Snelheid & WhatsApp Update', 
        finalUrl: safeFinal,
        hasSsl: true 
      };
    }
  } catch (errHttps) {
    // HTTPS mislukt, test of HTTP verbinding nog reageert
    try {
      const rHttp = await fetch(normalized, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(3500) });
      const safeFinalHttp = (rHttp.url && isSafeExternalUrl(rHttp.url)) ? rHttp.url : normalized;
      if (rHttp.url.startsWith('https://')) {
        return { 
          type: 'MOBILE_UPGRADE', 
          label: 'Mobiele Conversie, Snelheid & WhatsApp Update', 
          finalUrl: safeFinalHttp,
          hasSsl: true 
        };
      }
      return { 
        type: 'INSECURE_HTTP', 
        label: 'Onbeveiligde HTTP (Geen SSL Certificaat)',
        finalUrl: safeFinalHttp,
        hasSsl: false
      };
    } catch (errHttp) {
      return { 
        type: 'SITE_OFFLINE', 
        label: 'Website Onbereikbaar / Storing op Google Maps',
        hasSsl: false
      };
    }
  }

  return { 
    type: 'MOBILE_UPGRADE', 
    label: 'Mobiele Conversie, Snelheid & WhatsApp Update',
    hasSsl: true 
  };
}

/**
 * Normaliseert Nederlands telefoonnummer naar leesbaar formaat
 */
function normalizeDutchPhone(phone) {
  if (!phone) return null;
  const clean = phone.replace(/[^0-9+]/g, '');
  if (clean.startsWith('31')) return '0' + clean.substring(2);
  if (clean.startsWith('+31')) return '0' + clean.substring(3);
  return clean;
}

/**
 * Berekent de lead-potentie score, het archetype en de haak voor de acquisitie e-mail
 */
export function analyzeBusinessPotential(b, probe = null) {
  let score = 50; // Basis
  const strengths = [];
  let archetype = 'A_TRADE_DIRECT';
  let archetypeLabel = 'Nuchter & Direct Bellen (Vakman)';
  let pitchHook = '';

  const cat = ((b.category || '') + ' ' + (b.name || '')).toLowerCase();
  const isBeautyOrCare = cat.includes('kapper') || cat.includes('salon') || cat.includes('beauty') ||
    cat.includes('massage') || cat.includes('zorg') || cat.includes('pedicure') || cat.includes('nagel') ||
    cat.includes('coach') || cat.includes('therapie');

  // Bepaal het werkelijke type haakje
  let probeType = probe ? probe.type : null;
  if (!probeType) {
    if (!b.website) probeType = 'NO_WEBSITE';
    else if (b.hasInsecureHttp) probeType = 'INSECURE_HTTP';
    else if (b.isOffline) probeType = 'SITE_OFFLINE';
    else probeType = 'MOBILE_UPGRADE';
  }

  if (probeType === 'NO_WEBSITE') {
    score += 40;
    strengths.push("Heeft nog géén actieve website gekoppeld op Google Maps");

    if (isBeautyOrCare) {
      archetype = 'B_PRESENTATION_REVIEWS';
      archetypeLabel = 'Uitstraling & Klantreviews (Zorg/Beauty)';
      pitchHook = `We zagen dat je met ${b.name} in ${b.address ? 'regio Hoogezand / Groningen' : 'de regio'} prachtige reviews krijgt, maar dat je op Google Maps nog geen directe website hebt om jouw behandelingen, sfeer en klantbeoordelingen te presenteren.`;
    } else {
      archetype = 'A_TRADE_DIRECT';
      archetypeLabel = 'Geen Website op Google Maps (Direct Bellen)';
      pitchHook = `We zagen jouw vermelding voor ${b.name} op Google Maps in ${b.address ? 'regio Hoogezand / Groningen' : 'de regio'}. Omdat er nog geen eigen website aan gekoppeld is, lopen particulieren die mobiel een betrouwbare specialist zoeken nu sneller door naar concurrenten. Ik heb alvast een compleet, vrijblijvend concept klaargezet met directe bel- en WhatsApp-knoppen.`;
    }
  } else if (probeType === 'SITE_OFFLINE') {
    archetype = 'E_SITE_OFFLINE';
    archetypeLabel = 'Website Onbereikbaar / Foutmelding op Google Maps';
    score += 45;
    strengths.push("Huidige website link op Google Maps is onbereikbaar of geeft een storing");
    pitchHook = `We wilden jouw website bekijken via jouw Google Maps vermelding voor ${b.name}, maar merkten dat de link naar ${b.website} momenteel niet bereikbaar is of een foutmelding geeft. Zonde voor potentiële klanten die je zoeken. Ik heb alvast een modern, razendsnel en direct werkend concept voor je klaargezet.`;
  } else if (probeType === 'INSECURE_HTTP') {
    archetype = 'C_MODERNISATION';
    archetypeLabel = 'SSL Beveiliging & HTTPS Update';
    score += 35;
    strengths.push("Heeft een onbeveiligde HTTP-website zonder modern SSL-slotje");
    pitchHook = `We zagen jouw vermelding voor ${b.name} op Google Maps. We merkten op dat de website nog op onbeveiligd HTTP draait en geen werkende HTTPS-verbinding heeft. Browsers zoals Google Chrome tonen hierdoor een waarschuwing 'Niet beveiligd', wat zonde is voor het vertrouwen van potentiële klanten.`;
  } else {
    // MOBILE_UPGRADE (Website heeft al SSL / HTTPS!)
    archetype = 'D_MOBILE_UPGRADE';
    archetypeLabel = 'Mobiele Conversie, Snelheid & WhatsApp Update';
    score += 30;
    strengths.push("Bestaande website heeft SSL, maar mist moderne mobiele conversieknoppen en WhatsApp");
    pitchHook = `We zagen jouw vakwerk en mooie vermelding voor ${b.name} op Google Maps. Jullie hebben al een website, maar meer dan 75% van de particulieren zoekt tegenwoordig via hun mobiele telefoon naar een specialist. Veel traditionele websites zijn op mobiel traag en missen directe 1-klik contactknoppen zoals WhatsApp of Direct Bellen, waardoor mobiele bezoekers afhaken. Ik heb speciaal voor ${b.name} een modern, supersnel mobiel concept gebouwd.`;
  }

  if (b.rating && b.rating >= 4.5) {
    score += 10;
    strengths.push(`Uitstekende Google reputatie (${b.rating} sterren over ${b.reviewsCount || 0} reviews)`);
  }

  if (b.phone) {
    strengths.push(`Direct telefonisch bereikbaar (${b.phone})`);
  }

  return { score, strengths, archetype, archetypeLabel, pitchHook };
}

/**
 * Scant openbare website / homepage op e-mail regex indien aanwezig
 */
async function mineEmailFromWebsite(url) {
  if (!url || !isSafeExternalUrl(url)) return null;
  let timeout = null;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });

    if (!resp.ok) return null;
    const rawText = await resp.text();
    // CWE-400: Begrens gelezen tekst tot 256KB ter voorkoming van memory bloat
    const text = rawText.slice(0, 256 * 1024);

    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const matches = text.match(emailRegex);
    if (matches && matches.length > 0) {
      let targetHost = '';
      try {
        const u = new URL(url.startsWith('http') ? url : 'http://' + url);
        targetHost = u.hostname.toLowerCase().replace(/^www\./, '');
      } catch {}

      // Filter veelvoorkomende dummy/asset emails en valideer lengte & RFC formaat
      // Zorg dat de e-mail toebehoort aan het domein van de website zelf (geen externe partners/ontwerpers)
      const filtered = matches.filter(e => {
        const clean = e.toLowerCase().trim();
        const emailDomain = clean.split('@')[1];
        if (!emailDomain) return false;
        const isDomainMatch = !targetHost || emailDomain === targetHost || emailDomain.endsWith('.' + targetHost) || targetHost.endsWith('.' + emailDomain);

        return clean.length <= 100 && 
               isDomainMatch &&
               !clean.includes('creationaltfix') &&
               !clean.includes('example') && 
               !clean.includes('.png') && 
               !clean.includes('.jpg') && 
               !clean.includes('.webp') && 
               !clean.includes('sentry') &&
               /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean);
      });
      if (filtered.length > 0) return filtered[0].toLowerCase().trim();
    }
  } catch {
    // Timeout of netwerkfout
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  return null;
}

/**
 * Valideert of een website plausibel bij het bedrijf hoort en niet bij een ander bedrijf (CWE-20 / Data Integrity)
 * Voorkomt dat nevenbedrijven of concurrenten per abuis gekoppeld worden aan een lead.
 * @param {string} businessName 
 * @param {string} websiteUrl 
 * @returns {boolean}
 */
export function isWebsiteMatchingBusiness(businessName, websiteUrl) {
  if (!websiteUrl || typeof websiteUrl !== 'string') return false;
  if (!businessName || typeof businessName !== 'string') return true;

  try {
    const parsed = new URL(websiteUrl.startsWith('http') ? websiteUrl : 'http://' + websiteUrl);
    const domain = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (domain.includes('creationaltfix')) return false;
    const domainBase = domain.split('.')[0].replace(/[^a-z0-9]/g, '');

    const stopWords = new Set([
      'de', 'het', 'een', 'en', 'van', 'der', 'den', 'te', 'in', 'op', 'voor',
      'bv', 'b.v.', 'vof', 'v.o.f.', 'zzp', 'holding', 'groep', 'bedrijf', 'diensten',
      'service', 'nederland', 'noord', 'groningen', 'hoogezand', 'veendam'
    ]);

    const nameTokens = businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2 && !stopWords.has(t));

    // Als de bedrijfsnaam geen bruikbare tokens heeft, vertrouw crawler
    if (nameTokens.length === 0) return true;

    // 1. Minstens één significant token (>= 3 letters) uit de bedrijfsnaam komt voor in het domein
    const significantTokens = nameTokens.filter(t => t.length >= 3);
    if (significantTokens.length > 0) {
      if (significantTokens.some(token => domainBase.includes(token))) {
        return true;
      }
    }

    // 2. Acroniem match (bijv. "M&A delivery service" -> "ma-ds" of "mads")
    const acronym = nameTokens.map(t => t[0]).join('');
    if (acronym.length >= 2 && domainBase.includes(acronym)) {
      return true;
    }

    // 3. Volledige naam match zonder leestekens/spaties
    const cleanFullName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanFullName.length >= 4 && (domainBase.includes(cleanFullName) || cleanFullName.includes(domainBase))) {
      return true;
    }

    // 4. Match in het URL-pad (bijv. platforms zoals devakman.info/dennisdijkema)
    const fullPath = (parsed.hostname + parsed.pathname).toLowerCase();
    if (nameTokens.some(token => token.length >= 3 && fullPath.includes(token))) {
      return true;
    }

    // Geen match gevonden: website hoort hoogstwaarschijnlijk bij een ander bedrijf!
    return false;
  } catch {
    return false;
  }
}

/**
 * Biedt branche-specifieke diensten (4 maatwerk kaarten per sector) voor elk MKB/ZZP segment
 */
export function deriveServicesFromCategory(category = '', name = '') {
  const cat = ((category || '') + ' ' + (name || '')).toLowerCase();

  if (cat.includes('dak') || cat.includes('zink') || cat.includes('bitumen') || cat.includes('epdm')) {
    return [
      { title: "Dakrenovatie & Onderhoud", desc: "Volledige vernieuwing en preventief onderhoud van platte en hellende daken met 10 jaar garantie." },
      { title: "Bitumen, EPDM & Dakpannen", desc: "Waterdichte dakbedekking met A-merk bitumen, duurzame EPDM-folie of keramische dakpannen." },
      { title: "Daklekkage & Spoedherstel", desc: "Snelle lekdetectie en directe noodreparatie bij stormschade of acute lekkages." },
      { title: "Dakcoating, Isolatie & Zinkwerk", desc: "Energiebesparende dakisolatie, beschermende dakcoating en strak zink- en loodwerk." }
    ];
  }

  if (cat.includes('ontstop') || cat.includes('riool') || cat.includes('afvoer')) {
    return [
      { title: "Riool & Afvoer Ontstoppen", desc: "Directe verhelping van verstoppingen in wc, keukenafvoer, doucheputje of hoofdriool." },
      { title: "Camera-Inspectie & Stankdetectie", desc: "Nauwkeurige lokalisatie van breuken, wortelgroei en verzakkingen zonder onnodig breekwerk." },
      { title: "Hogedruk Rioolreiniging", desc: "Grondige reiniging van leidingen om terugkerende verstoppingen en borrelende afvoeren te voorkomen." },
      { title: "Rioolrenovatie & Vervanging", desc: "Duurzaam herstel en aanleg van binnen- en buitenriolering volgens moderne normen." }
    ];
  }

  if (cat.includes('loodgieter') || cat.includes('installat') || cat.includes('cv') || cat.includes('warmtepomp') || cat.includes('sanitair')) {
    return [
      { title: "CV-Ketel & Warmtepomp Service", desc: "Vakkundige installatie, periodiek onderhoud en storingsdienst voor verwarming en hybride warmtepompen." },
      { title: "Loodgieterswerk & Leidingen", desc: "Aanleg, verleggen en reparatie van water-, gas- en afvoerleidingen bij nieuwbouw of verbouw." },
      { title: "Badkamer & Sanitair Montage", desc: "Strakke plaatsing van kranen, toiletten, inloopdouches en complete badkamerrenovaties." },
      { title: "Lekkage & Storingsdienst", desc: "Snelle opsporing en vakkundig herstel van water- en verwarmingslekkages in de regio." }
    ];
  }

  if (cat.includes('stratenmaker') || cat.includes('bestrat') || cat.includes('grondwerk') || cat.includes('sierbestrating')) {
    return [
      { title: "Sierbestrating & Terrassen", desc: "Strak gelegde terrassen met keramische tegels, gebakken waaltjes of natuursteen op stabiele ondergrond." },
      { title: "Opritten & Parkeervakken", desc: "Zwaar belastbare bestrating en professionele fundering die verzakkingen en spoorvorming voorkomt." },
      { title: "Grondwerk & Afwatering", desc: "Vakkundig uitgraven, aanvullen met straatzand, verdichten en aanleg van lijngoten en hemelwaterafvoer." },
      { title: "Herbestrating & Kantopsluiting", desc: "Ophogen van verzakte tuininritten, tuinpaden en het plaatsen van duurzame opsluitbanden." }
    ];
  }

  if (cat.includes('hovenier') || cat.includes('tuin') || cat.includes('groen') || cat.includes('boom')) {
    return [
      { title: "Tuinaanleg & Tuinontwerp", desc: "Complete metamorfose van jouw buitenruimte: van doordacht beplantingsplan tot oplevering." },
      { title: "Sierbestrating & Vlonders", desc: "Strak gelegde terrassen, tuinpaden, keramische tegels en hardhouten vlonders op maat." },
      { title: "Periodiek Tuinonderhoud", desc: "Vakkundig snoeiwerk, gazononderhoud, bemesting en onkruidbeheer in elk seizoen." },
      { title: "Schuttingen & Houtbouw", desc: "Duurzame hout-beton erfafscheidingen, douglas overkappingen en pergola's op maat." }
    ];
  }

  if (cat.includes('stukadoor') || cat.includes('stuc') || cat.includes('afbouw') || cat.includes('spack')) {
    return [
      { title: "Glad Pleisterwerk (Sausklaar)", desc: "Spiegelgladde wanden en plafonds, direct klaar om streeploos te sauzen of behangen." },
      { title: "Sierpleister & Spachtelputz", desc: "Slijtvaste, stootvaste en decoratieve wandafwerking met fijne korrelstructuur in elke gewenste tint." },
      { title: "Plafondafwerking & Schuurwerk", desc: "Strakke plafonds met fijn schuurwerk, lijstwerk of naadloze afwerking van gipsplaten." },
      { title: "Latex Spuiten & Buitenstucwerk", desc: "Streeploos airless latex spuitwerk en weerbestendig gevelstucwerk voor nieuwbouw en renovatie." }
    ];
  }

  if (cat.includes('schilder') || cat.includes('glaszet') || cat.includes('lakwerk')) {
    return [
      { title: "Binnenschilderwerk", desc: "Strakke afwerking van muren, plafonds, trappen, deuren en kozijnen met krasvaste A-merk lakken." },
      { title: "Buitenschilderwerk", desc: "Duurzame bescherming tegen weer en wind met Sigma of Sikkens verfsystemen voor jarenlang behoud." },
      { title: "Houtrotreparatie & Deelvervanging", desc: "Vakkundige inspectie en duurzaam herstel van aangetast houtwerk met 2-componenten epoxy." },
      { title: "Kleuradvies & Glaszetten", desc: "Persoonlijk kleur- en materiaaladvies en het plaatsen van isolerend HR++ beglazing." }
    ];
  }

  if (cat.includes('elektr') || cat.includes('groepenkast') || cat.includes('laadpaal')) {
    return [
      { title: "Groepenkast Vervangen & Uitbreiden", desc: "Veilige NEN1010/3140 installatie met moderne aardlekschakelaars en uitbreiding voor inductie of krachtstroom." },
      { title: "Elektra Aanleg & Renovatie", desc: "Compleet leidingwerk, schakelmateriaal en sfeerverlichting voor keuken, aanbouw of woningrenovatie." },
      { title: "Laadpalen & Verduurzaming", desc: "Vakkundige montage en aansluiting van slimme thuislaadpalen en zonnepaneel-groepen." },
      { title: "Storingsdienst & Keuringen", desc: "Snelle diagnose en veilige oplossing bij kortsluiting, stroomuitval of oude bedrading." }
    ];
  }

  if (cat.includes('fiets') || cat.includes('tweewieler') || cat.includes('e-bike') || cat.includes('fatbike')) {
    return [
      { title: "E-Bike & Stadsfiets Reparatie", desc: "Vakkundig herstel van elektrische fietsen, stadsfietsen, kinderfietsen en bakfietsen van alle merken." },
      { title: "Accu, Motor & Display Diagnose", desc: "Uitlezen van e-bike systemen, sensorvervanging en herstel van elektrische storingen." },
      { title: "Banden, Remmen & Aandrijving", desc: "Directe vervanging van lekke banden, kettingen, tandwielen, versnellingsnaven en hydraulische remmen." },
      { title: "Onderhoudsbeurt & Rijklaar Service", desc: "Volledige veiligheidscheck, spaken spannen en smering zodat jouw fiets weer als nieuw rijdt." }
    ];
  }

  if (cat.includes('auto') || cat.includes('garage') || cat.includes('apk') || cat.includes('carrosserie') || cat.includes('banden')) {
    return [
      { title: "APK Keuring & Onderhoudsbeurt", desc: "Kleine en grote onderhoudsbeurten en eerlijke APK-keuring voor alle automerken zonder verrassingen." },
      { title: "Diagnose, Remmen & Distributie", desc: "Uitlezen van motormanagement, vervanging van remschijven, koppelingen en distributieriemen." },
      { title: "Bandenwissel, Uitlijnen & Airco", desc: "Zomer- en winterbandenservice, nauwkeurig balanceren en airco-onderhoud voor optimaal rijcomfort." },
      { title: "Schadeherstel & Spoedreparatie", desc: "Vakkundig carrosserieherstel en snelle hulp bij autopech zodat je direct weer veilig op weg kunt." }
    ];
  }

  if (cat.includes('personal') || cat.includes('fitness') || cat.includes('gym') || cat.includes('sport') || cat.includes('bootcamp')) {
    return [
      { title: "1-op-1 Personal Training", desc: "Persoonlijke kracht- en conditietraining volledig afgestemd op jouw lichaam, niveau en doelstellingen." },
      { title: "Duo & Small Group Training", desc: "Samen gemotiveerd trainen in kleine groepen met professionele techniekcoaching en maximale energie." },
      { title: "Voedings- & Leefstijlplan op Maat", desc: "Praktische, haalbare voedingsrichtlijnen voor duurzame vetverbranding, spieropbouw en meer energie." },
      { title: "Fysieke Metingen & Progressie", desc: "Periodieke lichaamscompositiemetingen en bijsturing zodat je gegarandeerd resultaat behaalt." }
    ];
  }

  if (cat.includes('gewicht') || cat.includes('voeding') || cat.includes('afvallen') || cat.includes('leefstijl') || cat.includes('weight') || cat.includes('vital')) {
    return [
      { title: "Gezond & Blijvend Afvallen", desc: "Persoonlijke begeleiding naar een gezond gewicht met gewone supermarktproducten, zonder crashdiëten." },
      { title: "Voedingsanalyse & Dagmenu's", desc: "Praktische weekmenu's en lekkere recepten die naadloos passen in een druk gezins- of werkleven." },
      { title: "Leefstijl- & Gedragscoaching", desc: "Doorbreken van vaste gewoontes en emotie-eten met positieve, stok-achter-de-deur begeleiding." },
      { title: "Vergoeding via Aanvullende Polis", desc: "Veel trajecten bij een erkende gewichtsconsulent worden (deels) vergoed zonder aanspraak op eigen risico." }
    ];
  }

  if (cat.includes('koerier') || cat.includes('delivery') || cat.includes('transport') || cat.includes('bezorg') || cat.includes('logistiek')) {
    return [
      { title: "Directe Spoedkoerier (Sneltransport)", desc: "Zonder tussenstop van A naar B in heel Nederland en Europa: binnen 30-45 minuten onderweg." },
      { title: "Zakelijke & Medische Zendingen", desc: "Betrouwbaar en discreet vervoer van vertrouwelijke documenten, onderdelen en tijdkritische pakketten." },
      { title: "Vaste Routes & Distributie", desc: "Flexibele dagelijkse of wekelijkse ritten voor webshops, groothandels en productiebedrijven." },
      { title: "24/7 Bereikbaar & Track-Update", desc: "Direct contact met de chauffeur en onmiddellijke afleverbevestiging zodra de zending is bezorgd." }
    ];
  }

  if (cat.includes('webdesign') || cat.includes('webontwikkeling') || cat.includes('software') || cat.includes('marketing') || cat.includes('studio')) {
    return [
      { title: "Maatwerk Webdesign & Development", desc: "Supersnelle, conversiegerichte websites en webapplicaties die perfect presteren op mobiel en desktop." },
      { title: "Lokale SEO & Google Vindbaarheid", desc: "Technische optimalisatie en gestructureerde data zodat jouw bedrijf bovenaan scoort in de regio." },
      { title: "Huisstijl, UX & Merkidentiteit", desc: "Onderscheidend digitaal ontwerp dat direct vertrouwen wekt bij jouw ideale doelgroep." },
      { title: "Beheer, Beveiliging & Snelheid", desc: "Zorgeloze hosting, SSL-beveiliging en proactief technisch onderhoud voor 99,9% uptime." }
    ];
  }

  if (cat.includes('schoonmaak') || cat.includes('glazenwas') || cat.includes('reinig')) {
    return [
      { title: "Glazenwasserij & Kozijnreiniging", desc: "Streeploos schone ramen en grondig gereinigde kozijnen met osmose-water of traditioneel vakmanschap." },
      { title: "Zakelijke & Particuliere Schoonmaak", desc: "Periodiek interieuronderhoud voor kantoren, praktijkruimtes, VvE-trappenhuizen en woningen." },
      { title: "Gevel-, Dakgoot- & Zonnepaneelreiniging", desc: "Veilige verwijdering van groene aanslag, mos en vuil voor optimaal rendement en behoud." },
      { title: "Opleveringsschoonmaak", desc: "Grondige dieptereiniging na verbouwing, renovatie of verhuizing." }
    ];
  }

  if (cat.includes('kapper') || cat.includes('salon') || cat.includes('beauty') || cat.includes('nagel') || cat.includes('pedicure') || cat.includes('massage')) {
    return [
      { title: "Behandeling & Styling op Maat", desc: "Persoonlijk advies en vakkundige uitvoering met hoogwaardige, verzorgende salonproducten." },
      { title: "Specialistische Verzorging", desc: "Aandacht voor elk detail zodat jij ontspannen en stralend de salon verlaat." },
      { title: "Hygiëne & Kwaliteitsproducten", desc: "Wij werken uitsluitend volgens de hoogste hygiënerichtlijnen en met huidvriendelijke A-merken." },
      { title: "Flexibele Afspraakmogelijkheden", desc: "Snel en eenvoudig een afspraak inplannen op een moment dat jou het beste uitkomt." }
    ];
  }

  if (cat.includes('timmer') || cat.includes('klus') || cat.includes('vakman') || cat.includes('onderhoud') || cat.includes('renovatie') || cat.includes('bouw') || cat.includes('aannem')) {
    return [
      { title: "Renovatie, Verbouw & Afbouw", desc: "Vakkundige totaaluitvoering voor grote en kleine verbouwingen in en rondom jouw woning." },
      { title: "Maatwerk Timmerwerk & Kozijnen", desc: "Op maat gemaakte kastenwanden, deuren, boeidelen, overkappingen en kozijnvervanging." },
      { title: "Woningonderhoud & Reparatie", desc: "Snelle en duurzame oplossing voor houtrot, klemmende deuren, gevelbekleding en herstelwerk." },
      { title: "Keuken, Badkamer & Zolder", desc: "Complete aftimmering, isolatie en strakke oplevering met één vast aanspreekpunt." }
    ];
  }

  // Algemene default diensten voor ZZP'er / Vakman
  return [
    { title: "Vakmanschap op Maat", desc: "Persoonlijke aandacht en professionele uitvoering volgens afspraak door een ervaren specialist." },
    { title: "Transparante Offerte Vooraf", desc: "Binnen 24 uur een heldere prijsopgave zodat je vooraf exact weet waar je aan toe bent." },
    { title: "Regionale Service in Groningen", desc: "Snel ter plaatse, korte lijnen en lokale betrokkenheid in de regio." },
    { title: "Garantie op Kwaliteit", desc: "Wij leveren pas op wanneer elk detail klopt en jij 100% tevreden bent met het resultaat." }
  ];
}

/**
 * Genereert 3 branche-specifieke klantbeoordelingen indien Google Maps alleen de sterrenscore teruggeeft
 */
export function deriveReviewsFromCategory(category = '', name = '', address = '') {
  const cat = ((category || '') + ' ' + (name || '')).toLowerCase();
  const city = extractCityFromAddress(address);

  if (cat.includes('dak') || cat.includes('zink') || cat.includes('bitumen')) {
    return [
      { text: `Na stormschade direct geholpen door ${name}. Binnen een dag geïnspecteerd en het dak weer 100% waterdicht opgeleverd. Eerlijke prijs en topvakwerk!`, author: `Familie Bos • ${city}` },
      { text: `Ons platte dak laten vernieuwen met nieuwe dakbedekking en isolatie. Strakke afwerking van de dakranden en alles keurig schoon achtergelaten.`, author: `M. Dijkhuizen • Regio ${city}` },
      { text: `Duidelijke offerte vooraf met foto's van het dak. Zeer betrouwbare dakspecialist die zijn afspraken stipt nakomt.`, author: `J. van der Laan • ${city}` }
    ];
  }

  if (cat.includes('ontstop') || cat.includes('riool') || cat.includes('loodgieter') || cat.includes('installat')) {
    return [
      { text: `Supersnel ter plaatse in ${city} toen onze afvoer verstopt zat. Met professionele apparatuur binnen een half uur opgelost en heldere tarieven vooraf.`, author: `R. Meijer • ${city}` },
      { text: `Erg tevreden over de kundige service van ${name}. Denkt echt mee, werkt netjes en laat alles keurig achter na de klus.`, author: `S. Hoekstra • Regio ${city}` },
      { text: `Vriendelijke vakman die direct de oorzaak wist te vinden. Geen voorrijkosten-verrassingen achteraf, gewoon eerlijk werk.`, author: `H. Brouwer • ${city}` }
    ];
  }

  if (cat.includes('stratenmaker') || cat.includes('bestrat') || cat.includes('hovenier') || cat.includes('tuin')) {
    return [
      { text: `Onze oprit en achtertuin zijn compleet nieuw aangelegd door ${name}. Ligt er strak bij, perfecte afwatering en prettig overleg tijdens het werk.`, author: `Familie de Vries • ${city}` },
      { text: `Hardwerkende vakmensen met oog voor detail. Goed advies gekregen over de tegels en indeling, het resultaat overtreft onze verwachtingen.`, author: `P. Bakker • Regio ${city}` },
      { text: `Komen afspraken keurig na en leveren topkwaliteit. Onze tuin in ${city} kan er weer jaren tegenaan!`, author: `L. Koster • ${city}` }
    ];
  }

  if (cat.includes('stukadoor') || cat.includes('stuc') || cat.includes('schilder')) {
    return [
      { text: `Onze hele benedenverdieping is strak afgewerkt door ${name}. Spiegelglad resultaat, netjes afgeplakt en precies volgens planning opgeleverd.`, author: `Familie Jansen • ${city}` },
      { text: `Echt vakwerk geleverd! Je ziet direct het verschil in kwaliteit en afwerking. Duidelijke offerte en fijne communicatie.`, author: `E. Smit • Regio ${city}` },
      { text: `Zeer secuur gewerkt en aan het einde van elke dag alles netjes opgeruimd. Wij raden ${name} aan iedereen in ${city} aan.`, author: `K. Mulder • ${city}` }
    ];
  }

  if (cat.includes('fiets') || cat.includes('auto') || cat.includes('garage')) {
    return [
      { text: `Mijn e-bike dezelfde dag nog vakkundig gerepareerd voor een hele nette prijs. Eerlijk advies en je merkt meteen de ervaring van ${name}.`, author: `A. Boer • ${city}` },
      { text: `Altijd snelle service en vriendelijk geholpen. Geen onnodige onderdelen vervangen maar gewoon direct een goede oplossing.`, author: `W. Drenth • Regio ${city}` },
      { text: `Hét vaste adres in ${city} voor onderhoud en reparatie. Betrouwbaar, vakkundig en altijd bereikbaar.`, author: `T. Venema • ${city}` }
    ];
  }

  if (cat.includes('personal') || cat.includes('fitness') || cat.includes('gewicht') || cat.includes('voeding') || cat.includes('weight') || cat.includes('coach')) {
    return [
      { text: `Dankzij de persoonlijke begeleiding bij ${name} voel ik me fitter en energieker dan ooit. Geen standaardschema, maar echt maatwerk dat vol te houden is!`, author: `M. Wolters • ${city}` },
      { text: `Fijne, motiverende sfeer en deskundige coaching. Eindelijk resultaat behaald zonder hongergevoel of blessures.`, author: `N. Veenstra • Regio ${city}` },
      { text: `Persoonlijke aandacht staat hier echt op één. Elke week merk ik vooruitgang, een absolute aanrader in ${city}!`, author: `D. Koning • ${city}` }
    ];
  }

  if (cat.includes('koerier') || cat.includes('delivery') || cat.includes('transport')) {
    return [
      { text: `Tijdkritische zending vanuit ${city} moest direct geleverd worden. Binnen een half uur opgehaald en exact op tijd afgeleverd met bevestiging.`, author: `Zakelijke klant • ${city}` },
      { text: `Zeer betrouwbare koeriersdienst. Representatief, zorgvuldig met kwetsbare goederen en korte communicatielijnen.`, author: `B. Hendriks • Regio ${city}` },
      { text: `Al meerdere spoedritten laten verzorgen door ${name}. Altijd bereikbaar en 100% afspraak is afspraak.`, author: `J. Kuipers • ${city}` }
    ];
  }

  return [
    { text: `Uitstekende ervaring met ${name}! Snelle reactie, heldere prijsafspraak vooraf en super strak vakwerk afgeleverd.`, author: `Familie de Boer • ${city}` },
    { text: `Een vakman die echt meedenkt en pas stopt als elk detail klopt. Alles keurig volgens planning uitgevoerd en netjes achtergelaten.`, author: `R. van Dijk • Regio ${city}` },
    { text: `Fijne, nuchtere communicatie en topkwaliteit resultaat. Wij schakelen ${name} bij een volgende klus direct weer in!`, author: `M. Schouten • ${city}` }
  ];
}


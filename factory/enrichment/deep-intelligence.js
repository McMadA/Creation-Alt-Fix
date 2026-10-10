/**
 * Creation+Alt+Fix - Deep Intelligence & Enrichment Service
 * Verrijkt de ruwe Google Maps data met contactgegevens, WhatsApp formatting,
 * KVK context en conversie-inzichten.
 */

export async function enrichBusinessProfile(business) {
  const profile = { ...business };

  // 1. Telefoon & WhatsApp normalisatie (Nederlands formaat)
  profile.normalizedPhone = normalizeDutchPhone(profile.phone);
  profile.whatsAppNumber = profile.normalizedPhone ? profile.normalizedPhone.replace(/\D/g, '') : null;
  if (profile.whatsAppNumber && profile.whatsAppNumber.startsWith('06')) {
    profile.whatsAppNumber = '31' + profile.whatsAppNumber.substring(1);
    profile.hasWhatsApp = true;
  } else {
    profile.hasWhatsApp = false;
  }

  // 2. Echte live website / SSL verificatie
  const probe = await probeWebsite(profile.website);
  profile.websiteProbe = probe;

  // 3. Kwalificatiescore & Potentie-analyse
  const potentialAnalysis = analyzeBusinessPotential(profile, probe);
  profile.score = potentialAnalysis.score;
  profile.archetype = potentialAnalysis.archetype;
  profile.archetypeLabel = potentialAnalysis.archetypeLabel;
  profile.pitchHook = potentialAnalysis.pitchHook;
  profile.strengths = potentialAnalysis.strengths;
  profile.recommendedDomain = `${profile.slug}.nl`;

  // 4. Fallback e-mail mining
  // Indien het bedrijf nog geen direct e-mailadres heeft, genereren we geschikte contact-opties
  if (!profile.email) {
    if (profile.website && probe.type !== 'SITE_OFFLINE') {
      profile.email = await mineEmailFromWebsite(probe.finalUrl || profile.website).catch(() => null);
    }
  }

  // 5. Default services afleiden uit categorie
  profile.suggestedServices = deriveServicesFromCategory(profile.category, profile.name);

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
      // Filter veelvoorkomende dummy/asset emails en valideer lengte & RFC formaat
      const filtered = matches.filter(e => {
        const clean = e.toLowerCase().trim();
        return clean.length <= 100 && 
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
 * Biedt branche-specifieke diensten als de crawler er geen heeft kunnen uitlezen
 */
function deriveServicesFromCategory(category = '', name = '') {
  const cat = (category + ' ' + name).toLowerCase();

  if (cat.includes('schilder')) {
    return [
      { title: "Binnenschilderwerk", desc: "Strakke afwerking van muren, plafonds, deuren en kozijnen met hoogwaardige verf." },
      { title: "Buitenschilderwerk", desc: "Duurzame bescherming tegen weer en wind voor een representatieve uitstraling." },
      { title: "Houtrot herstel", desc: "Vakkundige inspectie en renovatie van aangetast houtwerk rondom jouw woning." },
      { title: "Kleur- & Materiaaladvies", desc: "Persoonlijk advies over passende tinten en slijtvaste verfsystemen." }
    ];
  }

  if (cat.includes('hovenier') || cat.includes('tuin')) {
    return [
      { title: "Tuinaanleg & Ontwerp", desc: "Complete metamorfose van jouw tuin van schets tot oplevering." },
      { title: "Sierbestrating & Terrassen", desc: "Strak gelegde klinkers, keramische tegels en stabiele opritten." },
      { title: "Periodiek Tuinonderhoud", desc: "Vakkundig snoeiwerk, bemesting en onkruidbeheer in elk seizoen." },
      { title: "Schuttingen & Houtbouw", desc: "Duurzame erfafscheidingen, overkappingen en pergola's op maat." }
    ];
  }

  if (cat.includes('timmerman') || cat.includes('klus')) {
    return [
      { title: "Renovatie & Verbouw", desc: "Vakkundige aanpak voor grote en kleine klussen in en rond het huis." },
      { title: "Maatwerk Houtbewerking", desc: "Op maat gemaakte inbouwkasten, trappen, deuren en meubels." },
      { title: "Onderhoud & Reparatie", desc: "Snelle en degelijke oplossing voor knellende deuren, lekkages en herstel." },
      { title: "Dak & Gevelafwerking", desc: "Degelijke afdichting en vernieuwing van boeidelen en gevelbekleding." }
    ];
  }

  if (cat.includes('kapper') || cat.includes('salon')) {
    return [
      { title: "Knippen & Stylen", desc: "Trendy en tijdloze kapsels perfect afgestemd op jouw gezichtsvorm." },
      { title: "Kleuren & Highlights", desc: "Professionele balayage, folietechnieken en dekkende kleuringen." },
      { title: "Bruidskapsels & Feeststyling", desc: "Stralend voor de dag op jouw speciale gelegenheid met langdurige hold." },
      { title: "Verzorgende Haarmaskers", desc: "Diepgaande hydratatie en herstel voor beschadigd of droog haar." }
    ];
  }

  // Algemene default diensten voor ZZP'er
  return [
    { title: "Vakmanschap op Maat", desc: "Persoonlijke aandacht en professionele uitvoering volgens afspraak." },
    { title: "Snelle & Duidelijke Communicatie", desc: "Binnen 24 uur reactie en transparante prijsopgaven zonder verrassingen." },
    { title: "Regionale Service in Groningen", desc: "Lokale betrokkenheid en flexibele service in en rondom Hoogezand." },
    { title: "Garantie op Kwaliteit", desc: "Wij gaan pas naar huis wanneer jij 100% tevreden bent met het resultaat." }
  ];
}

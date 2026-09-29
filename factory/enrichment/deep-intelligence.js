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

  // 2. Kwalificatiescore & Potentie-analyse
  const potentialAnalysis = analyzeBusinessPotential(profile);
  profile.score = potentialAnalysis.score;
  profile.pitchHook = potentialAnalysis.pitchHook;
  profile.strengths = potentialAnalysis.strengths;
  profile.recommendedDomain = `${profile.slug}.nl`;

  // 3. Fallback e-mail mining
  // Indien het bedrijf nog geen direct e-mailadres heeft, genereren we geschikte contact-opties
  if (!profile.email) {
    if (profile.website) {
      profile.email = await mineEmailFromWebsite(profile.website).catch(() => null);
    }
  }

  // 4. Default services afleiden uit categorie
  profile.suggestedServices = deriveServicesFromCategory(profile.category, profile.name);

  return profile;
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
 * Berekent de lead-potentie score en de haak voor de acquisitie e-mail
 */
function analyzeBusinessPotential(b) {
  let score = 50; // Basis
  const strengths = [];
  let pitchHook = '';

  if (!b.website) {
    score += 40;
    strengths.push("Heeft nog géén actieve website op Google Maps");
    pitchHook = `We zagen dat je als ${b.category || 'vakman'} in ${b.address ? 'regio Hoogezand' : 'de regio'} uitstekend werk levert, maar dat je op Google Maps nog geen directe website hebt gekoppeld. Hierdoor lopen potentiële klanten nu sneller door naar concurrenten.`;
  } else {
    strengths.push("Heeft een bestaande webvermelding die gemoderniseerd kan worden");
    pitchHook = `We zagen jouw vermelding voor ${b.name} op Google Maps. Veel ZZP'ers in jouw branche verliezen mobiele bezoekers door een trage of verouderde site.`;
  }

  if (b.rating && b.rating >= 4.5) {
    score += 10;
    strengths.push(`Uitstekende Google reputatie (${b.rating} sterren over ${b.reviewsCount || 0} reviews)`);
  }

  if (b.phone) {
    strengths.push(`Direct telefonisch bereikbaar (${b.phone})`);
  }

  return { score, strengths, pitchHook };
}

/**
 * Scant openbare website / homepage op e-mail regex indien aanwezig
 */
async function mineEmailFromWebsite(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const text = await resp.text();

    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const matches = text.match(emailRegex);
    if (matches && matches.length > 0) {
      // Filter veelvoorkomende dummy/asset emails
      const filtered = matches.filter(e => !e.includes('example') && !e.includes('.png') && !e.includes('.jpg') && !e.includes('sentry'));
      if (filtered.length > 0) return filtered[0].toLowerCase();
    }
  } catch {
    // Timeout of netwerkfout
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

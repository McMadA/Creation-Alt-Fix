import { execFile } from 'child_process';
import util from 'util';
import { FACTORY_CONFIG } from '../config/factory-config.js';
import { applyCodeProtection } from '../security/code-drm.js';

const execFileAsync = util.promisify(execFile);

/**
 * Creation+Alt+Fix - AGY Generator Service
 * Roept de lokale Antigravity CLI ('agy --print') aan om complete websites en acquisitie-pitches
 * te programmeren met jouw actieve AI-abonnement (0 extra API-kosten!).
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
        '--print',
        prompt,
        '--effort', FACTORY_CONFIG.agy.effort || 'low'
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
      console.warn(`⚠️ [AGY Engine] Lege of korte output ontvangen van 'agy', schakel over naar high-grade template.`);
      generatedHtml = buildFallbackTemplate(business);
    }
  } catch (error) {
    console.warn(`⚠️ [AGY Engine] Waarschuwing bij aanroepen van 'agy' (${error.message}). Genereren met interne high-converting template...`);
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
 * Construeert de prompt voor 'agy --print'
 */
function buildAgyPrompt(b) {
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

Belangrijke Ontwerpeisen:
1. Volledig zelfstandig HTML5 bestand inclusief ingebedde moderne CSS (<style>) en lichte Vanilla JS (<script>).
2. Kleurenpalet: Professioneel, modern, betrouwbaar (Donkere/donkerblauwe achtergrond #0B0F19 of #0F172A met elegante cyaan/indigo accenten #06B6D4 / #6366F1, scherpe witte typografie).
3. Responsive voor mobiel, tablet en desktop (mobile-first!).
4. Secties:
   - Sticky Header met logo/naam en direct bellen/WhatsApp knop.
   - Hero sectie met wervende titel, ondertitel, USP badges ("Lokaal in Hoogezand", "Eerlijke tarieven", "Vrijblijvend contact").
   - Diensten Grid met mooie kaarten en iconen.
   - Waarom Kiezen Voor Ons (Vakmanschap, Garantie, Snelheid).
   - Echte Klantbeoordelingen (toon de Google reviews!).
   - Contact sectie met direct telefoonnummer, e-mail link en een strak offerte/aanvraag formulier.
   - Footer met copyright en LocalBusiness Schema (JSON-LD).
5. Plaats helemaal bovenaan een subtiele, professionele concept-banner:
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

  // 3. HTML E-mail Body
  const bodyHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; color: #1e293b; line-height: 1.6; font-size: 15px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px;">
  <p style="font-size: 16px; margin-top: 0;">Beste ${b.name},</p>
  
  <p>${b.pitchHook}</p>
  
  <p>Omdat wij als <strong>Creation+Alt+Fix</strong> gespecialiseerd zijn in het razendsnel online zetten van lokale ZZP'ers in Groningen en Drenthe, heb ik alvast een vrijblijvend, werkend concept voor je gebouwd:</p>
  
  <div style="margin: 28px 0; text-align: center;">
    <a href="${conceptUrl}" style="background: linear-gradient(135deg, #2563EB, #1D4ED8); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">
      👉 Bekijk hier jouw Concept Website
    </a>
  </div>
  
  <p><strong>Wat zit hier al in voor ${b.name}:</strong></p>
  <ul style="padding-left: 20px; line-height: 1.8;">
    ${bulletsHtml}
  </ul>
  
  <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; margin: 24px 0;">
    <strong style="color: #0f172a;">Transparant over de kosten (geen verrassingen achteraf):</strong><br>
    • <strong>Website realisatie:</strong> Vanaf <strong>€ 199,-</strong> (eenmalig excl. BTW)<br>
    • <strong>Managed Cloud Hosting All-in:</strong> Slechts <strong>€ 150,- / jaar</strong> (~€ 12,50/mnd) inclusief jouw <em>.${domain.split('.').pop() || 'nl'}</em> domein, SSL-slotje, 5 zakelijke mailboxen, dagelijkse back-ups en 30 minuten gratis service per jaar.<br>
    • <strong>Persoonlijk Klantenportaal:</strong> Toegang tot <em>portal.creationaltfix.nl</em> om live feedback pins te plaatsen en voortgang te volgen.
  </div>
  
  <p>Vind je dit wat en wil je de website live hebben onder je eigen domeinnaam (bijv. <em>${domain}</em>)? We kunnen deze binnen 24 uur personaliseren met jouw foto's en teksten.</p>
  
  <p>Kijk er vanavond gerust even naar op je telefoon. Stuur gerust een mailtje terug of bel/app me even op <a href="tel:+31619135453" style="color: #2563EB; font-weight: 600;">06 - 19 13 54 53</a> voor een vrijblijvend praatje!</p>
  
  <p style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
    Met vriendelijke groet,<br><br>
    <strong>Allard Veldman</strong><br>
    Creation+Alt+Fix<br>
    <span style="font-size: 13px; color: #64748b;">
      Hoogezand (Groningen) • KVK: 99986191 • Tel: +31 6 19135453<br>
      <a href="https://creationaltfix.nl" style="color: #2563EB; text-decoration: none;">creationaltfix.nl</a> • <a href="mailto:info@creationaltfix.nl" style="color: #2563EB; text-decoration: none;">info@creationaltfix.nl</a>
    </span>
  </p>
  
  <p style="margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 12px; line-height: 1.4;">
    <em>Geen interesse in dit concept of liever geen berichten meer ontvangen? Reageer even met 'geen interesse', dan verwijderen wij jouw gegevens direct en definitief conform art. 21 AVG (Recht van bezwaar).</em>
  </p>
</div>
`.trim();

  // 4. Plain Text E-mail Body (Maximale Inbox Score / Geen Spamfilter Risico)
  const bodyPlain = `
Beste ${b.name},

${b.pitchHook}

Omdat wij als Creation+Alt+Fix gespecialiseerd zijn in het razendsnel online zetten van lokale ZZP'ers in Groningen en Drenthe, heb ik alvast een vrijblijvend, werkend concept voor je klaargezet:

👉 Bekijk jouw concept website hier: ${conceptUrl}

Wat zit hier al in voor ${b.name}:
${bulletsPlain}

Transparant over de tarieven:
- Website realisatie: Vanaf € 199,- (eenmalig excl. BTW)
- Managed Cloud Hosting All-in: € 150,- per jaar (~€ 12,50/mnd) inclusief jouw ${domain} domeinnaam, SSL-slotje, 5 zakelijke mailboxen, back-ups en 30 min. service per jaar.
- Inclusief toegang tot jouw persoonlijke Klantenportaal (portal.creationaltfix.nl) voor live feedback en revisies.

Vind je dit wat? We kunnen deze binnen 24 uur live zetten onder jouw eigen domeinnaam (${domain}).

Kijk er gerust vanavond even naar op je telefoon. Reageer gewoon op deze mail of bel/app me even op 06 - 19 13 54 53!

Met vriendelijke groet,

Allard Veldman
Creation+Alt+Fix (Hoogezand, Groningen)
KVK: 99986191 | Tel: +31 6 19135453
info@creationaltfix.nl | https://creationaltfix.nl

---
Geen interesse in dit concept of liever geen berichten meer ontvangen? Reageer even met 'geen interesse' en wij verwijderen je direct conform art. 21 AVG (Recht van bezwaar).
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
 * Schone, high-performance HTML5 template voor het geval 'agy' offline is
 */
function buildFallbackTemplate(b) {
  const reviewsHtml = (b.reviews && b.reviews.length > 0)
    ? b.reviews.map(r => `
        <div class="review-card">
          <div class="stars">★★★★★</div>
          <p class="review-text">"${r.text}"</p>
          <div class="review-author">— ${r.author} (Google Review)</div>
        </div>
      `).join('')
    : `
        <div class="review-card">
          <div class="stars">★★★★★</div>
          <p class="review-text">"Klantvriendelijk, betrouwbaar en levert altijd vakwerk af. Zeker een aanrader in de regio!"</p>
          <div class="review-author">— Tevreden Klant</div>
        </div>
      `;

  const servicesHtml = (b.suggestedServices || [])
    .map(s => `
        <div class="service-card">
          <div class="service-icon">✦</div>
          <h3>${s.title}</h3>
          <p>${s.desc}</p>
        </div>
      `).join('');

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${b.name} | Vakmanschap in Hoogezand & Regio Groningen</title>
  <meta name="description" content="Professionele ${b.category || 'diensten'} door ${b.name}. Neem direct contact op voor een snelle afspraak of offerte in regio Hoogezand.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0B0F19;
      --bg-card: rgba(17, 24, 39, 0.8);
      --accent: #06B6D4;
      --accent-hover: #0891B2;
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --border: rgba(255, 255, 255, 0.1);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      line-height: 1.6;
    }
    .concept-bar {
      background: linear-gradient(90deg, #1e1b4b, #0f172a);
      border-bottom: 1px solid rgba(99, 102, 241, 0.3);
      padding: 10px 16px;
      text-align: center;
      font-size: 0.85rem;
      color: #cbd5e1;
    }
    .concept-bar a { color: #38bdf8; font-weight: 600; text-decoration: underline; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 8%;
      border-bottom: 1px solid var(--border);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      background: rgba(11, 15, 25, 0.9);
      z-index: 100;
    }
    .logo { font-size: 1.35rem; font-weight: 700; color: var(--text-main); }
    .logo span { color: var(--accent); }
    .hero {
      padding: 70px 8% 50px;
      text-align: center;
      max-width: 900px;
      margin: 0 auto;
    }
    .badge {
      display: inline-block;
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 20px;
      border: 1px solid rgba(6, 182, 212, 0.3);
    }
    .hero h1 { font-size: 2.5rem; font-weight: 700; line-height: 1.25; margin-bottom: 20px; }
    .hero p { font-size: 1.15rem; color: var(--text-muted); margin-bottom: 30px; }
    .cta-group { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
    .btn {
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.98rem;
    }
    .btn-primary { background: var(--accent); color: #000000; }
    .btn-primary:hover { background: var(--accent-hover); transform: translateY(-2px); }
    .btn-secondary { background: rgba(255,255,255,0.08); color: #ffffff; border: 1px solid var(--border); }
    .btn-secondary:hover { background: rgba(255,255,255,0.15); }
    .section { padding: 60px 8%; max-width: 1200px; margin: 0 auto; }
    .section-title { text-align: center; margin-bottom: 45px; }
    .section-title h2 { font-size: 2rem; margin-bottom: 10px; }
    .section-title p { color: var(--text-muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
    .service-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 30px;
      border-radius: 12px;
      transition: transform 0.2s;
    }
    .service-card:hover { transform: translateY(-4px); border-color: rgba(6,182,212,0.4); }
    .service-icon { color: var(--accent); font-size: 1.8rem; margin-bottom: 14px; }
    .service-card h3 { font-size: 1.25rem; margin-bottom: 10px; }
    .service-card p { color: var(--text-muted); font-size: 0.95rem; }
    .review-card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid var(--border);
      padding: 24px;
      border-radius: 12px;
    }
    .stars { color: #F59E0B; margin-bottom: 12px; font-size: 1.1rem; }
    .review-text { font-style: italic; color: #E2E8F0; margin-bottom: 12px; font-size: 0.95rem; }
    .review-author { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
    .contact-card {
      background: linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9));
      border: 1px solid rgba(6, 182, 212, 0.3);
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      max-width: 700px;
      margin: 0 auto;
    }
    .contact-card h3 { font-size: 1.7rem; margin-bottom: 15px; }
    footer {
      border-top: 1px solid var(--border);
      padding: 30px 8%;
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="concept-bar">
    ✨ Demonstratieconcept voor <strong>${b.name}</strong> • Gemaakt door <a href="https://creationaltfix.nl" target="_blank">Creation+Alt+Fix</a>
  </div>
  <header>
    <div class="logo">${b.name}<span>.</span></div>
    ${b.phone ? `<a href="tel:${b.phone}" class="btn btn-secondary">📞 ${b.phone}</a>` : ''}
  </header>
  <main>
    <section class="hero">
      <span class="badge">📍 Actief in ${b.address ? 'regio Hoogezand' : 'regio Groningen'}</span>
      <h1>Vakmanschap & Betrouwbaarheid bij ${b.name}</h1>
      <p>Voor particulieren en bedrijven die gaan voor topkwaliteit, heldere communicatie en duurzaam resultaat.</p>
      <div class="cta-group">
        ${b.phone ? `<a href="tel:${b.phone}" class="btn btn-primary">📞 Direct Bellen</a>` : ''}
        ${b.hasWhatsApp ? `<a href="https://wa.me/${b.whatsAppNumber}?text=Hallo%20${encodeURIComponent(b.name)},%20ik%20heb%20een%20vraag" class="btn btn-secondary" target="_blank">💬 Stuur WhatsApp</a>` : ''}
      </div>
    </section>
    <section class="section">
      <div class="section-title">
        <h2>Onze Diensten</h2>
        <p>Professionele oplossingen op maat voor al jouw projecten</p>
      </div>
      <div class="grid">
        ${servicesHtml}
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
    <section class="section">
      <div class="contact-card">
        <h3>Vrijblijvend Contact Opnemen?</h3>
        <p style="color: var(--text-muted); margin-bottom: 25px;">Neem direct contact op voor een kennismaking, advies of een vrijblijvende prijsopgave.</p>
        <div class="cta-group">
          ${b.phone ? `<a href="tel:${b.phone}" class="btn btn-primary">📞 ${b.phone}</a>` : ''}
          ${b.hasWhatsApp ? `<a href="https://wa.me/${b.whatsAppNumber}" class="btn btn-secondary" target="_blank">💬 WhatsApp Chatten</a>` : ''}
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

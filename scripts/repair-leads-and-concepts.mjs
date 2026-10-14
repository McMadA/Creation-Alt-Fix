import fs from 'fs';
import path from 'path';

console.log('🚀 Start Lead Factory & Concepts Reparatie...\n');

// 1. REPAREER DATA IN leads.json (factory én crm/admin)
const paths = [
  'factory/data/leads.json',
  'crm/admin/data/leads.json'
];

paths.forEach(p => {
  if (!fs.existsSync(p)) return;
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  let list = Array.isArray(raw) ? raw : raw.leads;

  // A. Verwijder duplicaat 'dakdekker' (behoud 'heinkens-daktechniek')
  list = list.filter(l => l.slug !== 'dakdekker');

  // B. Herstel 'n-ten-seldam'
  const seldam = list.find(l => l.slug === 'n-ten-seldam');
  if (seldam) {
    seldam.website = null;
    seldam.hasWebsite = false;
    seldam.email = null;
    seldam.archetype = 'A_TRADE_DIRECT';
    seldam.archetypeLabel = 'Geen Website op Google Maps (Direct Bellen)';
    seldam.pitchHook = 'We zagen jouw vakwerk op Google Maps, maar zagen dat er nog geen mobiele website aan gekoppeld was. Omdat particulieren snel willen bellen, heb ik alvast een vrijblijvend concept voor je klaargezet.';
    if (seldam.pitch) {
      seldam.pitch.archetype = 'A_TRADE_DIRECT';
      seldam.pitch.archetypeLabel = 'Geen Website op Google Maps (Direct Bellen)';
      seldam.pitch.whatsAppText = 'Hoi N ten seldam! Allard hier van Creation+Alt+Fix uit Hoogezand. Ik zag jullie mooie vakwerk op Google Maps, maar zag dat er nog geen mobiele website aan gekoppeld was. Omdat particulieren snel willen bellen, heb ik alvast een vrijblijvend concept voor je klaargezet: https://creationaltfix.nl/concept/n-ten-seldam/ - Kijk er gerust naar als je tijd hebt!';
      seldam.pitch.bodyPlain = seldam.pitch.bodyPlain.replace('Jullie hebben al een website, maar meer dan 75% van de particulieren zoekt tegenwoordig via hun mobiele telefoon naar een specialist. Veel traditionele websites zijn op mobiel traag en missen directe 1-klik contactknoppen zoals WhatsApp of Direct Bellen, waardoor mobiele bezoekers afhaken.', 'Omdat er nog geen eigen website aan gekoppeld is op Google Maps, lopen particulieren die mobiel een betrouwbare specialist zoeken nu sneller door naar concurrenten. Ik heb alvast een compleet, vrijblijvend concept klaargezet met directe bel- en WhatsApp-knoppen.');
      seldam.pitch.bodyHtml = seldam.pitch.bodyHtml.replace(/Jullie hebben al een website[^<]*/g, 'Omdat er nog geen eigen website aan gekoppeld is op Google Maps, lopen particulieren die mobiel een betrouwbare specialist zoeken nu sneller door naar concurrenten. Ik heb alvast een compleet, vrijblijvend concept klaargezet met directe bel- en WhatsApp-knoppen.');
    }
  }

  // C. Zorg dat heinkens-daktechniek accuraat en compleet is
  const heinkens = list.find(l => l.slug === 'heinkens-daktechniek');
  if (heinkens) {
    heinkens.name = 'Heinkens Daktechniek';
    heinkens.address = 'Burgemeester van Roijenstraat Oost 242, 9602 CP Hoogezand';
    heinkens.category = 'Dakdekker & Dakrenovatie';
  }

  const output = Array.isArray(raw) ? list : { ...raw, leads: list };
  fs.writeFileSync(p, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ ${p} opgeschoond (${list.length} unieke leads over).`);
});

// 2. REPAREER CONCEPT WEBPAGES (verwijder gelekte DRM en herstel zuivere HTML)
const conceptDir = 'website/concept';
const folders = fs.readdirSync(conceptDir).filter(f => fs.statSync(path.join(conceptDir, f)).isDirectory());

const cleanDrmScript = `<script id="caf-security-guard">
/*
 * INTELLECTUEEL EIGENDOM VAN CREATION+ALT+FIX (KvK 99986191).
 * DIT WERK IS AUTEURSRECHTELIJK BESCHERMD CONFORM DE NEDERLANDSE AUTEURSWET 1912 EN HET BENELUX VERDRAG VOOR INTELLECTUELE EIGENDOM (BVIE).
 * DIT DOCUMENT IS BEVEILIGD MET EEN TECHNOLOGISCHE VOORZIENING IN DE ZIN VAN ARTIKEL 29A AUTEURSWET 1912.
 * ELKE ONGEOORLOOFDE VERMENIGVULDIGING, OMZEILING, EXTERNE HOSTING OF COMMERCIEEL GEBRUIK ZONDER SCHRIFTELIJKE LICENTIE IS BIJ WET VERBODEN EN RECHTSVERVOLGBAAR.
 */
(function() {
  'use strict';
  
  // 1. DOMAIN-LOCKING KILLSWITCH
  const allowed = ["creationaltfix.nl","www.creationaltfix.nl","localhost","127.0.0.1"];
  const currentHost = window.location.hostname;
  const isAuthorized = allowed.some(function(d) {
    return currentHost === d || currentHost.endsWith('.' + d);
  });

  if (!isAuthorized && currentHost !== '') {
    window.stop && window.stop();
    document.documentElement.innerHTML = '<div style="background:#0B0F19;color:#F8FAFC;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center;"><div style="max-width:580px;background:rgba(17,24,39,0.95);border:1px solid rgba(239,68,68,0.4);border-radius:16px;padding:40px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);"><div style="font-size:3rem;margin-bottom:16px;color:#EF4444;">&#9888;</div><h1 style="font-size:1.6rem;margin-bottom:12px;color:#FCA5A5;">Onbevoegde Kopie Gedetecteerd</h1><p style="color:#94A3B8;line-height:1.6;font-size:0.95rem;margin-bottom:28px;">Deze website is het exclusieve intellectuele eigendom van <strong>Creation+Alt+Fix</strong> (Auteurswet 1912). Het kopi&euml;ren of extern hosten van dit concept zonder actieve licentieovereenkomst is niet toegestaan en kan leiden tot juridische stappen.</p><a href="https://creationaltfix.nl" style="background:#06B6D4;color:#000;padding:14px 28px;border-radius:8px;font-weight:700;text-decoration:none;display:inline-block;">Website Officieel Overnemen via Creation+Alt+Fix &rarr;</a></div></div>';
    throw new Error("CAF_SECURITY_UNAUTHORIZED_HOST");
  }

  // 2. ANTI-INSPECT DEFENSE: Blokkeer Rechtermuisklik
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    showSecurityToast("Rechtermuisklik en broncode-inspectie zijn uitgeschakeld ter bescherming van intellectueel eigendom.");
    return false;
  }, { capture: true });

  // 3. BLOKKEER INSPECTIE SNELTOETSEN (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
  document.addEventListener('keydown', function(e) {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
      (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S'))
    ) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityToast("Inspectie en broncode-export zijn beveiligd door Creation+Alt+Fix.");
      return false;
    }
  }, { capture: true });

  function showSecurityToast(msg) {
    let t = document.getElementById('caf-sec-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'caf-sec-toast';
      t.style.position = 'fixed';
      t.style.bottom = '24px';
      t.style.left = '50%';
      t.style.transform = 'translateX(-50%)';
      t.style.background = 'rgba(15, 23, 42, 0.96)';
      t.style.color = '#F8FAFC';
      t.style.padding = '12px 24px';
      t.style.borderRadius = '8px';
      t.style.border = '1px solid #EF4444';
      t.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
      t.style.fontSize = '0.85rem';
      t.style.zIndex = '9999999';
      t.style.fontFamily = 'sans-serif';
      t.style.textAlign = 'center';
      t.style.transition = 'opacity 0.3s ease';
      document.body.appendChild(t);
    }
    t.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = '🔒 Creation+Alt+Fix Beveiliging: ';
    t.appendChild(strong);
    t.appendChild(document.createTextNode(String(msg || '')));
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(function() { t.style.opacity = '0'; }, 3500);
  }
})();
</script>`;

folders.forEach(dir => {
  const file = path.join(conceptDir, dir, 'index.html');
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');

  // A. Verwijder alle oude/beschadigde DRM scripts
  html = html.replace(/<script id="caf-security-guard">[\s\S]*?<\/script>\s*/gi, '');

  // B. Verwijder gelekte statische DRM HTML brokken
  html = html.replace(/<\/head><body><div class="box">[\s\S]*?Website Officieel Overnemen via Creation\+Alt\+Fix &rarr;<\/a><\/div>/gi, '');
  html = html.replace(/<div class="box"><div class="icon">&#9888;<\/div><h1>Onbevoegde Kopie Gedetecteerd<\/h1>[\s\S]*?Website Officieel Overnemen via Creation\+Alt\+Fix &rarr;<\/a><\/div>/gi, '');
  html = html.replace(/'; throw new Error\("CAF_SECURITY_UNAUTHORIZED_HOST"\);[\s\S]*?setTimeout\(function\(\) \{ t\.style\.opacity = '0'; \}, 3500\); \}\)\(\);/gi, '');

  // C. Zorg voor exact 1 schone </head> en <body>
  // Verwijder eventuele dubbele closing heads of open bodies vóór de echte body
  html = html.replace(/(<\/head>\s*)+/gi, '</head>\n');
  
  // Injecteer schone guard voor </head>
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${cleanDrmScript}\n</head>`);
  } else {
    html = cleanDrmScript + '\n' + html;
  }

  fs.writeFileSync(file, html, 'utf8');
});

console.log('✅ Alle concept HTML bestanden opgeschoond en gerepareerd.');

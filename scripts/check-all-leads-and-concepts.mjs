import fs from 'fs';
import path from 'path';

const leadsFile = 'factory/data/leads.json';
const raw = JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
const leads = Array.isArray(raw) ? raw : (raw.leads || []);

console.log('================================================================');
console.log(`🔍 AUDIT RAPPORT: ${leads.length} LEADS & CONCEPTEN GECONTROLEERD`);
console.log('================================================================\n');

// 1. DUPLICATEN CHECK
console.log('📌 1. DUPLICATEN CHECK (Websites, Telefoons, Domeinen):');
const websites = {};
const phones = {};
const names = {};

leads.forEach(l => {
  if (l.website) {
    const w = l.website.toLowerCase().replace(/\/+$/, '');
    if (!websites[w]) websites[w] = [];
    websites[w].push(l.slug);
  }
  if (l.phone) {
    const p = l.phone.replace(/[^0-9]/g, '');
    if (!phones[p]) phones[p] = [];
    phones[p].push(l.slug);
  }
});

let foundDuplicates = false;
for (const [w, slugs] of Object.entries(websites)) {
  if (slugs.length > 1) {
    console.warn(`  ⚠️ Website "${w}" staat in MEERDERE leads: [${slugs.join(', ')}]`);
    foundDuplicates = true;
  }
}
for (const [p, slugs] of Object.entries(phones)) {
  if (slugs.length > 1) {
    console.warn(`  ⚠️ Telefoonnummer "${p}" staat in MEERDERE leads: [${slugs.join(', ')}]`);
    foundDuplicates = true;
  }
}
if (!foundDuplicates) {
  console.log('  ✅ Geen duplicaten gevonden in websites of telefoonnummers.');
}

// 2. DATA CROSS-CONTAMINATION (Mismatch tussen bedrijfsnaam en website/email)
console.log('\n📌 2. DATA CONSISTENTIE & MISMATCH CHECK:');
leads.forEach(l => {
  const issues = [];
  if (l.website && l.slug) {
    const w = l.website.toLowerCase();
    // Als de website een heel andere naam bevat dan de slug of bedrijfsnaam
    if (l.slug === 'n-ten-seldam' && w.includes('berends')) {
      issues.push(`Website mismatch: "${l.website}" hoort bij Berends, niet bij "${l.name}"`);
    }
    if (l.email && l.slug === 'n-ten-seldam' && l.email.includes('berends')) {
      issues.push(`E-mail mismatch: "${l.email}" hoort bij Berends, niet bij "${l.name}"`);
    }
  }
  if (issues.length > 0) {
    console.warn(`  ❌ Lead [${l.slug}] ${l.name}:`);
    issues.forEach(i => console.warn(`     - ${i}`));
  }
});

// 3. CONCEPT HTML WEERGAVE & BROKEN DRM INJECTION CHECK
console.log('\n📌 3. CONCEPT HTML DISPLAY & BROKEN DRM CHECK:');
const conceptDir = 'website/concept';
leads.forEach(l => {
  const file = path.join(conceptDir, l.slug, 'index.html');
  if (!fs.existsSync(file)) {
    console.warn(`  ❌ [${l.slug}]: index.html ONTBREEKT!`);
    return;
  }
  const html = fs.readFileSync(file, 'utf8');
  const issues = [];

  // Check if DRM code leaked into visible body text
  if (html.includes('</head><body><div class="box">') || html.includes('throw new Error("CAF_SECURITY_UNAUTHORIZED_HOST")</') || html.includes('throw new Error("CAF_SECURITY_UNAUTHORIZED_HOST"); } // 2. ANTI-INSPECT')) {
    issues.push('LEAKED_RAW_DRM: DRM code lekt als zichtbare tekst in body!');
  }

  // Check if DRM script is inside <script>
  const scriptIdx = html.indexOf('CAF_SECURITY_UNAUTHORIZED_HOST');
  if (scriptIdx !== -1) {
    const prevScript = html.lastIndexOf('<script', scriptIdx);
    const nextScript = html.indexOf('</script>', scriptIdx);
    if (prevScript === -1 || nextScript === -1 || nextScript < scriptIdx) {
      issues.push('MALFORMED_SCRIPT: DRM code staat buiten geldige <script> tag!');
    }
  }

  // Check if double body or double head
  const bodyMatches = (html.match(/<body/gi) || []).length;
  if (bodyMatches > 1) {
    issues.push(`DOUBLE_BODY: Bestand bevat ${bodyMatches} <body> tags!`);
  }

  if (issues.length > 0) {
    console.warn(`  ❌ [${l.slug}] ${l.name}:`);
    issues.forEach(i => console.warn(`     - ${i}`));
  } else {
    console.log(`  ✅ [${l.slug}] HTML display & DRM integer.`);
  }
});

console.log('\n================================================================');

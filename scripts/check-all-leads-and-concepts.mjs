import fs from 'fs';
import path from 'path';

const factoryLeadsFile = 'factory/data/leads.json';
const crmLeadsFile = 'crm/admin/data/leads.json';

const rawFactory = JSON.parse(fs.readFileSync(factoryLeadsFile, 'utf8'));
const leads = Array.isArray(rawFactory) ? rawFactory : (rawFactory.leads || []);

let totalErrors = 0;

console.log('================================================================');
console.log(`🔍 AUDIT RAPPORT: ${leads.length} LEADS & CONCEPTEN GECONTROLEERD`);
console.log('================================================================\n');

// 0. SYNCHRONISATIE CHECK (factory vs crm/admin)
console.log('📌 0. DATABASE SYNCHRONISATIE CHECK:');
if (fs.existsSync(crmLeadsFile)) {
  const factoryContent = fs.readFileSync(factoryLeadsFile, 'utf8');
  const crmContent = fs.readFileSync(crmLeadsFile, 'utf8');
  if (factoryContent === crmContent) {
    console.log('  ✅ factory/data/leads.json en crm/admin/data/leads.json zijn 100% synchroon en identiek.');
  } else {
    console.error('  ❌ factory/data/leads.json en crm/admin/data/leads.json zijn NIET identiek!');
    totalErrors++;
  }
} else {
  console.error(`  ❌ ${crmLeadsFile} bestaat niet!`);
  totalErrors++;
}

// 1. DUPLICATEN CHECK
console.log('\n📌 1. DUPLICATEN CHECK (Websites, Telefoons, Slugs):');
const websites = {};
const phones = {};
const slugs = {};

leads.forEach(l => {
  if (l.website) {
    const w = l.website.toLowerCase().replace(/\/+$/, '');
    if (!websites[w]) websites[w] = [];
    websites[w].push(l.slug);
  }
  if (l.phone) {
    const p = l.phone.replace(/[^0-9]/g, '');
    const suffix = p.length >= 8 ? p.slice(-8) : p;
    if (!phones[suffix]) phones[suffix] = [];
    phones[suffix].push(l.slug);
  }
  if (l.slug) {
    if (!slugs[l.slug]) slugs[l.slug] = [];
    slugs[l.slug].push(l.name);
  }
});

let foundDuplicates = false;
for (const [w, sls] of Object.entries(websites)) {
  if (sls.length > 1) {
    console.error(`  ❌ Website "${w}" staat in MEERDERE leads: [${sls.join(', ')}]`);
    foundDuplicates = true;
    totalErrors++;
  }
}
for (const [p, sls] of Object.entries(phones)) {
  if (sls.length > 1) {
    console.error(`  ❌ Telefoonnummer (suffix ${p}) staat in MEERDERE leads: [${sls.join(', ')}]`);
    foundDuplicates = true;
    totalErrors++;
  }
}
for (const [slug, names] of Object.entries(slugs)) {
  if (names.length > 1) {
    console.error(`  ❌ Slug "${slug}" komt MEERDERE keren voor: [${names.join(', ')}]`);
    foundDuplicates = true;
    totalErrors++;
  }
}
if (!foundDuplicates) {
  console.log('  ✅ 0 duplicaten gevonden in websites, telefoonnummers of slugs.');
}

// 2. DATA CROSS-CONTAMINATION & RECORD ACCURACY
console.log('\n📌 2. DATA CONSISTENTIE & RECORD INTEGRITEIT:');
const seldam = leads.find(l => l.slug === 'n-ten-seldam');
if (!seldam) {
  console.error('  ❌ Lead "n-ten-seldam" ontbreekt in database!');
  totalErrors++;
} else {
  if (seldam.website !== null || seldam.hasWebsite !== false || seldam.email !== null) {
    console.error(`  ❌ N ten seldam heeft nog steeds een website of email: website=${seldam.website}, email=${seldam.email}`);
    totalErrors++;
  } else if (seldam.archetype !== 'A_TRADE_DIRECT') {
    console.error(`  ❌ N ten seldam archetype is niet A_TRADE_DIRECT (is: ${seldam.archetype})`);
    totalErrors++;
  } else {
    console.log('  ✅ N ten seldam: website=null, email=null, hasWebsite=false, archetype=A_TRADE_DIRECT (Geen cross-contamination).');
  }
}

const heinkens = leads.find(l => l.slug === 'heinkens-daktechniek');
const dakdekker = leads.find(l => l.slug === 'dakdekker');
if (dakdekker) {
  console.error('  ❌ Oude duplicaat "dakdekker" staat nog in de database!');
  totalErrors++;
} else if (!heinkens) {
  console.error('  ❌ Canonieke lead "heinkens-daktechniek" ontbreekt!');
  totalErrors++;
} else {
  console.log('  ✅ Heinkens Daktechniek: enkele canonieke entry actief, duplicaat "dakdekker" verwijderd.');
}

// 3. CONCEPT HTML WEERGAVE & BROKEN DRM INJECTION CHECK
console.log('\n📌 3. CONCEPT HTML DISPLAY & BROKEN DRM CHECK:');
const conceptDir = 'website/concept';
leads.forEach(l => {
  const file = path.join(conceptDir, l.slug, 'index.html');
  if (!fs.existsSync(file)) {
    console.error(`  ❌ [${l.slug}]: index.html ONTBREEKT!`);
    totalErrors++;
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

  // Check outside script guard
  const htmlWithoutGuard = html.replace(/<script id="caf-security-guard">[\s\S]*?<\/script>/, '');
  if (htmlWithoutGuard.includes('Onbevoegde Kopie Gedetecteerd')) {
    issues.push('LEAKED_TEXT: Onbevoegde Kopie Gedetecteerd staat buiten script guard!');
  }
  if (htmlWithoutGuard.includes('CAF_SECURITY_UNAUTHORIZED_HOST')) {
    issues.push('LEAKED_EXCEPTION: CAF_SECURITY_UNAUTHORIZED_HOST staat buiten script guard!');
  }

  // Check if double body or double head
  const bodyOpens = (html.match(/<body/gi) || []).length;
  const bodyCloses = (html.match(/<\/body>/gi) || []).length;
  if (bodyOpens !== 1 || bodyCloses !== 1) {
    issues.push(`BODY_TAG_MISMATCH: opens=${bodyOpens}, closes=${bodyCloses}`);
  }

  const headOpens = (html.match(/<head[\s>]/gi) || []).length;
  const headCloses = (html.match(/<\/head>/gi) || []).length;
  if (headOpens !== 1 || headCloses !== 1) {
    issues.push(`HEAD_TAG_MISMATCH: opens=${headOpens}, closes=${headCloses}`);
  }

  if (issues.length > 0) {
    console.error(`  ❌ [${l.slug}] ${l.name}:`);
    issues.forEach(i => console.error(`     - ${i}`));
    totalErrors += issues.length;
  } else {
    console.log(`  ✅ [${l.slug}] HTML display & DRM integer.`);
  }
});

console.log('\n================================================================');
console.log(`🏁 AUDIT EINDSTATUS: ${totalErrors === 0 ? 'ALLES GESLAAGD (0 FOUTEN)' : `${totalErrors} FOUTEN GEVONDEN`}`);
console.log('================================================================\n');

if (totalErrors > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

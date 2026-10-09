import fs from 'fs';
import path from 'path';
import assert from 'assert';

const filesToValidate = [
  './factory/data/leads.json',
  './crm/admin/data/leads.json'
];

const conceptBaseDir = './website/concept';
const conceptFolders = fs.readdirSync(conceptBaseDir).filter(f => fs.statSync(path.join(conceptBaseDir, f)).isDirectory());

console.log(`🔍 [Validator] Gevonden fysieke concept mappen in ${conceptBaseDir}: ${conceptFolders.length}`);
assert.strictEqual(conceptFolders.length, 20, "Er moeten exact 20 concept mappen zijn in website/concept/");

for (const filePath of filesToValidate) {
  console.log(`\n📋 [Validator] Valideren van ${filePath}...`);
  assert.ok(fs.existsSync(filePath), `Bestand ${filePath} moet bestaan`);
  
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  assert.ok(Array.isArray(data.leads), "Data moet leads array bevatten");
  assert.strictEqual(data.leads.length, 20, `Er moeten exact 20 records in ${filePath} staan`);
  assert.strictEqual(data.totalScanned, 20, "totalScanned moet 20 zijn");
  assert.strictEqual(data.totalQualified, 20, "totalQualified moet 20 zijn");
  assert.strictEqual(data.totalGenerated, 20, "totalGenerated moet 20 zijn");
  assert.strictEqual(data.totalSent, 0, "totalSent moet 0 zijn");

  data.leads.forEach((lead, idx) => {
    assert.ok(lead.name && lead.name.trim().length > 0, `Lead [${idx}] (${lead.slug}) mag geen lege naam hebben`);
    assert.ok(lead.slug && lead.slug.trim().length > 0, `Lead [${idx}] moet een slug hebben`);
    assert.ok(conceptFolders.includes(lead.slug), `Lead [${idx}] slug '${lead.slug}' moet overeenkomen met een fysieke map in website/concept/`);
    assert.ok(fs.existsSync(path.join(conceptBaseDir, lead.slug, 'index.html')), `Map website/concept/${lead.slug}/index.html moet bestaan`);
    
    assert.ok(lead.contactPerson && lead.contactPerson.trim().length > 0, `Lead [${lead.slug}] moet contactPerson hebben`);
    assert.ok(lead.address && lead.address.trim().length > 0, `Lead [${lead.slug}] moet address hebben`);
    assert.ok(lead.phone && lead.phone.trim().length > 0, `Lead [${lead.slug}] moet phone hebben`);
    assert.ok(lead.normalizedPhone && /^[0-9]+$/.test(lead.normalizedPhone), `Lead [${lead.slug}] moet normalizedPhone hebben (alleen cijfers)`);
    assert.ok(lead.whatsAppNumber && /^[0-9]+$/.test(lead.whatsAppNumber), `Lead [${lead.slug}] moet whatsAppNumber hebben (alleen cijfers)`);
    assert.ok(lead.email && lead.email !== "null" && lead.email.includes('@'), `Lead [${lead.slug}] moet een geldig emailadres hebben`);
    assert.ok(lead.category && lead.category.trim().length > 0, `Lead [${lead.slug}] moet category hebben`);
    assert.ok(lead.liveUrl && lead.liveUrl.startsWith('https://creationaltfix.nl/concept/'), `Lead [${lead.slug}] moet valide liveUrl hebben`);
    assert.strictEqual(lead.status, 'concept_ready', `Lead [${lead.slug}] status moet 'concept_ready' zijn`);
    
    assert.ok(lead.pitch, `Lead [${lead.slug}] moet pitch object hebben`);
    assert.ok(lead.pitch.subject && lead.pitch.subject.length > 0, `Lead [${lead.slug}] pitch moet subject hebben`);
    assert.ok(lead.pitch.bodyPlain && lead.pitch.bodyPlain.length > 0, `Lead [${lead.slug}] pitch moet bodyPlain hebben`);
    assert.ok(lead.pitch.whatsAppText && lead.pitch.whatsAppText.length > 0, `Lead [${lead.slug}] pitch moet whatsAppText hebben`);
  });

  console.log(`✅ [Validator] ${filePath}: Alle 20 records zijn 100% valide, compleet en fysiek gekoppeld!`);
}

console.log('\n🎉 VALIDATIE VOLLEDIG GESLAAGD!');

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const filesToValidate = [
  './factory/data/leads.json',
  './crm/admin/data/leads.json'
];

const CUSTOM_CONCEPT_SLUGS = new Set(['deholterij', 'lutjestee', 'remtheerd']);
const conceptBaseDir = './website/concept';
const allConceptFolders = fs.readdirSync(conceptBaseDir).filter(f => fs.statSync(path.join(conceptBaseDir, f)).isDirectory());
const factoryConceptFolders = allConceptFolders.filter(f => !CUSTOM_CONCEPT_SLUGS.has(f));

console.log(`🔍 [Validator] Gevonden fysieke concept mappen in ${conceptBaseDir}: ${allConceptFolders.length} totaal (${factoryConceptFolders.length} Lead Factory + ${allConceptFolders.length - factoryConceptFolders.length} Flagship maatwerk)`);
assert.ok(factoryConceptFolders.length >= 20, "Er moeten minimaal 20 Lead Factory concept mappen zijn in website/concept/");

for (const filePath of filesToValidate) {
  console.log(`\n📋 [Validator] Valideren van ${filePath}...`);
  assert.ok(fs.existsSync(filePath), `Bestand ${filePath} moet bestaan`);
  
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  assert.ok(Array.isArray(data.leads), "Data moet leads array bevatten");
  assert.strictEqual(data.leads.length, factoryConceptFolders.length, `Aantal records (${data.leads.length}) in ${filePath} moet exact gelijk zijn aan aantal Lead Factory concept mappen (${factoryConceptFolders.length})`);
  assert.ok(data.totalScanned >= 20, "totalScanned moet >= 20 zijn");
  assert.ok(data.totalQualified >= 20, "totalQualified moet >= 20 zijn");
  assert.ok(data.totalGenerated >= 20, "totalGenerated moet >= 20 zijn");

  data.leads.forEach((lead, idx) => {
    assert.ok(lead.name && lead.name.trim().length > 0, `Lead [${idx}] (${lead.slug}) mag geen lege naam hebben`);
    assert.ok(lead.slug && lead.slug.trim().length > 0, `Lead [${idx}] moet een slug hebben`);
    assert.ok(factoryConceptFolders.includes(lead.slug), `Lead [${idx}] slug '${lead.slug}' moet overeenkomen met een fysieke map in website/concept/`);
    const htmlPath = path.join(conceptBaseDir, lead.slug, 'index.html');
    assert.ok(fs.existsSync(htmlPath), `Map website/concept/${lead.slug}/index.html moet bestaan`);
    
    assert.ok(lead.contactPerson && lead.contactPerson.trim().length > 0, `Lead [${lead.slug}] moet contactPerson hebben`);
    assert.ok(lead.address && lead.address.trim().length > 0, `Lead [${lead.slug}] moet address hebben`);
    assert.ok(lead.city && lead.city.trim().length > 0, `Lead [${lead.slug}] moet city hebben`);
    assert.ok(lead.phone && lead.phone.trim().length > 0, `Lead [${lead.slug}] moet phone hebben`);
    assert.ok(lead.normalizedPhone && /^[0-9]+$/.test(lead.normalizedPhone), `Lead [${lead.slug}] moet normalizedPhone hebben (alleen cijfers)`);

    // Strikt onderscheid mobiel (06) vs vast nummer voor WhatsApp
    const isMobile = lead.normalizedPhone.startsWith('06');
    if (isMobile) {
      assert.strictEqual(lead.hasWhatsApp, true, `Mobiele lead [${lead.slug}] moet hasWhatsApp: true hebben`);
      assert.ok(lead.whatsAppNumber && /^316[0-9]{8}$/.test(lead.whatsAppNumber), `Mobiele lead [${lead.slug}] moet geldig 316 whatsAppNumber hebben`);
    } else {
      assert.strictEqual(lead.hasWhatsApp, false, `Vast nummer lead [${lead.slug}] (${lead.phone}) mag GEEN hasWhatsApp: true hebben`);
      assert.strictEqual(lead.whatsAppNumber, null, `Vast nummer lead [${lead.slug}] (${lead.phone}) moet whatsAppNumber: null hebben`);
    }

    if (lead.email !== null) {
      assert.ok(typeof lead.email === 'string' && lead.email.includes('@'), `Lead [${lead.slug}] email moet geldig zijn of null`);
      assert.ok(!lead.email.toLowerCase().includes('creationaltfix'), `Lead [${lead.slug}] mag nooit het eigen agency e-mailadres bevatten`);
    }

    assert.ok(Array.isArray(lead.suggestedServices) && lead.suggestedServices.length >= 4, `Lead [${lead.slug}] moet minimaal 4 suggestedServices hebben`);
    assert.ok(Array.isArray(lead.reviews) && lead.reviews.length >= 2, `Lead [${lead.slug}] moet minimaal 2 reviews hebben`);

    assert.ok(lead.category && lead.category.trim().length > 0, `Lead [${lead.slug}] moet category hebben`);
    assert.ok(lead.liveUrl && lead.liveUrl.startsWith('https://creationaltfix.nl/concept/'), `Lead [${lead.slug}] moet valide liveUrl hebben`);
    
    assert.ok(lead.pitch, `Lead [${lead.slug}] moet pitch object hebben`);
    assert.ok(lead.pitch.subject && lead.pitch.subject.length > 0, `Lead [${lead.slug}] pitch moet subject hebben`);
    assert.ok(lead.pitch.bodyPlain && lead.pitch.bodyPlain.includes('20-Punten Kwaliteitskeurmerk'), `Lead [${lead.slug}] pitch moet 20-Punten Kwaliteitskeurmerk bevatten`);
    assert.ok(lead.pitch.whatsAppText && lead.pitch.whatsAppText.length > 0, `Lead [${lead.slug}] pitch moet whatsAppText hebben`);

    // Valideer het fysieke concept HTML bestand
    const html = fs.readFileSync(htmlPath, 'utf-8');
    assert.ok(html.includes('service-card') || html.includes('Diensten'), `Concept HTML voor [${lead.slug}] moet gevulde diensten bevatten`);
    assert.ok(html.includes('FAQPage'), `Concept HTML voor [${lead.slug}] moet FAQPage Schema.org bevatten`);
    assert.ok(!html.includes('&display=swap&display=swap'), `Concept HTML voor [${lead.slug}] mag geen dubbele &display=swap hebben`);
    if (!isMobile) {
      assert.ok(!html.includes(`wa.me/315`), `Concept HTML voor vast nummer [${lead.slug}] mag geen wa.me/315... link bevatten`);
    }
  });

  console.log(`✅ [Validator] ${filePath}: Alle ${data.leads.length} records zijn 100% valide, compleet en fysiek gekoppeld!`);
}

console.log('\n🎉 VALIDATIE VOLLEDIG GESLAAGD!');

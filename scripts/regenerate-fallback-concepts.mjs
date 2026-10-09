import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildFallbackTemplate } from '../factory/generator/agy-generator.js';
import { applyCodeProtection } from '../factory/security/code-drm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const LEADS_FILE = path.join(ROOT_DIR, 'factory', 'data', 'leads.json');
const CONCEPT_DIR = path.join(ROOT_DIR, 'website', 'concept');

// De 3 handmatig gepolijste flagship concepten blijven onaangeroerd
const PRESERVE_SLUGS = new Set([
  'berends',
  'heinkens-daktechniek',
  'hovenier-groningen-oost'
]);

async function run() {
  console.log('🔄 [Regenerator] Start hergeneratie van gelijkenis-websites via verrijkte multi-archetype generator...');

  const data = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  const leads = data.leads || [];

  let regeneratedCount = 0;
  let skippedCount = 0;

  for (const lead of leads) {
    if (PRESERVE_SLUGS.has(lead.slug)) {
      console.log(`⏩ [Behoud Flagship] "${lead.name}" (${lead.slug}) behouden als handgemaakt vlaggenschip.`);
      skippedCount++;
      continue;
    }

    console.log(`✨ [Hergenereren] "${lead.name}" (${lead.slug})...`);

    // Genereer schone maatwerk HTML met dynamische sub-paletten en herstelde CSS syntax
    let html = buildFallbackTemplate(lead);

    // Pas Anti-Theft DRM & Domain-Locking Killswitch toe
    html = applyCodeProtection(html, lead);

    const targetFolder = path.join(CONCEPT_DIR, lead.slug);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const targetFile = path.join(targetFolder, 'index.html');
    fs.writeFileSync(targetFile, html, 'utf8');
    regeneratedCount++;
  }

  console.log(`\n✅ [Klaar] ${regeneratedCount} concept-websites succesvol hergegenereerd met unieke styling en banners.`);
  console.log(`🛡️ ${skippedCount} flagship concepten onaangeroerd behouden.`);
}

run().catch(err => {
  console.error('❌ Fout tijdens hergenereren:', err);
  process.exit(1);
});

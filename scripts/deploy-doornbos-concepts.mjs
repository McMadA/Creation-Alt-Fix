import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'basic-ftp';
import { FACTORY_CONFIG } from '../factory/config/factory-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootRepo = path.resolve(__dirname, '../../');
const doornbosDir = path.join(rootRepo, 'DoornbosWebsites');
const conceptsDir = path.join(rootRepo, 'Creation-Alt-Fix', 'website', 'concept');

const sitesToDeploy = [
  {
    slug: 'deholterij',
    name: 'De Holterij',
    sourceDir: path.join(doornbosDir, 'www.deholterij.nl'),
    primaryDomain: 'deholterij.nl',
    pages: ['index.html', 'caravanstalling.html', 'vakantiewoning-lutje-stee.html', 'contact.html']
  },
  {
    slug: 'remtheerd',
    name: 'Caravanstalling Remtheerd',
    sourceDir: path.join(doornbosDir, 'www.remtheerd.nl'),
    primaryDomain: 'remtheerd.nl',
    pages: ['index.html', 'contact.html']
  },
  {
    slug: 'lutjestee',
    name: 'Vakantiewoning Lutje Stee',
    sourceDir: path.join(doornbosDir, 'www.lutjestee.nl'),
    primaryDomain: 'lutjestee.nl',
    pages: ['index.html', 'historie.html', 'tarieven.html', 'bezienswaardigheden.html', 'links.html', 'english.html', 'contact.html']
  }
];

// Helper to find all referenced images in HTML and CSS
function getReferencedImages(sourceDir, pages) {
  const referenced = new Set();

  for (const page of pages) {
    const pagePath = path.join(sourceDir, page);
    if (!fs.existsSync(pagePath)) continue;
    const content = fs.readFileSync(pagePath, 'utf8');
    const matches = content.matchAll(/(?:src|data-full|href|content)=["']([^"']*\.(?:jpg|jpeg|png|webp|gif|svg))["']/gi);
    for (const m of matches) {
      if (m[1].includes('assets/images/')) {
        referenced.add(path.basename(m[1]));
      }
    }
  }

  const cssPath = path.join(sourceDir, 'assets', 'css', 'style.css');
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf8');
    const cssMatches = css.matchAll(/url\(["']?([^"')]*\.(?:jpg|jpeg|png|webp|gif|svg))["']?\)/gi);
    for (const m of cssMatches) {
      if (m[1].includes('images/')) {
        referenced.add(path.basename(m[1]));
      }
    }
  }

  return referenced;
}

// Stage clean concept directory with only referenced assets
function stageConcept(site) {
  const destDir = path.join(conceptsDir, site.slug);
  console.log(`\n📂 Staging [${site.slug}] van ${site.sourceDir} -> ${destDir}...`);

  // Ensure fresh destination
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  // 1. Copy & transform HTML pages
  for (const page of site.pages) {
    const srcPage = path.join(site.sourceDir, page);
    if (!fs.existsSync(srcPage)) continue;
    let html = fs.readFileSync(srcPage, 'utf8');

    const conceptBase = `https://creationaltfix.nl/concept/${site.slug}/`;
    const pageUrl = page === 'index.html' ? conceptBase : `${conceptBase}${page}`;

    // Transform canonical URL
    html = html.replace(
      new RegExp(`<link rel="canonical" href="https?:\/\/(?:www\\.)?${site.primaryDomain}[^"]*">`, 'g'),
      `<link rel="canonical" href="${pageUrl}">`
    );

    // Transform og:url
    html = html.replace(
      new RegExp(`<meta property="og:url" content="https?:\/\/(?:www\\.)?${site.primaryDomain}[^"]*">`, 'g'),
      `<meta property="og:url" content="${pageUrl}">`
    );

    // Transform schema.org url
    html = html.replace(
      new RegExp(`"url": "https?:\/\/(?:www\\.)?${site.primaryDomain}\/?"`, 'g'),
      `"url": "${conceptBase}"`
    );

    fs.writeFileSync(path.join(destDir, page), html, 'utf8');
    console.log(`   ✓ ${page} (met concept canonicals & OG tags)`);
  }

  // 2. Copy CSS & JS
  const cssDest = path.join(destDir, 'assets', 'css');
  fs.mkdirSync(cssDest, { recursive: true });
  fs.copyFileSync(path.join(site.sourceDir, 'assets', 'css', 'style.css'), path.join(cssDest, 'style.css'));

  const jsDest = path.join(destDir, 'assets', 'js');
  fs.mkdirSync(jsDest, { recursive: true });
  fs.copyFileSync(path.join(site.sourceDir, 'assets', 'js', 'main.js'), path.join(jsDest, 'main.js'));

  // 3. Copy API (contact.php)
  const apiSrc = path.join(site.sourceDir, 'api');
  if (fs.existsSync(apiSrc)) {
    const apiDest = path.join(destDir, 'api');
    fs.mkdirSync(apiDest, { recursive: true });
    fs.copyFileSync(path.join(apiSrc, 'contact.php'), path.join(apiDest, 'contact.php'));
  }

  // 4. Copy ONLY referenced images
  const imagesDest = path.join(destDir, 'assets', 'images');
  fs.mkdirSync(imagesDest, { recursive: true });
  const referencedImages = getReferencedImages(site.sourceDir, site.pages);
  const srcImagesDir = path.join(site.sourceDir, 'assets', 'images');

  let copiedCount = 0;
  for (const imgName of referencedImages) {
    const srcImg = path.join(srcImagesDir, imgName);
    if (fs.existsSync(srcImg)) {
      fs.copyFileSync(srcImg, path.join(imagesDest, imgName));
      copiedCount++;
    } else {
      console.warn(`   ⚠️ Waarschuwing: afbeelding niet gevonden: ${imgName}`);
    }
  }
  console.log(`   ✓ ${copiedCount} actieve afbeeldingen gekopieerd naar assets/images/`);
}

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 DEPLOYING DOORNBOS CONCEPT WEBSITES TO CREATIONALTFIX.NL/CONCEPT');
  console.log('='.repeat(70));

  // 1. Lokale Staging
  console.log('\n📦 STAP 1: Schone Staging in Creation-Alt-Fix/website/concept/...');
  for (const site of sitesToDeploy) {
    stageConcept(site);
  }

  // 2. FTPS Upload
  console.log('\n' + '='.repeat(70));
  console.log('🔌 STAP 2: FTPS Verbinding naar Vimexx DirectAdmin Server...');
  const { host, port, user, password, remoteRoot } = FACTORY_CONFIG.ftp;
  console.log(`   Host    : ${host}:${port}`);
  console.log(`   User    : ${user}`);
  console.log(`   Remote  : /${remoteRoot}`);

  if (!user || !password) {
    throw new Error('Geen FTP credentials gevonden in .env!');
  }

  const client = new Client();
  client.ftp.verbose = false;
  client.timeout = 60000;

  try {
    await client.access({
      host,
      port,
      user,
      password,
      secure: true,
      secureOptions: { rejectUnauthorized: false }
    });
    console.log('✅ FTPS TLS Verbinding succesvol tot stand gebracht!');

    console.log('\n' + '='.repeat(70));
    console.log('⬆️ STAP 3: Uploaden van concept bestanden naar Vimexx...');

    for (const site of sitesToDeploy) {
      const localSlugDir = path.join(conceptsDir, site.slug);
      const targetRemoteDir = `/${remoteRoot}/${site.slug}`;

      console.log(`\n📤 Uploaden [${site.name}] -> ${targetRemoteDir}...`);
      await client.ensureDir(targetRemoteDir);
      // Upload local directory contents directly into the current working directory!
      await client.uploadFromDir(localSlugDir);
      console.log(`✅ [${site.name}] upload 100% voltooid!`);
    }

    client.close();
    console.log('\n🎉 FTPS Synchronisatie succesvol afgerond!');
  } catch (err) {
    client.close();
    console.error('❌ Fout tijdens FTPS upload:', err);
    process.exit(1);
  }

  // 3. Live Healthcheck
  console.log('\n' + '='.repeat(70));
  console.log('🌐 STAP 4: Live HTTP Healthcheck op creationaltfix.nl/concept/...');

  let allHealthy = true;
  for (const site of sitesToDeploy) {
    const liveBase = `https://creationaltfix.nl/concept/${site.slug}/`;
    console.log(`\n🔍 Controleren [${site.name}]: ${liveBase}`);

    for (const page of site.pages) {
      const url = page === 'index.html' ? liveBase : `${liveBase}${page}`;
      try {
        const response = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'CAF-Healthcheck/1.0' } });
        if (response.ok) {
          console.log(`   [HTTP ${response.status}] OK: ${url}`);
        } else {
          console.error(`   [HTTP ${response.status}] FOUT: ${url}`);
          allHealthy = false;
        }
      } catch (e) {
        console.error(`   [NETWERKFOUT]: ${url} - ${e.message}`);
        allHealthy = false;
      }
    }

    // Check main stylesheet
    const cssUrl = `${liveBase}assets/css/style.css`;
    try {
      const cssRes = await fetch(cssUrl, { method: 'GET' });
      if (cssRes.ok) {
        console.log(`   [HTTP ${cssRes.status}] CSS OK: ${cssUrl}`);
      } else {
        console.error(`   [HTTP ${cssRes.status}] CSS FOUT: ${cssUrl}`);
      }
    } catch (e) {
      console.error(`   [NETWERKFOUT] CSS: ${cssUrl}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  if (allHealthy) {
    console.log('🌟 ALLE CONCEPT WEBSITES STAAN LIVE EN FUNCTIONEREN 100%!');
    console.log('='.repeat(70));
    console.log('\n🔗 LIVE CONCEPT URLS:');
    console.log('  1. De Holterij:                https://creationaltfix.nl/concept/deholterij/');
    console.log('  2. Caravanstalling Remtheerd:  https://creationaltfix.nl/concept/remtheerd/');
    console.log('  3. Vakantiewoning Lutje Stee:  https://creationaltfix.nl/concept/lutjestee/');
    console.log('\n💬 WhatsApp preview gereed voor Eppo Doornbos!');
  } else {
    console.warn('⚠️ Een of meer URL-checks hebben een fout geretourneerd.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatale fout in deploy script:', err);
  process.exit(1);
});

import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT = 'C:/Users/Admin/Documents/GitHub/Websites';

const SITES = [
  { name: 'stenekesrioolspecialist', dir: 'stenekesrioolspecialist', type: 'static' },
  { name: 'Vanderplaats', dir: 'Vanderplaats', type: 'vite_or_static' },
  { name: 'BakkertjeSieg', dir: 'BakkertjeSieg', type: 'react' },
  { name: 'Scholte-elektrotechniek', dir: 'Scholte-elektrotechniek', type: 'static' },
  { name: 'pomppop', dir: 'pomppop/public', type: 'static_in_public' },
  { name: 'willa-handmade-studio', dir: 'willa-handmade-studio', type: 'react' },
  { name: 'arnolddesign', dir: 'arnolddesign', type: 'react' },
  { name: 'Creation-Alt-Fix/website', dir: 'Creation-Alt-Fix/website', type: 'static_multi' }
];

function getHtmlFiles(dir, maxDepth = 4, currentDepth = 0) {
  let files = [];
  if (!fs.existsSync(dir) || currentDepth > maxDepth) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getHtmlFiles(fullPath, maxDepth, currentDepth + 1));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function getSrcFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getSrcFiles(fullPath));
    } else if (entry.isFile() && /\.(jsx?|tsx?)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

console.log('=== MULTI-SITE QUALITY & PERFORMANCE AUDITOR ===\n');

for (const site of SITES) {
  const siteDir = path.join(WORKSPACE_ROOT, site.dir);
  console.log(`\n----------------------------------------`);
  console.log(`Auditing Site: ${site.name} (${site.dir})`);
  console.log(`----------------------------------------`);

  const htmlFiles = getHtmlFiles(siteDir);
  console.log(`Found ${htmlFiles.length} HTML files`);

  // Check robots.txt and sitemap.xml
  const siteBase = site.type === 'static_in_public' ? path.join(WORKSPACE_ROOT, 'pomppop/public') : (site.name.includes('/') ? path.join(WORKSPACE_ROOT, site.dir) : path.join(WORKSPACE_ROOT, site.name));
  const hasRobots = fs.existsSync(path.join(siteBase, 'robots.txt')) || fs.existsSync(path.join(siteBase, 'public/robots.txt'));
  const hasSitemap = fs.existsSync(path.join(siteBase, 'sitemap.xml')) || fs.existsSync(path.join(siteBase, 'public/sitemap.xml'));
  console.log(`Robots.txt present: ${hasRobots}`);
  console.log(`Sitemap.xml present: ${hasSitemap}`);

  for (const htmlFile of htmlFiles) {
    const relHtml = path.relative(WORKSPACE_ROOT, htmlFile);
    const content = fs.readFileSync(htmlFile, 'utf8');

    console.log(`\n  File: ${relHtml}`);

    // 1. Title
    const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;
    if (!title) console.log(`    ❌ Missing <title>`);
    else console.log(`    ✓ Title: "${title}"`);

    // 2. Meta description
    const descMatch = content.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                      content.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    const desc = descMatch ? descMatch[1].trim() : null;
    if (!desc) console.log(`    ❌ Missing meta description`);
    else console.log(`    ✓ Meta description (${desc.length} chars)`);

    // 3. OpenGraph
    const ogTitle = content.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) ||
                    content.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
    const ogDesc = content.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) ||
                   content.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
    const ogImage = content.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i) ||
                    content.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i);
    const ogUrl = content.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']*)["']/i) ||
                  content.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:url["']/i);
    console.log(`    OpenGraph: title=${!!ogTitle}, desc=${!!ogDesc}, image=${!!ogImage}, url=${!!ogUrl}`);

    // 4. Twitter Card
    const twCard = content.match(/<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']*)["']/i) ||
                   content.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']twitter:card["']/i);
    const twTitle = content.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']*)["']/i) ||
                    content.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']twitter:title["']/i);
    console.log(`    Twitter: card=${!!twCard}, title=${!!twTitle}`);

    // 5. Canonical
    const canonical = content.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
    console.log(`    Canonical: ${canonical ? canonical[1] : 'NONE'}`);

    // 6. JSON-LD Schema.org
    const jsonLdMatches = [...content.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    console.log(`    JSON-LD blocks: ${jsonLdMatches.length}`);
    for (let i = 0; i < jsonLdMatches.length; i++) {
      try {
        const parsed = JSON.parse(jsonLdMatches[i][1]);
        const type = parsed['@type'] || (parsed['@graph'] ? 'Graph' : 'Unknown');
        console.log(`      Block ${i+1}: @type = ${type}, phone = ${parsed.telephone || 'N/A'}, address = ${parsed.address ? 'Yes' : 'N/A'}, hours = ${parsed.openingHours || parsed.openingHoursSpecification ? 'Yes' : 'N/A'}`);
      } catch (err) {
        console.log(`      ❌ Block ${i+1}: INVALID JSON: ${err.message}`);
      }
    }

    // 7. Images: alt, loading, decoding
    const imgMatches = [...content.matchAll(/<img\b([^>]*)>/gi)];
    let missingAlt = 0;
    let missingLoading = 0;
    let missingDecoding = 0;
    let brokenImages = 0;

    for (const match of imgMatches) {
      const attrs = match[1];
      const hasAlt = /alt=["'][^"']*["']/i.test(attrs);
      if (!hasAlt) missingAlt++;

      const isHero = /fetchpriority=["']high["']/i.test(attrs) || /class=["'][^"']*hero[^"']*["']/i.test(attrs) || /data-hero/i.test(attrs);
      const hasLoading = /loading=["'](lazy|eager)["']/i.test(attrs);
      const hasDecoding = /decoding=["'](async|sync|auto)["']/i.test(attrs);

      if (!isHero && !hasLoading) missingLoading++;
      if (!hasDecoding) missingDecoding++;

      const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        const src = srcMatch[1];
        if (!src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://')) {
          // Check local file existence
          const cleanSrc = src.split('?')[0].split('#')[0];
          let targetPath = path.resolve(path.dirname(htmlFile), cleanSrc);
          if (cleanSrc.startsWith('/')) {
            targetPath = path.resolve(siteDir, cleanSrc.slice(1));
          }
          if (!fs.existsSync(targetPath)) {
            // Also check public folder if site has one
            const publicPath = path.resolve(siteBase, 'public', cleanSrc.replace(/^\//, ''));
            if (!fs.existsSync(publicPath)) {
              console.log(`      ❌ Broken image: ${src} (checked ${targetPath} and ${publicPath})`);
              brokenImages++;
            }
          }
        }
      }
    }
    console.log(`    Images: total=${imgMatches.length}, missingAlt=${missingAlt}, missingLoading=${missingLoading}, missingDecoding=${missingDecoding}, broken=${brokenImages}`);

    // 8. Buttons & icon links: aria-label
    const btnMatches = [...content.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
    let btnMissingLabel = 0;
    for (const match of btnMatches) {
      const attrs = match[1];
      const inner = match[2].trim();
      const textOnly = inner.replace(/<[^>]+>/g, '').trim();
      if (!textOnly) {
        // Icon-only button
        if (!/aria-label=["'][^"']+["']/i.test(attrs) && !/title=["'][^"']+["']/i.test(attrs)) {
          btnMissingLabel++;
        }
      }
    }
    console.log(`    Buttons: total=${btnMatches.length}, iconOnlyMissingAriaLabel=${btnMissingLabel}`);

    // 9. Links: check <a> hrefs for 404
    const aMatches = [...content.matchAll(/<a\b([^>]*)href=["']([^"']+)["']/gi)];
    let brokenLinks = 0;
    for (const match of aMatches) {
      const href = match[2];
      if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
        continue;
      }
      if (href.startsWith('#')) {
        const id = href.slice(1);
        if (id && id !== 'top' && id !== '') {
          const hasId = new RegExp(`id=["']${id}["']`, 'i').test(content) || new RegExp(`name=["']${id}["']`, 'i').test(content);
          if (!hasId) {
            console.log(`      ⚠️ Anchor link target #${id} not found in same file`);
          }
        }
        continue;
      }
      const cleanHref = href.split('?')[0].split('#')[0];
      if (!cleanHref) continue;

      let targetPath = path.resolve(path.dirname(htmlFile), cleanHref);
      if (cleanHref.startsWith('/')) {
        targetPath = path.resolve(siteDir, cleanHref.slice(1));
      }
      if (!fs.existsSync(targetPath)) {
        // Check if adding .html or /index.html works
        if (!fs.existsSync(targetPath + '.html') && !fs.existsSync(path.join(targetPath, 'index.html'))) {
          // Check relative to siteBase
          const siteRel = path.resolve(siteBase, cleanHref.replace(/^\//, ''));
          if (!fs.existsSync(siteRel) && !fs.existsSync(siteRel + '.html') && !fs.existsSync(path.join(siteRel, 'index.html'))) {
            console.log(`      ❌ Broken link href="${href}"`);
            brokenLinks++;
          }
        }
      }
    }
    console.log(`    Links: total=${aMatches.length}, broken=${brokenLinks}`);
  }

  // If React/TypeScript site, also audit src/
  if (site.type === 'react') {
    const srcDir = path.join(siteBase, 'src');
    if (fs.existsSync(srcDir)) {
      const srcFiles = getSrcFiles(srcDir);
      console.log(`\n  Checking React source files in ${path.relative(WORKSPACE_ROOT, srcDir)} (${srcFiles.length} files)...`);
      let srcMissingAlt = 0;
      let srcIconBtnMissingLabel = 0;
      for (const file of srcFiles) {
        const srcContent = fs.readFileSync(file, 'utf8');
        // Check <img>
        const imgTags = [...srcContent.matchAll(/<img\b([^>]*)\/?>/gi)];
        for (const m of imgTags) {
          const attrs = m[1];
          if (!/alt=["'{]/i.test(attrs)) {
            console.log(`    ⚠️ React missing alt in ${path.relative(WORKSPACE_ROOT, file)}: ${m[0]}`);
            srcMissingAlt++;
          }
        }
        // Check icon-only buttons
        const buttonTags = [...srcContent.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
        for (const b of buttonTags) {
          const attrs = b[1];
          const inner = b[2].trim();
          // if button only has svg or icon or lucide-react icon
          if (/^<(svg|lucide|Icon|span\s+className=["'][^"']*icon|X|Plus|Trash|Edit|Menu|Chevron|Eye)/i.test(inner) && !/>\s*[\w\u00C0-\u017F]+\s*</.test(inner)) {
            if (!/aria-label=/i.test(attrs) && !/title=/i.test(attrs)) {
              console.log(`    ⚠️ React icon-only button missing aria-label in ${path.relative(WORKSPACE_ROOT, file)}: ${attrs}`);
              srcIconBtnMissingLabel++;
            }
          }
        }
      }
      console.log(`  React audit: missingAlt=${srcMissingAlt}, iconBtnMissingLabel=${srcIconBtnMissingLabel}`);
    }
  }
}

console.log('\n=== AUDIT COMPLETE ===');

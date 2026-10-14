import { FACTORY_CONFIG } from '../config/factory-config.js';

/**
 * Creation+Alt+Fix - Google Maps Crawler Engine
 * Scant Google Maps lokaal op ZZP bedrijven in Hoogezand & omstreken
 */
export async function searchGoogleMaps(query, options = {}) {
  const limit = options.limit || FACTORY_CONFIG.scraper.maxResultsPerQuery || 10;
  const headless = options.headless !== undefined ? options.headless : true;
  const existingLeads = Array.isArray(options.existingLeads) ? options.existingLeads : [];

  console.log(`🔍 [Crawler] Start zoekopdracht op Google Maps: "${query}" (Doellimiet: ${limit})...`);

  const results = [];
  let browser = null;

  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--lang=nl-NL,nl'
      ]
    });

    const context = await browser.newContext({
      userAgent: FACTORY_CONFIG.scraper.userAgents[0],
      viewport: { width: 1366, height: 768 },
      locale: 'nl-NL',
      geolocation: { latitude: 53.1616, longitude: 6.7583 }, // Hoogezand coördinaten
      permissions: ['geolocation']
    });

    const page = await context.newPage();
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@53.1616,6.7583,13z`;
    await page.goto(mapsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Handle Google Consent Dialog indien getoond
    try {
      const consentBtn = page.locator('button:has-text("Alles accepteren"), button:has-text("Ik ga akkoord"), button:has-text("Accept all"), form:has(button) button').first();
      if (await consentBtn.isVisible({ timeout: 4000 })) {
        await consentBtn.click();
        await page.waitForTimeout(1500);
      }
    } catch {
      // Geen consent dialoog of al geaccepteerd
    }

    // Wacht op zoekresultaten feed of individuele resultaatkaart
    await page.waitForTimeout(3000);

    const feedLocator = page.locator('div[role="feed"]');
    const hasFeed = await feedLocator.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasFeed) {
      // Scroll de feed omlaag om meer resultaten in te laden
      for (let i = 0; i < 3; i++) {
        await feedLocator.evaluate((el) => {
          el.scrollBy(0, 1000);
        });
        await page.waitForTimeout(1500);
      }

      // Verzamel alle listing links
      const listings = await page.$$('div[role="feed"] > div > div > a[href*="/maps/place/"]');
      console.log(`📍 [Crawler] ${listings.length} potentiële vermeldingen gevonden in resultatenfeed.`);

      for (let i = 0; i < Math.min(listings.length, limit); i++) {
        try {
          const listing = listings[i];
          const rawAria = await listing.getAttribute('aria-label');
          const href = await listing.getAttribute('href');

          if (!rawAria) continue;

          // Klik op de vermelding voor details paneel
          await listing.click();
          await page.waitForTimeout(1800);

          // Extraheer bedrijfsdetails uit het rechter/zijpaneel
          const details = await extractPlaceDetails(page, rawAria, href);
          if (details && details.name) {
            const sanitized = sanitizeLeadData(details);
            if (sanitized) {
              if (isDuplicateLead(sanitized, results) || isDuplicateLead(sanitized, existingLeads)) {
                console.log(`   ⏭️ [Crawler] Duplicaat overgeslagen tijdens crawl: ${sanitized.name} (match op website/telefoon)`);
                continue;
              }
              results.push(sanitized);
              console.log(`   ✔️ Gevonden: ${sanitized.name} | Tel: ${sanitized.phone || 'Geen'} | Website: ${sanitized.website || '❌ GEEN (Hoge potentie!)'}`);
            }
          }
        } catch (err) {
          console.warn(`⚠️ [Crawler] Fout bij verwerken van listing ${i}: ${err.message}`);
        }
      }
    } else {
      // Mogelijk is Google Maps direct doorgeschakeld naar 1 unieke locatie
      const titleEl = await page.locator('h1').first();
      if (await titleEl.isVisible({ timeout: 3000 })) {
        const name = await titleEl.innerText();
        const singleDetails = await extractPlaceDetails(page, name, page.url());
        if (singleDetails) {
          const sanitized = sanitizeLeadData(singleDetails);
          if (sanitized && !isDuplicateLead(sanitized, results) && !isDuplicateLead(sanitized, existingLeads)) {
            results.push(sanitized);
          }
        }
      }
    }

  } catch (error) {
    console.error(`❌ [Crawler] Fout tijdens Google Maps scan: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  console.log(`✨ [Crawler] Scan voltooid. ${results.length} bedrijven geëxtraheerd voor query: "${query}".`);
  return results;
}

/**
 * Extraheert adres, telefoon, website, reviews en openingstijden uit het detailvenster
 */
async function extractPlaceDetails(page, fallbackName, mapsUrl) {
  return await page.evaluate(({ fallbackName, mapsUrl }) => {
    // 1. Bedrijfsnaam (voorkom de algemene 'Resultaten' kop van Google Maps)
    let name = fallbackName || '';
    const placeH1 = document.querySelector('h1.DUwDvf, div[role="main"] h1');
    if (placeH1 && placeH1.innerText.trim() && !placeH1.innerText.includes('Resultaten')) {
      name = placeH1.innerText.trim();
    }
    if (!name || name === 'Resultaten' || name.startsWith('Resultaten voor')) {
      name = (fallbackName && !fallbackName.includes('Resultaten')) ? fallbackName : 'Lokale Ondernemer';
    }

    // 2. Rating en aantal reviews
    let rating = null;
    let reviewsCount = 0;
    const ratingEl = document.querySelector('span[aria-hidden="true"][class*="ceNzKf"], span[class*="MW4etd"]');
    if (ratingEl) {
      const parsedRating = parseFloat(ratingEl.innerText.replace(',', '.'));
      if (!isNaN(parsedRating)) rating = parsedRating;
    }
    const reviewCountEl = document.querySelector('span[aria-label*="reviews"], span[aria-label*="beoordeling"], button[aria-label*="reviews"]');
    if (reviewCountEl) {
      const match = reviewCountEl.innerText.match(/\d+/);
      if (match) reviewsCount = parseInt(match[0], 10);
    }

    // 3. Categorie / Branche
    let category = '';
    const catBtn = document.querySelector('button[jsaction*="category"], button[class*="DkEaL"]');
    if (catBtn) category = catBtn.innerText.trim();

    // Scope alle selectors strikt tot het actieve detailpaneel van Google Maps
    const container = document.querySelector('div[role="main"]') || document.body;

    // 4. Adres, Telefoon en Website uit specifieke Google Maps elementen
    let address = '';
    let phone = '';
    let website = '';

    // Website via data-item-id of authority link binnen de detailcontainer
    const webEl = container.querySelector('a[data-item-id="authority"], a[data-item-id*="website"], a[aria-label*="Website:" i], a[data-tooltip*="website" i]');
    if (webEl) {
      website = webEl.getAttribute('href') || '';
    }

    // Telefoon via data-item-id of phone button binnen de detailcontainer
    const phoneEl = container.querySelector('button[data-item-id*="phone:"], button[data-tooltip*="telefoonnummer" i], button[aria-label*="Telefoon:" i]');
    if (phoneEl) {
      const label = phoneEl.getAttribute('aria-label') || phoneEl.innerText || '';
      const match = label.match(/(\+?31|0)[0-9\s-]{8,14}/);
      if (match) phone = match[0].trim();
      else phone = label.replace(/Telefoon:|Phone:/i, '').trim();
    }

    // Adres via data-item-id of address button binnen de detailcontainer
    const addrEl = container.querySelector('button[data-item-id*="address"], button[data-tooltip*="adres" i], button[aria-label*="Adres:" i]');
    if (addrEl) {
      address = (addrEl.getAttribute('aria-label') || addrEl.innerText || '').replace(/Adres:|Address:/i, '').trim();
    }

    // Fallback uitsluitend binnen container en met strikte labelvalidatie (voorkomt willekeurige links van andere bedrijven)
    if (!address || !phone || !website) {
      const detailButtons = container.querySelectorAll('button[data-item-id], a[data-item-id], button[aria-label], a[aria-label]');
      for (const btn of detailButtons) {
        // Sluit gerelateerde bedrijven en advertenties uit om cross-contamination te voorkomen
        if (btn.closest('div[aria-label*="Vergelijkbaar" i], div[aria-label*="Mensen zochten ook" i], div[aria-label*="In de buurt" i], div[data-attrid*="kc:"]')) {
          continue;
        }
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = (btn.innerText || '').toLowerCase();
        const href = btn.getAttribute('href') || '';

        if (!address && (label.includes('adres:') || label.includes('address:'))) {
          address = (btn.getAttribute('aria-label') || '').replace(/Adres:|Address:/i, '').trim();
        } else if (!phone && (label.includes('telefoon:') || label.includes('phone:') || href.startsWith('tel:'))) {
          phone = ((btn.getAttribute('aria-label') || '').replace(/Telefoon:|Phone:/i, '').trim() || text.trim() || href.replace('tel:', '')).trim();
        } else if (!website && (label.includes('website:') || label.includes('site:')) && href.startsWith('http') && !href.includes('google.')) {
          website = href;
        }
      }
    }


    // 5. Haal top reviews op (indien zichtbaar)
    const reviews = [];
    const reviewCards = document.querySelectorAll('div[class*="jftiEf"], div[data-review-id]');
    for (let r = 0; r < Math.min(reviewCards.length, 3); r++) {
      const card = reviewCards[r];
      const author = card.querySelector('div[class*="d4r55"]')?.innerText?.trim() || 'Klant';
      const text = card.querySelector('span[class*="wiI7fc"]')?.innerText?.trim() || '';
      if (text) {
        reviews.push({ author, text });
      }
    }

    // Bepaal veilige slug en valideer website protocol
    let cleanWeb = (website || '').trim();
    if (!/^https?:\/\//i.test(cleanWeb)) {
      cleanWeb = null;
    }

    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'zzp-concept';
    if (slug.length > 64) {
      slug = slug.slice(0, 64).replace(/-+$/, '');
    }

    return {
      name,
      slug,
      category,
      rating,
      reviewsCount,
      address,
      phone,
      website: cleanWeb,
      reviews,
      googleMapsUrl: mapsUrl,
      hasWebsite: Boolean(cleanWeb),
      scannedAt: new Date().toISOString()
    };
  }, { fallbackName, mapsUrl });
}

/**
 * Normaliseert een website domein (zonder protocol, www en trailing slashes) voor deduplicatie
 * @param {string} url 
 * @returns {string|null}
 */
export function normalizeDomain(url) {
  if (!url || typeof url !== 'string') return null;
  return url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim() || null;
}

/**
 * Normaliseert telefoonnummer naar laatste 8 cijfers ter herkenning van overlappende notaties
 * @param {string} phone 
 * @returns {string|null}
 */
export function normalizePhoneDigits(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(-8) : (digits.length >= 6 ? digits : null);
}

/**
 * Controleert of een kandidaat-lead al in de resultatenlijst of bestaande database voorkomt
 * Vergelijkt op slug, genormaliseerd domein en telefoonnummer
 * @param {Object} candidate 
 * @param {Array} existingList 
 * @returns {boolean}
 */
export function isDuplicateLead(candidate, existingList = []) {
  if (!candidate || !Array.isArray(existingList)) return false;
  const candSlug = candidate.slug;
  const candDomain = normalizeDomain(candidate.website);
  const candPhone = normalizePhoneDigits(candidate.phone);

  return existingList.some(existing => {
    if (!existing) return false;
    if (candSlug && existing.slug && candSlug === existing.slug) return true;
    if (candPhone && existing.phone) {
      const exPhone = normalizePhoneDigits(existing.phone);
      if (exPhone && candPhone === exPhone) return true;
    }
    if (candDomain && existing.website) {
      const exDomain = normalizeDomain(existing.website);
      if (exDomain && candDomain === exDomain) return true;
    }
    return false;
  });
}

/**
 * Saniteert en normaliseert gescrapete lead gegevens (CWE-79 URI injectie & Windows Path Bounds)
 * @param {Object} data 
 * @returns {Object|null}
 */
export function sanitizeLeadData(data) {
  if (!data || typeof data !== 'object') return null;
  const name = typeof data.name === 'string' ? data.name.trim().slice(0, 150) : 'Lokale Ondernemer';
  let slug = (typeof data.slug === 'string' ? data.slug : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'zzp-concept';
  if (slug.length > 64) {
    slug = slug.slice(0, 64).replace(/-+$/, '');
  }
  let website = typeof data.website === 'string' ? data.website.trim() : '';
  if (!/^https?:\/\//i.test(website)) {
    website = null;
  }
  return {
    ...data,
    name,
    slug,
    website,
    hasWebsite: Boolean(website)
  };
}

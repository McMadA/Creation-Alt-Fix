import { FACTORY_CONFIG } from '../config/factory-config.js';

/**
 * Creation+Alt+Fix - Google Maps Crawler Engine
 * Scant Google Maps lokaal op ZZP bedrijven in Hoogezand & omstreken
 */
export async function searchGoogleMaps(query, options = {}) {
  const limit = options.limit || FACTORY_CONFIG.scraper.maxResultsPerQuery || 10;
  const headless = options.headless !== undefined ? options.headless : true;

  console.log(`🔍 [Crawler] Start zoekopdracht op Google Maps: "${query}" (Doellimiet: ${limit})...`);

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
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
  const results = [];

  try {
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
            results.push(details);
            console.log(`   ✔️ Gevonden: ${details.name} | Tel: ${details.phone || 'Geen'} | Website: ${details.website || '❌ GEEN (Hoge potentie!)'}`);
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
        if (singleDetails) results.push(singleDetails);
      }
    }

  } catch (error) {
    console.error(`❌ [Crawler] Fout tijdens Google Maps scan: ${error.message}`);
  } finally {
    await browser.close();
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

    // 4. Adres, Telefoon en Website uit specifieke Google Maps elementen
    let address = '';
    let phone = '';
    let website = '';

    // Website via data-item-id of authority link
    const webEl = document.querySelector('a[data-item-id="authority"], a[data-item-id*="website"], a[aria-label*="Website:"]');
    if (webEl) {
      website = webEl.getAttribute('href') || '';
    }

    // Telefoon via data-item-id of phone button
    const phoneEl = document.querySelector('button[data-item-id*="phone:"], button[data-tooltip*="telefoonnummer"], button[aria-label*="Telefoon:"]');
    if (phoneEl) {
      const label = phoneEl.getAttribute('aria-label') || phoneEl.innerText || '';
      const match = label.match(/(\+?31|0)[0-9\s-]{8,14}/);
      if (match) phone = match[0].trim();
      else phone = label.replace(/Telefoon:|Phone:/i, '').trim();
    }

    // Adres via data-item-id of address button
    const addrEl = document.querySelector('button[data-item-id*="address"], button[data-tooltip*="adres"], button[aria-label*="Adres:"]');
    if (addrEl) {
      address = (addrEl.getAttribute('aria-label') || addrEl.innerText || '').replace(/Adres:|Address:/i, '').trim();
    }

    // Fallback door alle knoppen/links te scannen als specifieke selectors ontbraken
    if (!address || !phone || !website) {
      const detailButtons = document.querySelectorAll('button[data-item-id], a[data-item-id], button[aria-label], a[aria-label]');
      for (const btn of detailButtons) {
        const label = btn.getAttribute('aria-label') || '';
        const text = btn.innerText || '';
        const href = btn.getAttribute('href') || '';

        if (!address && (label.includes('Adres:') || label.includes('Address:'))) {
          address = label.replace(/Adres:|Address:/i, '').trim();
        } else if (!phone && (label.includes('Telefoon:') || label.includes('Phone:') || href.startsWith('tel:'))) {
          phone = (label.replace(/Telefoon:|Phone:/i, '').trim() || text.trim() || href.replace('tel:', '')).trim();
        } else if (!website && (label.includes('Website:') || (href.startsWith('http') && !href.includes('google.com')))) {
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

    // Bepaal slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'zzp-concept';

    return {
      name,
      slug,
      category,
      rating,
      reviewsCount,
      address,
      phone,
      website: website || null,
      reviews,
      googleMapsUrl: mapsUrl,
      hasWebsite: Boolean(website),
      scannedAt: new Date().toISOString()
    };
  }, { fallbackName, mapsUrl });
}

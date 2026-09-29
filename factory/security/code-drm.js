/**
 * Creation+Alt+Fix - Anti-Theft Code Protection & Code DRM Module
 * Beveiligt demonstratie- en conceptwebsites tegen diefstal, kopiëren en inspectie.
 * 
 * Beveiligingslagen:
 * 1. Domain-Locking Killswitch: Bricks the website if hosted on any unauthorized domain
 * 2. Anti-Inspect Defense: Disables right-click (contextmenu), F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S
 * 3. DevTools Detection Trap: Detects inspect window opening and blurs the screen with a lock overlay
 * 4. Legal Copyright Notice: Auteurswet 1912 & Benelux Verdrag bescherming
 */

export function applyCodeProtection(html, business) {
  if (!html || typeof html !== 'string') return html;

  const allowedDomains = [
    'creationaltfix.nl',
    'www.creationaltfix.nl',
    'localhost',
    '127.0.0.1'
  ];

  const businessName = (business && business.name) ? business.name : 'Lokale Ondernemer';
  const slug = (business && business.slug) ? business.slug : 'concept';

  const drmScript = `
<script id="caf-security-guard">
/*
 * INTELLECTUEEL EIGENDOM VAN CREATION+ALT+FIX (KvK 99986191).
 * DIT WERK IS AUTEURSRECHTELIJK BESCHERMD CONFORM DE NEDERLANDSE AUTEURSWET 1912 EN HET BENELUX VERDRAG VOOR INTELLECTUELE EIGENDOM (BVIE).
 * DIT DOCUMENT IS BEVEILIGD MET EEN TECHNOLOGISCHE VOORZIENING IN DE ZIN VAN ARTIKEL 29A AUTEURSWET 1912.
 * ELKE ONGEOORLOOFDE VERMENIGVULDIGING, OMZEILING, EXTERNE HOSTING OF COMMERCIEEL GEBRUIK ZONDER SCHRIFTELIJKE LICENTIE IS BIJ WET VERBODEN EN RECHTSVERVOLGBAAR.
 */
(function() {
  'use strict';
  
  // 1. DOMAIN-LOCKING KILLSWITCH
  const allowed = ${JSON.stringify(allowedDomains)};
  const currentHost = window.location.hostname;
  const isAuthorized = allowed.some(function(d) {
    return currentHost === d || currentHost.endsWith('.' + d);
  });

  if (!isAuthorized && currentHost !== '') {
    // Onbevoegde kopie gedetecteerd! Vernietig de inhoud en toon blokkade
    window.stop && window.stop();
    document.documentElement.innerHTML = '<!DOCTYPE html><html><head><title>Toegang Geblokkeerd</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0B0F19;color:#F8FAFC;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center}.box{max-width:580px;background:rgba(17,24,39,0.95);border:1px solid rgba(239,68,68,0.4);border-radius:16px;padding:40px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7)}.icon{font-size:3rem;margin-bottom:16px;color:#EF4444}h1{font-size:1.6rem;margin-bottom:12px;color:#FCA5A5}p{color:#94A3B8;line-height:1.6;font-size:0.95rem;margin-bottom:28px}.btn{background:#06B6D4;color:#000;padding:14px 28px;border-radius:8px;font-weight:700;text-decoration:none;display:inline-block}</style></head><body><div class="box"><div class="icon">&#9888;</div><h1>Onbevoegde Kopie Gedetecteerd</h1><p>Deze website is het exclusieve intellectuele eigendom van <strong>Creation+Alt+Fix</strong> (Auteurswet 1912). Het kopi&euml;ren of extern hosten van dit concept zonder actieve licentieovereenkomst is niet toegestaan en kan leiden tot juridische stappen.</p><a href="https://creationaltfix.nl" class="btn">Website Officieel Overnemen via Creation+Alt+Fix &rarr;</a></div></body></html>';
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

  // 4. DEVTOOLS DETECTIE & BLUR TRAP
  let devToolsOpen = false;
  const threshold = 160;
  setInterval(function() {
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;
    if ((widthDiff || heightDiff) && !devToolsOpen) {
      devToolsOpen = true;
      document.body.style.filter = 'blur(10px)';
      document.body.style.pointerEvents = 'none';
      showSecurityToast("Ontwikkelaarstools gedetecteerd. Layout vervaagd conform Creation+Alt+Fix licentievoorwaarden.");
    } else if (!widthDiff && !heightDiff && devToolsOpen) {
      devToolsOpen = false;
      document.body.style.filter = '';
      document.body.style.pointerEvents = '';
    }
  }, 1000);

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
    t.innerHTML = '&#128274; <strong>Creation+Alt+Fix Beveiliging:</strong> ' + msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(function() { t.style.opacity = '0'; }, 3500);
  }
})();
</script>
`;

  // Injecteer het DRM script direct na <head> of voor </body>
  let protectedHtml = html;
  if (protectedHtml.includes('</head>')) {
    protectedHtml = protectedHtml.replace('</head>', `${drmScript}\n</head>`);
  } else if (protectedHtml.includes('</body>')) {
    protectedHtml = protectedHtml.replace('</body>', `${drmScript}\n</body>`);
  } else {
    protectedHtml = drmScript + protectedHtml;
  }

  return protectedHtml;
}

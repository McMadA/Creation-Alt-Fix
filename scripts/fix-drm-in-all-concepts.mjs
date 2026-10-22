import fs from 'fs';
import path from 'path';

const conceptDir = 'website/concept';
const folders = fs.readdirSync(conceptDir).filter(f => fs.statSync(path.join(conceptDir, f)).isDirectory());

function buildCleanDrmScript(slug) {
  return `<script id="caf-security-guard">
/*
 * INTELLECTUEEL EIGENDOM VAN CREATION+ALT+FIX (KvK 99986191).
 * DIT WERK IS AUTEURSRECHTELIJK BESCHERMD CONFORM DE NEDERLANDSE AUTEURSWET 1912 EN HET BENELUX VERDRAG VOOR INTELLECTUELE EIGENDOM (BVIE).
 * DIT DOCUMENT IS BEVEILIGD MET EEN TECHNOLOGISCHE VOORZIENING IN DE ZIN VAN ARTIKEL 29A AUTEURSWET 1912.
 * ELKE ONGEOORLOOFDE VERMENIGVULDIGING, OMZEILING, EXTERNE HOSTING OF COMMERCIEEL GEBRUIK ZONDER SCHRIFTELIJKE LICENTIE IS BIJ WET VERBODEN EN RECHTSVERVOLGBAAR.
 */
(function() {
  'use strict';
  
  // 1. DOMAIN-LOCKING KILLSWITCH
  const allowed = ["creationaltfix.nl","www.creationaltfix.nl","localhost","127.0.0.1"];
  const currentHost = window.location.hostname;
  const isAuthorized = allowed.some(function(d) {
    return currentHost === d || currentHost.endsWith('.' + d);
  });

  if (!isAuthorized && currentHost !== '') {
    window.stop && window.stop();
    document.documentElement.innerHTML = '\\x3Cdiv style="background:#0B0F19;color:#F8FAFC;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center;"\\x3E\\x3Cdiv style="max-width:580px;background:rgba(17,24,39,0.95);border:1px solid rgba(239,68,68,0.4);border-radius:16px;padding:40px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);"\\x3E\\x3Cdiv style="font-size:3rem;margin-bottom:16px;color:#EF4444;"\\x3E&#9888;\\x3C/div\\x3E\\x3Ch1 style="font-size:1.6rem;margin-bottom:12px;color:#FCA5A5;"\\x3EOnbevoegde Kopie Gedetecteerd\\x3C/h1\\x3E\\x3Cp style="color:#94A3B8;line-height:1.6;font-size:0.95rem;margin-bottom:28px;"\\x3EDeze website is het exclusieve intellectuele eigendom van \\x3Cstrong\\x3ECreation+Alt+Fix\\x3C/strong\\x3E (Auteurswet 1912). Het kopi&euml;ren of extern hosten van dit concept zonder actieve licentieovereenkomst is niet toegestaan en kan leiden tot juridische stappen.\\x3C/p\\x3E\\x3Ca href="https://creationaltfix.nl" style="background:#06B6D4;color:#000;padding:14px 28px;border-radius:8px;font-weight:700;text-decoration:none;display:inline-block;"\\x3EWebsite Officieel Overnemen via Creation+Alt+Fix &rarr;\\x3C/a\\x3E\\x3C/div\\x3E\\x3C/div\\x3E';
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
    t.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = '🔒 Creation+Alt+Fix Beveiliging: ';
    t.appendChild(strong);
    t.appendChild(document.createTextNode(String(msg || '')));
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(function() { t.style.opacity = '0'; }, 3500);
  }

  // 4. ZERO-COOKIE VIEW-PING BEACON (100% AVG / GDPR-proof)
  // Registreert een anonieme view-ping zodra een potentiële klant het concept opent
  (function() {
    try {
      var isPreview = false;
      var search = window.location.search || '';
      if (search.indexOf('preview=admin') !== -1 || search.indexOf('admin=1') !== -1 || search.indexOf('caf_admin=1') !== -1) {
        isPreview = true;
      }
      try {
        if (localStorage.getItem('caf_bridge_token') || localStorage.getItem('caf_admin') || sessionStorage.getItem('caf_admin_preview')) {
          isPreview = true;
        }
      } catch (e) {}

      var conceptSlug = ${JSON.stringify(slug)};
      var sessionKey = 'caf_viewed_' + conceptSlug;
      if (!isPreview && conceptSlug && !sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, '1');
        var payload = JSON.stringify({ action: 'ping', slug: conceptSlug });
        var pingUrl = '/crm/api/leads.php?action=ping&slug=' + encodeURIComponent(conceptSlug);
        var host = window.location.hostname;
        if (window.location.port === '3847' || host === 'localhost' || host === '127.0.0.1') {
          pingUrl = 'http://127.0.0.1:3847/api/leads/ping';
        }
        if (navigator.sendBeacon) {
          navigator.sendBeacon(pingUrl, new Blob([payload], { type: 'application/json' }));
        } else if (window.fetch) {
          fetch(pingUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
            mode: 'no-cors'
          }).catch(function() {});
        }
      }
    } catch (err) {}
  })();
})();
</script>`;
}

folders.forEach(dir => {
  const file = path.join(conceptDir, dir, 'index.html');
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');

  // Verwijder eventuele oude caf-security-guard scripts
  html = html.replace(/<script id="caf-security-guard">[\s\S]*?<\/script>\s*/gi, '');

  const cleanDrmScript = buildCleanDrmScript(dir);

  // Injecteer schone guard voor </head>
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${cleanDrmScript}\n</head>`);
  } else {
    html = cleanDrmScript + '\n' + html;
  }

  fs.writeFileSync(file, html, 'utf8');
});

console.log('✅ Schone DRM guard + Zero-Cookie Ping succesvol geïnjecteerd in alle concepten!');

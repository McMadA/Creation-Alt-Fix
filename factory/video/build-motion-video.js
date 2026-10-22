import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { generateSoundtrackWav } from './audio-synth.js';

/**
 * Creation+Alt+Fix - Motion Design Video Production Suite
 * Renders high-converting motion graphics and personalized 15-second WhatsApp reels per lead.
 * Encodes broadcast-grade MP4 (H.264/AAC) for Instagram Reels, LinkedIn and direct WhatsApp outreach.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VIDEO_DIR = __dirname;
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const WEBSITE_DIR = path.join(PROJECT_ROOT, 'website');
const CONCEPT_DIR = path.join(WEBSITE_DIR, 'concept');
const FACTORY_DATA_DIR = path.join(PROJECT_ROOT, 'factory', 'data');
const CRM_DATA_DIR = path.join(PROJECT_ROOT, 'crm', 'admin', 'data');

const DOWNLOADS_DIR = process.env.USERPROFILE 
  ? path.join(process.env.USERPROFILE, 'Downloads') 
  : path.resolve(VIDEO_DIR, 'dist');
const HTML_FILE = path.join(VIDEO_DIR, 'motion-template.html');
const WAV_FILE = path.join(VIDEO_DIR, 'soundtrack.wav');

/**
 * HTML escaper to protect generated templates against XSS injection.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates and sanitizes lead slug for file and directory safety.
 * Defends against directory traversal (CWE-22) and Windows reserved device names.
 */
export function sanitizeVideoSlug(rawSlug) {
  if (!rawSlug || typeof rawSlug !== 'string') {
    throw new Error("Ongeldige slug: vereist een niet-lege string.");
  }
  const clean = rawSlug.toLowerCase().trim();
  if (clean.includes('\0') || clean.includes('..') || clean.includes('/') || clean.includes('\\')) {
    throw new Error("Ongeldige slug: directory traversal tekens zijn niet toegestaan.");
  }
  if (!/^[a-z0-9_-]{2,100}$/.test(clean)) {
    throw new Error("Ongeldige slug formaat: mag uitsluitend letters, cijfers, koppeltekens en underscores bevatten (2-100 tekens).");
  }
  const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  if (WINDOWS_RESERVED.test(clean)) {
    throw new Error(`Windows gereserveerde apparaatnaam '${clean}' is niet toegestaan als slug.`);
  }
  return clean;
}

/**
 * Dynamically resolves Playwright and FFmpeg binaries in any execution environment.
 */
export async function getPlaywrightAndFfmpeg() {
  let chromium = null;
  let ffmpegPath = null;

  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch (_) {
    const pwPath = path.join(PROJECT_ROOT, 'node_modules', 'playwright', 'index.mjs');
    if (fs.existsSync(pwPath)) {
      const pw = await import(pathToFileURL(pwPath).href);
      chromium = pw.chromium;
    }
  }

  try {
    const ff = await import('ffmpeg-static');
    ffmpegPath = ff.default || ff;
  } catch (_) {
    const ffPath = path.join(PROJECT_ROOT, 'node_modules', 'ffmpeg-static', 'index.js');
    if (fs.existsSync(ffPath)) {
      const ff = await import(pathToFileURL(ffPath).href);
      ffmpegPath = ff.default || ff;
    }
  }

  return { chromium, ffmpegPath };
}

/**
 * Generates an ultra-sharp, self-contained 15-second mobile vertical HTML template (9:16).
 * Features 4 animated scenes tailored to the lead with high-tech Dark AI aesthetics.
 */
export function generateLeadMotionHtml(lead, options = {}) {
  const leadName = escapeHtml(lead.name || 'Vakman');
  const slug = escapeHtml(lead.slug || 'concept');
  const category = escapeHtml(lead.category || 'ZZP Vakman in Bouw & Techniek');
  const city = escapeHtml(lead.city || 'de regio');
  const address = escapeHtml(lead.address || '');
  const rating = escapeHtml(String(lead.rating || '5.0'));
  const reviewsCount = parseInt(lead.reviewsCount, 10) || 12;
  const domain = escapeHtml(lead.suggestedDomain || lead.recommendedDomain || `${lead.slug}.nl`);
  const liveUrl = escapeHtml(lead.liveUrl || `https://creationaltfix.nl/concept/${lead.slug}/`);
  const conceptIframeUrl = options.conceptFileUrl ? escapeHtml(options.conceptFileUrl) : '';

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=720, height=1280, initial-scale=1.0">
  <title>15s WhatsApp Reel - ${leadName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@600;700;800&family=Fira+Code:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    body {
      background-color: #070A12;
      color: #F8FAFC;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      width: 720px;
      height: 1280px;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    /* Ambient Tech Glow Background */
    .ambient-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
      background: radial-gradient(circle at 50% 20%, rgba(6, 182, 212, 0.15), transparent 60%),
                  radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.18), transparent 65%),
                  radial-gradient(circle at 20% 70%, rgba(16, 185, 129, 0.15), transparent 60%);
    }
    .grid-overlay {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
      background-size: 28px 28px;
      z-index: 2;
      opacity: 0.7;
    }

    /* Master Timeline Scene Container */
    .timeline-container {
      position: relative;
      width: 100%;
      height: 100%;
      z-index: 5;
    }
    .scene {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 50px 40px;
      text-align: center;
      opacity: 0;
      transform: scale(0.96);
      transition: opacity 0.45s ease-out, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    }

    /* SCENE 1: THE DISCOVERY (0.0s - 3.5s) */
    #scene-1 {
      animation: scene1Timeline 15s linear forwards;
    }
    @keyframes scene1Timeline {
      0% { opacity: 1; transform: scale(1); }
      20% { opacity: 1; transform: scale(1); }
      23% { opacity: 0; transform: scale(0.96) translateY(-20px); }
      100% { opacity: 0; transform: scale(0.96) translateY(-20px); }
    }

    .badge-maps {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      font-weight: 700;
      font-size: 1.1rem;
      margin-bottom: 24px;
      box-shadow: 0 0 25px rgba(239, 68, 68, 0.25);
    }
    .badge-rating {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border-radius: 9999px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
      font-weight: 700;
      font-size: 1rem;
      margin-bottom: 24px;
    }
    .lead-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 3.2rem;
      font-weight: 800;
      line-height: 1.15;
      color: #ffffff;
      margin-bottom: 20px;
      letter-spacing: -0.03em;
    }
    .lead-title span {
      background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .lead-subtitle {
      font-size: 1.35rem;
      color: #cbd5e1;
      line-height: 1.5;
      max-width: 580px;
      margin-bottom: 30px;
    }
    .missing-web-box {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 18px 28px;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-size: 1.15rem;
      color: #fca5a5;
    }

    /* SCENE 2: LIVE CONCEPT SHOWCASE (3.5s - 9.5s) */
    #scene-2 {
      animation: scene2Timeline 15s linear forwards;
    }
    @keyframes scene2Timeline {
      0% { opacity: 0; transform: scale(0.95) translateY(20px); }
      22% { opacity: 0; transform: scale(0.95) translateY(20px); }
      24% { opacity: 1; transform: scale(1) translateY(0); }
      61% { opacity: 1; transform: scale(1) translateY(0); }
      64% { opacity: 0; transform: scale(0.96) translateY(-20px); }
      100% { opacity: 0; transform: scale(0.96) translateY(-20px); }
    }

    .phone-mockup-wrapper {
      position: relative;
      width: 360px;
      height: 640px;
      border: 8px solid #1e293b;
      border-radius: 42px;
      background: #020617;
      overflow: hidden;
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9),
                  0 0 50px rgba(56, 189, 248, 0.25);
      margin-bottom: 24px;
    }
    .phone-notch {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 100px;
      height: 20px;
      background: #1e293b;
      border-radius: 12px;
      z-index: 20;
    }
    .phone-screen {
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
      background: #0b0f19;
    }
    .scroll-inner {
      width: 100%;
      animation: autoScrollSite 15s linear forwards;
    }
    @keyframes autoScrollSite {
      0% { transform: translateY(0); }
      25% { transform: translateY(0); }
      60% { transform: translateY(-380px); }
      100% { transform: translateY(-380px); }
    }

    .mock-site-hero {
      padding: 40px 20px 25px;
      text-align: left;
      background: linear-gradient(180deg, rgba(56, 189, 248, 0.12) 0%, transparent 100%);
    }
    .mock-pill {
      font-size: 0.72rem;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .mock-title {
      font-size: 1.4rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.25;
      margin-bottom: 12px;
    }
    .mock-cta-btns {
      display: flex;
      gap: 8px;
      margin-top: 14px;
    }
    .mock-btn-wa {
      flex: 1;
      padding: 10px;
      border-radius: 8px;
      background: #10b981;
      color: #fff;
      font-weight: 700;
      font-size: 0.8rem;
      text-align: center;
    }
    .mock-btn-tel {
      flex: 1;
      padding: 10px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      font-weight: 700;
      font-size: 0.8rem;
      text-align: center;
    }
    .mock-section {
      padding: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      text-align: left;
    }
    .mock-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
    }
    .mock-grid-card {
      background: rgba(255, 255, 255, 0.05);
      padding: 12px;
      border-radius: 8px;
      font-size: 0.75rem;
      color: #cbd5e1;
    }

    /* Floating Feature Badges */
    .floating-pills {
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: absolute;
      right: 30px;
      top: 320px;
      z-index: 30;
    }
    .float-pill {
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(56, 189, 248, 0.4);
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* SCENE 3: DOMAIN & TRANSPARENT PRICING (9.5s - 12.5s) */
    #scene-3 {
      animation: scene3Timeline 15s linear forwards;
    }
    @keyframes scene3Timeline {
      0% { opacity: 0; transform: scale(0.95); }
      63% { opacity: 0; transform: scale(0.95); }
      65% { opacity: 1; transform: scale(1); }
      81% { opacity: 1; transform: scale(1); }
      83% { opacity: 0; transform: scale(0.96) translateY(-20px); }
      100% { opacity: 0; transform: scale(0.96) translateY(-20px); }
    }

    .domain-claim-card {
      background: rgba(15, 23, 42, 0.9);
      border: 2px solid #10b981;
      border-radius: 24px;
      padding: 36px 30px;
      max-width: 620px;
      box-shadow: 0 20px 50px rgba(16, 185, 129, 0.25);
      margin-bottom: 28px;
    }
    .domain-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      font-weight: 800;
      font-size: 1.25rem;
      margin-bottom: 20px;
    }
    .domain-name-highlight {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2.8rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 12px;
      word-break: break-all;
    }
    .price-guarantee {
      font-size: 1.3rem;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .price-guarantee strong {
      color: #38bdf8;
    }

    /* SCENE 4: WHATSAPP OUTRO & CTA (12.5s - 15.0s) */
    #scene-4 {
      animation: scene4Timeline 15s linear forwards;
    }
    @keyframes scene4Timeline {
      0% { opacity: 0; transform: scale(0.95); }
      82% { opacity: 0; transform: scale(0.95); }
      84% { opacity: 1; transform: scale(1); }
      100% { opacity: 1; transform: scale(1); }
    }

    .brand-logo-badge {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #fff;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }
    .url-reveal-box {
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(56, 189, 248, 0.45);
      border-radius: 20px;
      padding: 24px 32px;
      margin-bottom: 30px;
      box-shadow: 0 0 35px rgba(56, 189, 248, 0.2);
    }
    .url-text {
      font-family: 'Fira Code', monospace;
      font-size: 1.35rem;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: -0.02em;
    }
    .btn-wa-cta {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: #10b981;
      color: #ffffff;
      font-weight: 800;
      font-size: 1.45rem;
      padding: 18px 36px;
      border-radius: 9999px;
      box-shadow: 0 0 35px rgba(16, 185, 129, 0.5);
      margin-bottom: 20px;
    }
    .allard-sub {
      color: #94a3b8;
      font-size: 1.1rem;
    }
  </style>
</head>
<body>
  <div class="ambient-bg"></div>
  <div class="grid-overlay"></div>

  <div class="timeline-container">
    <!-- SCENE 1: THE DISCOVERY -->
    <div id="scene-1" class="scene">
      <div class="badge-maps"><i class="fas fa-map-marker-alt"></i> Gevonden in ${city}</div>
      <div class="badge-rating">⭐ ${rating} Google Score (${reviewsCount} beoordelingen)</div>
      <h1 class="lead-title">Geen website voor <span>${leadName}</span>?</h1>
      <p class="lead-subtitle">
        Potentiële particulieren zoeken dagelijks mobiel naar een betrouwbare <strong>${category}</strong> in ${city}.
      </p>
      <div class="missing-web-box">
        <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 1.3rem;"></i>
        <span>Google Maps vermelding heeft nog geen actieve website!</span>
      </div>
    </div>

    <!-- SCENE 2: LIVE CONCEPT SHOWCASE -->
    <div id="scene-2" class="scene">
      <div class="phone-mockup-wrapper">
        <div class="phone-notch"></div>
        <div class="phone-screen">
          <div class="scroll-inner">
            <div class="mock-site-hero">
              <div class="mock-pill">${category}</div>
              <div class="mock-title">${leadName}</div>
              <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.4;">
                Dé vakspecialist voor particulier en bedrijf in ${city} en omstreken.
              </div>
              <div class="mock-cta-btns">
                <div class="mock-btn-wa"><i class="fab fa-whatsapp"></i> WhatsApp</div>
                <div class="mock-btn-tel"><i class="fas fa-phone"></i> Bellen</div>
              </div>
            </div>
            <div class="mock-section">
              <div class="mock-pill">Specialismen &amp; Vakwerk</div>
              <div class="mock-grid">
                <div class="mock-grid-card">⭐ Vakkundige montage</div>
                <div class="mock-grid-card">⚡ Snelle service</div>
                <div class="mock-grid-card">📍 Actief in ${city}</div>
                <div class="mock-grid-card">✅ Vrijblijvend advies</div>
              </div>
            </div>
            <div class="mock-section">
              <div class="mock-pill">Tevreden Klanten</div>
              <div style="font-size: 0.78rem; color: #fbbf24; margin-bottom: 4px;">⭐⭐⭐⭐⭐ 5.0 Rating</div>
              <div style="font-size: 0.76rem; color: #cbd5e1; font-style: italic;">
                "Super snel en netjes geregeld. Betrouwbare vakman!"
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="floating-pills">
        <div class="float-pill"><i class="fas fa-bolt" style="color: #38bdf8;"></i> 0.4s Laadtijd</div>
        <div class="float-pill"><i class="fas fa-mobile-alt" style="color: #a78bfa;"></i> 100% Mobile First</div>
        <div class="float-pill"><i class="fab fa-whatsapp" style="color: #10b981;"></i> 1-Klik Contact</div>
      </div>
    </div>

    <!-- SCENE 3: DOMAIN & TRANSPARENT PRICING -->
    <div id="scene-3" class="scene">
      <div class="domain-claim-card">
        <div class="domain-pill"><i class="fas fa-check-circle"></i> Vrij om te claimen!</div>
        <div class="domain-name-highlight">🟢 ${domain}</div>
        <div class="price-guarantee">
          Eenmalig <strong>€ 199,-</strong> • Géén wurgcontract • 100% Jouw Eigendom
        </div>
      </div>
      <div style="font-size: 1.15rem; color: #94a3b8; max-width: 500px;">
        Inclusief supersnelle NVMe hosting, SSL certificaat en zakelijke e-mail.
      </div>
    </div>

    <!-- SCENE 4: WHATSAPP OUTRO & CTA -->
    <div id="scene-4" class="scene">
      <div class="brand-logo-badge">
        <i class="fas fa-terminal" style="color: #38bdf8;"></i> Creation+Alt+Fix
      </div>
      <div style="font-size: 1.3rem; color: #cbd5e1; margin-bottom: 16px;">
        Bekijk jouw concept nu live op je telefoon:
      </div>
      <div class="url-reveal-box">
        <div class="url-text">${liveUrl}</div>
      </div>
      <div class="btn-wa-cta">
        <i class="fab fa-whatsapp"></i> Stuur Allard een Appje
      </div>
      <div class="allard-sub">
        Allard Veldman • 📞 06 19 13 54 53
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Autonomously renders a 15-second personalized vertical WhatsApp Reel MP4 for a lead.
 * Uses Playwright to capture the timeline in real-time and FFmpeg to encode broadcast-grade MP4.
 */
export async function renderLeadVideoPreview({
  slug,
  lead = null,
  width = 720,
  height = 1280,
  durationMs = 15000,
  fps = 30,
  outputDir = null,
  dryRun = false
} = {}) {
  const cleanSlug = sanitizeVideoSlug(slug);

  // 1. Resolve lead object
  let resolvedLead = lead;
  if (!resolvedLead) {
    let db = null;
    const leadsFile = fs.existsSync(FACTORY_DATA_DIR) ? path.join(FACTORY_DATA_DIR, 'leads.json') : null;
    if (leadsFile && fs.existsSync(leadsFile)) {
      try {
        db = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));
      } catch (_) {}
    }
    if (!db && fs.existsSync(CRM_DATA_DIR)) {
      const crmFile = path.join(CRM_DATA_DIR, 'leads.json');
      if (fs.existsSync(crmFile)) {
        try {
          db = JSON.parse(fs.readFileSync(crmFile, 'utf-8'));
        } catch (_) {}
      }
    }
    if (db && Array.isArray(db.leads)) {
      resolvedLead = db.leads.find(l => l.slug === cleanSlug || l.id === cleanSlug);
    }
  }

  if (!resolvedLead) {
    resolvedLead = {
      name: cleanSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      slug: cleanSlug,
      category: 'ZZP Vakman',
      city: 'de regio',
      rating: '5.0',
      reviewsCount: 10
    };
  }

  // 2. Target paths
  const conceptFolder = path.join(CONCEPT_DIR, cleanSlug);
  const targetMp4 = outputDir 
    ? path.join(outputDir, `${cleanSlug}-preview.mp4`)
    : path.join(conceptFolder, 'video-preview.mp4');
  const distMp4 = path.join(VIDEO_DIR, 'dist', `${cleanSlug}-whatsapp-reel.mp4`);

  if (dryRun) {
    return {
      ok: true,
      slug: cleanSlug,
      dryRun: true,
      videoUrl: `/concept/${cleanSlug}/video-preview.mp4`,
      absoluteUrl: `https://creationaltfix.nl/concept/${cleanSlug}/video-preview.mp4`,
      videoPath: targetMp4,
      durationSeconds: Math.round(durationMs / 1000),
      sizeBytes: 0,
      lead: resolvedLead
    };
  }

  const { chromium, ffmpegPath } = await getPlaywrightAndFfmpeg();
  if (!chromium) {
    throw new Error("Playwright Chromium is niet beschikbaar om de video te renderen.");
  }
  if (!ffmpegPath) {
    throw new Error("FFmpeg static binary is niet gevonden om de video te transcoderen.");
  }

  // 3. Ensure temporary render directory and HTML template
  const tempDir = path.join(VIDEO_DIR, `temp_lead_${cleanSlug}_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const tempHtml = path.join(tempDir, `template_${cleanSlug}.html`);
  const conceptIndex = path.join(conceptFolder, 'index.html');
  const conceptFileUrl = fs.existsSync(conceptIndex) 
    ? 'file:///' + conceptIndex.replace(/\\/g, '/') 
    : '';

  const htmlContent = generateLeadMotionHtml(resolvedLead, { conceptFileUrl });
  fs.writeFileSync(tempHtml, htmlContent, 'utf-8');

  // 4. Ensure soundtrack WAV
  if (!fs.existsSync(WAV_FILE)) {
    generateSoundtrackWav(WAV_FILE);
  }

  // 5. Playwright Recording
  const browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security']
  });

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: tempDir,
      size: { width, height }
    }
  });

  const page = await context.newPage();
  const fileUrl = 'file:///' + tempHtml.replace(/\\/g, '/');

  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.waitForTimeout(durationMs);

  await context.close();
  await browser.close();

  // 6. Find recorded WebM
  const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Geen video-opname gegenereerd in ${tempDir}`);
  }
  const rawWebm = path.join(tempDir, files[0]);

  // 7. FFmpeg transcode to MP4 (H.264/AAC with faststart for WhatsApp)
  fs.mkdirSync(path.dirname(targetMp4), { recursive: true });
  fs.mkdirSync(path.dirname(distMp4), { recursive: true });

  const targetDurationSec = (durationMs / 1000).toFixed(1);
  const fadeStart = Math.max(0, (durationMs / 1000) - 0.8).toFixed(1);

  const ffmpegArgs = [
    '-y',
    '-i', rawWebm,
    '-i', WAV_FILE,
    '-filter_complex', `[1:a]afade=t=out:st=${fadeStart}:d=0.8[a]`,
    '-map', '0:v:0',
    '-map', '[a]',
    '-t', targetDurationSec,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '22',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-movflags', '+faststart',
    targetMp4
  ];

  execFileSync(ffmpegPath, ffmpegArgs, { stdio: 'pipe' });

  // Copy to dist folder
  try {
    fs.copyFileSync(targetMp4, distMp4);
  } catch (_) {}

  const stats = fs.statSync(targetMp4);

  // 8. Update lead data in leads.json
  const videoMeta = {
    generated: true,
    generatedAt: new Date().toISOString(),
    fileName: 'video-preview.mp4',
    relativeUrl: `/concept/${cleanSlug}/video-preview.mp4`,
    absoluteUrl: `https://creationaltfix.nl/concept/${cleanSlug}/video-preview.mp4`,
    durationSeconds: Math.round(durationMs / 1000),
    sizeBytes: stats.size
  };
  resolvedLead.videoPreview = videoMeta;

  const updateDbFile = (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const db = JSON.parse(content);
      if (Array.isArray(db.leads)) {
        const idx = db.leads.findIndex(l => l.slug === cleanSlug || l.id === cleanSlug);
        if (idx !== -1) {
          db.leads[idx].videoPreview = videoMeta;
          db.leads[idx].updatedAt = new Date().toISOString();
          fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf-8');
        }
      }
    } catch (_) {}
  };

  updateDbFile(path.join(FACTORY_DATA_DIR, 'leads.json'));
  updateDbFile(path.join(CRM_DATA_DIR, 'leads.json'));

  // 9. Cleanup temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });

  return {
    ok: true,
    slug: cleanSlug,
    videoUrl: videoMeta.relativeUrl,
    absoluteUrl: videoMeta.absoluteUrl,
    videoPath: targetMp4,
    distPath: distMp4,
    durationSeconds: videoMeta.durationSeconds,
    sizeBytes: stats.size,
    lead: resolvedLead
  };
}

/**
 * 28-second Brand Video production function for Instagram / LinkedIn.
 */
async function renderVideo({ width, height, outputFilename, label }) {
  console.log(`\n============================================================`);
  console.log(`🎬 Rendering ${label} (${width}x${height})...`);
  console.log(`============================================================`);

  const { chromium, ffmpegPath } = await getPlaywrightAndFfmpeg();

  const tempDir = path.join(VIDEO_DIR, `temp_rec_${width}x${height}`);
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    recordVideo: { dir: tempDir, size: { width, height } }
  });

  const page = await context.newPage();
  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');

  console.log(`🌐 Loading animation stage...`);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  console.log(`⏱️ Recording 28-second timeline in realtime at 60fps...`);
  const durationMs = 28500;
  const startTime = Date.now();

  await page.waitForTimeout(durationMs);

  console.log(`🏁 Recording finished in ${((Date.now() - startTime) / 1000).toFixed(1)}s. Closing page...`);
  await context.close();
  await browser.close();

  const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    throw new Error(`Geen video-opname gevonden in ${tempDir}`);
  }
  const rawWebm = path.join(tempDir, files[0]);

  const finalMp4 = path.join(DOWNLOADS_DIR, outputFilename);
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

  console.log(`🎛️ Encoding high-bitrate H.264 MP4 with synchronized soundtrack...`);
  const ffmpegArgs = [
    '-y',
    '-i', rawWebm,
    '-i', WAV_FILE,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '19',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    finalMp4
  ];

  execFileSync(ffmpegPath, ffmpegArgs, { stdio: 'inherit' });
  const stats = fs.statSync(finalMp4);

  console.log(`\n🎉 SUCCESS! Motion design video ready:`);
  console.log(`📁 Bestand: ${finalMp4}`);
  console.log(`📊 Grootte: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  fs.rmSync(tempDir, { recursive: true, force: true });
  return finalMp4;
}

async function main() {
  console.log("\n============================================================");
  console.log("🚀 CREATION+ALT+FIX - SOCIAL MEDIA VIDEO PRODUCTION SUITE");
  console.log("============================================================\n");

  if (!fs.existsSync(WAV_FILE)) {
    console.log("🎵 Generating soundtrack...");
    generateSoundtrackWav(WAV_FILE);
  }

  const verticalMp4 = await renderVideo({
    width: 1080,
    height: 1920,
    outputFilename: 'CreationAltFix-Intake-tot-Website-Reel.mp4',
    label: 'Instagram Reel & Story (9:16 Vertical)'
  });

  const landscapeMp4 = await renderVideo({
    width: 1920,
    height: 1080,
    outputFilename: 'CreationAltFix-Intake-tot-Website-Landscape.mp4',
    label: 'LinkedIn Feed & Presentation (16:9 Widescreen)'
  });

  console.log("\n============================================================");
  console.log("✅ COMPLETE! BEIDE VIDEO'S STAAN IN JOUW DOWNLOADS MAP:");
  console.log(`1. ${verticalMp4}`);
  console.log(`2. ${landscapeMp4}`);
  console.log("============================================================\n");
}

const isMain = Boolean(process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  main().catch(err => {
    console.error("❌ Fout tijdens renderen:", err);
    process.exit(1);
  });
}

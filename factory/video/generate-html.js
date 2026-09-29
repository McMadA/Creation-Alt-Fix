import fs from 'fs';
import path from 'path';

/**
 * Creation+Alt+Fix - Motion Design HTML Generator
 * Generates an ultra-high quality, self-contained 28s animation template
 * with embedded base64 assets, glowing gradients, 3D device mockups, and glassmorphic UI.
 */

const ROOT_DIR = path.resolve('factory/video');
const WEBSITE_IMG_DIR = path.resolve('website/images');

const logoB64 = fs.readFileSync(path.join(WEBSITE_IMG_DIR, 'logo.webp')).toString('base64');
const besselingB64 = fs.readFileSync(path.join(WEBSITE_IMG_DIR, 'besseling.webp')).toString('base64');
const arnoldB64 = fs.readFileSync(path.join(WEBSITE_IMG_DIR, 'arnolddesign.webp')).toString('base64');

const htmlContent = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creation+Alt+Fix - Van Intake tot Live Website</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700;800&family=Fira+Code:wght@400;600&display=swap" rel="stylesheet">
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
      font-family: 'Inter', -apple-system, sans-serif;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    /* Ambient Background Glows */
    .ambient-bg {
      position: absolute;
      inset: 0;
      overflow: hidden;
      z-index: 1;
      pointer-events: none;
    }

    .glow-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.45;
      animation: floatOrb 12s ease-in-out infinite alternate;
    }

    .orb-cyan {
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, #06B6D4, transparent 70%);
      top: -150px;
      left: -150px;
    }

    .orb-indigo {
      width: 700px;
      height: 700px;
      background: radial-gradient(circle, #6366F1, transparent 70%);
      bottom: -200px;
      right: -200px;
      animation-delay: -6s;
    }

    .orb-emerald {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, #10B981, transparent 70%);
      top: 40%;
      left: 30%;
      opacity: 0.25;
      animation-duration: 9s;
    }

    @keyframes floatOrb {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(60px, 80px) scale(1.15); }
    }

    /* Particle Canvas */
    #particles-canvas {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
    }

    /* Grid Overlay */
    .grid-overlay {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 60px 60px;
      z-index: 2;
      mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
    }

    /* Stage Container (Scales to 1080x1920 or 1920x1080) */
    .stage {
      position: relative;
      width: 100%;
      height: 100%;
      max-width: 1080px;
      max-height: 1920px;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 48px;
    }

    /* Top Brand Watermark Bar */
    .top-bar {
      position: absolute;
      top: 54px;
      left: 48px;
      right: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 100;
    }

    .brand-tag {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(16px);
      padding: 10px 20px;
      border-radius: 9999px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }

    .brand-logo-img {
      height: 28px;
      width: auto;
      object-fit: contain;
    }

    .brand-name {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 1.05rem;
      letter-spacing: -0.02em;
      color: #F8FAFC;
    }

    .phase-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(34, 211, 238, 0.12);
      border: 1px solid rgba(34, 211, 238, 0.35);
      padding: 8px 18px;
      border-radius: 9999px;
      font-size: 0.9rem;
      font-weight: 700;
      color: #22D3EE;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      box-shadow: 0 0 20px rgba(34, 211, 238, 0.25);
    }

    .phase-indicator .pulse-dot {
      width: 8px;
      height: 8px;
      background: #22D3EE;
      border-radius: 50%;
      box-shadow: 0 0 10px #22D3EE;
      animation: pulseGlow 1.5s infinite;
    }

    @keyframes pulseGlow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* Master Timeline Scene Wrapper */
    .scene-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scene {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transform: translateY(30px) scale(0.96);
      transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .scene.active {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    /* Glassmorphism Card Style */
    .glass-card {
      background: rgba(15, 23, 42, 0.78);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border-radius: 28px;
      box-shadow: 0 35px 80px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(34, 211, 238, 0.1);
      width: 100%;
      max-width: 880px;
      padding: 48px;
      position: relative;
    }

    /* Typography */
    h1.hero-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 3.6rem;
      font-weight: 800;
      line-height: 1.1;
      text-align: center;
      margin-bottom: 24px;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, #FFFFFF 30%, #94A3B8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    h1.hero-title .highlight {
      background: linear-gradient(135deg, #22D3EE 0%, #818CF8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: block;
    }

    p.hero-subtitle {
      font-size: 1.55rem;
      line-height: 1.5;
      text-align: center;
      color: #94A3B8;
      max-width: 680px;
      margin-bottom: 40px;
    }

    /* ------------------------------------------- */
    /* SCENE 1: THE HOOK */
    /* ------------------------------------------- */
    .cta-button-hero {
      background: linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%);
      color: #070A12;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      padding: 22px 46px;
      border-radius: 16px;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 15px 45px rgba(6, 182, 212, 0.45);
      position: relative;
      cursor: pointer;
    }

    .cursor-pointer {
      position: absolute;
      width: 44px;
      height: 44px;
      z-index: 1000;
      filter: drop-shadow(0 10px 20px rgba(0,0,0,0.6));
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .click-ripple {
      position: absolute;
      border-radius: 50%;
      border: 3px solid #22D3EE;
      width: 40px;
      height: 40px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      opacity: 1;
      pointer-events: none;
    }

    @keyframes rippleExpand {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(4.5); opacity: 0; }
    }

    /* ------------------------------------------- */
    /* SCENE 2: FASE 1 INTAKE */
    /* ------------------------------------------- */
    .form-group {
      margin-bottom: 24px;
    }

    .form-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-input-mock {
      background: rgba(11, 15, 25, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      padding: 18px 24px;
      font-size: 1.35rem;
      font-weight: 500;
      color: #F8FAFC;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);
    }

    .typing-cursor {
      display: inline-block;
      width: 3px;
      height: 1.4em;
      background: #22D3EE;
      margin-left: 4px;
      animation: blink 0.7s infinite;
    }

    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

    .tag-container {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 14px;
    }

    .feature-tag {
      background: rgba(99, 102, 241, 0.14);
      border: 1px solid rgba(99, 102, 241, 0.35);
      color: #C7D2FE;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 1.05rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-submit-intake {
      width: 100%;
      background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%);
      color: #070A12;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.35rem;
      font-weight: 700;
      padding: 20px;
      border-radius: 14px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 28px;
      box-shadow: 0 12px 35px rgba(16, 185, 129, 0.35);
    }

    /* ------------------------------------------- */
    /* SCENE 3: FASE 2 OFFERTE & DIGITAAL AKKOORD */
    /* ------------------------------------------- */
    .quote-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding-bottom: 24px;
      margin-bottom: 28px;
    }

    .quote-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.9rem;
      font-weight: 700;
      color: #F8FAFC;
    }

    .quote-price-tag {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2.6rem;
      font-weight: 800;
      color: #22D3EE;
      text-align: right;
    }

    .quote-price-sub {
      font-size: 0.95rem;
      color: #94A3B8;
      font-weight: 500;
    }

    .quote-rows {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 30px;
    }

    .quote-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      background: rgba(255,255,255,0.025);
      border-radius: 12px;
      font-size: 1.15rem;
    }

    .quote-row .name { color: #E2E8F0; font-weight: 500; }
    .quote-row .val { color: #34D399; font-weight: 700; }

    .signature-box {
      border: 2px dashed rgba(34, 211, 238, 0.4);
      background: rgba(6, 182, 212, 0.04);
      border-radius: 18px;
      padding: 24px;
      position: relative;
      height: 130px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }

    .signature-svg {
      width: 320px;
      height: 80px;
    }

    .signature-path {
      stroke: #22D3EE;
      stroke-width: 4;
      stroke-linecap: round;
      fill: none;
      stroke-dasharray: 800;
      stroke-dashoffset: 800;
    }

    .seal-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34D399;
      padding: 12px 24px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 1.15rem;
      box-shadow: 0 0 25px rgba(16, 185, 129, 0.25);
    }

    /* ------------------------------------------- */
    /* SCENE 4: FASE 3 & 4 AI CODE & ONTWIKKELING */
    /* ------------------------------------------- */
    .code-scene-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 24px;
      width: 100%;
    }

    .terminal-card {
      background: #0B0F19;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    }

    .terminal-header {
      background: #111827;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .dot-red { width: 10px; height: 10px; border-radius: 50%; background: #EF4444; }
    .dot-yellow { width: 10px; height: 10px; border-radius: 50%; background: #F59E0B; }
    .dot-green { width: 10px; height: 10px; border-radius: 50%; background: #10B981; }

    .terminal-body {
      padding: 20px;
      font-family: 'Fira Code', monospace;
      font-size: 0.92rem;
      line-height: 1.7;
      color: #A5B4FC;
    }

    .terminal-body .cmd-ok { color: #34D399; }
    .terminal-body .cmd-cyan { color: #22D3EE; }

    .gauge-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 24px;
      text-align: center;
    }

    .score-circle {
      position: relative;
      width: 150px;
      height: 150px;
      margin-bottom: 16px;
    }

    .score-circle svg {
      transform: rotate(-90deg);
      width: 100%;
      height: 100%;
    }

    .score-circle .bg-ring {
      fill: none;
      stroke: rgba(255, 255, 255, 0.08);
      stroke-width: 12;
    }

    .score-circle .fill-ring {
      fill: none;
      stroke: #10B981;
      stroke-width: 12;
      stroke-linecap: round;
      stroke-dasharray: 440;
      stroke-dashoffset: 440;
    }

    .score-number {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2.6rem;
      font-weight: 800;
      color: #F8FAFC;
    }

    /* ------------------------------------------- */
    /* SCENE 5: FASE 5 OPGELEVERDE LIVE WEBSITE */
    /* ------------------------------------------- */
    .browser-frame {
      background: #0F172A;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      overflow: hidden;
      width: 100%;
      max-width: 860px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(6, 182, 212, 0.25);
      transform: perspective(1000px) rotateX(4deg) translateY(0);
      transition: transform 0.8s ease;
    }

    .browser-bar {
      background: #1E293B;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .browser-address {
      flex: 1;
      background: #0B0F19;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 0.95rem;
      color: #34D399;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }

    .browser-view {
      position: relative;
      height: 480px;
      overflow: hidden;
      background: #0B0F19;
    }

    .website-mock-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
    }

    .live-badge-floating {
      position: absolute;
      bottom: 24px;
      right: 24px;
      background: rgba(16, 185, 129, 0.95);
      color: #070A12;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 800;
      font-size: 1.15rem;
      padding: 12px 26px;
      border-radius: 9999px;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.5);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .star-rating {
      display: flex;
      gap: 6px;
      color: #F59E0B;
      font-size: 1.6rem;
      margin-top: 14px;
    }

    /* ------------------------------------------- */
    /* SCENE 6: OUTRO & CALL TO ACTION */
    /* ------------------------------------------- */
    .outro-logo-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 760px;
    }

    .outro-logo-big {
      height: 80px;
      width: auto;
      margin-bottom: 24px;
      filter: drop-shadow(0 0 25px rgba(34, 211, 238, 0.4));
    }

    .pricing-pill-big {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
      border: 1px solid rgba(34, 211, 238, 0.4);
      padding: 12px 32px;
      border-radius: 9999px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.6rem;
      font-weight: 800;
      color: #22D3EE;
      margin-bottom: 24px;
      box-shadow: 0 0 30px rgba(34, 211, 238, 0.2);
    }

    .cta-social-btn {
      background: linear-gradient(135deg, #06B6D4 0%, #6366F1 100%);
      color: #FFFFFF;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.55rem;
      font-weight: 700;
      padding: 22px 52px;
      border-radius: 18px;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 15px 50px rgba(6, 182, 212, 0.45);
      margin-bottom: 28px;
    }

    .contact-footer {
      display: flex;
      align-items: center;
      gap: 24px;
      font-size: 1.1rem;
      color: #94A3B8;
      font-weight: 500;
    }

    .contact-footer i { color: #22D3EE; }

    /* Confetti Particle elements */
    .confetti-piece {
      position: absolute;
      width: 12px;
      height: 18px;
      background: #22D3EE;
      opacity: 0;
      border-radius: 3px;
    }
  </style>
</head>
<body>

  <!-- Ambient Light Effects -->
  <div class="ambient-bg">
    <div class="glow-orb orb-cyan"></div>
    <div class="glow-orb orb-indigo"></div>
    <div class="glow-orb orb-emerald"></div>
  </div>

  <canvas id="particles-canvas"></canvas>
  <div class="grid-overlay"></div>

  <!-- Stage -->
  <div class="stage">
    
    <!-- Top Branding & Dynamic Phase Header -->
    <div class="top-bar">
      <div class="brand-tag">
        <img src="data:image/webp;base64,${logoB64}" class="brand-logo-img" alt="Creation+Alt+Fix">
        <span class="brand-name">Creation+Alt+Fix</span>
      </div>
      <div id="dynamic-phase-pill" class="phase-indicator">
        <span class="pulse-dot"></span>
        <span id="phase-pill-text">Workflow</span>
      </div>
    </div>

    <div class="scene-container">

      <!-- ========================================= -->
      <!-- SCENE 1: THE HOOK (0s - 4.5s) -->
      <!-- ========================================= -->
      <div id="scene-1" class="scene active">
        <h1 class="hero-title">
          Hoe bouwen wij jouw
          <span class="highlight">nieuwe website?</span>
        </h1>
        <p class="hero-subtitle">
          Van intake tot livegang in recordtijd. Zonder gedoe, professioneel en betaalbaar.
        </p>

        <div style="position: relative;">
          <button id="btn-hero-start" class="cta-button-hero">
            <i class="fas fa-bolt"></i> Start Project Intake
          </button>
          <div id="hero-click-ripple" class="click-ripple"></div>
        </div>

        <svg id="hero-cursor" class="cursor-pointer" viewBox="0 0 24 24" fill="none" style="top: 150px; left: 100px;">
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" fill="#FFFFFF"/>
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" stroke="#0B0F19" stroke-width="1.5"/>
        </svg>
      </div>

      <!-- ========================================= -->
      <!-- SCENE 2: FASE 1 INTAKE (4.5s - 9.5s) -->
      <!-- ========================================= -->
      <div id="scene-2" class="scene">
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div style="font-family: 'Space Grotesk'; font-size: 1.8rem; font-weight: 700; color: #F8FAFC;">
              <i class="fas fa-clipboard-list" style="color: #22D3EE; margin-right: 10px;"></i>
              Fase 1: Wensen &amp; Intake
            </div>
            <span class="seal-badge" style="font-size: 0.95rem; padding: 6px 16px;">
              <i class="fas fa-check-circle"></i> Stap 1 van 5
            </span>
          </div>

          <div class="form-group">
            <div class="form-label"><i class="fas fa-building"></i> Bedrijfsnaam</div>
            <div class="form-input-mock">
              <span id="input-typed-company"></span>
              <span id="cursor-company" class="typing-cursor"></span>
            </div>
          </div>

          <div class="form-group">
            <div class="form-label"><i class="fas fa-bullseye"></i> Belangrijkste Doel</div>
            <div class="form-input-mock">
              <span id="input-typed-goal"></span>
              <span id="cursor-goal" class="typing-cursor" style="display: none;"></span>
            </div>
          </div>

          <div class="tag-container">
            <span class="feature-tag" id="tag-1" style="opacity: 0; transform: translateY(10px);"><i class="fas fa-bolt" style="color: #22D3EE;"></i> NVMe Hosting</span>
            <span class="feature-tag" id="tag-2" style="opacity: 0; transform: translateY(10px);"><i class="fas fa-mobile-alt" style="color: #818CF8;"></i> Mobile First</span>
            <span class="feature-tag" id="tag-3" style="opacity: 0; transform: translateY(10px);"><i class="fas fa-shield-alt" style="color: #34D399;"></i> 99,9% SLA</span>
          </div>

          <button id="btn-submit-intake" class="btn-submit-intake">
            <i class="fas fa-paper-plane"></i> Verstuur Intake Aanvraag ➔
          </button>
        </div>
      </div>

      <!-- ========================================= -->
      <!-- SCENE 3: FASE 2 OFFERTE & DIGITAAL AKKOORD (9.5s - 14.5s) -->
      <!-- ========================================= -->
      <div id="scene-3" class="scene">
        <div class="glass-card">
          <div class="quote-header">
            <div>
              <div style="font-size: 0.9rem; color: #818CF8; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">Creation+Alt+Fix Portaal</div>
              <div class="quote-title">Fase 2: Offerte &amp; Projectscope</div>
            </div>
            <div>
              <div class="quote-price-tag">€ 199,-</div>
              <div class="quote-price-sub">Vast &amp; Transparant</div>
            </div>
          </div>

          <div class="quote-rows">
            <div class="quote-row">
              <span class="name"><i class="fas fa-check" style="color: #34D399; margin-right: 10px;"></i> Maatwerk Responsive Webdesign</span>
              <span class="val">Inbegrepen</span>
            </div>
            <div class="quote-row">
              <span class="name"><i class="fas fa-check" style="color: #34D399; margin-right: 10px;"></i> NVMe Cloud Hosting + .NL Domein + SSL</span>
              <span class="val">All-in</span>
            </div>
            <div class="quote-row">
              <span class="name"><i class="fas fa-check" style="color: #34D399; margin-right: 10px;"></i> AI Snelheid &amp; SEO Optimalisatie</span>
              <span class="val">Gegarandeerd</span>
            </div>
          </div>

          <div class="signature-box">
            <div style="position: absolute; top: 10px; left: 16px; font-size: 0.8rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">
              <i class="fas fa-signature"></i> Digitaal Akkoord Handtekening
            </div>
            <svg class="signature-svg" viewBox="0 0 320 80">
              <path id="sig-path" class="signature-path" d="M 20 50 Q 50 15, 80 45 T 140 35 Q 180 10, 220 50 T 290 30" />
            </svg>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="seal-badge" id="quote-seal" style="opacity: 0; transform: scale(0.9);">
              <i class="fas fa-certificate"></i> Digitaal Akkoord Bevestigd
            </div>
            <div style="font-size: 0.95rem; color: #94A3B8;">
              <i class="fas fa-lock" style="color: #10B981;"></i> 256-bit Encrypted
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================= -->
      <!-- SCENE 4: FASE 3 & 4 AI ONTWIKKELING (14.5s - 19.5s) -->
      <!-- ========================================= -->
      <div id="scene-4" class="scene">
        <div class="glass-card">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="font-family: 'Space Grotesk'; font-size: 2.2rem; font-weight: 800; color: #F8FAFC;">
              Fase 4: <span style="color: #22D3EE;">Lightning-Fast</span> Realisatie
            </h2>
            <p style="color: #94A3B8; font-size: 1.15rem; margin-top: 6px;">
              Geavanceerde AI-automatisering, pure Vanilla code en 100% Google PageSpeed.
            </p>
          </div>

          <div class="code-scene-grid">
            <div class="terminal-card">
              <div class="terminal-header">
                <span class="dot-red"></span>
                <span class="dot-yellow"></span>
                <span class="dot-green"></span>
                <span style="font-size: 0.8rem; color: #64748B; margin-left: 8px;">creation-alt-fix-engine v2.0</span>
              </div>
              <div class="terminal-body" id="terminal-stream">
                <div>&gt; Loading customer design profile... <span class="cmd-ok">[OK]</span></div>
                <div>&gt; Generating responsive CSS grid... <span class="cmd-ok">[OK]</span></div>
                <div>&gt; Compressing WebP assets (98% gain)... <span class="cmd-ok">[OK]</span></div>
                <div>&gt; Injecting Schema.org JSON-LD... <span class="cmd-ok">[OK]</span></div>
                <div>&gt; Enabling Code DRM &amp; Killswitch... <span class="cmd-cyan">[ACTIVE]</span></div>
                <div>&gt; Deploying to Vimexx NVMe cluster... <span class="cmd-ok">[100%]</span></div>
              </div>
            </div>

            <div class="gauge-card">
              <div class="score-circle">
                <svg viewBox="0 0 160 160">
                  <circle class="bg-ring" cx="80" cy="80" r="70" />
                  <circle id="gauge-fill" class="fill-ring" cx="80" cy="80" r="70" />
                </svg>
                <div class="score-number">
                  <span id="score-counter">0</span>
                  <span style="font-size: 0.8rem; color: #10B981; font-weight: 700;">PERFECT</span>
                </div>
              </div>
              <div style="font-family: 'Space Grotesk'; font-size: 1.25rem; font-weight: 700; color: #F8FAFC;">Google PageSpeed</div>
              <div style="font-size: 0.95rem; color: #34D399; margin-top: 4px;"><i class="fas fa-tachometer-alt"></i> Laadtijd: 0.18s</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================= -->
      <!-- SCENE 5: FASE 5 LIVE OPGELEVERD (19.5s - 24.5s) -->
      <!-- ========================================= -->
      <div id="scene-5" class="scene">
        <div class="browser-frame" id="browser-showcase">
          <div class="browser-bar">
            <div style="display: flex; gap: 8px;">
              <span class="dot-red"></span>
              <span class="dot-yellow"></span>
              <span class="dot-green"></span>
            </div>
            <div class="browser-address">
              <i class="fas fa-lock" style="color: #10B981;"></i>
              https://de-graaf-bakkerij.nl/
            </div>
            <div style="color: #64748B; font-size: 0.85rem;"><i class="fas fa-shield-alt" style="color: #22D3EE;"></i> SSL Actief</div>
          </div>

          <div class="browser-view">
            <img src="data:image/webp;base64,${besselingB64}" class="website-mock-img" alt="Opgeleverde Website">
            <div class="live-badge-floating">
              <i class="fas fa-check-circle"></i> Fase 5: Volledig Live &amp; Voldaan
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <div class="star-rating" style="justify-content: center;">
            <i class="fas fa-star"></i>
            <i class="fas fa-star"></i>
            <i class="fas fa-star"></i>
            <i class="fas fa-star"></i>
            <i class="fas fa-star"></i>
          </div>
          <div style="font-family: 'Space Grotesk'; font-size: 1.55rem; font-weight: 700; color: #F8FAFC; margin-top: 8px;">
            "Binnen enkele dagen live en direct nieuwe aanvragen!"
          </div>
        </div>
      </div>

      <!-- ========================================= -->
      <!-- SCENE 6: OUTRO & CALL TO ACTION (24.5s - 28.0s) -->
      <!-- ========================================= -->
      <div id="scene-6" class="scene">
        <div class="outro-logo-card">
          <img src="data:image/webp;base64,${logoB64}" class="outro-logo-big" alt="Creation+Alt+Fix">
          
          <h1 class="hero-title" style="font-size: 3.2rem; margin-bottom: 16px;">
            Jouw bedrijf verdient óók
            <span class="highlight">zo'n website.</span>
          </h1>

          <div class="pricing-pill-big">
            Website Laten Maken Vanaf € 199,- All-in
          </div>

          <button class="cta-social-btn">
            <i class="fab fa-instagram"></i> Stuur direct een DM ➔
          </button>

          <div class="contact-footer">
            <span><i class="fas fa-globe"></i> creationaltfix.nl</span>
            <span>•</span>
            <span><i class="fas fa-map-marker-alt"></i> Hoogezand / Groningen</span>
            <span>•</span>
            <span><i class="fas fa-phone-alt"></i> +31 6 19135453</span>
          </div>
        </div>
      </div>

    </div>
  </div>

  <script>
    // Particle Engine on Canvas
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.5 + 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.2,
        color: i % 3 === 0 ? '#22D3EE' : (i % 3 === 1 ? '#818CF8' : '#34D399')
      });
    }

    function drawParticles() {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(drawParticles);
    }
    requestAnimationFrame(drawParticles);

    // ===============================================
    // MASTER TIMELINE CONTROLLER (28 SECONDS)
    // ===============================================
    const scenes = [
      document.getElementById('scene-1'),
      document.getElementById('scene-2'),
      document.getElementById('scene-3'),
      document.getElementById('scene-4'),
      document.getElementById('scene-5'),
      document.getElementById('scene-6')
    ];

    const phasePillText = document.getElementById('phase-pill-text');

    function showScene(idx, phaseLabel) {
      scenes.forEach((s, i) => {
        if (i === idx) s.classList.add('active');
        else s.classList.remove('active');
      });
      if (phasePillText) phasePillText.textContent = phaseLabel;
    }

    // Interactive Element references
    const heroCursor = document.getElementById('hero-cursor');
    const heroRipple = document.getElementById('hero-click-ripple');
    const btnHeroStart = document.getElementById('btn-hero-start');

    const inputCompany = document.getElementById('input-typed-company');
    const cursorCompany = document.getElementById('cursor-company');
    const inputGoal = document.getElementById('input-typed-goal');
    const cursorGoal = document.getElementById('cursor-goal');
    const tag1 = document.getElementById('tag-1');
    const tag2 = document.getElementById('tag-2');
    const tag3 = document.getElementById('tag-3');

    const sigPath = document.getElementById('sig-path');
    const quoteSeal = document.getElementById('quote-seal');

    const gaugeFill = document.getElementById('gauge-fill');
    const scoreCounter = document.getElementById('score-counter');

    const browserShowcase = document.getElementById('browser-showcase');

    // Deterministic Frame / Time Update Function
    window.updateTimeline = function(elapsedMs) {
      const sec = elapsedMs / 1000;

      // 0.0s - 4.5s: SCENE 1 (THE HOOK)
      if (sec < 4.5) {
        showScene(0, "Introductie");
        // Animate cursor moving to button
        if (sec < 3.2) {
          const p = Math.min(sec / 3.0, 1);
          // EaseInOutCubic
          const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          const startX = 650;
          const startY = 700;
          const targetX = 520;
          const targetY = 560;
          heroCursor.style.left = (startX + (targetX - startX) * ease) + 'px';
          heroCursor.style.top = (startY + (targetY - startY) * ease) + 'px';
        } else if (sec >= 3.2 && sec < 4.0) {
          // Cursor click
          heroCursor.style.transform = 'scale(0.85)';
          btnHeroStart.style.transform = 'scale(0.96)';
          btnHeroStart.style.boxShadow = '0 0 35px #22D3EE';
          heroRipple.style.animation = 'rippleExpand 0.8s ease-out forwards';
        } else {
          heroCursor.style.transform = 'scale(1)';
          btnHeroStart.style.transform = 'scale(1)';
        }
      }

      // 4.5s - 9.5s: SCENE 2 (FASE 1 INTAKE)
      else if (sec >= 4.5 && sec < 9.5) {
        showScene(1, "Fase 1: Intake");
        const sSec = sec - 4.5;

        // Type company name
        const fullCompany = "Bakkerij & Patisserie De Graaf";
        if (sSec < 2.0) {
          const charCount = Math.floor((sSec / 2.0) * fullCompany.length);
          inputCompany.textContent = fullCompany.substring(0, charCount);
          cursorCompany.style.display = 'inline-block';
        } else {
          inputCompany.textContent = fullCompany;
          cursorCompany.style.display = 'none';
        }

        // Type goal
        const fullGoal = "Meer lokale klanten & online bestellingen";
        if (sSec >= 2.0 && sSec < 3.8) {
          cursorGoal.style.display = 'inline-block';
          const p = (sSec - 2.0) / 1.8;
          const charCount = Math.floor(p * fullGoal.length);
          inputGoal.textContent = fullGoal.substring(0, charCount);
        } else if (sSec >= 3.8) {
          inputGoal.textContent = fullGoal;
          cursorGoal.style.display = 'none';
        }

        // Tags bounce in
        if (sSec >= 2.5) {
          tag1.style.opacity = '1';
          tag1.style.transform = 'translateY(0)';
          tag1.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        }
        if (sSec >= 2.9) {
          tag2.style.opacity = '1';
          tag2.style.transform = 'translateY(0)';
          tag2.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        }
        if (sSec >= 3.3) {
          tag3.style.opacity = '1';
          tag3.style.transform = 'translateY(0)';
          tag3.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        }

        // Button submit pulse
        if (sSec >= 4.2) {
          const btn = document.getElementById('btn-submit-intake');
          btn.style.transform = 'scale(0.97)';
          btn.style.boxShadow = '0 0 40px #10B981';
        }
      }

      // 9.5s - 14.5s: SCENE 3 (FASE 2 OFFERTE & AKKOORD)
      else if (sec >= 9.5 && sec < 14.5) {
        showScene(2, "Fase 2: Digitaal Akkoord");
        const sSec = sec - 9.5;

        // Draw digital signature
        if (sSec < 2.8) {
          const p = Math.min(sSec / 2.5, 1);
          const offset = 800 * (1 - p);
          sigPath.style.strokeDashoffset = offset;
        } else {
          sigPath.style.strokeDashoffset = 0;
        }

        // Seal stamp pops in
        if (sSec >= 3.0) {
          quoteSeal.style.opacity = '1';
          quoteSeal.style.transform = 'scale(1)';
          quoteSeal.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }
      }

      // 14.5s - 19.5s: SCENE 4 (FASE 4 AI CODE & ONTWIKKELING)
      else if (sec >= 14.5 && sec < 19.5) {
        showScene(3, "Fase 4: In Ontwikkeling");
        const sSec = sec - 14.5;

        // Animate PageSpeed gauge 0 -> 100
        const p = Math.min(sSec / 3.0, 1);
        const ease = 1 - Math.pow(1 - p, 4);
        const currentScore = Math.floor(ease * 100);
        scoreCounter.textContent = currentScore;
        // 440 is full circumference
        const offset = 440 * (1 - ease);
        gaugeFill.style.strokeDashoffset = offset;
      }

      // 19.5s - 24.5s: SCENE 5 (FASE 5 OPGELEVERDE LIVE WEBSITE)
      else if (sec >= 19.5 && sec < 24.5) {
        showScene(4, "Fase 5: Volledig Live");
        const sSec = sec - 19.5;

        // Smooth 3D tilt recovery
        const p = Math.min(sSec / 1.5, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const rotX = 4 * (1 - ease);
        browserShowcase.style.transform = \`perspective(1000px) rotateX(\${rotX}deg) translateY(0)\`;
      }

      // 24.5s - 28.0s: SCENE 6 (OUTRO & CALL TO ACTION)
      else if (sec >= 24.5) {
        showScene(5, "Creation+Alt+Fix");
      }
    };

    // Auto-run loop for testing in standard browser
    let startTime = null;
    function loop(now) {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      window.updateTimeline(elapsed % 28000);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT_DIR, 'motion-template.html'), htmlContent, 'utf-8');
console.log('✅ Motion template HTML successfully generated at: ' + path.join(ROOT_DIR, 'motion-template.html'));

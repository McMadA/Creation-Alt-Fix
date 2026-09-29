import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { generateSoundtrackWav } from './audio-synth.js';

/**
 * Creation+Alt+Fix - Motion Design Video Production Engine
 * Renders the 28-second "Intake to Website" motion graphic,
 * pairs it with the custom electronic tech soundtrack & SFX,
 * and encodes to broadcast-grade MP4 (H.264/AAC) for Instagram Reels and LinkedIn.
 */

const ROOT_DIR = path.resolve('factory/video');
const DOWNLOADS_DIR = 'C:\\Users\\739530\\Downloads';
const HTML_FILE = path.join(ROOT_DIR, 'motion-template.html');
const WAV_FILE = path.join(ROOT_DIR, 'soundtrack.wav');

async function renderVideo({ width, height, outputFilename, label }) {
  console.log(`\n============================================================`);
  console.log(`🎬 Rendering ${label} (${width}x${height})...`);
  console.log(`============================================================`);

  const { chromium } = await import('playwright');
  const ffmpegModule = await import('ffmpeg-static');
  const ffmpegPath = ffmpegModule.default || ffmpegModule;

  const tempDir = path.join(ROOT_DIR, `temp_rec_${width}x${height}`);
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true
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
  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/');

  console.log(`🌐 Loading animation stage...`);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  console.log(`⏱️ Recording 28-second timeline in realtime at 60fps...`);
  const durationMs = 28500; // 28.5s to ensure clean fade out
  const startTime = Date.now();

  await page.waitForTimeout(durationMs);

  console.log(`🏁 Recording finished in ${((Date.now() - startTime) / 1000).toFixed(1)}s. Closing page...`);
  await context.close();
  await browser.close();

  // Find recorded WebM file
  const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    throw new Error(`Geen video-opname gevonden in ${tempDir}`);
  }
  const rawWebm = path.join(tempDir, files[0]);
  console.log(`📹 Raw WebM captured: ${rawWebm} (${(fs.statSync(rawWebm).size / 1024 / 1024).toFixed(2)} MB)`);

  // Target MP4 in Downloads folder
  const finalMp4 = path.join(DOWNLOADS_DIR, outputFilename);

  console.log(`🎛️ Encoding high-bitrate H.264 MP4 with synchronized soundtrack...`);
  // FFMPEG command: combine video and audio with faststart and yuv420p for Instagram & LinkedIn
  const ffmpegCmd = `"${ffmpegPath}" -y -i "${rawWebm}" -i "${WAV_FILE}" -map 0:v:0 -map 1:a:0 -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "${finalMp4}"`;

  execSync(ffmpegCmd, { stdio: 'inherit' });

  const stats = fs.statSync(finalMp4);
  console.log(`\n🎉 SUCCESS! Motion design video ready:`);
  console.log(`📁 Bestand: ${finalMp4}`);
  console.log(`📊 Grootte: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📐 Resolutie: ${width}x${height} (${width < height ? '9:16 Vertical Reel' : '16:9 Landscape'})`);

  // Cleanup temporary directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  return finalMp4;
}

async function main() {
  console.log("\n============================================================");
  console.log("🚀 CREATION+ALT+FIX - SOCIAL MEDIA VIDEO PRODUCTION SUITE");
  console.log("============================================================\n");

  // 1. Ensure Soundtrack WAV exists
  if (!fs.existsSync(WAV_FILE)) {
    console.log("🎵 Generating soundtrack...");
    generateSoundtrackWav(WAV_FILE);
  }

  // 2. Render Vertical 9:16 Reel (Instagram Reels, Stories & LinkedIn Mobile)
  const verticalMp4 = await renderVideo({
    width: 1080,
    height: 1920,
    outputFilename: 'CreationAltFix-Intake-tot-Website-Reel.mp4',
    label: 'Instagram Reel & Story (9:16 Vertical)'
  });

  // 3. Render Landscape 16:9 Video (LinkedIn Desktop & YouTube)
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

main().catch(err => {
  console.error("❌ Fout tijdens renderen:", err);
  process.exit(1);
});

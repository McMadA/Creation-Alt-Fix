import fs from 'fs';
import path from 'path';

/**
 * Creation+Alt+Fix - High-Definition Audio Synthesizer & Sound Designer
 * Generates an original, royalty-free, cinematic modern electronic tech soundtrack
 * perfectly synchronized with the 28-second "Intake to Website" motion design video.
 */

const SAMPLE_RATE = 44100;
const DURATION_SEC = 28;
const TOTAL_SAMPLES = SAMPLE_RATE * DURATION_SEC;

// Dual stereo buffers (left and right channels)
const left = new Float32Array(TOTAL_SAMPLES);
const right = new Float32Array(TOTAL_SAMPLES);

// Reverb delay line buffers for lush space
const REVERB_LENGTH = Math.floor(SAMPLE_RATE * 1.5);
const revLeft = new Float32Array(REVERB_LENGTH);
const revRight = new Float32Array(REVERB_LENGTH);
let revIndex = 0;

// Helper: Mix audio into stereo buffer
function mix(timeSec, durationSec, genFn, pan = 0, vol = 1.0, sendReverb = 0.25) {
  const startSample = Math.max(0, Math.floor(timeSec * SAMPLE_RATE));
  const numSamples = Math.floor(durationSec * SAMPLE_RATE);
  const endSample = Math.min(TOTAL_SAMPLES, startSample + numSamples);

  const leftGain = Math.cos((pan + 1) * 0.25 * Math.PI) * vol;
  const rightGain = Math.sin((pan + 1) * 0.25 * Math.PI) * vol;

  for (let i = startSample; i < endSample; i++) {
    const t = (i - startSample) / SAMPLE_RATE;
    const progress = (i - startSample) / numSamples;
    const sample = genFn(t, progress);

    const lVal = sample * leftGain;
    const rVal = sample * rightGain;

    left[i] += lVal;
    right[i] += rVal;

    // Send to simple feedback reverb
    if (sendReverb > 0) {
      const rIdx = (revIndex + (i - startSample)) % REVERB_LENGTH;
      revLeft[rIdx] += lVal * sendReverb;
      revRight[rIdx] += rVal * sendReverb;
    }
  }
}

// ----------------------------------------------------
// 1. INSTRUMENT SYNTHESIZERS
// ----------------------------------------------------

// Kick Drum: Deep punchy electronic 808/909 kick
function playKick(timeSec, vol = 0.85) {
  mix(timeSec, 0.45, (t) => {
    // Pitch drops rapidly from 160Hz to 48Hz
    const pitch = 48 + 112 * Math.exp(-t * 28);
    const env = Math.exp(-t * 11);
    const click = t < 0.008 ? (Math.random() * 2 - 1) * 0.3 * (1 - t / 0.008) : 0;
    return (Math.sin(2 * Math.PI * pitch * t) * env) + click;
  }, 0, vol, 0.05);
}

// Hi-Hat / Tick: Crisp electronic closed hat
function playHat(timeSec, vol = 0.22, pan = 0.2) {
  mix(timeSec, 0.06, (t) => {
    const env = Math.exp(-t * 55);
    // Bandpass-ish filtered white noise
    const noise = (Math.random() * 2 - 1);
    const metallic = Math.sin(2 * Math.PI * 7800 * t) * 0.3 + Math.sin(2 * Math.PI * 9600 * t) * 0.2;
    return (noise * 0.7 + metallic * 0.3) * env;
  }, pan, vol, 0.08);
}

// Snare / Clack: Crisp tech pop snare
function playSnare(timeSec, vol = 0.4, pan = -0.1) {
  mix(timeSec, 0.22, (t) => {
    const tone = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 22);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 16);
    return (tone * 0.4 + noise * 0.6);
  }, pan, vol, 0.35);
}

// Sub Bass Note: Warm analog-style synth bass
function playBass(timeSec, durationSec, freq, vol = 0.55) {
  mix(timeSec, durationSec, (t, p) => {
    const env = Math.min(t / 0.02, 1) * Math.exp(-t * 1.8);
    // Fundamental + 2nd harmonic + slight saturation
    const fundamental = Math.sin(2 * Math.PI * freq * t);
    const second = Math.sin(2 * Math.PI * freq * 2 * t) * 0.25;
    const wave = fundamental + second;
    return Math.tanh(wave * 1.3) * env;
  }, 0, vol, 0.05);
}

// Polyphonic Synth Pad Chord: Smooth lush future-pop chords
function playSynthChord(timeSec, durationSec, freqs, vol = 0.35) {
  freqs.forEach((freq, idx) => {
    const pan = ((idx / (freqs.length - 1)) - 0.5) * 0.7;
    mix(timeSec, durationSec, (t, p) => {
      // Gentle attack and release envelope
      const attack = Math.min(t / 0.15, 1);
      const release = Math.min((durationSec - t) / 0.25, 1);
      const env = Math.max(0, attack * release);
      // Detuned twin oscillators
      const osc1 = Math.sin(2 * Math.PI * freq * t);
      const osc2 = Math.sin(2 * Math.PI * (freq * 1.004) * t);
      const osc3 = Math.sin(2 * Math.PI * (freq * 0.996) * t);
      return (osc1 * 0.4 + osc2 * 0.3 + osc3 * 0.3) * env;
    }, pan, vol, 0.45);
  });
}

// ----------------------------------------------------
// 2. SYNCHRONIZED SOUND EFFECTS (SFX)
// ----------------------------------------------------

// SFX: Futuristic Riser / Whoosh
function playWhoosh(timeSec, durationSec = 1.0, isReverse = false, vol = 0.4) {
  mix(timeSec, durationSec, (t, p) => {
    const prog = isReverse ? p : (1 - p);
    const freq = 120 + 2400 * Math.pow(p, 2);
    const noise = (Math.random() * 2 - 1) * Math.sin(p * Math.PI);
    const tone = Math.sin(2 * Math.PI * freq * t) * 0.3 * Math.sin(p * Math.PI);
    return (noise * 0.7 + tone * 0.3);
  }, isReverse ? -0.3 : 0.3, vol, 0.5);
}

// SFX: UI Digital Click / Pop
function playUIClick(timeSec, vol = 0.35, pitch = 2200) {
  mix(timeSec, 0.04, (t) => {
    const env = Math.exp(-t * 90);
    return Math.sin(2 * Math.PI * pitch * t) * env;
  }, 0.1, vol, 0.2);
}

// SFX: Fast Typewriter / Keyboard Key Taps
function playTypingBurst(timeSec, count = 5, spacing = 0.11) {
  for (let i = 0; i < count; i++) {
    const clickTime = timeSec + (i * spacing);
    const pitch = 1800 + Math.random() * 800;
    playUIClick(clickTime, 0.18 + Math.random() * 0.08, pitch);
  }
}

// SFX: Holographic Confirmation Chime (Fase Akkoord!)
function playSuccessChime(timeSec, vol = 0.45) {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const noteTime = timeSec + (idx * 0.07);
    mix(noteTime, 0.9, (t) => {
      const env = Math.exp(-t * 4.2);
      const tone = Math.sin(2 * Math.PI * freq * t) + Math.sin(2 * Math.PI * freq * 2 * t) * 0.2;
      return tone * env;
    }, (idx - 1.5) * 0.3, vol, 0.6);
  });
}

// SFX: Digital AI Compiler Stream (Ticking & Arpeggio)
function playCodeStream(timeSec, durationSec = 3.5) {
  const step = 0.09;
  const numSteps = Math.floor(durationSec / step);
  const scale = [440, 523, 587, 659, 784, 880, 1046, 1174];
  for (let i = 0; i < numSteps; i++) {
    const t = timeSec + (i * step);
    const freq = scale[i % scale.length];
    mix(t, 0.05, (elapsed) => {
      const env = Math.exp(-elapsed * 60);
      return Math.sin(2 * Math.PI * freq * elapsed) * env;
    }, ((i % 4) - 1.5) * 0.4, 0.12, 0.3);
  }
}

// SFX: Cinematic Drop Impact (Scene 5: Website Livegang!)
function playCinematicImpact(timeSec, vol = 0.8) {
  mix(timeSec, 1.8, (t) => {
    // Massive sub drop from 110Hz to 32Hz
    const pitch = 32 + 78 * Math.exp(-t * 6);
    const env = Math.exp(-t * 2.2);
    const boom = Math.sin(2 * Math.PI * pitch * t) * env;
    // Splash noise burst
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 12) * 0.35;
    return boom + noise;
  }, 0, vol, 0.7);
}

// SFX: Shimmering Confetti / Star Sparkle
function playSparkle(timeSec, vol = 0.3) {
  const freqs = [1568, 1760, 2093, 2349, 2793, 3136];
  for (let i = 0; i < 14; i++) {
    const t = timeSec + (i * 0.065);
    const freq = freqs[Math.floor(Math.random() * freqs.length)];
    mix(t, 0.25, (elapsed) => {
      const env = Math.exp(-elapsed * 12);
      return Math.sin(2 * Math.PI * freq * elapsed) * env;
    }, (Math.random() * 2 - 1) * 0.8, vol * 0.6, 0.7);
  }
}

// SFX: Grand Finale Harmonic Chord (Creation+Alt+Fix Outro)
function playFinaleChord(timeSec, vol = 0.5) {
  // Rich C Maj9 chord: C4 (261.63), G4 (392.00), B4 (493.88), D5 (587.33), E5 (659.25)
  const chord = [261.63, 392.00, 493.88, 587.33, 659.25];
  chord.forEach((freq, idx) => {
    mix(timeSec, 3.5, (t) => {
      const env = Math.min(t / 0.08, 1) * Math.exp(-t * 0.95);
      const o1 = Math.sin(2 * Math.PI * freq * t);
      const o2 = Math.sin(2 * Math.PI * (freq * 1.002) * t) * 0.4;
      return (o1 + o2) * env;
    }, (idx - 2) * 0.3, vol, 0.75);
  });
}

// ----------------------------------------------------
// 3. COMPOSE COMPLETE 28-SECOND SOUNDTRACK
// ----------------------------------------------------
console.log("🎵 Synthesizing Creation+Alt+Fix 28-second motion design soundtrack...");

// --- SCENE 1: THE HOOK (0.0s - 4.5s) ---
// Ambient intro with pulsing bass and riser
playWhoosh(0.1, 1.4, false, 0.45);
playBass(0.5, 3.8, 65.41, 0.45); // C2
playSynthChord(0.5, 3.5, [130.81, 196.00, 246.94, 293.66], 0.3); // C Maj9 pad

// Mouse click on "Start Intake"
playWhoosh(3.2, 0.9, true, 0.35); // Pre-riser
playUIClick(4.0, 0.55, 1950);     // Confirmed click!
playSuccessChime(4.1, 0.3);

// --- SCENE 2: FASE 1 INTAKE (4.5s - 9.5s) ---
// Beat kicks in! 120 BPM = 0.5s per beat
const beatStart = 4.5;
for (let b = 0; b < 10; b++) {
  const t = beatStart + (b * 0.5);
  if (b % 2 === 0) playKick(t, 0.75);
  else playSnare(t, 0.35);
  playHat(t + 0.25, 0.18, 0.25);
  playHat(t, 0.12, -0.2);
}

// Bassline for Scene 2 (Ab -> Bb)
playBass(4.5, 2.3, 51.91, 0.5); // Ab1
playBass(7.0, 2.3, 58.27, 0.5); // Bb1
playSynthChord(4.5, 2.3, [207.65, 261.63, 311.13], 0.25); // Ab
playSynthChord(7.0, 2.3, [233.08, 293.66, 349.23], 0.25); // Bb

// Form typing sounds
playTypingBurst(5.0, 6, 0.12);
playTypingBurst(6.2, 5, 0.11);
playTypingBurst(7.4, 7, 0.10);

// Submit intake click + confirmation
playUIClick(8.8, 0.5, 2100);
playSuccessChime(9.0, 0.5); // "Fase 1: Intake Voltooid"

// --- SCENE 3: FASE 2 OFFERTE & DIGITAAL AKKOORD (9.5s - 14.5s) ---
// High-energy groove continues
playWhoosh(9.4, 0.8, false, 0.35);
const beat2 = 9.5;
for (let b = 0; b < 10; b++) {
  const t = beat2 + (b * 0.5);
  if (b % 2 === 0) playKick(t, 0.8);
  else playSnare(t, 0.38);
  playHat(t + 0.25, 0.2, 0.3);
  playHat(t, 0.14, -0.25);
}

// Bassline for Scene 3 (C -> G)
playBass(9.5, 2.3, 65.41, 0.55); // C2
playBass(12.0, 2.3, 49.00, 0.55); // G1
playSynthChord(9.5, 2.3, [130.81, 196.00, 261.63], 0.3);
playSynthChord(12.0, 2.3, [146.83, 196.00, 293.66], 0.3);

// Digital signature drawing SFX (rapid smooth clicks)
playTypingBurst(11.2, 8, 0.08);
playUIClick(12.8, 0.55, 2400); // 1-Klik Akkoord!
playSuccessChime(13.0, 0.55);   // "Fase 2: Digitaal Akkoord!"

// --- SCENE 4: FASE 3 & 4 AI CODE & ONTWIKKELING (14.5s - 19.5s) ---
// Fast-paced techno transition: double-time hats, compiler streams
playWhoosh(14.3, 0.9, true, 0.4);
const beat3 = 14.5;
for (let b = 0; b < 10; b++) {
  const t = beat3 + (b * 0.5);
  playKick(t, 0.85); // Four on the floor!
  if (b % 2 === 1) playSnare(t, 0.42);
  playHat(t + 0.125, 0.22, -0.3);
  playHat(t + 0.25, 0.25, 0.3);
  playHat(t + 0.375, 0.22, -0.3);
}

// Rapid bassline & code compiler stream
playBass(14.5, 1.2, 65.41, 0.6); // C
playBass(15.7, 1.2, 73.42, 0.6); // D
playBass(17.0, 1.2, 77.78, 0.6); // Eb
playBass(18.2, 1.2, 87.31, 0.6); // F
playCodeStream(14.8, 3.8);        // AI Compiling arpeggios
playWhoosh(18.5, 1.0, true, 0.5); // Big build-up riser!

// --- SCENE 5: FASE 5 OPGELEVERDE LIVE WEBSITE! (19.5s - 24.5s) ---
// Massive celebratory drop: Impact boom, sparkling stars, triumphant melody
playCinematicImpact(19.5, 0.9);
playSparkle(19.7, 0.45);
playSuccessChime(19.9, 0.65);

// Celebratory beat groove
const beat4 = 20.0;
for (let b = 0; b < 8; b++) {
  const t = beat4 + (b * 0.5);
  if (b % 2 === 0) playKick(t, 0.8);
  else playSnare(t, 0.4);
  playHat(t + 0.25, 0.2, 0.2);
}

playBass(20.0, 2.0, 65.41, 0.5);
playBass(22.0, 2.0, 58.27, 0.5);
playSynthChord(20.0, 2.0, [261.63, 329.63, 392.00, 523.25], 0.35); // C Major
playSynthChord(22.0, 2.0, [233.08, 293.66, 349.23, 466.16], 0.35); // Bb Major
playSparkle(22.5, 0.4);

// --- SCENE 6: OUTRO & CALL TO ACTION (24.5s - 28.0s) ---
// Reverb tail, warm harmonic finale chord
playWhoosh(24.3, 1.0, false, 0.35);
playFinaleChord(24.8, 0.6);
playUIClick(26.2, 0.4, 2600); // CTA pulse ding
playSparkle(26.5, 0.35);

// ----------------------------------------------------
// 4. APPLY REVERB & MASTERING LIMITER
// ----------------------------------------------------
console.log("🎛️ Applying mastering reverb and soft-clipping limiter...");

// Mix feedback reverb into main channels
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const rIdx = i % REVERB_LENGTH;
  left[i] += revLeft[rIdx] * 0.4;
  right[i] += revRight[rIdx] * 0.4;
}

// Master Limiter / Soft-Clipper to prevent any digital distortion
let peak = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}

const masterGain = peak > 0.95 ? (0.92 / peak) : 0.95;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  left[i] = Math.tanh(left[i] * masterGain);
  right[i] = Math.tanh(right[i] * masterGain);
}

// ----------------------------------------------------
// 5. ENCODE TO 16-BIT STEREO PCM WAV FILE
// ----------------------------------------------------
export function generateSoundtrackWav(outputPath) {
  const bytesPerSample = 2; // 16-bit
  const blockAlign = 2 * bytesPerSample; // 2 channels
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = TOTAL_SAMPLES * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Chunk
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt Subchunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);          // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);           // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(2, 22);           // NumChannels (2 = Stereo)
  buffer.writeUInt32LE(SAMPLE_RATE, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28);    // ByteRate
  buffer.writeUInt16LE(blockAlign, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34);          // BitsPerSample

  // data Subchunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    // Left sample
    let lVal = Math.floor(left[i] * 32767);
    lVal = Math.max(-32768, Math.min(32767, lVal));
    buffer.writeInt16LE(lVal, offset);
    offset += 2;

    // Right sample
    let rVal = Math.floor(right[i] * 32767);
    rVal = Math.max(-32768, Math.min(32767, rVal));
    buffer.writeInt16LE(rVal, offset);
    offset += 2;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Soundtrack successfully written to: ${outputPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  return outputPath;
}

// Standalone CLI execution
if (process.argv[1] && process.argv[1].endsWith('audio-synth.js')) {
  const out = path.resolve('factory/video/soundtrack.wav');
  generateSoundtrackWav(out);
}

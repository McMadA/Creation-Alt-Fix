import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { Client } from 'basic-ftp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

// Regex to match the emergency shield block and any surrounding whitespace
const SHIELD_REGEX = /#\s*={10,}\s*\r?\n#\s*🛡️?\s*PHP2SHELL EMERGENCY SHIELD[\s\S]*?<\/IfModule>\s*/gi;

async function revertDomainHtaccess(client, remotePath, label, wasOriginallyMissing = false) {
  const tempFile = path.join(os.tmpdir(), `revert_htaccess_${Date.now()}_${Math.random().toString(36).substring(7)}.tmp`);
  try {
    let existingContent = '';
    try {
      await client.downloadTo(tempFile, remotePath);
      existingContent = fs.readFileSync(tempFile, 'utf8');
    } catch (e) {
      console.log(`ℹ️ [Niet gevonden] ${label} (${remotePath})`);
      return;
    }

    if (!existingContent.match(SHIELD_REGEX)) {
      console.log(`⏩ [Geen schild aanwezig] ${label} (${remotePath})`);
      return;
    }

    let cleanedContent = existingContent.replace(SHIELD_REGEX, '').trim();

    if (cleanedContent.length === 0) {
      if (wasOriginallyMissing) {
        await client.remove(remotePath);
        console.log(`🗑️  [VERWIJDERD]   ${label} -> ${remotePath} (was leeg/nieuw aangemaakt)`);
      } else {
        // Upload empty file or remove
        await client.remove(remotePath);
        console.log(`🗑️  [VERWIJDERD]   ${label} -> ${remotePath} (bestand leeg na rollback)`);
      }
    } else {
      fs.writeFileSync(tempFile, cleanedContent + '\n', 'utf8');
      await client.uploadFrom(tempFile, remotePath);
      console.log(`🔄 [HERSTELD]     ${label} -> ${remotePath}`);
    }
  } catch (err) {
    console.error(`❌ [FOUT]         ${label}: ${err.message}`);
  } finally {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }
}

async function run() {
  const client = new Client();
  client.ftp.verbose = false;

  try {
    console.log('📡 Verbinding maken met Vimexx FTPS (web0156.zxcs.nl)...');
    await client.access({
      host: env.FTP_SERVER || 'web0156.zxcs.nl',
      port: parseInt(env.FTP_PORT || '21', 10),
      user: env.FTP_USERNAME,
      password: env.FTP_PASSWORD,
      secure: true,
      secureOptions: { rejectUnauthorized: false }
    });
    console.log('✅ Verbonden! Terugdraaien van PHP2Shell noodschild naar originele status...\n');

    const targets = [
      { path: 'domains/creationaltfix.nl/public_html/.htaccess', label: 'Creation+Alt+Fix (Hoofdsite)', wasOriginallyMissing: false },
      { path: 'domains/creationaltfix.nl/public_html/portal/.htaccess', label: 'Creation+Alt+Fix (CRM Portaal)', wasOriginallyMissing: false },
      { path: 'domains/ftruckstore.nl/public_html/.htaccess', label: 'F-Truck Store (.nl - WooCommerce)', wasOriginallyMissing: false },
      { path: 'domains/ftruckstore.com/public_html/.htaccess', label: 'F-Truck Store (.com)', wasOriginallyMissing: false },
      { path: 'domains/besselinginstallatietechniek.nl/public_html/.htaccess', label: 'Besseling Installatietechniek', wasOriginallyMissing: true },
      { path: 'domains/bakkertjesieg.nl/public_html/.htaccess', label: 'Bakkertje Sieg', wasOriginallyMissing: false },
      { path: 'domains/angelastenekes.nl/public_html/.htaccess', label: 'Angela Stenekes', wasOriginallyMissing: false },
      { path: 'domains/scholte-elektrotechniek.nl/public_html/.htaccess', label: 'Scholte Elektrotechniek', wasOriginallyMissing: false },
      { path: 'domains/arnolddesign.nl/public_html/.htaccess', label: 'Arnold Design', wasOriginallyMissing: false },
      { path: 'domains/naaiatelier-willa.nl/public_html/.htaccess', label: 'Naaiatelier Willa', wasOriginallyMissing: false },
      { path: 'domains/stenekesrioolspecialist.nl/public_html/.htaccess', label: 'Stenekes Rioolspecialist', wasOriginallyMissing: true },
      { path: 'domains/pomppop.nl/public_html/.htaccess', label: 'Stichting PompPop', wasOriginallyMissing: true },
      { path: 'domains/qolipa.nl/public_html/.htaccess', label: 'Qolipa (.nl)', wasOriginallyMissing: true },
      { path: 'domains/qolipa.com/public_html/.htaccess', label: 'Qolipa (.com)', wasOriginallyMissing: true },
      { path: 'domains/capybaraculture.com/public_html/.htaccess', label: 'Capybara Culture', wasOriginallyMissing: true }
    ];

    for (const target of targets) {
      await revertDomainHtaccess(client, target.path, target.label, target.wasOriginallyMissing);
    }

    console.log('\n🎉 Alle Vimexx web-omgevingen zijn succesvol hersteld naar hun originele staat!');
  } catch (err) {
    console.error('Fatale fout tijdens herstel:', err);
  } finally {
    client.close();
  }
}

run();

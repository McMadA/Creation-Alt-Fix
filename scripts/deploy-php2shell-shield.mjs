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

const SHIELD_BANNER = '# PHP2SHELL EMERGENCY SHIELD (CVE-2026-109618 & CVE-2026-109619)';
const SHIELD_BLOCK = `
# ==============================================================================
# 🛡️ PHP2SHELL EMERGENCY SHIELD (CVE-2026-109618 & CVE-2026-109619)
# Blokkeert unauthenticated multipart POST exploits aan de Apache poort (HTTP 403)
# Voorkomt dat PHP core de kwetsbare multipart upload-progress parser activeert.
# Normale GET, JSON, x-www-form-urlencoded requests blijven 100% operationeel.
# ==============================================================================
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTP:Content-Type} multipart/ [NC,OR]
    RewriteCond %{CONTENT_TYPE} multipart/ [NC]
    RewriteRule ^ - [F,L]
</IfModule>
`;

async function protectDomainHtaccess(client, remotePath, label) {
  const tempFile = path.join(os.tmpdir(), `htaccess_${Date.now()}_${Math.random().toString(36).substring(7)}.tmp`);
  try {
    let existingContent = '';
    try {
      await client.downloadTo(tempFile, remotePath);
      existingContent = fs.readFileSync(tempFile, 'utf8');
    } catch (e) {
      existingContent = ''; // File might not exist
    }

    if (existingContent.includes(SHIELD_BANNER)) {
      console.log(`⏩ [Al Beveiligd] ${label} (${remotePath})`);
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return;
    }

    let newContent = '';
    if (existingContent.trim().length === 0) {
      newContent = SHIELD_BLOCK.trim() + '\n';
    } else {
      newContent = SHIELD_BLOCK.trim() + '\n\n' + existingContent.trim() + '\n';
    }

    fs.writeFileSync(tempFile, newContent, 'utf8');
    await client.uploadFrom(tempFile, remotePath);
    console.log(`🛡️  [BEVEILIGD]  ${label} -> ${remotePath}`);
  } catch (err) {
    console.error(`❌ [FOUT]      ${label}: ${err.message}`);
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
    console.log('✅ Verbonden! Uitrollen van PHP2Shell nood-mitigatie over alle domeinen...\n');

    const targets = [
      { path: 'domains/creationaltfix.nl/public_html/.htaccess', label: 'Creation+Alt+Fix (Hoofdsite)' },
      { path: 'domains/creationaltfix.nl/public_html/portal/.htaccess', label: 'Creation+Alt+Fix (CRM Portaal)' },
      { path: 'domains/ftruckstore.nl/public_html/.htaccess', label: 'F-Truck Store (.nl - WooCommerce)' },
      { path: 'domains/ftruckstore.com/public_html/.htaccess', label: 'F-Truck Store (.com)' },
      { path: 'domains/besselinginstallatietechniek.nl/public_html/.htaccess', label: 'Besseling Installatietechniek' },
      { path: 'domains/bakkertjesieg.nl/public_html/.htaccess', label: 'Bakkertje Sieg' },
      { path: 'domains/angelastenekes.nl/public_html/.htaccess', label: 'Angela Stenekes' },
      { path: 'domains/scholte-elektrotechniek.nl/public_html/.htaccess', label: 'Scholte Elektrotechniek' },
      { path: 'domains/arnolddesign.nl/public_html/.htaccess', label: 'Arnold Design' },
      { path: 'domains/naaiatelier-willa.nl/public_html/.htaccess', label: 'Naaiatelier Willa' },
      { path: 'domains/stenekesrioolspecialist.nl/public_html/.htaccess', label: 'Stenekes Rioolspecialist' },
      { path: 'domains/pomppop.nl/public_html/.htaccess', label: 'Stichting PompPop' },
      { path: 'domains/qolipa.nl/public_html/.htaccess', label: 'Qolipa (.nl)' },
      { path: 'domains/qolipa.com/public_html/.htaccess', label: 'Qolipa (.com)' },
      { path: 'domains/capybaraculture.com/public_html/.htaccess', label: 'Capybara Culture' }
    ];

    for (const target of targets) {
      await protectDomainHtaccess(client, target.path, target.label);
    }

    console.log('\n🎉 Alle Vimexx web-omgevingen zijn succesvol uitgerust met het PHP2Shell noodschild!');
  } catch (err) {
    console.error('Fatale fout tijdens uitrol:', err);
  } finally {
    client.close();
  }
}

run();

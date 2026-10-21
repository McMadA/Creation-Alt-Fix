import fs from 'fs';
import { Client } from 'basic-ftp';
import path from 'path';
import { fileURLToPath } from 'url';

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

const client = new Client();
client.ftp.verbose = false;

async function audit() {
  try {
    await client.access({
      host: env.FTP_SERVER || 'web0156.zxcs.nl',
      port: parseInt(env.FTP_PORT || '21', 10),
      user: env.FTP_USERNAME,
      password: env.FTP_PASSWORD,
      secure: true,
      secureOptions: { rejectUnauthorized: false }
    });

    console.log('✅ Connected to Vimexx FTPS server (web0156.zxcs.nl)');
    const domains = [
      'creationaltfix.nl',
      'ftruckstore.nl',
      'ftruckstore.com',
      'besselinginstallatietechniek.nl',
      'bakkertjesieg.nl',
      'arnolddesign.nl',
      'qolipa.nl',
      'qolipa.com',
      'capybaraculture.com',
      'naaiatelier-willa.nl',
      'pomppop.nl',
      'angelastenekes.nl',
      'scholte-elektrotechniek.nl',
      'stenekesrioolspecialist.nl'
    ];

    console.log('\n--- LIVE DOMAIN STATUS ---');
    for (const d of domains) {
      try {
        const files = await client.list(`domains/${d}/public_html`);
        const hasHtaccess = files.some(f => f.name === '.htaccess');
        const phpFiles = files.filter(f => f.name.endsWith('.php')).map(f => f.name);
        console.log(`${d.padEnd(32)} | .htaccess: ${hasHtaccess ? '✅ YES' : '❌ NO '} | PHP in root: [${phpFiles.join(', ')}]`);
      } catch (e) {
        console.log(`${d.padEnd(32)} | ⚠️ Error: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('Fatal FTP error:', err);
  } finally {
    client.close();
  }
}

audit();

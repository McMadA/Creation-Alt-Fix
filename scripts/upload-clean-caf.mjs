import fs from 'fs';
import path from 'path';
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

async function uploadClean() {
  const client = new Client();
  try {
    await client.access({
      host: env.FTP_SERVER || 'web0156.zxcs.nl',
      port: parseInt(env.FTP_PORT || '21', 10),
      user: env.FTP_USERNAME,
      password: env.FTP_PASSWORD,
      secure: true,
      secureOptions: { rejectUnauthorized: false }
    });
    await client.uploadFrom('website/.htaccess', 'domains/creationaltfix.nl/public_html/.htaccess');
    console.log('✅ Cleaned domains/creationaltfix.nl/public_html/.htaccess uploaded!');
    await client.uploadFrom('crm/.htaccess', 'domains/creationaltfix.nl/public_html/portal/.htaccess');
    console.log('✅ Cleaned domains/creationaltfix.nl/public_html/portal/.htaccess uploaded!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.close();
  }
}

uploadClean();

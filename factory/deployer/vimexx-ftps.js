import fs from 'fs';
import path from 'path';
import { FACTORY_CONFIG } from '../config/factory-config.js';

/**
 * Valideert en saneert concept HTML payload tegen geheugenuitputting en null bytes
 */
export function validateConceptHtml(content) {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Ongeldige of lege HTML inhoud voor deployment');
  }
  if (Buffer.byteLength(content, 'utf-8') > 5 * 1024 * 1024) {
    throw new Error('Concept HTML overschrijdt de maximale toegestane bestandsgrootte van 5MB');
  }
  return content.replace(/\0/g, '');
}

/**
 * Creation+Alt+Fix - Vimexx FTPS Deployment Client
 * Uploadt gegenereerde concept-websites rechtstreeks naar de Vimexx DirectAdmin server
 */
export async function deployConceptToVimexx(slug, localHtmlContent) {
  // CWE-22: Strikte slug sanitization ter voorkoming van path traversal / willekeurige directory write
  const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  const cleanSlug = String(slug || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, 64)
    .replace(/[-_]+$/, '');

  if (!cleanSlug || WINDOWS_RESERVED.test(cleanSlug)) {
    throw new Error('Ongeldige of ontbrekende slug voor deployment (alleen a-z, 0-9, _ en - toegestaan, geen Windows device namen)');
  }

  // CWE-400 / CWE-20: Valideer en saneer HTML content
  const sanitizedHtml = validateConceptHtml(localHtmlContent);

  console.log(`🚀 [FTPS Deployer] Start deployment voor concept: "${cleanSlug}"...`);

  // 1. Zorg dat het concept ook lokaal netjes bewaard blijft binnen de toegestane map
  const resolvedConceptBase = path.resolve(FACTORY_CONFIG.localConceptDir);
  const localSlugDir = path.resolve(resolvedConceptBase, cleanSlug);

  if (!localSlugDir.startsWith(resolvedConceptBase)) {
    throw new Error('Path traversal poging gedetecteerd in slug directory pad');
  }

  fs.mkdirSync(localSlugDir, { recursive: true });
  const localFilePath = path.join(localSlugDir, 'index.html');
  fs.writeFileSync(localFilePath, sanitizedHtml, 'utf-8');
  console.log(`📁 [FTPS Deployer] Lokaal opgeslagen in: ${localFilePath}`);

  const liveUrl = `${FACTORY_CONFIG.conceptBaseUrl}/${cleanSlug}/`;

  // 2. Controleer of FTP credentials beschikbaar zijn
  const { host, port, user, password, remoteRoot } = FACTORY_CONFIG.ftp;
  if (!user || !password) {
    console.log(`ℹ️ [FTPS Deployer] Geen directe FTP credentials gevonden in .env. Concept is lokaal gereed in /website/concept/${cleanSlug}/.`);
    console.log(`   (Tip: vul FTP_USERNAME en FTP_PASSWORD in om direct live naar Vimexx te syncen, of push via Git)`);
    return {
      success: true,
      mode: 'local_staged',
      liveUrl,
      localFilePath
    };
  }

  // 3. Voer directe FTPS synchronisatie uit
  const ftp = await import('basic-ftp');
  const client = new ftp.Client();
  client.ftp.verbose = false;
  // CWE-400: Dwing 20-seconden socket timeout af tegen hanging connections bij netwerkonderbreking
  client.timeout = 20000;

  try {
    console.log(`🔌 [FTPS Deployer] Verbinden met Vimexx server (${host}:${port}) als '${user}'...`);
    await client.access({
      host: host,
      port: port,
      user: user,
      password: password,
      secure: true,
      secureOptions: { 
        rejectUnauthorized: process.env.FTP_REJECT_UNAUTHORIZED !== 'false' 
      }
    });

    const targetRemoteDir = `${remoteRoot}/${cleanSlug}`;
    console.log(`📂 [FTPS Deployer] Aanmaken remote map: ${targetRemoteDir}...`);
    await client.ensureDir(targetRemoteDir);

    console.log(`⬆️ [FTPS Deployer] Uploaden index.html...`);
    await client.uploadFrom(localFilePath, 'index.html');

    console.log(`🎉 [FTPS Deployer] Succesvol geüpload! Concept is direct live op: ${liveUrl}`);
    return {
      success: true,
      mode: 'ftp_deployed',
      liveUrl,
      localFilePath
    };
  } catch (error) {
    console.warn(`⚠️ [FTPS Deployer] Fout tijdens FTPS upload naar Vimexx: ${error.message}`);
    return {
      success: false,
      mode: 'local_only',
      error: error.message,
      liveUrl,
      localFilePath
    };
  } finally {
    client.close();
  }
}

/**
 * Uploadt de actuele leads.json naar het online CRM Admin Dashboard op Vimexx
 */
export async function syncLeadsDatabaseToVimexx() {
  const localLeadsPath = path.resolve(FACTORY_CONFIG.localConceptDir, '..', '..', 'crm', 'admin', 'data', 'leads.json');
  if (!fs.existsSync(localLeadsPath)) return false;

  const { host, port, user, password } = FACTORY_CONFIG.ftp;
  if (!user || !password) return false;

  const ftp = await import('basic-ftp');
  const client = new ftp.Client();
  client.ftp.verbose = false;
  // CWE-400: Dwing 20-seconden socket timeout af tegen hanging connections bij netwerkonderbreking
  client.timeout = 20000;

  try {
    await client.access({
      host,
      port,
      user,
      password,
      secure: true,
      secureOptions: { rejectUnauthorized: process.env.FTP_REJECT_UNAUTHORIZED !== 'false' }
    });

    const remotePortalDataDir = "domains/creationaltfix.nl/public_html/portal/admin/data";
    await client.ensureDir(remotePortalDataDir);
    await client.uploadFrom(localLeadsPath, 'leads.json');
    console.log(`🌐 [FTPS Deployer] Live CRM leads.json gesynchroniseerd naar Vimexx portal!`);
    return true;
  } catch (err) {
    console.warn(`⚠️ [FTPS Deployer] Kon leads.json niet naar Vimexx syncen: ${err.message}`);
    return false;
  } finally {
    client.close();
  }
}

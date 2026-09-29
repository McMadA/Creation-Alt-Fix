import * as ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import { FACTORY_CONFIG } from '../config/factory-config.js';

/**
 * Creation+Alt+Fix - Vimexx FTPS Deployment Client
 * Uploadt gegenereerde concept-websites rechtstreeks naar de Vimexx DirectAdmin server
 */
export async function deployConceptToVimexx(slug, localHtmlContent) {
  console.log(`🚀 [FTPS Deployer] Start deployment voor concept: "${slug}"...`);

  // 1. Zorg dat het concept ook lokaal netjes bewaard blijft
  const localSlugDir = path.join(FACTORY_CONFIG.localConceptDir, slug);
  fs.mkdirSync(localSlugDir, { recursive: true });
  const localFilePath = path.join(localSlugDir, 'index.html');
  fs.writeFileSync(localFilePath, localHtmlContent, 'utf-8');
  console.log(`📁 [FTPS Deployer] Lokaal opgeslagen in: ${localFilePath}`);

  const liveUrl = `${FACTORY_CONFIG.conceptBaseUrl}/${slug}/`;

  // 2. Controleer of FTP credentials beschikbaar zijn
  const { host, port, user, password, remoteRoot } = FACTORY_CONFIG.ftp;
  if (!user || !password) {
    console.log(`ℹ️ [FTPS Deployer] Geen directe FTP credentials gevonden in .env. Concept is lokaal gereed in /website/concept/${slug}/.`);
    console.log(`   (Tip: vul FTP_USERNAME en FTP_PASSWORD in om direct live naar Vimexx te syncen, of push via Git)`);
    return {
      success: true,
      mode: 'local_staged',
      liveUrl,
      localFilePath
    };
  }

  // 3. Voer directe FTPS synchronisatie uit
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    console.log(`🔌 [FTPS Deployer] Verbinden met Vimexx server (${host}:${port}) als '${user}'...`);
    await client.access({
      host: host,
      port: port,
      user: user,
      password: password,
      secure: true,
      secureOptions: { rejectUnauthorized: false }
    });

    const targetRemoteDir = `${remoteRoot}/${slug}`;
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

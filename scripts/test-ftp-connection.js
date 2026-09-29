/**
 * Snelle FTPS verbindingstest voor Vimexx DirectAdmin
 * Gebruik: node scripts/test-ftp-connection.js
 */
import { FACTORY_CONFIG } from '../factory/config/factory-config.js';
import { Client } from 'basic-ftp';

const { host, port, user, password, remoteRoot } = FACTORY_CONFIG.ftp;

console.log('\n🔌 FTPS Verbindingstest — Creation+Alt+Fix');
console.log('═══════════════════════════════════════════');
console.log(`   Host    : ${host}:${port}`);
console.log(`   Gebruiker: ${user}`);
console.log(`   Remote  : /${remoteRoot}`);
console.log('═══════════════════════════════════════════\n');

if (!user || !password) {
  console.error('❌ Geen FTP credentials gevonden in .env! Vul FTP_USERNAME en FTP_PASSWORD in.');
  process.exit(1);
}

const client = new Client();
client.ftp.verbose = true;

try {
  console.log('⏳ Verbinden met Vimexx server...');
  await client.access({
    host,
    port,
    user,
    password,
    secure: true,
    secureOptions: {
      rejectUnauthorized: process.env.FTP_REJECT_UNAUTHORIZED !== 'false'
    }
  });

  console.log('\n✅ Verbinding geslaagd!\n');

  console.log('📂 Remote mappen in /domains/creationaltfix.nl/public_html/:');
  const list = await client.list('/domains/creationaltfix.nl/public_html/');
  for (const item of list.slice(0, 15)) {
    const type = item.type === 2 ? '📁' : '📄';
    console.log(`   ${type} ${item.name}`);
  }

  // Test schrijfrechten door een klein testbestand te uploaden
  console.log('\n🧪 Schrijfrechten testen (upload test-ping.txt)...');
  const { Readable } = await import('stream');
  const testContent = `CAF FTP Test - ${new Date().toISOString()}`;
  const readable = Readable.from([testContent]);
  await client.uploadFrom(readable, `${remoteRoot}/test-ping.txt`);
  console.log('✅ Schrijfrechten OK — test-ping.txt succesvol geüpload!');

  // Direct opruimen
  await client.remove(`${remoteRoot}/test-ping.txt`);
  console.log('🗑️  test-ping.txt verwijderd (opgeruimd).\n');

  console.log('🎉 Alle tests geslaagd! De factory kan direct live uploaden naar Vimexx.\n');

} catch (err) {
  console.error(`\n❌ FTPS Verbindingsfout: ${err.message}`);
  if (err.message.includes('530')) {
    console.error('   → Fout 530: Gebruikersnaam of wachtwoord is onjuist.');
  } else if (err.message.includes('CERT') || err.message.includes('SSL') || err.message.includes('TLS')) {
    console.error('   → SSL/TLS fout. Probeer FTP_REJECT_UNAUTHORIZED=false in .env.');
  } else if (err.message.includes('ECONNREFUSED')) {
    console.error('   → Verbinding geweigerd. Controleer het poortnummer (standaard: 21).');
  }
  process.exit(1);
} finally {
  client.close();
}

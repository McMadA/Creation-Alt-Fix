const urls = [
  'https://creationaltfix.nl',
  'https://portal.creationaltfix.nl',
  'https://portal.creationaltfix.nl/api/healthcheck.php',
  'https://ftruckstore.nl',
  'https://bakkertjesieg.nl',
  'https://angelastenekes.nl',
  'https://scholte-elektrotechniek.nl',
  'https://naaiatelier-willa.nl',
  'https://arnolddesign.nl',
  'https://stenekesrioolspecialist.nl'
];

async function verify() {
  console.log('\n🔒 --- PHP2SHELL LIVE MITIGATION VERIFICATION ---');
  for (const url of urls) {
    try {
      // 1. Normal GET
      const getRes = await fetch(url, { method: 'GET' });
      
      // 2. Exploit Multipart POST
      const postRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=---------------------------974767299852498929531610575'
        },
        body: '-----------------------------974767299852498929531610575--'
      });

      const safe = postRes.status === 403;
      console.log(`${url.padEnd(52)} | GET: ${getRes.status} | Multipart: ${safe ? '🛡️  403 BLOCKED (100% VEILIG!)' : '⚠️ ' + postRes.status}`);
    } catch (e) {
      console.log(`${url.padEnd(52)} | ❌ Error: ${e.message}`);
    }
  }
}

verify();

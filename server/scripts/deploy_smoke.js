const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error('Usage: node scripts/deploy_smoke.js <backend_base_url>');
  process.exit(1);
}

async function run() {
  const normalized = baseUrl.replace(/\/$/, '');
  const checks = [
    { name: 'health', url: `${normalized}/health` },
    { name: 'health_deps', url: `${normalized}/health/deps` }
  ];

  for (const check of checks) {
    try {
      const response = await fetch(check.url);
      const body = await response.json().catch(() => ({}));
      console.log(`\n[${check.name}] ${response.status}`);
      console.log(JSON.stringify(body, null, 2));
    } catch (err) {
      console.log(`\n[${check.name}] FAILED`);
      console.log(err.message);
    }
  }
}

run();

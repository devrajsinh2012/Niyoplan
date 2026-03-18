const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env', override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const projectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0];
  } catch {
    return 'unknown';
  }
})();

const requiredTables = [
  'profiles',
  'projects',
  'card_counters',
  'lists',
  'sprints',
  'cards',
  'labels',
  'card_checklists',
  'card_labels',
  'activity_log',
  'dsm_entries',
  'card_dependencies',
  'pm_meeting_reviews',
  'meeting_action_items',
  'hr_reviews',
  'spaces',
  'folders',
  'docs',
  'goals',
  'goal_key_results',
  'notifications'
];

async function checkTable(table) {
  const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' }).limit(1);
  if (error) {
    return { table, ok: false, code: error.code || 'UNKNOWN', message: error.message };
  }
  return { table, ok: true };
}

(async () => {
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Project ref: ${projectRef}`);

  const checks = [];
  for (const table of requiredTables) {
    checks.push(await checkTable(table));
  }

  const ok = checks.filter((c) => c.ok);
  const missing = checks.filter((c) => !c.ok);

  console.log('Schema Check Summary');
  console.log(`Ready tables: ${ok.length}/${requiredTables.length}`);

  if (missing.length > 0) {
    console.log('Missing or inaccessible tables:');
    for (const row of missing) {
      console.log(`- ${row.table} (${row.code}): ${row.message}`);
    }
    process.exitCode = 2;
  } else {
    console.log('All required tables are present and queryable.');
  }
})();

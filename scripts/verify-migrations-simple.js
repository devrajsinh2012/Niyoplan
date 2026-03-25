#!/usr/bin/env node

/**
 * Simple migration verification - test the planning API
 */

const fs = require('fs');
const path = require('path');

// Read .env.local
const envFile = path.join(process.cwd(), '.env.local');
let envVars = {};

if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Verifying database migrations...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Cannot find Supabase credentials in .env.local');
  console.log('\nℹ️  Make sure you have:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=...');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=...');
  process.exit(1);
}

async function verify() {
  try {
    // Import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('✅ Connected to Supabase\n');

    // Test 1: Check card_dependencies columns
    console.log('Test 1: card_dependencies table');
    const { data: deps, error: depsError } = await supabase
      .from('card_dependencies')
      .select('id, type, lead_or_lag_days, created_by')
      .limit(1);

    if (depsError) {
      console.log('  ❌ Error:', depsError.message);
    } else {
      console.log('  ✅ Has type, lead_or_lag_days, created_by columns');
    }

    // Test 2: Check cards columns
    console.log('\nTest 2: cards table');
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('id, progress_percent, actual_start, actual_end, is_critical_path')
      .limit(1);

    if (cardsError) {
      console.log('  ❌ Error:', cardsError.message);
    } else {
      console.log('  ✅ Has progress_percent, actual_start, actual_end, is_critical_path columns');
    }

    // Test 3: Check meetings table
    console.log('\nTest 3: meetings table');
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('id, title, meeting_date')
      .limit(1);

    if (meetingsError?.code === 'PGRST116') {
      console.log('  ❌ meetings table does NOT exist');
    } else if (meetingsError) {
      console.log('  ❌ Error:', meetingsError.message);
    } else {
      console.log('  ✅ meetings table exists');
    }

    console.log('\n✨ Verification complete!');
    console.log('\nYou can now:');
    console.log('  📅 Visit the Calendar Grid tab in your project');
    console.log('  📊 View Gantt timeline with progress bars');
    console.log('  🔗 Create dependencies with types and lead/lag\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();

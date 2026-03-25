#!/usr/bin/env node

/**
 * Verify Database Migrations
 * Checks if all new columns exist in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyMigrations() {
  console.log('🔍 Verifying database migrations...\n');

  try {
    // Test 1: Check if card_dependencies has new columns
    console.log('Test 1: Checking card_dependencies table...');
    const { data: deps, error: depsError } = await supabase
      .from('card_dependencies')
      .select('*')
      .limit(1);

    if (depsError && depsError.code !== 'PGRST116') {
      console.error('  ❌ Error querying card_dependencies:', depsError.message);
    } else if (deps && deps.length > 0) {
      const dep = deps[0];
      const hasType = 'type' in dep;
      const hasLagDays = 'lead_or_lag_days' in dep;
      const hasCreatedBy = 'created_by' in dep;

      console.log(`  ${hasType ? '✅' : '❌'} type column exists`);
      console.log(`  ${hasLagDays ? '✅' : '❌'} lead_or_lag_days column exists`);
      console.log(`  ${hasCreatedBy ? '✅' : '❌'} created_by column exists`);
    } else {
      console.log('  ⚠️  No dependencies found (table exists but empty)');
    }

    // Test 2: Check if cards has new columns
    console.log('\nTest 2: Checking cards table...');
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .limit(1);

    if (cardsError && cardsError.code !== 'PGRST116') {
      console.error('  ❌ Error querying cards:', cardsError.message);
    } else if (cards && cards.length > 0) {
      const card = cards[0];
      const hasProgress = 'progress_percent' in card;
      const hasActualStart = 'actual_start' in card;
      const hasActualEnd = 'actual_end' in card;
      const hasCriticalPath = 'is_critical_path' in card;

      console.log(`  ${hasProgress ? '✅' : '❌'} progress_percent column exists`);
      console.log(`  ${hasActualStart ? '✅' : '❌'} actual_start column exists`);
      console.log(`  ${hasActualEnd ? '✅' : '❌'} actual_end column exists`);
      console.log(`  ${hasCriticalPath ? '✅' : '❌'} is_critical_path column exists`);
    } else {
      console.log('  ⚠️  No cards found (table exists but empty)');
    }

    // Test 3: Check if meetings table exists
    console.log('\nTest 3: Checking meetings table...');
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('*')
      .limit(1);

    if (meetingsError?.code === 'PGRST116') {
      console.log('  ❌ meetings table does NOT exist');
    } else if (meetingsError) {
      console.error('  ❌ Error querying meetings:', meetingsError.message);
    } else {
      console.log('  ✅ meetings table exists');
    }

    console.log('\n✨ Migration verification complete!');
    console.log('\n📋 Summary:');
    console.log('   If all checks passed (✅), your calendar and gantt features are ready!');
    console.log('   If any checks failed (❌), re-run the migration scripts in Supabase SQL editor.\n');

  } catch (error) {
    console.error('Error during verification:', error.message);
    process.exit(1);
  }
}

verifyMigrations();

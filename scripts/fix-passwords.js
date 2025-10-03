#!/usr/bin/env node
/*
  One-time fixer: re-hash any plain-text passwords in Supabase users table.
  - Reads .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
  - For any user with password length < 60 (not a bcrypt hash), hashes with bcrypt and updates the row.
  Safe to re-run; skips already-hashed rows.
*/

const path = require('path');
const fs = require('fs');

// Load env from .env.local if present
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
} catch {}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  console.log('🔐 Scanning users for plain-text passwords...');
  const { data: users, error } = await supabase
    .from('users')
    .select('id, username, email, password')
    .limit(2000);

  if (error) {
    console.error('Failed to fetch users:', error.message);
    process.exit(1);
  }

  const bcrypt = require('bcryptjs');
  let fixed = 0;
  for (const u of users || []) {
    const pwd = u.password || '';
    // Heuristic: bcrypt hashes are usually 60 chars and start with $2
    const looksHashed = typeof pwd === 'string' && pwd.length >= 60 && pwd.startsWith('$2');
    if (!pwd || looksHashed) continue;

    try {
      const hash = await bcrypt.hash(String(pwd), 10);
      const { error: upErr } = await supabase
        .from('users')
        .update({ password: hash, updated_at: new Date().toISOString() })
        .eq('id', u.id);
      if (upErr) {
        console.warn(`⚠️  Failed to update user ${u.id} (${u.username || u.email}):`, upErr.message);
      } else {
        fixed++;
        console.log(`✅ Re-hashed password for user ${u.username || u.email}`);
      }
    } catch (e) {
      console.warn(`⚠️  Error hashing password for user ${u.id}:`, e.message || e);
    }
  }

  console.log(`
Done. ${fixed} user password(s) updated.`);
  if (fixed === 0) console.log('No plain-text passwords found.');
  process.exit(0);
})();

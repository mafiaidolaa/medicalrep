# 🚀 Quick Fix: Clinic Visibility Issue

## Problem
Clinics created by users with limited permissions disappear after page refresh.

## Quick Solution (5 minutes)

### Step 1: Run This SQL in Supabase

1. Go to your Supabase Dashboard
2. Open SQL Editor
3. Paste and run this:

```sql
-- Fix RLS policies for clinics table
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Service role has full access" ON clinics;
DROP POLICY IF EXISTS "Authenticated users can read all clinics" ON clinics;
DROP POLICY IF EXISTS "Authenticated users can insert clinics" ON clinics;

-- Create new policies
CREATE POLICY "Service role has full access" 
ON clinics FOR ALL TO service_role 
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read all clinics" 
ON clinics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert clinics" 
ON clinics FOR INSERT TO authenticated WITH CHECK (true);
```

### Step 2: Verify Environment Variable

Check that your `.env.local` file contains:

```bash
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

If it's missing or commented out, uncomment it and **restart your dev server**:

```bash
# Stop server with Ctrl+C
npm run dev
```

### Step 3: Clear Cache and Test

1. Open your app in the browser
2. Press `Ctrl + Shift + R` (hard refresh)
3. Login as "mo" user
4. Create a new clinic
5. Refresh the page - clinic should now be visible! ✅

## Verify Fix Works

Run this diagnostic endpoint:
```
http://localhost:3000/api/clinics/debug
```

You should see:
- ✅ `serviceRoleKeyPresent: true`
- ✅ `serviceRoleClinicCount` > 0
- ✅ List of clinics in `latestClinics`

## Still Having Issues?

See the full guide: `CLINIC_VISIBILITY_FIX.md`

Or run the complete diagnostic: `diagnose_clinics_rls.sql`

# 🔧 Clinic Visibility Issue - Complete Solution Guide

## Problem Summary

Clinics created by limited-permission users (like "mo") disappear after page refresh and are not visible to either the creating user or admin users.

## Root Cause Analysis

The issue stems from **three interconnected problems**:

1. **RLS (Row Level Security) Policies**: The clinics table may have restrictive RLS policies that prevent users from seeing clinics they've created
2. **Caching Layer**: The frontend caches clinic data for 2 minutes, which may cache empty results
3. **Service Role Key Usage**: The API route should use service_role key to bypass RLS, but might be falling back to anon key

## 🚀 Step-by-Step Solution

### Step 1: Run Diagnostic Tests

1. **Check API Diagnostic Endpoint**:
   ```bash
   # Open this URL in your browser while logged in
   http://localhost:3000/api/clinics/debug
   ```
   
   This will show you:
   - Whether service role key is present
   - How many clinics exist in the database
   - Current authenticated user
   - Specific recommendations

2. **Run SQL Diagnostic Script**:
   - Open Supabase Dashboard → SQL Editor
   - Copy and paste the contents of `diagnose_clinics_rls.sql`
   - Run each query section by section to understand:
     - Current RLS status
     - Existing RLS policies
     - Total clinics count
     - Clinics with NULL area/line

### Step 2: Fix RLS Policies

Based on your diagnostic results, you have **two options**:

#### Option A: Temporarily Disable RLS (Quick Fix - Development Only)

Run this in Supabase SQL Editor:

```sql
-- ⚠️ WARNING: Only use this in development!
ALTER TABLE clinics DISABLE ROW LEVEL SECURITY;
```

**Pros**: Immediate fix, all users can see all clinics
**Cons**: No security, not suitable for production

#### Option B: Implement Proper RLS Policies (Recommended)

Run this in Supabase SQL Editor:

```sql
-- Enable RLS
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Service role has full access" ON clinics;
DROP POLICY IF EXISTS "Authenticated users can read all clinics" ON clinics;
DROP POLICY IF EXISTS "Authenticated users can insert clinics" ON clinics;
DROP POLICY IF EXISTS "Users can update their registered clinics" ON clinics;
DROP POLICY IF EXISTS "Admins and managers can delete clinics" ON clinics;

-- Policy 1: Service role bypasses all RLS (for API routes)
CREATE POLICY "Service role has full access" 
ON clinics 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Policy 2: All authenticated users can read all clinics
-- (The frontend will handle role-based filtering)
CREATE POLICY "Authenticated users can read all clinics" 
ON clinics 
FOR SELECT 
TO authenticated 
USING (true);

-- Policy 3: All authenticated users can insert clinics
CREATE POLICY "Authenticated users can insert clinics" 
ON clinics 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy 4: Users can update clinics they registered, or admins/managers can update any
CREATE POLICY "Users can update their registered clinics" 
ON clinics 
FOR UPDATE 
TO authenticated 
USING (
    registered_by = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'gm', 'manager')
    )
)
WITH CHECK (
    registered_by = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'gm', 'manager')
    )
);

-- Policy 5: Only admins and managers can delete clinics
CREATE POLICY "Admins and managers can delete clinics" 
ON clinics 
FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'gm', 'manager')
    )
);
```

### Step 3: Verify Service Role Key

Ensure your `.env.local` file has the service role key:

```bash
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

**Important**: After adding or modifying `.env.local`, you MUST restart your development server:

```bash
# Press Ctrl+C to stop the server
# Then restart it
npm run dev
```

### Step 4: Clear Cache

After applying the fixes:

1. **Clear Frontend Cache**:
   - Open browser DevTools (F12)
   - Go to Application/Storage tab
   - Clear all storage (or just localStorage/sessionStorage)
   - Hard refresh the page (Ctrl+Shift+R)

2. **Clear Server Cache** (if using):
   - Restart your development server
   - The in-memory cache will be cleared automatically

### Step 5: Test the Fix

1. **Login as "mo" user** (limited permissions)
2. **Create a new clinic** with all required fields (name, doctor name, area, line)
3. **Refresh the page** (Ctrl+R or F5)
4. **Verify the clinic is visible** in the list
5. **Logout and login as "admin"**
6. **Verify the clinic is visible** to admin as well

## 🔍 Debugging Tips

### Check Browser Console Logs

When the clinics page loads, you should see:

```
✅ Fetched X clinics via API
```

If you see `0 clinics`, there's still an issue.

### Check Network Tab

1. Open DevTools → Network tab
2. Filter by "clinics"
3. Refresh the page
4. Click on the `/api/clinics` request
5. Check the Response tab - you should see an array of clinic objects

### Check Server Logs

In your terminal where the dev server is running, look for:

```
🔑 Using service_role key for clinic creation
📝 Clinic will be registered by user: [user-id]
✅ Clinic created successfully: [clinic-data]
```

## 🎯 Expected Behavior After Fix

1. ✅ User "mo" can create clinics
2. ✅ User "mo" can see their created clinics after refresh
3. ✅ Admin can see all clinics including those created by "mo"
4. ✅ Non-admin users see only clinics in their area/line (filtered by frontend)
5. ✅ No clinics "disappear" after page refresh

## ⚠️ Common Pitfalls

1. **Forgetting to restart dev server** after modifying `.env.local`
2. **Browser caching old data** - always hard refresh (Ctrl+Shift+R)
3. **RLS policies conflicting** - drop old policies before creating new ones
4. **NULL area or line values** - ensure all clinics have valid area and line set
5. **Session expired** - logout and login again if you've been working for a long time

## 🆘 Still Not Working?

If clinics still disappear after following all steps:

1. Run the debug endpoint: `http://localhost:3000/api/clinics/debug`
2. Run the SQL diagnostic script
3. Check both browser console and server terminal logs
4. Share the output from the debug endpoint and any error messages

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- Frontend visibility logic: `src/lib/visibility.ts`
- API route implementation: `src/app/api/clinics/route.ts`

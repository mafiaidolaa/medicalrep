// Deep debug authentication system
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

async function deepDebug() {
    console.log('🔍 DEEP DEBUGGING ClinicConnect Authentication System\n');
    console.log('=' .repeat(60));
    
    // 1. Environment Variables Check
    console.log('\n1. ENVIRONMENT VARIABLES:');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    
    console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? `✅ ${supabaseUrl}` : '❌ MISSING'}`);
    console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Found (length: ' + supabaseAnonKey.length + ')' : '❌ MISSING'}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Found (length: ' + supabaseServiceKey.length + ')' : '❌ MISSING'}`);
    console.log(`   NEXTAUTH_URL: ${nextAuthUrl ? `✅ ${nextAuthUrl}` : '❌ MISSING'}`);
    console.log(`   NEXTAUTH_SECRET: ${nextAuthSecret ? '✅ Found (length: ' + nextAuthSecret.length + ')' : '❌ MISSING'}`);
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.log('\n❌ CRITICAL: Missing Supabase credentials');
        return;
    }
    
    // 2. Database Connection Tests
    console.log('\n2. DATABASE CONNECTION TESTS:');
    
    // Test with anon key
    console.log('   Testing with ANON key...');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    try {
        const { data: anonData, error: anonError } = await anonClient.from('users').select('count').limit(1);
        if (anonError) {
            console.log(`   ❌ Anon client error: ${anonError.message}`);
        } else {
            console.log(`   ✅ Anon client works`);
        }
    } catch (err) {
        console.log(`   ❌ Anon client exception: ${err.message}`);
    }
    
    // Test with service role
    console.log('   Testing with SERVICE ROLE key...');
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    
    try {
        const { data: serviceData, error: serviceError } = await serviceClient.from('users').select('count').limit(1);
        if (serviceError) {
            console.log(`   ❌ Service client error: ${serviceError.message}`);
            return;
        } else {
            console.log(`   ✅ Service client works`);
        }
    } catch (err) {
        console.log(`   ❌ Service client exception: ${err.message}`);
        return;
    }
    
    // 3. Users Table Deep Analysis
    console.log('\n3. USERS TABLE ANALYSIS:');
    try {
        const { data: users, error } = await serviceClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.log(`   ❌ Error fetching users: ${error.message}`);
            return;
        }
        
        console.log(`   ✅ Found ${users.length} users in database:`);
        
        for (const user of users) {
            console.log(`\n   👤 User: ${user.email} (${user.username})`);
            console.log(`      Role: ${user.role}`);
            console.log(`      Full Name: ${user.full_name || 'N/A'}`);
            console.log(`      Password Hash: ${user.password ? (user.password.startsWith('$2b$') ? '✅ bcrypt hash' : '❌ NOT bcrypt') : '❌ NO PASSWORD'}`);
            console.log(`      Password Length: ${user.password ? user.password.length : 0}`);
            console.log(`      Created: ${user.created_at}`);
            console.log(`      Active: ${user.is_active !== false ? '✅' : '❌'}`);
            
            // Test specific passwords
            if (user.email === 'admin@clinicconnect.com' && user.password) {
                console.log(`      Testing 'AdminPass123!' against this hash...`);
                try {
                    const match = await bcrypt.compare('AdminPass123!', user.password);
                    console.log(`      Password 'AdminPass123!' matches: ${match ? '✅ YES' : '❌ NO'}`);
                    
                    // Also test other common passwords
                    const testPasswords = ['admin', 'password', 'AdminPass123', '123456'];
                    for (const testPass of testPasswords) {
                        const testMatch = await bcrypt.compare(testPass, user.password);
                        if (testMatch) {
                            console.log(`      ✅ FOUND WORKING PASSWORD: '${testPass}'`);
                        }
                    }
                } catch (bcryptErr) {
                    console.log(`      ❌ Error testing password: ${bcryptErr.message}`);
                }
            }
        }
        
    } catch (err) {
        console.log(`   ❌ Users table error: ${err.message}`);
        return;
    }
    
    // 4. Test Authentication Flow
    console.log('\n4. AUTHENTICATION FLOW TEST:');
    
    // Simulate the getUserByUsername function
    console.log('   Simulating getUserByUsername function...');
    
    const testCredentials = [
        { input: 'admin@clinicconnect.com', password: 'AdminPass123!' },
        { input: 'admin', password: 'AdminPass123!' },
        { input: 'john.doe@clinicconnect.com', password: 'MedRep2024!' }
    ];
    
    for (const cred of testCredentials) {
        console.log(`\n   🧪 Testing: ${cred.input} / ${cred.password}`);
        
        // Check if input is email or username
        const isEmail = cred.input.includes('@');
        console.log(`      Detected as: ${isEmail ? 'EMAIL' : 'USERNAME'}`);
        
        try {
            const { data: user, error } = await serviceClient
                .from('users')
                .select('*')
                .eq(isEmail ? 'email' : 'username', cred.input)
                .single();
                
            if (error) {
                console.log(`      ❌ User lookup failed: ${error.message}`);
                if (error.code === 'PGRST116') {
                    console.log(`      (This means no user found with ${isEmail ? 'email' : 'username'}: ${cred.input})`);
                }
                continue;
            }
            
            console.log(`      ✅ User found: ${user.email} (${user.username})`);
            
            if (!user.password) {
                console.log(`      ❌ User has no password set`);
                continue;
            }
            
            console.log(`      Password hash starts with: ${user.password.substring(0, 10)}...`);
            
            try {
                const isValid = await bcrypt.compare(cred.password, user.password);
                console.log(`      Password verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
                
                if (isValid) {
                    console.log(`      🎉 LOGIN SHOULD WORK WITH: ${cred.input} / ${cred.password}`);
                }
            } catch (bcryptErr) {
                console.log(`      ❌ Bcrypt error: ${bcryptErr.message}`);
            }
            
        } catch (err) {
            console.log(`      ❌ Database error: ${err.message}`);
        }
    }
    
    // 5. Check RLS Policies
    console.log('\n5. ROW LEVEL SECURITY (RLS) CHECK:');
    try {
        // Test with anon key (should be restricted by RLS)
        const { data: rlsTest, error: rlsError } = await anonClient
            .from('users')
            .select('email, username')
            .limit(1);
            
        if (rlsError) {
            console.log(`   ✅ RLS is working (anon client blocked): ${rlsError.message}`);
        } else {
            console.log(`   ⚠️  RLS might be too permissive: anon client can read users`);
        }
    } catch (err) {
        console.log(`   ✅ RLS is working (anon client threw error)`);
    }
    
    // 6. Generate Fresh Password Hash
    console.log('\n6. FRESH PASSWORD HASH GENERATION:');
    const freshHash = await bcrypt.hash('AdminPass123!', 12);
    console.log(`   Fresh bcrypt hash for 'AdminPass123!': ${freshHash}`);
    console.log(`   Verification of fresh hash: ${await bcrypt.compare('AdminPass123!', freshHash) ? '✅' : '❌'}`);
    
    // 7. Recommendations
    console.log('\n7. RECOMMENDATIONS:');
    console.log('   If authentication is still failing, try these SQL commands:');
    console.log('');
    console.log(`   -- Update admin password with fresh hash:`);
    console.log(`   UPDATE public.users SET password = '${freshHash}' WHERE email = 'admin@clinicconnect.com';`);
    console.log('');
    console.log(`   -- Check if user exists:`);
    console.log(`   SELECT id, email, username, role, password IS NOT NULL as has_password FROM public.users WHERE email = 'admin@clinicconnect.com';`);
    console.log('');
    console.log(`   -- Reset ALL user passwords:`);
    const adminHash = await bcrypt.hash('AdminPass123!', 12);
    const repHash = await bcrypt.hash('MedRep2024!', 12);
    console.log(`   UPDATE public.users SET password = '${adminHash}' WHERE role = 'admin';`);
    console.log(`   UPDATE public.users SET password = '${repHash}' WHERE role = 'medical_rep';`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 DEBUG COMPLETE - Check the results above for issues');
}

deepDebug().catch(console.error);
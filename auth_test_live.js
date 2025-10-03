// Live authentication test - simulates the actual login flow
const { signIn } = require('next-auth/react');

async function testLiveAuth() {
    console.log('🧪 TESTING LIVE AUTHENTICATION FLOW\n');
    console.log('Testing NextAuth signIn directly...\n');
    
    try {
        // This would simulate what happens when the login form is submitted
        console.log('1. Testing signIn with admin@clinicconnect.com / AdminPass123!');
        
        const result = await signIn('credentials', {
            username: 'admin@clinicconnect.com',
            password: 'AdminPass123!',
            redirect: false
        });
        
        console.log('SignIn result:', result);
        
    } catch (error) {
        console.error('SignIn error:', error);
        console.log('\nThis might not work in Node.js context, this is meant for browser');
        console.log('The issue might be:');
        console.log('1. Cookie sameSite: "none" - problematic for localhost');
        console.log('2. Edge runtime causing issues with bcrypt');
        console.log('3. AUTH_TRUST_HOST not properly set');
    }
}

testLiveAuth();
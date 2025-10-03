const bcrypt = require('bcryptjs');

// كلمات المرور الافتراضية
const passwords = {
  super_admin: 'super123',
  admin: 'admin123', 
  manager: 'manager123',
  representative: 'rep123',
  accountant: 'acc123'
};

// تشفير كلمات المرور
async function generateHashes() {
  console.log('-- Password hashes for default users:');
  console.log('-- Copy these hashes to your SQL file\n');
  
  for (const [role, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 12);
    console.log(`-- ${role}: ${password}`);
    console.log(`'${hash}',\n`);
  }
}

generateHashes().catch(console.error);
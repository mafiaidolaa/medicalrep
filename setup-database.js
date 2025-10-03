const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// You'll need to add your SERVICE_ROLE_KEY here
const supabaseUrl = 'https://vxdvcrcbegggilreaoip.supabase.co'
const serviceRoleKey = 'YOUR_SERVICE_ROLE_KEY_HERE' // Replace with actual key

async function setupDatabase() {
  if (serviceRoleKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.log('❌ Please update the SERVICE_ROLE_KEY in this script first!')
    console.log('🔑 Get it from: Settings → API → service_role key')
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '001_initial_schema.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.log('❌ Migration file not found:', migrationPath)
      return
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('🚀 Setting up database schema...')
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      console.log('❌ Error running migration:', error.message)
      
      // Try alternative method - split and run individual statements
      console.log('🔄 Trying alternative setup method...')
      await runStatementsIndividually(supabase, migrationSQL)
    } else {
      console.log('✅ Database schema created successfully!')
      
      // Test the setup
      await testDatabaseSetup(supabase)
    }
    
  } catch (err) {
    console.log('❌ Setup failed:', err.message)
  }
}

async function runStatementsIndividually(supabase, sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

  console.log(`📝 Running ${statements.length} SQL statements...`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      })
      
      if (error) {
        console.log(`❌ Statement ${i + 1} failed:`, error.message)
        console.log('SQL:', statement.substring(0, 100) + '...')
      } else {
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`)
      }
    } catch (err) {
      console.log(`❌ Statement ${i + 1} error:`, err.message)
    }
  }
}

async function testDatabaseSetup(supabase) {
  console.log('🧪 Testing database setup...')
  
  const tables = ['users', 'clinics', 'products', 'orders', 'visits']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ ${table} table:`, error.message)
      } else {
        console.log(`✅ ${table} table: Ready`)
      }
    } catch (err) {
      console.log(`❌ ${table} table error:`, err.message)
    }
  }
}

setupDatabase()
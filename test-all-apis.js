/**
 * Comprehensive API Testing Script
 * Tests all API endpoints for CRUD operations and soft delete functionality
 * 
 * Usage:
 * 1. Ensure your server is running
 * 2. Update the BASE_URL if needed
 * 3. Run: node test-all-apis.js
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3000'; // Change to your server URL
const TEST_USER_ID = 1; // Change to a valid user ID for testing

// Test data for each endpoint
const testData = {
  clinics: {
    name: 'Test Clinic API',
    address: '123 Test Street, Test City, TS 12345',
    phone: '+1-555-0123',
    email: 'test@clinic-api.com',
    website: 'https://test-clinic-api.com',
    description: 'API Testing Clinic'
  },
  orders: {
    order_number: 'ORD-API-TEST-001',
    customer_name: 'API Test Customer',
    customer_email: 'customer@api-test.com',
    customer_phone: '+1-555-0456',
    total_amount: 199.99,
    status: 'pending',
    notes: 'API test order'
  },
  visits: {
    patient_name: 'API Test Patient',
    patient_email: 'patient@api-test.com',
    patient_phone: '+1-555-0789',
    visit_date: new Date().toISOString().split('T')[0],
    visit_time: '10:00',
    purpose: 'API Testing Visit',
    status: 'scheduled',
    notes: 'Test visit for API validation'
  },
  invoices: {
    invoice_number: 'INV-API-TEST-001',
    customer_name: 'API Test Invoice Customer',
    customer_email: 'invoice-customer@api-test.com',
    customer_phone: '+1-555-0321',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: 100.00,
    tax_amount: 8.00,
    discount_amount: 0.00,
    total_amount: 108.00,
    status: 'draft',
    notes: 'API test invoice'
  },
  payments: {
    payment_reference: 'PAY-API-TEST-001',
    payer_name: 'API Test Payer',
    payer_email: 'payer@api-test.com',
    payer_phone: '+1-555-0654',
    amount: 108.00,
    payment_method: 'credit_card',
    payment_date: new Date().toISOString().split('T')[0],
    status: 'completed',
    transaction_id: 'TXN-API-TEST-001',
    notes: 'API test payment'
  },
  collections: {
    collection_reference: 'COL-API-TEST-001',
    patient_name: 'API Test Collection Patient',
    patient_email: 'collection-patient@api-test.com',
    patient_phone: '+1-555-0987',
    collection_date: new Date().toISOString().split('T')[0],
    collection_type: 'blood',
    amount_collected: 500,
    unit: 'ml',
    status: 'completed',
    notes: 'API test collection'
  },
  expenses: {
    description: 'API Test Expense',
    category: 'office_supplies',
    amount: 49.99,
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'credit_card',
    receipt_number: 'RCT-API-TEST-001',
    vendor: 'API Test Vendor',
    notes: 'API test expense record'
  },
  products: {
    name: 'API Test Product',
    category: 'medication',
    description: 'Test product for API validation',
    sku: 'SKU-API-TEST-001',
    price: 29.99,
    cost: 15.00,
    quantity_in_stock: 100,
    minimum_stock_level: 10,
    manufacturer: 'API Test Manufacturer',
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'API test product'
  }
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Test-Script'
      }
    };

    const requestModule = url.protocol === 'https:' ? https : http;
    const req = requestModule.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test function for a single endpoint
async function testEndpoint(endpoint) {
  console.log(`\n🧪 Testing ${endpoint.toUpperCase()} API...`);
  console.log('='.repeat(50));
  
  const results = {
    endpoint,
    tests: [],
    createdId: null
  };

  try {
    // Test 1: GET (List) - should work even with no data
    console.log('📋 Testing GET (List)...');
    const listResponse = await makeRequest('GET', `/api/${endpoint}`);
    results.tests.push({
      name: 'GET List',
      status: listResponse.status,
      success: listResponse.status === 200,
      response: listResponse.data
    });
    console.log(`   Status: ${listResponse.status} ${listResponse.status === 200 ? '✅' : '❌'}`);

    // Test 2: POST (Create)
    console.log('➕ Testing POST (Create)...');
    const createResponse = await makeRequest('POST', `/api/${endpoint}`, testData[endpoint]);
    const createSuccess = createResponse.status === 200 || createResponse.status === 201;
    results.tests.push({
      name: 'POST Create',
      status: createResponse.status,
      success: createSuccess,
      response: createResponse.data
    });
    console.log(`   Status: ${createResponse.status} ${createSuccess ? '✅' : '❌'}`);

    if (createSuccess && createResponse.data && createResponse.data[endpoint.slice(0, -1)]) {
      results.createdId = createResponse.data[endpoint.slice(0, -1)].id;
      console.log(`   Created ID: ${results.createdId}`);
    }

    // Test 3: PUT (Update) - only if we have an ID
    if (results.createdId) {
      console.log('✏️  Testing PUT (Update)...');
      const updateData = { ...testData[endpoint], id: results.createdId };
      
      // Modify a field to test update
      if (updateData.name) updateData.name += ' (Updated)';
      else if (updateData.description) updateData.description += ' (Updated)';
      else if (updateData.patient_name) updateData.patient_name += ' (Updated)';
      else if (updateData.customer_name) updateData.customer_name += ' (Updated)';
      else if (updateData.payer_name) updateData.payer_name += ' (Updated)';
      
      const updateResponse = await makeRequest('PUT', `/api/${endpoint}`, updateData);
      const updateSuccess = updateResponse.status === 200;
      results.tests.push({
        name: 'PUT Update',
        status: updateResponse.status,
        success: updateSuccess,
        response: updateResponse.data
      });
      console.log(`   Status: ${updateResponse.status} ${updateSuccess ? '✅' : '❌'}`);
    }

    // Test 4: DELETE (Soft Delete) - only if we have an ID
    if (results.createdId) {
      console.log('🗑️  Testing DELETE (Soft Delete)...');
      const deleteResponse = await makeRequest('DELETE', `/api/${endpoint}`, { id: results.createdId });
      const deleteSuccess = deleteResponse.status === 200;
      results.tests.push({
        name: 'DELETE Soft Delete',
        status: deleteResponse.status,
        success: deleteSuccess,
        response: deleteResponse.data
      });
      console.log(`   Status: ${deleteResponse.status} ${deleteSuccess ? '✅' : '❌'}`);
    }

    // Test 5: GET Trash (Deleted Items)
    console.log('🗂️  Testing GET Trash...');
    const trashResponse = await makeRequest('GET', `/api/trash?type=${endpoint}`);
    results.tests.push({
      name: 'GET Trash',
      status: trashResponse.status,
      success: trashResponse.status === 200,
      response: trashResponse.data
    });
    console.log(`   Status: ${trashResponse.status} ${trashResponse.status === 200 ? '✅' : '❌'}`);

    // Test 6: POST Restore (if we have deleted items)
    if (results.createdId && trashResponse.status === 200) {
      console.log('♻️  Testing POST Restore...');
      const restoreResponse = await makeRequest('POST', `/api/trash/restore`, {
        type: endpoint,
        id: results.createdId
      });
      const restoreSuccess = restoreResponse.status === 200;
      results.tests.push({
        name: 'POST Restore',
        status: restoreResponse.status,
        success: restoreSuccess,
        response: restoreResponse.data
      });
      console.log(`   Status: ${restoreResponse.status} ${restoreSuccess ? '✅' : '❌'}`);

      // Clean up: Permanently delete the test record
      if (restoreSuccess) {
        console.log('🧹 Cleaning up test data...');
        await makeRequest('DELETE', `/api/${endpoint}`, { id: results.createdId, permanent: true });
        console.log('   Cleanup completed');
      }
    }

  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message);
    results.tests.push({
      name: 'Error',
      success: false,
      error: error.message
    });
  }

  return results;
}

// Main testing function
async function runAllTests() {
  console.log('🚀 Starting Comprehensive API Testing');
  console.log('🔗 Target URL:', BASE_URL);
  console.log('📅 Started at:', new Date().toISOString());
  console.log('='.repeat(80));

  const endpoints = Object.keys(testData);
  const allResults = [];
  const summary = {
    total: 0,
    passed: 0,
    failed: 0
  };

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    allResults.push(result);
    
    // Update summary
    for (const test of result.tests) {
      summary.total++;
      if (test.success) {
        summary.passed++;
      } else {
        summary.failed++;
      }
    }
    
    // Small delay between endpoint tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${summary.total}`);
  console.log(`Passed: ${summary.passed} ✅`);
  console.log(`Failed: ${summary.failed} ${summary.failed > 0 ? '❌' : '✅'}`);
  console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);

  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  for (const result of allResults) {
    console.log(`\n${result.endpoint.toUpperCase()}:`);
    for (const test of result.tests) {
      const status = test.success ? '✅' : '❌';
      console.log(`  ${test.name}: ${status} (${test.status || test.error})`);
    }
  }

  console.log('\n🏁 Testing completed at:', new Date().toISOString());
  
  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

// Additional test for system health
async function testSystemHealth() {
  console.log('\n❤️  Testing System Health...');
  try {
    // Test if server is responding
    const healthResponse = await makeRequest('GET', '/api/health');
    if (healthResponse.status === 200) {
      console.log('   System Health: ✅ OK');
      return true;
    } else {
      console.log('   System Health: ❌ Issues detected');
      return false;
    }
  } catch (error) {
    console.log('   System Health: ❌ Server not responding');
    console.log('   Error:', error.message);
    return false;
  }
}

// Error handling for the main process
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the tests
console.log('🔧 EP Group System - API Testing Suite');
console.log('Version: 1.0.0');
console.log('Author: System Development Team\n');

testSystemHealth().then((healthy) => {
  if (healthy) {
    runAllTests();
  } else {
    console.log('\n❌ System health check failed. Please ensure your server is running.');
    console.log('💡 Make sure to:');
    console.log('   1. Start your development server');
    console.log('   2. Check that the BASE_URL is correct');
    console.log('   3. Verify database connections are working');
    process.exit(1);
  }
});
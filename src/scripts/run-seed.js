#!/usr/bin/env node

/**
 * Simple script to trigger database seeding
 */

const fetch = require('node-fetch');

const runSeed = async () => {
  try {
    console.log('تشغيل seeding للقاعدة...');
    
    const response = await fetch('http://localhost:3001/api/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ تم تشغيل seeding بنجاح:', data.message);
    } else {
      const error = await response.json();
      console.log('❌ فشل في seeding:', error.error);
      if (error.details) {
        console.log('التفاصيل:', error.details);
      }
    }
  } catch (error) {
    console.error('❌ خطأ في الاتصال:', error.message);
    console.log('تأكد من أن الخادم يعمل على http://localhost:3001');
  }
};

runSeed();
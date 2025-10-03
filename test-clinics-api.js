/**
 * أداة اختبار API العيادات
 * تشغيل: node test-clinics-api.js
 */

const API_BASE = 'http://localhost:3000'; // أو الـ URL الخاص بخادمك

async function testClinicsAPI() {
  console.log('🧪 بدء اختبار API العيادات...\n');
  
  try {
    // 1. اختبار GET - جلب العيادات
    console.log('1️⃣ اختبار جلب العيادات...');
    const response = await fetch(`${API_BASE}/api/clinics?limit=5`);
    
    if (response.ok) {
      const clinics = await response.json();
      console.log(`✅ تم جلب ${clinics.length} عيادة`);
      if (clinics.length > 0) {
        console.log(`   مثال: ${clinics[0].name} - ${clinics[0].doctor_name}`);
      }
    } else {
      console.log(`❌ فشل في جلب العيادات: ${response.status}`);
    }
    
    // 2. اختبار POST - إضافة عيادة تجريبية
    console.log('\n2️⃣ اختبار إضافة عيادة تجريبية...');
    const testClinic = {
      name: 'عيادة الاختبار',
      doctor_name: 'د. أحمد محمد',
      address: 'شارع التجربة، المدينة',
      area: 'المنطقة التجريبية',
      line: 'الخط الأول',
      classification: 'A',
      credit_status: 'green'
    };
    
    const addResponse = await fetch(`${API_BASE}/api/clinics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testClinic)
    });
    
    let addedClinic = null;
    if (addResponse.ok) {
      addedClinic = await addResponse.json();
      console.log(`✅ تم إضافة العيادة التجريبية: ${addedClinic.id}`);
    } else {
      console.log(`❌ فشل في إضافة العيادة: ${addResponse.status}`);
      const error = await addResponse.json().catch(() => ({}));
      console.log(`   التفاصيل: ${error.details || error.error || 'خطأ غير معروف'}`);
    }
    
    if (addedClinic) {
      // 3. اختبار PUT - تحديث العيادة
      console.log('\n3️⃣ اختبار تحديث العيادة...');
      const updateData = {
        id: addedClinic.id,
        name: 'عيادة الاختبار - محدثة',
        doctor_name: 'د. أحمد محمد - محدث'
      };
      
      const updateResponse = await fetch(`${API_BASE}/api/clinics`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (updateResponse.ok) {
        const updatedClinic = await updateResponse.json();
        console.log(`✅ تم تحديث العيادة: ${updatedClinic.name}`);
      } else {
        console.log(`❌ فشل في تحديث العيادة: ${updateResponse.status}`);
      }
      
      // 4. اختبار DELETE - حذف منطقي
      console.log('\n4️⃣ اختبار الحذف المنطقي...');
      const deleteResponse = await fetch(`${API_BASE}/api/clinics?id=${addedClinic.id}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        const result = await deleteResponse.json();
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`❌ فشل في حذف العيادة: ${deleteResponse.status}`);
      }
      
      // 5. اختبار سلة المهملات
      console.log('\n5️⃣ اختبار سلة المهملات...');
      const trashResponse = await fetch(`${API_BASE}/api/trash?section=clinics`);
      
      if (trashResponse.ok) {
        const trashItems = await trashResponse.json();
        console.log(`✅ تم جلب ${trashItems.length} عنصر من سلة المهملات`);
        
        const testItem = trashItems.find(item => item.entity_id === addedClinic.id);
        if (testItem) {
          console.log(`   ✅ العيادة التجريبية موجودة في سلة المهملات`);
          
          // 6. اختبار الاستعادة
          console.log('\n6️⃣ اختبار استعادة العيادة...');
          const restoreResponse = await fetch(`${API_BASE}/api/trash/restore`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              section: 'clinics',
              id: addedClinic.id
            })
          });
          
          if (restoreResponse.ok) {
            console.log(`✅ تم استعادة العيادة بنجاح`);
            
            // 7. اختبار الحذف النهائي
            console.log('\n7️⃣ اختبار الحذف النهائي (للمديرين فقط)...');
            const permDeleteResponse = await fetch(`${API_BASE}/api/clinics?id=${addedClinic.id}&permanent=true`, {
              method: 'DELETE'
            });
            
            if (permDeleteResponse.status === 403) {
              console.log(`✅ الحذف النهائي محظور للمستخدمين العاديين (كما هو متوقع)`);
            } else if (permDeleteResponse.ok) {
              console.log(`✅ تم الحذف النهائي بنجاح`);
            } else {
              console.log(`⚠️ استجابة غير متوقعة للحذف النهائي: ${permDeleteResponse.status}`);
            }
          } else {
            console.log(`❌ فشل في استعادة العيادة: ${restoreResponse.status}`);
          }
        } else {
          console.log(`❌ العيادة التجريبية غير موجودة في سلة المهملات`);
        }
      } else {
        console.log(`❌ فشل في جلب سلة المهملات: ${trashResponse.status}`);
      }
    }
    
    console.log('\n🎉 انتهى اختبار API العيادات');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
  }
}

// تشغيل الاختبار
testClinicsAPI();
const { spawn } = require('child_process');

console.log('🚀 بدء اختبار البناء...');

const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ تم بناء النظام بنجاح!');
  } else {
    console.log(`❌ فشل في البناء مع رمز الخطأ: ${code}`);
  }
});

buildProcess.on('error', (error) => {
  console.log(`❌ خطأ في تشغيل البناء: ${error.message}`);
});
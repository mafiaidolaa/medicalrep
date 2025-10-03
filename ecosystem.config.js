module.exports = {
  apps: [
    {
      name: 'nextn-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/nextn',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/www/nextn/logs/err.log',
      out_file: '/var/www/nextn/logs/out.log',
      log_file: '/var/www/nextn/logs/combined.log',
      time: true
    }
  ]
};
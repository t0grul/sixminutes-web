module.exports = {
  apps: [
    {
      name: 'sixminutes',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/sixminutes',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
}

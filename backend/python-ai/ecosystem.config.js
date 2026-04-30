module.exports = {
  apps: [
    {
      name: 'hairstyle-ai',
      script: 'C:\\Python314\\python.exe',
      args: '-m uvicorn main:app --host 127.0.0.1 --port 8001 --workers 2',
      cwd: 'C:\\Users\\Dell\\Desktop\\MySalonBookings\\backend\\python-ai',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

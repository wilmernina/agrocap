const path = require('node:path');

module.exports = {
  apps: [{
    name: 'agrosys-api',
    cwd: path.join(__dirname, '..', 'backend'),
    script: 'src/server.ts',
    interpreter: 'node',
    node_args: '--experimental-transform-types',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_memory_restart: '500M',
    kill_timeout: 10_000,
    listen_timeout: 10_000,
    time: true,
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000,
    },
  }],
};

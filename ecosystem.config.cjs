module.exports = {
    apps: [
        {
            name: 'skinmarket-backend',
            script: './src/backend/server.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development'
            },
            env_production: {
                NODE_ENV: 'production'
            }
        },
        {
            name: 'skinmarket-frontend',
            script: 'npm',
            args: 'run dev',
            env: {
                NODE_ENV: 'development'
            }
        }
    ]
};

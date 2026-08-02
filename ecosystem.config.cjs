module.exports = {
    apps: [
        {
            name: 'skinmarket-backend',
            script: './src/backend/server.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            // Log configuration
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_file: './logs/pm2-combined.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            // Delay between restarts
            restart_delay: 5000,
            max_restarts: 10,
            // Environment variables
            env: {
                NODE_ENV: 'development',
                PORT: 3001
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3001
            }
        }
    ]
};


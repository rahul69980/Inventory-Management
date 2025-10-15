// PM2 Ecosystem Configuration for Inventory Management System
module.exports = {
  apps: [{
    name: 'inventory-management-system',
    script: 'server.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster', // Enable cluster mode for better performance
    
    // Environment configuration
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    
    // Production environment
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    
    // Logging configuration
    log_file: '/var/log/inventory-app/combined.log',
    out_file: '/var/log/inventory-app/out.log',
    error_file: '/var/log/inventory-app/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    watch: false, // Disable in production
    ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],
    
    // Resource limits
    max_memory_restart: '1G',
    
    // Restart configuration
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Advanced options
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Automation
    autorestart: true,
    
    // Additional environment variables
    env_file: '.env.production'
  }],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu', // Change to your Linux user
      host: 'your-server-ip', // Change to your server IP
      ref: 'origin/main',
      repo: 'http://github.com/your-username/inventory-management.git', // Change to your repo
      path: '/var/www/inventory-app',
      'post-deploy': 'npm install && cp .env.production .env && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      
      // SSH configuration
      ssh_options: 'StrictHostKeyChecking=no',
      
      // Environment setup
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};

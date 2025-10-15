#!/bin/bash

# ================================================================
# Inventory Management System - Linux Deployment Script
# ================================================================

echo "🚀 Starting deployment of Inventory Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="inventory-management-system"
APP_DIR="/var/www/inventory-app"
LOG_DIR="/var/log/inventory-app"
USER=$(whoami)

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

print_info "Starting deployment as user: $USER"

# Update system packages
print_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not already installed)
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js..."
    curl -fsSL http://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_status "Node.js installed successfully"
else
    print_status "Node.js is already installed ($(node --version))"
fi

# Install MongoDB (if not already installed)
if ! command -v mongod &> /dev/null; then
    print_info "Installing MongoDB..."
    
    # Import MongoDB GPG key
    wget -qO - http://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    
    # Add MongoDB repository
    echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    
    # Update package list and install MongoDB
    sudo apt update
    sudo apt install -y mongodb-org
    
    # Start and enable MongoDB
    sudo systemctl start mongod
    sudo systemctl enable mongod
    
    print_status "MongoDB installed and started"
else
    print_status "MongoDB is already installed"
    sudo systemctl start mongod
fi

# Install PM2 globally (if not already installed)
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    sudo npm install -g pm2
    
    # Set up PM2 startup script
    pm2 startup | tail -n 1 | sudo bash
    
    print_status "PM2 installed successfully"
else
    print_status "PM2 is already installed ($(pm2 --version))"
fi

# Create application directories
print_info "Creating application directories..."
sudo mkdir -p $APP_DIR
sudo mkdir -p $LOG_DIR
sudo mkdir -p $APP_DIR/uploads
sudo mkdir -p $APP_DIR/logs
sudo mkdir -p $APP_DIR/temp

# Set proper ownership
sudo chown -R $USER:$USER $APP_DIR
sudo chown -R $USER:$USER $LOG_DIR

print_status "Directories created successfully"

# Copy application files (assuming script is run from project directory)
print_info "Copying application files..."
if [ -f "package.json" ]; then
    cp -r . $APP_DIR/
    print_status "Application files copied"
else
    print_error "package.json not found. Make sure you're running this script from the project directory"
    exit 1
fi

# Navigate to application directory
cd $APP_DIR

# Install npm dependencies
print_info "Installing npm dependencies..."
npm install --production
print_status "Dependencies installed"

# Copy production environment file
if [ -f ".env.production" ]; then
    cp .env.production .env
    print_status "Production environment file copied"
else
    print_warning "No .env.production file found. Please create one with your production settings."
fi

# Install and configure nginx (optional reverse proxy)
read -p "Do you want to install and configure nginx as a reverse proxy? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Installing nginx..."
    sudo apt install -y nginx
    
    # Create nginx configuration
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Serve static files directly
    location /uploads/ {
        alias $APP_DIR/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    location /css/ {
        alias $APP_DIR/public/css/;
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
    
    location /js/ {
        alias $APP_DIR/public/js/;
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
EOF
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    sudo nginx -t
    
    if [ $? -eq 0 ]; then
        sudo systemctl restart nginx
        sudo systemctl enable nginx
        print_status "Nginx configured and started"
    else
        print_error "Nginx configuration test failed"
    fi
fi

# Simple firewall setup (optional)
if command -v ufw &> /dev/null; then
    print_info "Setting up basic firewall..."
    sudo ufw allow 22    # SSH
    sudo ufw allow 3000  # Application port
    print_status "Basic firewall configured"
fi

# Seed the database (optional)
read -p "Do you want to seed the database with sample data? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Seeding database..."
    NODE_ENV=production node scripts/seedData.js
    print_status "Database seeded successfully"
fi

# Start the application with PM2
print_info "Starting application with PM2..."
pm2 start ecosystem.config.js --env production
pm2 save

print_status "Application started successfully"

# Display status
echo
print_info "Deployment Summary:"
echo "===================="
echo "Application: $APP_NAME"
echo "Directory: $APP_DIR"
echo "Log Directory: $LOG_DIR"
echo "Environment: production"
echo "Node.js Version: $(node --version)"
echo "PM2 Version: $(pm2 --version)"
echo

print_info "Useful Commands:"
echo "=================="
echo "• Check PM2 status: pm2 status"
echo "• View logs: pm2 logs $APP_NAME"
echo "• Restart app: pm2 restart $APP_NAME"
echo "• Stop app: pm2 stop $APP_NAME"
echo "• Monitor app: pm2 monit"
echo "• Check MongoDB: sudo systemctl status mongod"
echo "• Check Nginx: sudo systemctl status nginx"
echo

# Check if everything is running
print_info "System Status Check:"
echo "===================="

# Check MongoDB
if systemctl is-active --quiet mongod; then
    print_status "MongoDB is running"
else
    print_error "MongoDB is not running"
fi

# Check PM2 app
if pm2 list | grep -q "$APP_NAME.*online"; then
    print_status "Application is running"
else
    print_error "Application is not running"
fi

# Check Nginx (if installed)
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        print_status "Nginx is running"
    else
        print_error "Nginx is not running"
    fi
fi

echo
print_status "🎉 Deployment completed!"
echo
print_info "Your Inventory Management System should now be accessible at:"
echo "• Direct access: http://your-server-ip:3000"
if command -v nginx &> /dev/null && systemctl is-active --quiet nginx; then
    echo "• Through Nginx: http://your-domain.com (if configured)"
fi
echo
print_warning "Don't forget to:"
echo "1. Update your domain in nginx configuration"
echo "2. Update .env file with production values"
echo "3. Configure your firewall properly"
echo "4. Set up regular database backups"
echo

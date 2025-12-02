#!/bin/bash
# SixMinutes Deployment Script
# Run this on your Hetzner server after initial setup

set -e

APP_DIR="/var/www/sixminutes"
REPO_URL="YOUR_GIT_REPO_URL"  # Change this to your repo

echo "🚀 Starting deployment..."

# Navigate to app directory
cd $APP_DIR

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build the application
echo "🏗️ Building application..."
npm run build

# Restart PM2
echo "🔄 Restarting application..."
pm2 restart sixminutes || pm2 start ecosystem.config.js

echo "✅ Deployment complete!"

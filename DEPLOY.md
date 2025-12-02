# SixMinutes Deployment Guide - Hetzner CX23

## Prerequisites
- Hetzner CX23 server with Ubuntu 22.04/24.04
- Domain name pointed to your server IP
- SSH access to your server

---

## Step 1: Server Setup (Run as root)

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v

# Install PM2 globally
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql
```

---

## Step 2: Setup PostgreSQL Database

```bash
# Switch to postgres user and create database
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE sixminutes;
CREATE USER sixminutes_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE sixminutes TO sixminutes_user;
ALTER DATABASE sixminutes OWNER TO sixminutes_user;
\c sixminutes
GRANT ALL ON SCHEMA public TO sixminutes_user;
\q
```

---

## Step 3: Create App Directory & Clone Code

```bash
# Create directory
mkdir -p /var/www/sixminutes
cd /var/www/sixminutes

# Option A: Clone from Git
git clone YOUR_REPO_URL .

# Option B: Upload files via SCP (from your local machine)
# scp -r ./sixminutes-web/* root@YOUR_SERVER_IP:/var/www/sixminutes/
```

---

## Step 4: Configure Environment

```bash
cd /var/www/sixminutes

# Create .env file
nano .env
```

Add the following (replace with your values):
```
DATABASE_URL="postgresql://sixminutes_user:YOUR_SECURE_DB_PASSWORD@localhost:5432/sixminutes"
JWT_SECRET="generate-a-64-character-random-string-here"
NODE_ENV="production"
```

Generate a secure JWT secret:
```bash
openssl rand -base64 64
```

---

## Step 5: Install Dependencies & Build

```bash
cd /var/www/sixminutes

# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build the app
npm run build
```

---

## Step 6: Setup PM2

```bash
cd /var/www/sixminutes

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

---

## Step 7: Configure Nginx

```bash
# Copy nginx config
cp /var/www/sixminutes/nginx.conf /etc/nginx/sites-available/sixminutes

# Edit and replace YOUR_DOMAIN.com with your actual domain
nano /etc/nginx/sites-available/sixminutes

# Enable the site
ln -s /etc/nginx/sites-available/sixminutes /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx
```

---

## Step 8: Setup SSL with Certbot

```bash
# Get SSL certificate
certbot --nginx -d yourdomain.com

# Certbot will automatically configure HTTPS
# Choose to redirect HTTP to HTTPS when prompted
```

---

## Step 9: Create Admin User

```bash
cd /var/www/sixminutes

# Run admin creation script
npx tsx scripts/create-admin.ts
```

---

## Step 10: Configure Firewall (Optional but Recommended)

```bash
# Install UFW
apt install -y ufw

# Allow SSH
ufw allow ssh

# Allow HTTP and HTTPS
ufw allow 'Nginx Full'

# Enable firewall
ufw enable
```

---

## Useful Commands

| Task | Command |
|------|---------|
| View app logs | `pm2 logs sixminutes` |
| Restart app | `pm2 restart sixminutes` |
| Stop app | `pm2 stop sixminutes` |
| Check status | `pm2 status` |
| Monitor | `pm2 monit` |
| Update & deploy | `cd /var/www/sixminutes && ./deploy.sh` |

---

## Updating the App

```bash
cd /var/www/sixminutes
chmod +x deploy.sh
./deploy.sh
```

Or manually:
```bash
cd /var/www/sixminutes
git pull origin main
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart sixminutes
```

---

## Troubleshooting

### App not starting
```bash
pm2 logs sixminutes --lines 50
```

### Database connection issues
```bash
# Test connection
psql -U sixminutes_user -d sixminutes -h localhost
```

### Nginx issues
```bash
nginx -t
systemctl status nginx
journalctl -u nginx
```

### Check if port is in use
```bash
lsof -i :3001
```

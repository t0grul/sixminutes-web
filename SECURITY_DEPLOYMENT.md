# SixMinutes - Complete Security & Deployment Guide

## 🛡️ Security Overview

### Potential Threats & Mitigations

| Threat | Risk Level | Mitigation |
|--------|------------|------------|
| SQL Injection | High | Prisma ORM prevents raw SQL |
| XSS Attacks | Medium | Input sanitization, CSP headers |
| CSRF | Medium | SameSite cookies, CSRF tokens |
| Brute Force | High | Rate limiting, account lockout |
| Data Breach | High | Strong JWT secrets, encrypted passwords |
| DDoS | Medium | Nginx rate limiting, fail2ban |
| Man-in-Middle | Medium | HTTPS/TLS encryption |

---

## 🔐 Security Checklist

### 1. Authentication & Authorization
- [ ] Strong JWT secret (64+ chars)
- [ ] Password hashing with bcrypt (12 rounds)
- [ ] Session timeout
- [ ] Role-based access control
- [ ] Admin-only routes protected

### 2. Database Security
- [ ] PostgreSQL with strong password
- [ ] Separate database user per app
- [ ] No root database access
- [ ] Database connections from localhost only
- [ ] Regular backups

### 3. Network Security
- [ ] HTTPS with valid SSL certificate
- [ ] Security headers (HSTS, CSP, X-Frame-Options)
- [ ] Firewall configured
- [ ] Fail2ban for brute force protection
- [ ] SSH key authentication only

### 4. Application Security
- [ ] Environment variables for secrets
- [ ] No secrets in code
- [ ] Input validation
- [ ] Error handling without info leakage
- [ ] Regular dependency updates

---

## 🚀 Complete Deployment Steps

### Phase 1: Server Setup

```bash
# Connect to server
ssh root@91.99.120.21

# 1. Update system
apt update && apt upgrade -y

# 2. Install essential packages
apt install -y curl wget git nginx certbot python3-certbot-nginx

# 3. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. Install PM2 globally
npm install -g pm2

# 5. Install PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# 6. Install security tools
apt install -y fail2ban ufw
```

### Phase 2: Database Security

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user with strong password
CREATE DATABASE sixminutes;
CREATE USER sixminutes_user WITH ENCRYPTED PASSWORD 'SixMin2024!@#DB_Passw0rd$';
GRANT ALL PRIVILEGES ON DATABASE sixminutes TO sixminutes_user;
ALTER DATABASE sixminutes OWNER TO sixminutes_user;
\c sixminutes
GRANT ALL ON SCHEMA public TO sixminutes_user;
REVOKE ALL ON schema public FROM public;
GRANT USAGE ON schema public TO sixminutes_user;
\q

# Secure PostgreSQL
nano /etc/postgresql/*/main/postgresql.conf
# Set: listen_addresses = 'localhost'

nano /etc/postgresql/*/main/pg_hba.conf
# Comment out IPv6 connections
# Ensure only local connections allowed

systemctl restart postgresql
```

### Phase 3: Application Deployment

```bash
# Create app directory
mkdir -p /var/www/sixminutes
cd /var/www/sixminutes

# Set proper permissions
chown -R root:root /var/www/sixminutes
chmod 755 /var/www/sixminutes

# Upload files from Windows (run in PowerShell on your PC)
# scp -r C:\Users\user\Desktop\6ME\sixminutes-web\* root@91.99.120.21:/var/www/sixminutes/

# Install dependencies
npm ci --production=false

# Create secure .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://sixminutes_user:SixMin2024!@#DB_Passw0rd$@localhost:5432/sixminutes"
JWT_SECRET="K8xPq2mN7vR4tY9wB3jF6hL1cD5gA0sE8uI2oP4aZ7xC9vM3nQ6wR1tY5uJ8kH0l"
NODE_ENV="production"
PORT=3001
EOF

# Set .env permissions
chmod 600 .env

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Phase 4: Nginx Configuration

```bash
# Copy nginx config
cp /var/www/sixminutes/nginx.conf /etc/nginx/sites-available/sixminutes

# Create enhanced security config
cat > /etc/nginx/snippets/security-headers.conf << 'EOF'
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
EOF

# Update main config with security headers
nano /etc/nginx/sites-available/sixminutes
# Add: include /etc/nginx/snippets/security-headers.conf;

# Enable site
ln -s /etc/nginx/sites-available/sixminutes /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t
systemctl reload nginx
```

### Phase 5: SSL Certificate

```bash
# Get SSL certificate
certbot --nginx -d sixminutes.ftp.sh --non-interactive --agree-tos --email admin@sixminutes.ftp.sh

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### Phase 6: Firewall & Security

```bash
# Configure UFW firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable

# Configure Fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl start fail2ban
```

### Phase 7: Create Admin User

```bash
cd /var/www/sixminutes
npx tsx scripts/create-admin.ts admin "Sx6M!n@2024$Htzn"
```

### Phase 8: Security Hardening

```bash
# Disable root SSH login
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no (use SSH keys only)

# Create deploy user for future updates
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp -r /root/.ssh /home/deploy/
chown -R deploy:deploy /home/deploy/.ssh

# Set up automatic security updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
# Select "Yes" for automatic updates

# Create backup script
cat > /var/www/sixminutes/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/sixminutes"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U sixminutes_user sixminutes > $BACKUP_DIR/db_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/sixminutes

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /var/www/sixminutes/backup.sh
echo "0 2 * * * /var/www/sixminutes/backup.sh" | crontab -

# Restart SSH
systemctl restart ssh
```

---

## 📊 Monitoring & Maintenance

### Daily Checks
```bash
# Check application status
pm2 status
pm2 logs sixminutes --lines 50

# Check server resources
df -h
free -h
top

# Check security logs
tail -f /var/log/auth.log
tail -f /var/log/fail2ban.log
```

### Weekly Maintenance
```bash
# Update dependencies
cd /var/www/sixminutes
npm audit fix
npm update

# Check SSL certificate
certbot certificates

# Review fail2ban bans
fail2ban-client status sshd
```

### Monthly Tasks
```bash
# Full system update
apt update && apt upgrade -y

# Review logs for suspicious activity
grep "Failed password" /var/log/auth.log | tail -20

# Check disk usage and cleanup
du -sh /var/www/sixminutes/*
journalctl --vacuum-time=30d
```

---

## 🚨 Incident Response

### If Security Incident Occurs

1. **Isolate the server:**
   ```bash
   ufw deny all
   pm2 stop sixminutes
   ```

2. **Check logs:**
   ```bash
   tail -100 /var/log/auth.log
   tail -100 /var/log/nginx/access.log
   pm2 logs sixminutes --lines 100
   ```

3. **Change passwords:**
   ```bash
   # Change database password
   sudo -u postgres psql -c "ALTER USER sixminutes_user WITH ENCRYPTED PASSWORD 'new-strong-password';"
   
   # Update .env file
   nano /var/www/sixminutes/.env
   ```

4. **Restart services:**
   ```bash
   pm2 restart sixminutes
   ufw allow ssh
   ufw allow 'Nginx Full'
   ```

---

## ✅ Final Security Checklist

- [ ] HTTPS enabled with valid certificate
- [ ] Firewall configured (UFW)
- [ ] Fail2ban running
- [ ] Database using strong password
- [ ] JWT secret is 64+ characters
- [ ] Environment variables secured (chmod 600)
- [ ] Root SSH disabled
- [ ] Security headers configured
- [ ] Automatic backups running
- [ ] SSL auto-renewal configured
- [ ] Admin credentials secured
- [ ] Dependencies audited and updated

---

## 🌐 Access Your Application

**URL:** https://sixminutes.ftp.sh
**Admin Login:** admin / Sx6M!n@2024$Htzn

---

## 📞 Emergency Contacts

- **Server:** Hetzner Cloud Console
- **Domain:** Your domain registrar
- **SSL:** Let's Encrypt (certbot)

---

## 🔄 Update Process

To update your application in the future:

```bash
# SSH as deploy user
ssh deploy@91.99.120.21

# Navigate to app
cd /var/www/sixminutes

# Pull latest changes
git pull origin main

# Update dependencies
npm ci

# Run migrations if needed
npx prisma migrate deploy

# Build and restart
npm run build
pm2 restart sixminutes
```

---

**Your app is now production-ready with enterprise-level security!** 🎉

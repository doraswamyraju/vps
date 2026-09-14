# 🚀 VPS Deployment & Maintenance Runbook

Complete guide for updating, deploying, and troubleshooting the VPS Multi-Tenant Platform on **`srv875579`** (`vps.sriddha.com`).

---

## ⚡ 1. One-Liner Quick Deploy (Recommended)

Copy and run this exact command in your VPS terminal (`SSH root@147.93.107.21`):

```bash
cd /var/www/vps && git pull origin main && cd backend && npm install && pm2 restart vps-dashboard-api && cd ../frontend && npm install && npm run build && echo "✅ Deployment completed successfully!"
```

---

## 📋 2. Step-by-Step Deployment

### Step 1: Navigate to Project Folder
```bash
cd /var/www/vps
```

### Step 2: Pull Latest Code from GitHub
```bash
git pull origin main
```
*(If you see local changes warning, run `git stash` then `git pull origin main`)*

### Step 3: Update & Restart Backend
```bash
cd /var/www/vps/backend
npm install
pm2 restart vps-dashboard-api
```

### Step 4: Build Frontend
```bash
cd /var/www/vps/frontend
npm install
npm run build
```

### Step 5: Check Health & Logs
```bash
pm2 status vps-dashboard-api
pm2 logs vps-dashboard-api --lines 30
```

---

## ⚙️ 3. Backend Environment Configuration (`.env`)

The backend environment file is located at `/var/www/vps/backend/.env`:

```env
PORT=5000
JWT_SECRET=supersecretjwtkey_vps_dashboard_2026
ADMIN_USER=admin
ADMIN_PASS=adminpassword123
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASS=Rajugari@2026
DASHBOARD_DB=vps_panel_db
```

### Quick Commands to Edit or Update `.env`:
- **Using nano:**
  ```bash
  nano /var/www/vps/backend/.env
  ```
- **Update MySQL Password directly:**
  ```bash
  sed -i 's/MYSQL_PASS=.*/MYSQL_PASS=Rajugari@2026/' /var/www/vps/backend/.env
  pm2 restart vps-dashboard-api
  ```

---

## 🛠️ 4. Troubleshooting Common Issues

### Issue 1: `fatal: not a git repository`
**Cause:** You are running `git pull` from the root home folder (`~`) instead of `/var/www/vps`.  
**Fix:**
```bash
cd /var/www/vps
git pull origin main
```

---

### Issue 2: `PM2 process not found or errored`
**Check status:**
```bash
pm2 list
pm2 show vps-dashboard-api
```
**Restart or start if stopped:**
```bash
cd /var/www/vps/backend
pm2 start server.js --name "vps-dashboard-api"
pm2 save
```

---

### Issue 3: `MySQL connection error / Access denied`
**Fix:**
1. Verify MySQL service is active:
   ```bash
   systemctl status mysql
   ```
2. If stopped, start MySQL:
   ```bash
   systemctl start mysql
   ```
3. Test login with credentials:
   ```bash
   mysql -u root -p'Rajugari@2026' -e "SHOW DATABASES;"
   ```

---

### Issue 4: `Vite build out of memory or high CPU`
If Vite build spikes on 1 CPU server:
```bash
cd /var/www/vps/frontend
NODE_OPTIONS="--max-old-space-size=1024" npm run build
```

---

### Issue 5: `Nginx 502 Bad Gateway`
**Restart Nginx and API:**
```bash
pm2 restart vps-dashboard-api
systemctl reload nginx
```

---

## 📌 Summary Reference Table

| Item | Value / Location |
| :--- | :--- |
| **Server Path** | `/var/www/vps` |
| **Backend API Directory** | `/var/www/vps/backend` |
| **Frontend Directory** | `/var/www/vps/frontend` |
| **Frontend Production Build** | `/var/www/vps/frontend/dist` |
| **PM2 Process Name** | `vps-dashboard-api` |
| **Backend Port** | `5000` |
| **Dashboard URL** | `https://vps.sriddha.com` |

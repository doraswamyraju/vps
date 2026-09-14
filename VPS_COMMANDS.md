# VPS Deployment & Update Guide

Follow these commands on your VPS terminal (SSH) to pull the latest changes and deploy the File Manager & Disk Explorer update.

---

### Step 1: Navigate to your project folder
```bash
cd /path/to/vps
```
*(Replace `/path/to/vps` with your actual project path on your server, e.g., `/var/www/vps` or `~/vps`)*

---

### Step 2: Pull latest code from GitHub
```bash
git pull origin main
```

---

### Step 3: Update and restart Backend
```bash
cd backend
npm install
pm2 restart all
```
*(Or specify the backend PM2 process name, e.g., `pm2 restart vps-backend` or `pm2 restart server`)*

---

### Step 4: Build and update Frontend
```bash
cd ../frontend
npm install
npm run build
```
- If your frontend is served via **Nginx** pointing to `frontend/dist`, the build will be served immediately!
- If your frontend is served via a **PM2 process** (e.g., `pm2 serve dist 3000`), restart it:
```bash
pm2 restart frontend
```

---

### Step 5: Verify status and logs
```bash
pm2 status
pm2 logs --lines 20
```

---

### Quick All-in-One Command (Copy & Paste)
```bash
git pull origin main && cd backend && npm install && pm2 restart all && cd ../frontend && npm install && npm run build && echo "Deployment completed successfully!"
```

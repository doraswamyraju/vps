# VPS Management Dashboard & Multi-Tenant Hosting Panel

A modern, fast, and feature-rich VPS Control Panel built with **Node.js, Express, React, Vite, and TailwindCSS**.

---

## 🌟 Key Features

1. **👑 Super Admin & Multi-Tenant Architecture**
   - Super Admin controls full server resources, PM2 applications, databases, and filesystem.
   - Resource Admins (Tenants) are restricted to their assigned applications, databases, and chrooted folder paths.
   - User Management with one-click user creation, resource assignment, and account status toggles.

2. **📊 Virtual Quotas & White-Label Metrics**
   - Configurable display limits per tenant (e.g., `100 GB Disk`, `8 GB RAM`, `4 Virtual Cores`).
   - Custom numbers displayed to client accounts independent of physical server hardware.

3. **📁 File Manager & Disk Space Analyzer**
   - Breadcrumb navigation, file type icons, search, and directory tree exploration.
   - Disk space breakdown visualizer (`ncdu` / TreeSize style) with throttled low-priority background scanning.
   - Built-in text & code editor modal with live saving.

4. **⚡ Live System Monitoring & PM2 App Manager**
   - Live CPU, Memory, Disk, and Uptime metrics.
   - Interactive PM2 Process Manager (Start, Stop, Restart, and live application logs).
   - **PM2 Crash Sentinel & CPU Protection**: Auto-pauses apps that crash 5+ times in 60s to prevent 100% CPU spikes, with instant HTML email alerts containing error log stack traces. See [PM2_CRASH_SENTINEL_GUIDE.md](PM2_CRASH_SENTINEL_GUIDE.md).
   - MySQL & MongoDB health monitor with database sizes, uptime, active connections, and table counts.

---

## 🚀 Deployment

See [VPS_COMMANDS.md](VPS_COMMANDS.md) for full deployment instructions and [PM2_CRASH_SENTINEL_GUIDE.md](PM2_CRASH_SENTINEL_GUIDE.md) for crash sentinel documentation.

### Quick Deploy Command:
```bash
cd /var/www/vps && git pull origin main && cd backend && npm install && pm2 restart vps-dashboard-api && cd ../frontend && npm install && npm run build && echo "✅ Deployed!"
```

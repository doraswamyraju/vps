const express = require('express');
const { exec } = require('child_process');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// Helper to execute PM2 commands via CLI
const runPm2Command = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) return reject(err);
            try {
                resolve(JSON.parse(stdout));
            } catch (e) {
                resolve(stdout);
            }
        });
    });
};

const isAppAllowed = (app, user) => {
    if (!user || user.role === 'superadmin') return true;
    const allowed = (user.resources || [])
        .filter(r => r.type === 'pm2_app')
        .map(r => r.identifier.toLowerCase());
    return allowed.includes(String(app.name).toLowerCase()) || allowed.includes(String(app.id));
};

router.get('/', async (req, res) => {
    try {
        const list = await runPm2Command('pm2 jlist');
        let apps = list.map(app => ({
            id: app.pm_id,
            name: app.name,
            status: app.pm2_env.status,
            restarts: app.pm2_env.restart_time,
            uptime: app.pm2_env.pm_uptime,
            cpu: app.monit ? app.monit.cpu : 0,
            memory: app.monit ? app.monit.memory : 0
        }));

        // Filter for Tenant Admin
        if (req.user?.role !== 'superadmin') {
            apps = apps.filter(app => isAppAllowed(app, req.user));
        }

        res.json(apps);
    } catch (err) {
        console.error('Error fetching PM2 apps:', err);
        res.status(500).json({ message: 'Error fetching applications' });
    }
});

router.post('/start/:id', async (req, res) => {
    const appId = req.params.id;
    try {
        if (req.user?.role !== 'superadmin' && !isAppAllowed({ id: appId, name: appId }, req.user)) {
            return res.status(403).json({ message: 'Unauthorized for this application' });
        }
        await runPm2Command(`pm2 start ${appId}`);
        res.json({ message: `App ${appId} started` });
    } catch (err) {
        res.status(500).json({ message: 'Error starting application' });
    }
});

router.post('/stop/:id', async (req, res) => {
    const appId = req.params.id;
    try {
        if (req.user?.role !== 'superadmin' && !isAppAllowed({ id: appId, name: appId }, req.user)) {
            return res.status(403).json({ message: 'Unauthorized for this application' });
        }
        await runPm2Command(`pm2 stop ${appId}`);
        res.json({ message: `App ${appId} stopped` });
    } catch (err) {
        res.status(500).json({ message: 'Error stopping application' });
    }
});

router.post('/restart/:id', async (req, res) => {
    const appId = req.params.id;
    try {
        if (req.user?.role !== 'superadmin' && !isAppAllowed({ id: appId, name: appId }, req.user)) {
            return res.status(403).json({ message: 'Unauthorized for this application' });
        }
        await runPm2Command(`pm2 restart ${appId}`);
        res.json({ message: `App ${appId} restarted` });
    } catch (err) {
        res.status(500).json({ message: 'Error restarting application' });
    }
});

module.exports = router;

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

router.get('/', async (req, res) => {
    try {
        const list = await runPm2Command('pm2 jlist');
        const apps = list.map(app => ({
            id: app.pm_id,
            name: app.name,
            status: app.pm2_env.status,
            restarts: app.pm2_env.restart_time,
            uptime: app.pm2_env.pm_uptime,
            cpu: app.monit ? app.monit.cpu : 0,
            memory: app.monit ? app.monit.memory : 0
        }));
        res.json(apps);
    } catch (err) {
        console.error('Error fetching PM2 apps:', err);
        res.status(500).json({ message: 'Error fetching applications' });
    }
});

router.post('/start/:id', async (req, res) => {
    try {
        await runPm2Command(`pm2 start ${req.params.id}`);
        res.json({ message: `App ${req.params.id} started` });
    } catch (err) {
        res.status(500).json({ message: 'Error starting application' });
    }
});

router.post('/stop/:id', async (req, res) => {
    try {
        await runPm2Command(`pm2 stop ${req.params.id}`);
        res.json({ message: `App ${req.params.id} stopped` });
    } catch (err) {
        res.status(500).json({ message: 'Error stopping application' });
    }
});

router.post('/restart/:id', async (req, res) => {
    try {
        await runPm2Command(`pm2 restart ${req.params.id}`);
        res.json({ message: `App ${req.params.id} restarted` });
    } catch (err) {
        res.status(500).json({ message: 'Error restarting application' });
    }
});

module.exports = router;

const express = require('express');
const pm2 = require('pm2');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// Connect to PM2 wrapper
const executePm2 = (action, ...args) => {
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                return reject(err);
            }
            pm2[action](...args, (err, result) => {
                pm2.disconnect();
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });
    });
};

router.get('/', async (req, res) => {
    try {
        const list = await executePm2('list');
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
        await executePm2('start', req.params.id);
        res.json({ message: `App ${req.params.id} started` });
    } catch (err) {
        res.status(500).json({ message: 'Error starting application', error: err.message });
    }
});

router.post('/stop/:id', async (req, res) => {
    try {
        await executePm2('stop', req.params.id);
        res.json({ message: `App ${req.params.id} stopped` });
    } catch (err) {
        res.status(500).json({ message: 'Error stopping application', error: err.message });
    }
});

router.post('/restart/:id', async (req, res) => {
    try {
        await executePm2('restart', req.params.id);
        res.json({ message: `App ${req.params.id} restarted` });
    } catch (err) {
        res.status(500).json({ message: 'Error restarting application', error: err.message });
    }
});

module.exports = router;

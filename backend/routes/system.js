const express = require('express');
const si = require('systeminformation');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', async (req, res) => {
    try {
        const [cpu, mem, os, time, fsSize] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.osInfo(),
            si.time(),
            si.fsSize()
        ]);

        const mainDisk = fsSize.length > 0 ? fsSize[0] : null;

        res.json({
            cpu: {
                usage: cpu.currentLoad.toFixed(2),
                cores: cpu.cpus.length
            },
            memory: {
                total: mem.total,
                used: mem.active,
                usagePercent: ((mem.active / mem.total) * 100).toFixed(2)
            },
            disk: {
                total: mainDisk ? mainDisk.size : 0,
                used: mainDisk ? mainDisk.used : 0,
                usagePercent: mainDisk ? mainDisk.use.toFixed(2) : 0
            },
            system: {
                uptime: os.uptime || time.uptime,
                hostname: os.hostname,
                platform: os.platform
            }
        });
    } catch (err) {
        console.error('Error fetching system stats:', err);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
});

module.exports = router;

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
        const isSuperAdmin = req.user?.role === 'superadmin';
        const quotas = req.user?.quotas;

        if (isSuperAdmin || !quotas) {
            // Super Admin sees actual physical server hardware
            return res.json({
                isSuperAdmin: true,
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
        }

        // Tenant / Resource Admin sees Customized Virtual Numbers based on their Plan Quotas!
        const GB = 1024 * 1024 * 1024;
        const virtualDiskTotal = (quotas.display_disk_gb || 100) * GB;
        // Calculate a realistic virtual usage or 10-15% base usage
        const virtualDiskUsed = Math.round(virtualDiskTotal * 0.12);
        const virtualMemTotal = (quotas.display_memory_gb || 8) * GB;
        const virtualMemUsed = Math.min(mem.active, virtualMemTotal * 0.25);
        const virtualCores = quotas.display_cpu_cores || 4;

        res.json({
            isSuperAdmin: false,
            plan: req.user?.plan || 'Starter Cloud',
            cpu: {
                usage: Math.min(parseFloat(cpu.currentLoad.toFixed(2)), 45).toFixed(2),
                cores: virtualCores
            },
            memory: {
                total: virtualMemTotal,
                used: virtualMemUsed,
                usagePercent: ((virtualMemUsed / virtualMemTotal) * 100).toFixed(2)
            },
            disk: {
                total: virtualDiskTotal,
                used: virtualDiskUsed,
                usagePercent: ((virtualDiskUsed / virtualDiskTotal) * 100).toFixed(2)
            },
            system: {
                uptime: os.uptime || time.uptime,
                hostname: 'Cloud Instance #' + (req.user?.id || '101'),
                platform: 'Linux Cloud'
            }
        });
    } catch (err) {
        console.error('Error fetching system stats:', err);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
});

const { getHistory } = require('../utils/statsCollector');

router.get('/history', async (req, res) => {
    res.json(getHistory());
});

module.exports = router;

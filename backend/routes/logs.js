const express = require('express');
const { exec } = require('child_process');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

const isAppAllowed = (appName, user) => {
    if (!user || user.role === 'superadmin') return true;
    const allowed = (user.resources || [])
        .filter(r => r.type === 'pm2_app')
        .map(r => r.identifier.toLowerCase());
    return allowed.includes(String(appName).toLowerCase());
};

// System logs (Super Admin only)
router.get('/system', (req, res) => {
    if (req.user?.role !== 'superadmin') {
        return res.status(403).json({ message: 'Forbidden: System logs are restricted to Super Admin' });
    }

    exec('journalctl -n 100 --no-pager 2>/dev/null || tail -n 100 /var/log/syslog 2>/dev/null', (error, stdout, stderr) => {
        if (error && !stdout) {
            return res.json({ logs: 'No system logs accessible or service running on Windows/restricted environment.' });
        }
        res.json({ logs: stdout || stderr || 'No system logs available.' });
    });
});

// PM2 App logs (supports both /app/:app and /:app)
const fetchAppLogs = (req, res) => {
    const appName = req.params.app;

    if (!appName) {
        return res.status(400).json({ message: 'Application identifier required' });
    }

    if (appName === 'system') {
        if (req.user?.role !== 'superadmin') {
            return res.status(403).json({ message: 'Forbidden: System logs are restricted to Super Admin' });
        }
        return exec('journalctl -n 100 --no-pager 2>/dev/null || tail -n 100 /var/log/syslog 2>/dev/null', (error, stdout) => {
            res.json({ logs: stdout || 'No system logs available.' });
        });
    }

    // Validate appName to prevent command injection
    if (!/^[a-zA-Z0-9_.-]+$/.test(appName)) {
        return res.status(400).json({ message: 'Invalid application name' });
    }

    if (!isAppAllowed(appName, req.user)) {
        return res.status(403).json({ message: 'Unauthorized to view logs for this application' });
    }

    exec(`pm2 logs ${appName} --lines 100 --nostream`, { maxBuffer: 1024 * 1024 * 2 }, (error, stdout, stderr) => {
        if (error && !stdout) {
            return res.json({ logs: `No logs found or process not active: ${appName}` });
        }
        res.json({ logs: stdout || stderr || `Application ${appName} is running with no recent log entries.` });
    });
};

router.get('/app/:app', fetchAppLogs);
router.get('/:app', fetchAppLogs);

module.exports = router;

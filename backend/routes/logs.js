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

router.get('/:app', (req, res) => {
    const appName = req.params.app;
    
    // Validate appName to prevent command injection
    if (!/^[a-zA-Z0-9_-]+$/.test(appName)) {
        return res.status(400).json({ message: 'Invalid application name' });
    }

    if (!isAppAllowed(appName, req.user)) {
        return res.status(403).json({ message: 'Unauthorized to view logs for this application' });
    }

    // pm2 logs [app_name] --lines 100 --nostream
    exec(`pm2 logs ${appName} --lines 100 --nostream`, (error, stdout, stderr) => {
        if (error) {
            console.error('Error fetching logs:', error);
            return res.json({ logs: error.message + '\n' + stdout + '\n' + stderr });
        }
        res.json({ logs: stdout + '\n' + stderr });
    });
});

module.exports = router;

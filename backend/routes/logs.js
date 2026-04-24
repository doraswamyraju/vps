const express = require('express');
const { exec } = require('child_process');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/:app', (req, res) => {
    const appName = req.params.app;
    
    // Validate appName to prevent command injection
    if (!/^[a-zA-Z0-9_-]+$/.test(appName)) {
        return res.status(400).json({ message: 'Invalid application name' });
    }

    // pm2 logs [app_name] --lines 100 --nostream
    exec(`pm2 logs ${appName} --lines 100 --nostream`, (error, stdout, stderr) => {
        if (error) {
            console.error('Error fetching logs:', error);
            // It might fail if app doesn't exist or isn't running pm2 logs correctly, but we return what we can
            return res.json({ logs: error.message + '\n' + stdout + '\n' + stderr });
        }
        res.json({ logs: stdout + '\n' + stderr });
    });
});

module.exports = router;

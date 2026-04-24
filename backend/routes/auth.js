const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'adminpassword123';

    if (username === adminUser && password === adminPass) {
        const token = jwt.sign(
            { username },
            process.env.JWT_SECRET || 'supersecretjwtkey_vps_dashboard_2026',
            { expiresIn: '2h' }
        );
        return res.json({ token, message: 'Logged in successfully' });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
});

module.exports = router;

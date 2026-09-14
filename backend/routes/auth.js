const express = require('express');
const jwt = require('jsonwebtoken');
const { getDbConnection, verifyPassword } = require('../utils/dbManager');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_vps_dashboard_2026';

    // 1. Try Database authentication
    let connection;
    try {
        connection = await getDbConnection(true);
        const [rows] = await connection.query(`
            SELECT u.id, u.name, u.username, u.email, u.password, u.role, u.status,
                   q.display_disk_gb, q.display_memory_gb, q.display_cpu_cores, q.display_bandwidth_gb,
                   p.name as plan_name
            FROM users u
            LEFT JOIN user_quotas q ON u.id = q.user_id
            LEFT JOIN plans p ON q.plan_id = p.id
            WHERE u.username = ? OR (u.email IS NOT NULL AND u.email = ?)
        `, [username, username]);

        if (rows.length > 0) {
            const user = rows[0];
            if (user.status === 'suspended') {
                return res.status(403).json({ message: 'Account is suspended. Please contact administrator.' });
            }

            const isValid = verifyPassword(password, user.password);
            if (isValid) {
                // Fetch assigned resources
                const [resources] = await connection.query('SELECT resource_type, resource_identifier, permissions FROM user_resources WHERE user_id = ?', [user.id]);

                const userPayload = {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    plan: user.plan_name || 'Standard',
                    quotas: {
                        display_disk_gb: user.display_disk_gb || 50,
                        display_memory_gb: user.display_memory_gb || 4,
                        display_cpu_cores: user.display_cpu_cores || 2,
                        display_bandwidth_gb: user.display_bandwidth_gb || 500
                    },
                    resources: resources.map(r => ({
                        type: r.resource_type,
                        identifier: r.resource_identifier,
                        permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions
                    }))
                };

                const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
                return res.json({ token, user: userPayload, message: 'Logged in successfully' });
            }
        }
    } catch (err) {
        console.warn('DB login attempt fallback to .env:', err.message);
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }

    // 2. Fallback to .env ADMIN_USER
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'adminpassword123';

    if (username === adminUser && password === adminPass) {
        const userPayload = {
            id: 1,
            name: 'Super Administrator',
            username: adminUser,
            role: 'superadmin',
            plan: 'Unlimited Server Admin',
            quotas: null,
            resources: []
        };
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: userPayload, message: 'Logged in successfully' });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
});

router.get('/me', authMiddleware, async (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;

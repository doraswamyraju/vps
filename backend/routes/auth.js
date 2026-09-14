const express = require('express');
const jwt = require('jsonwebtoken');
const { getDbConnection, verifyPassword, hashPassword } = require('../utils/dbManager');
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
                   p.id as plan_id,
                   COALESCE(s.plan_name, p.name, 'Custom Cloud Plan') as plan_name,
                   COALESCE(s.amount, p.price, 0) as plan_price,
                   COALESCE(s.interval_type, p.interval_type, 'monthly') as plan_interval,
                   COALESCE(s.currency, p.currency, 'INR') as plan_currency,
                   COALESCE(s.status, 'active') as subscription_status,
                   s.current_period_end as renewal_date
            FROM users u
            LEFT JOIN user_quotas q ON u.id = q.user_id
            LEFT JOIN plans p ON q.plan_id = p.id
            LEFT JOIN subscriptions s ON u.id = s.user_id
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
                    plan: {
                        id: user.plan_id,
                        name: user.plan_name,
                        price: parseFloat(user.plan_price) || 0,
                        interval: user.plan_interval,
                        currency: user.plan_currency,
                        status: user.subscription_status,
                        renewal_date: user.renewal_date
                    },
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
            plan: {
                name: 'Unlimited Super Admin',
                price: 0,
                interval: 'lifetime',
                status: 'active'
            },
            quotas: null,
            resources: []
        };
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: userPayload, message: 'Logged in successfully' });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
});

router.get('/profile', authMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection(true);
        const [rows] = await connection.query(`
            SELECT u.id, u.name, u.username, u.email, u.role, u.status, u.created_at,
                   q.display_disk_gb, q.display_memory_gb, q.display_cpu_cores, q.display_bandwidth_gb,
                   p.id as plan_id,
                   COALESCE(s.plan_name, p.name, 'Custom Cloud Plan') as plan_name,
                   COALESCE(s.amount, p.price, 0) as plan_price,
                   COALESCE(s.currency, p.currency, 'INR') as plan_currency,
                   COALESCE(s.interval_type, p.interval_type, 'monthly') as plan_interval,
                   COALESCE(s.status, 'active') as subscription_status,
                   s.current_period_end as renewal_date
            FROM users u
            LEFT JOIN user_quotas q ON u.id = q.user_id
            LEFT JOIN plans p ON q.plan_id = p.id
            LEFT JOIN subscriptions s ON u.id = s.user_id
            WHERE u.id = ?
        `, [req.user.id]);

        if (rows.length > 0) {
            const user = rows[0];
            const [resources] = await connection.query('SELECT resource_type, resource_identifier, permissions FROM user_resources WHERE user_id = ?', [user.id]);
            return res.json({
                user: {
                    ...user,
                    plan_price: parseFloat(user.plan_price) || 0,
                    resources: resources.map(r => ({
                        type: r.resource_type,
                        identifier: r.resource_identifier,
                        permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions
                    }))
                }
            });
        }
        res.json({ user: req.user });
    } catch (err) {
        res.json({ user: req.user });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
});

router.put('/profile', authMiddleware, async (req, res) => {
    const { name, email, currentPassword, newPassword } = req.body;
    let connection;
    try {
        connection = await getDbConnection(true);
        const [rows] = await connection.query('SELECT * FROM users WHERE id = ?', [req.user.id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found in database' });
        }

        const user = rows[0];

        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to set new password' });
            }
            const isValid = verifyPassword(currentPassword, user.password);
            if (!isValid) {
                return res.status(400).json({ message: 'Incorrect current password' });
            }
            const hashed = hashPassword(newPassword);
            await connection.query('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?', [name || user.name, email || user.email, hashed, user.id]);
        } else {
            await connection.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name || user.name, email || user.email, user.id]);
        }

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Failed to update profile', error: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
});

module.exports = router;

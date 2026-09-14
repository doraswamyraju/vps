const express = require('express');
const { getDbConnection, hashPassword } = require('../utils/dbManager');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// Middleware to ensure only Super Admin can manage users
const requireSuperAdmin = (req, res, next) => {
    if (req.user?.role !== 'superadmin') {
        return res.status(403).json({ message: 'Forbidden: Super Admin access required' });
    }
    next();
};

router.use(requireSuperAdmin);

// 1. List all users with their plans, custom pricing, and assigned resources
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection(true);

        const [users] = await connection.query(`
            SELECT u.id, u.name, u.username, u.email, u.role, u.status, u.created_at,
                   q.display_disk_gb, q.display_memory_gb, q.display_cpu_cores, q.display_bandwidth_gb,
                   p.id as plan_id, COALESCE(s.plan_name, p.name) as plan_name,
                   COALESCE(s.amount, p.price, 0) as custom_price,
                   COALESCE(s.currency, p.currency, 'INR') as currency,
                   COALESCE(s.interval_type, p.interval_type, 'monthly') as interval_type,
                   s.status as subscription_status, s.current_period_end as renewal_date
            FROM users u
            LEFT JOIN user_quotas q ON u.id = q.user_id
            LEFT JOIN plans p ON q.plan_id = p.id
            LEFT JOIN subscriptions s ON u.id = s.user_id
            ORDER BY u.id DESC
        `);

        // Fetch resources for each user
        const [allResources] = await connection.query('SELECT * FROM user_resources');

        const enrichedUsers = users.map(user => {
            const resources = allResources.filter(r => r.user_id === user.id);
            return {
                ...user,
                resources
            };
        });

        res.json(enrichedUsers);
    } catch (err) {
        console.error('Error listing users:', err);
        res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
});

// 2. Create new user with plan, custom pricing & virtual quotas
router.post('/', async (req, res) => {
    const { name, username, email, password, role, plan_id, plan_name, custom_price, currency, interval_type, renewal_date, status, quotas, resources } = req.body;

    if (!name || !username || !password) {
        return res.status(400).json({ message: 'Name, username, and password are required' });
    }

    let connection;
    try {
        connection = await getDbConnection(true);

        // Check if user exists
        const [existing] = await connection.query('SELECT id FROM users WHERE username = ? OR (email IS NOT NULL AND email = ?)', [username, email || '']);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const hashedPassword = hashPassword(password);
        const [userResult] = await connection.query(
            'INSERT INTO users (name, username, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [name, username, email || null, hashedPassword, role || 'admin', status || 'active']
        );

        const userId = userResult.insertId;

        // Assign plan & virtual quotas
        const diskGb = quotas?.display_disk_gb || 100;
        const memoryGb = quotas?.display_memory_gb || 8;
        const cpuCores = quotas?.display_cpu_cores || 4;
        const bandwidthGb = quotas?.display_bandwidth_gb || 1000;

        await connection.query(
            `INSERT INTO user_quotas (user_id, plan_id, display_disk_gb, display_memory_gb, display_cpu_cores, display_bandwidth_gb)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, plan_id || null, diskGb, memoryGb, cpuCores, bandwidthGb]
        );

        // Create subscription / custom pricing record
        const renewalDateValue = renewal_date ? new Date(renewal_date) : null;
        await connection.query(`
            INSERT INTO subscriptions (user_id, plan_id, plan_name, amount, currency, interval_type, status, current_period_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId,
            plan_id || null,
            plan_name || 'Standard Plan',
            custom_price !== undefined ? custom_price : 499,
            currency || 'INR',
            interval_type || 'monthly',
            status || 'active',
            renewalDateValue
        ]);

        // Assign resources if provided
        if (Array.isArray(resources) && resources.length > 0) {
            for (const resItem of resources) {
                if (resItem.type && resItem.identifier) {
                    await connection.query(
                        'INSERT INTO user_resources (user_id, resource_type, resource_identifier, permissions) VALUES (?, ?, ?, ?)',
                        [userId, resItem.type, resItem.identifier, JSON.stringify(resItem.permissions || ['read', 'write'])]
                    );
                }
            }
        }

        res.json({ success: true, message: 'User created successfully', userId });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ message: 'Failed to create user', error: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
});

// 3. Update user details, custom pricing, status, or reset password
router.put('/:id', async (req, res) => {
    const userId = req.params.id;
    const { name, email, password, role, status, plan_id, plan_name, custom_price, currency, interval_type, renewal_date, quotas, resources } = req.body;

    let connection;
    try {
        connection = await getDbConnection(true);

        if (password) {
            const hashed = hashPassword(password);
            await connection.query(
                'UPDATE users SET name = ?, email = ?, password = ?, role = ?, status = ? WHERE id = ?',
                [name, email || null, hashed, role || 'admin', status || 'active', userId]
            );
        } else {
            await connection.query(
                'UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?',
                [name, email || null, role || 'admin', status || 'active', userId]
            );
        }

        // Update quotas
        if (quotas) {
            await connection.query(`
                INSERT INTO user_quotas (user_id, plan_id, display_disk_gb, display_memory_gb, display_cpu_cores, display_bandwidth_gb)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    plan_id = VALUES(plan_id),
                    display_disk_gb = VALUES(display_disk_gb),
                    display_memory_gb = VALUES(display_memory_gb),
                    display_cpu_cores = VALUES(display_cpu_cores),
                    display_bandwidth_gb = VALUES(display_bandwidth_gb)
            `, [userId, plan_id || null, quotas.display_disk_gb || 100, quotas.display_memory_gb || 8, quotas.display_cpu_cores || 4, quotas.display_bandwidth_gb || 1000]);
        }

        // Update Subscription / Pricing
        const renewalDateValue = renewal_date ? new Date(renewal_date) : null;
        await connection.query(`
            INSERT INTO subscriptions (user_id, plan_id, plan_name, amount, currency, interval_type, status, current_period_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                plan_id = VALUES(plan_id),
                plan_name = VALUES(plan_name),
                amount = VALUES(amount),
                currency = VALUES(currency),
                interval_type = VALUES(interval_type),
                status = VALUES(status),
                current_period_end = VALUES(current_period_end)
        `, [
            userId,
            plan_id || null,
            plan_name || 'Standard Plan',
            custom_price !== undefined ? custom_price : 0,
            currency || 'INR',
            interval_type || 'monthly',
            status || 'active',
            renewalDateValue
        ]);

        // Update resources if provided
        if (Array.isArray(resources)) {
            await connection.query('DELETE FROM user_resources WHERE user_id = ?', [userId]);
            for (const resItem of resources) {
                if (resItem.type && resItem.identifier) {
                    await connection.query(
                        'INSERT INTO user_resources (user_id, resource_type, resource_identifier, permissions) VALUES (?, ?, ?, ?)',
                        [userId, resItem.type, resItem.identifier, JSON.stringify(resItem.permissions || ['read', 'write'])]
                    );
                }
            }
        }

        res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Failed to update user', error: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
});

// 4. Quick Toggle Status (Activate / Suspend)
router.patch('/:id/status', async (req, res) => {
    const userId = req.params.id;
    const { status } = req.body; // 'active' | 'suspended'

    if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ message: 'Status must be active or suspended' });
    }

    let connection;
    try {
        connection = await getDbConnection(true);
        await connection.query('UPDATE users SET status = ? WHERE id = ? AND role != "superadmin"', [status, userId]);
        await connection.query('UPDATE subscriptions SET status = ? WHERE user_id = ?', [status, userId]);

        res.json({ success: true, message: `User status changed to ${status}` });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update user status', error: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
});

// 5. Delete user
router.delete('/:id', async (req, res) => {
    const userId = req.params.id;

    let connection;
    try {
        connection = await getDbConnection(true);
        await connection.query('DELETE FROM users WHERE id = ? AND role != "superadmin"', [userId]);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete user', error: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
});

module.exports = router;

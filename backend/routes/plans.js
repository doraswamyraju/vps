const express = require('express');
const { getDbConnection } = require('../utils/dbManager');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// Get all plans (public for logged in users)
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection(true);
        const [plans] = await connection.query('SELECT * FROM plans ORDER BY price ASC');
        res.json(plans);
    } catch (err) {
        console.error('Error fetching plans:', err);
        res.status(500).json({ message: 'Failed to fetch plans', error: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
});

// Admin-only Plan Management
const requireSuperAdmin = (req, res, next) => {
    if (req.user?.role !== 'superadmin') {
        return res.status(403).json({ message: 'Forbidden: Super Admin access required' });
    }
    next();
};

router.post('/', requireSuperAdmin, async (req, res) => {
    const { name, price, currency, interval_type, display_disk_gb, display_memory_gb, display_cpu_cores, display_bandwidth_gb, max_apps, max_databases } = req.body;
    let connection;
    try {
        connection = await getDbConnection(true);
        const [result] = await connection.query(`
            INSERT INTO plans (name, price, currency, interval_type, display_disk_gb, display_memory_gb, display_cpu_cores, display_bandwidth_gb, max_apps, max_databases)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, price || 0, currency || 'INR', interval_type || 'monthly', display_disk_gb || 50, display_memory_gb || 4, display_cpu_cores || 2, display_bandwidth_gb || 500, max_apps || 3, max_databases || 3]);

        res.json({ success: true, message: 'Plan created successfully', planId: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create plan', error: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
});

router.put('/:id', requireSuperAdmin, async (req, res) => {
    const planId = req.params.id;
    const { name, price, currency, interval_type, display_disk_gb, display_memory_gb, display_cpu_cores, display_bandwidth_gb, max_apps, max_databases } = req.body;
    let connection;
    try {
        connection = await getDbConnection(true);
        await connection.query(`
            UPDATE plans SET name = ?, price = ?, currency = ?, interval_type = ?, display_disk_gb = ?, display_memory_gb = ?, display_cpu_cores = ?, display_bandwidth_gb = ?, max_apps = ?, max_databases = ?
            WHERE id = ?
        `, [name, price, currency, interval_type, display_disk_gb, display_memory_gb, display_cpu_cores, display_bandwidth_gb, max_apps, max_databases, planId]);

        res.json({ success: true, message: 'Plan updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update plan', error: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
});

router.delete('/:id', requireSuperAdmin, async (req, res) => {
    const planId = req.params.id;
    let connection;
    try {
        connection = await getDbConnection(true);
        await connection.query('DELETE FROM plans WHERE id = ?', [planId]);
        res.json({ success: true, message: 'Plan deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete plan', error: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
});

module.exports = router;

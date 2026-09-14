const express = require('express');
const { MongoClient } = require('mongodb');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

const isMongoDbAllowed = (dbName, user) => {
    if (!user || user.role === 'superadmin') return true;
    const allowed = (user.resources || [])
        .filter(r => r.type === 'mongo_db')
        .map(r => r.identifier.toLowerCase());
    return allowed.includes(String(dbName).toLowerCase());
};

router.get('/status', async (req, res) => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

    try {
        await client.connect();
        const admin = client.db('admin');
        
        let info = {};
        try {
            info = await admin.command({ serverStatus: 1 });
        } catch (e) {
            console.warn('Could not fetch MongoDB serverStatus (insufficient permissions)');
        }

        let dbs = { databases: [] };
        try {
            const result = await client.db().admin().listDatabases({ authorizedDatabases: true });
            dbs = result;
        } catch (e) {
            try {
                const result = await client.listDatabases({ authorizedDatabases: true });
                dbs = result;
            } catch (e2) {
                try {
                    const result = await client.db('admin').command({ listDatabases: 1, authorizedDatabases: true });
                    dbs = result;
                } catch (e3) {
                    console.error('All MongoDB list methods failed:', e3.message);
                }
            }
        }

        let databases = dbs.databases || [];

        // Filter databases for Tenant Admin
        if (req.user?.role !== 'superadmin') {
            databases = databases.filter(db => isMongoDbAllowed(db.name, req.user));
        }

        res.json({
            status: 'online',
            version: info.version || 'Unknown',
            uptime: info.uptime || 0,
            connections: info.connections?.current || 0,
            databases
        });
    } catch (err) {
        console.error('MongoDB connection error:', err);
        res.status(500).json({ status: 'offline', message: 'Unable to connect to MongoDB', error: err.message });
    } finally {
        await client.close();
    }
});

router.get('/collections/:dbName', async (req, res) => {
    const { dbName } = req.params;

    if (!isMongoDbAllowed(dbName, req.user)) {
        return res.status(403).json({ message: 'Forbidden: Access to this MongoDB database is not permitted.' });
    }

    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

    try {
        await client.connect();
        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();
        
        // Also get stats for each collection
        const detailedCollections = await Promise.all(collections.map(async (col) => {
            try {
                const stats = await db.command({ collStats: col.name });
                return {
                    name: col.name,
                    count: stats.count,
                    size: stats.size
                };
            } catch (e) {
                return { name: col.name, count: '?', size: 0 };
            }
        }));

        res.json(detailedCollections);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch collections', error: err.message });
    } finally {
        await client.close();
    }
});

module.exports = router;

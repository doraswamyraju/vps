const express = require('express');
const { MongoClient } = require('mongodb');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

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
            // Standard method for modern MongoDB driver
            dbs = await client.listDatabases({ authorizedDatabases: true });
        } catch (e) {
            console.error('MongoDB listDatabases error:', e.message);
        }

        res.json({
            status: 'online',
            version: info.version || 'Unknown',
            uptime: info.uptime || 0,
            connections: info.connections?.current || 0,
            databases: dbs.databases
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

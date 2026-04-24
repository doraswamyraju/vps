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
            dbs = await admin.listDatabases({ authorizedDatabases: true });
        } catch (e) {
            console.warn('Could not fetch MongoDB database list:', e.message);
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

module.exports = router;

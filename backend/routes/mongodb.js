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
        const info = await admin.command({ serverStatus: 1 });
        const dbs = await admin.listDatabases();

        res.json({
            status: 'online',
            version: info.version,
            uptime: info.uptime,
            connections: info.connections.current,
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

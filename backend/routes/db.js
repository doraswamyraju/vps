const express = require('express');
const mysql = require('mysql2/promise');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

const getDbConnection = async () => {
    return mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASS || '',
        connectTimeout: 5000
    });
};

router.get('/status', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        
        // Check active threads/connections
        const [connRows] = await connection.execute("SHOW STATUS LIKE 'Threads_connected'");
        const threadsConnected = connRows.length > 0 ? connRows[0].Value : 0;
        
        // List databases
        const [dbRows] = await connection.execute("SHOW DATABASES");
        const databases = dbRows.map(row => row.Database).filter(db => 
            !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(db)
        );

        res.json({
            status: 'online',
            activeConnections: threadsConnected,
            databases: databases
        });
    } catch (err) {
        console.error('MySQL connection error:', err);
        res.status(500).json({ status: 'offline', message: 'Unable to connect to database', error: err.message });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

module.exports = router;

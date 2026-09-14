const express = require('express');
const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const fs = require('fs');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

const tryConnect = async (config) => {
    try {
        return await mysql.createConnection({ ...config, connectTimeout: 4000 });
    } catch (e) {
        return null;
    }
};

const getDbConnection = async () => {
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASS || '';
    const host = process.env.MYSQL_HOST || '127.0.0.1';
    const port = parseInt(process.env.MYSQL_PORT || '3306', 10);

    // 1. Try configured options
    if (process.env.MYSQL_SOCKET) {
        const conn = await tryConnect({ user, password, socketPath: process.env.MYSQL_SOCKET });
        if (conn) return conn;
    }

    // 2. Try TCP 127.0.0.1 / localhost
    let conn = await tryConnect({ host, port, user, password });
    if (conn) return conn;

    if (host !== 'localhost') {
        conn = await tryConnect({ host: 'localhost', port, user, password });
        if (conn) return conn;
    }

    // 3. Try standard Linux Unix sockets if on Linux
    const commonSockets = [
        '/var/run/mysqld/mysqld.sock',
        '/var/lib/mysql/mysql.sock',
        '/tmp/mysql.sock'
    ];
    for (const socketPath of commonSockets) {
        if (fs.existsSync(socketPath)) {
            conn = await tryConnect({ user, password, socketPath });
            if (conn) return conn;
        }
    }

    // If all fail, make one last attempt with original config to throw the exact error
    return await mysql.createConnection({
        host,
        port,
        user,
        password,
        connectTimeout: 5000
    });
};

const checkServiceStatus = () => {
    return new Promise((resolve) => {
        exec('systemctl is-active mysql || systemctl is-active mariadb', (error, stdout) => {
            const status = (stdout || '').trim();
            if (status === 'active') {
                resolve('running');
            } else {
                resolve(status || 'unknown');
            }
        });
    });
};

router.get('/status', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();

        // 1. Version
        const [versionRows] = await connection.execute("SELECT VERSION() as version");
        const version = versionRows.length > 0 ? versionRows[0].version : 'Unknown';

        // 2. Global status metrics
        const [statusRows] = await connection.execute("SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected', 'Uptime', 'Questions', 'Queries', 'Bytes_received', 'Bytes_sent')");
        const statusMap = {};
        for (const row of statusRows) {
            statusMap[row.Variable_name] = row.Value;
        }

        // 3. Detailed Databases with size & table counts
        let databases = [];
        try {
            const [dbSizeRows] = await connection.execute(`
                SELECT 
                    table_schema AS name,
                    COUNT(table_name) AS tableCount,
                    COALESCE(SUM(data_length + index_length), 0) AS sizeBytes
                FROM information_schema.tables
                WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
                GROUP BY table_schema
                ORDER BY sizeBytes DESC
            `);
            databases = dbSizeRows.map(row => ({
                name: row.name,
                tableCount: parseInt(row.tableCount, 10) || 0,
                sizeBytes: parseInt(row.sizeBytes, 10) || 0
            }));
        } catch (e) {
            // Fallback to simple SHOW DATABASES if information_schema permission is restricted
            const [dbRows] = await connection.execute("SHOW DATABASES");
            databases = dbRows
                .map(r => r.Database)
                .filter(db => !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(db))
                .map(name => ({ name, tableCount: 0, sizeBytes: 0 }));
        }

        // Filter databases for Tenant Admin
        if (req.user?.role !== 'superadmin') {
            const allowedDbs = (req.user?.resources || [])
                .filter(r => r.type === 'mysql_db')
                .map(r => r.identifier.toLowerCase());
            databases = databases.filter(db => allowedDbs.includes(db.name.toLowerCase()));
        }

        res.json({
            status: 'online',
            serviceStatus: 'active',
            version,
            uptime: parseInt(statusMap['Uptime'] || 0, 10),
            activeConnections: parseInt(statusMap['Threads_connected'] || 0, 10),
            totalQueries: parseInt(statusMap['Questions'] || statusMap['Queries'] || 0, 10),
            databases
        });
    } catch (err) {
        console.error('MySQL connection error:', err.message);
        const serviceStatus = await checkServiceStatus();

        res.status(500).json({
            status: 'offline',
            serviceStatus,
            message: 'Unable to connect to MySQL database.',
            error: err.message,
            tip: serviceStatus === 'running' 
                ? 'MySQL service is active, but credentials in .env were rejected. Verify MYSQL_USER and MYSQL_PASS.' 
                : 'MySQL service is not currently active. Start it with: sudo systemctl start mysql'
        });
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (e) {}
        }
    }
});

module.exports = router;

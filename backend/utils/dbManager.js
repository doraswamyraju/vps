const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');

// Helper: Hash password using built-in scrypt
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, key] = storedHash.split(':');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
};

const getDbConnection = async (includeDatabase = true) => {
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASS || '';
    const host = process.env.MYSQL_HOST || '127.0.0.1';
    const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
    const database = includeDatabase ? (process.env.DASHBOARD_DB || 'vps_panel_db') : undefined;

    const config = {
        host,
        port,
        user,
        password,
        database,
        connectTimeout: 4000
    };

    if (process.env.MYSQL_SOCKET) {
        config.socketPath = process.env.MYSQL_SOCKET;
        delete config.host;
    }

    return await mysql.createConnection(config);
};

// Initialize Database & Tables automatically on startup
const initDatabase = async () => {
    let connection;
    try {
        // 1. Create database if it doesn't exist
        connection = await getDbConnection(false);
        const dbName = process.env.DASHBOARD_DB || 'vps_panel_db';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.end();

        // 2. Connect to database and create tables
        connection = await getDbConnection(true);

        // Users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('superadmin', 'admin') DEFAULT 'admin',
                status ENUM('active', 'suspended') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Plans table (with Virtual Display Quotas)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                price DECIMAL(10, 2) DEFAULT 0.00,
                currency VARCHAR(10) DEFAULT 'INR',
                interval_type ENUM('monthly', 'yearly') DEFAULT 'monthly',
                display_disk_gb INT DEFAULT 50,
                display_memory_gb INT DEFAULT 4,
                display_cpu_cores INT DEFAULT 2,
                display_bandwidth_gb INT DEFAULT 500,
                max_apps INT DEFAULT 3,
                max_databases INT DEFAULT 3,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // User Custom Quotas (Override per user)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_quotas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE NOT NULL,
                plan_id INT,
                display_disk_gb INT DEFAULT 100,
                display_memory_gb INT DEFAULT 8,
                display_cpu_cores INT DEFAULT 4,
                display_bandwidth_gb INT DEFAULT 1000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // User Assigned Resources
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_resources (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                resource_type ENUM('pm2_app', 'mysql_db', 'mongo_db', 'file_path') NOT NULL,
                resource_identifier VARCHAR(255) NOT NULL,
                permissions JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Subscriptions
        await connection.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                plan_id INT,
                status ENUM('active', 'past_due', 'canceled', 'trialing') DEFAULT 'active',
                amount DECIMAL(10, 2) DEFAULT 0.00,
                currency VARCHAR(10) DEFAULT 'INR',
                payment_gateway VARCHAR(50) DEFAULT 'manual',
                payment_id VARCHAR(100),
                current_period_end TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Seed Default Super Admin if no users exist
        const [userRows] = await connection.query("SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'");
        if (userRows[0].count === 0) {
            const adminUser = process.env.ADMIN_USER || 'admin';
            const adminPass = process.env.ADMIN_PASS || 'adminpassword123';
            const hashed = hashPassword(adminPass);
            await connection.query(
                "INSERT INTO users (name, username, email, password, role, status) VALUES (?, ?, ?, ?, 'superadmin', 'active')",
                ['Super Administrator', adminUser, 'admin@vps.sriddha.com', hashed]
            );
            console.log('✅ Default Super Admin seeded successfully into database.');
        }

        // Seed Default Starter / Pro Plans if none exist
        const [planRows] = await connection.query("SELECT COUNT(*) as count FROM plans");
        if (planRows[0].count === 0) {
            await connection.query(`
                INSERT INTO plans (name, price, currency, interval_type, display_disk_gb, display_memory_gb, display_cpu_cores, display_bandwidth_gb, max_apps, max_databases)
                VALUES 
                ('Starter Cloud', 499.00, 'INR', 'monthly', 50, 4, 2, 250, 2, 2),
                ('Professional Cloud', 999.00, 'INR', 'monthly', 100, 8, 4, 500, 5, 5),
                ('Enterprise Custom', 2499.00, 'INR', 'monthly', 250, 16, 8, 2000, 15, 10)
            `);
            console.log('✅ Default Hosting Plans seeded successfully.');
        }

        console.log('✅ Multi-Tenant Database & Tables initialized.');
    } catch (err) {
        console.warn('⚠️ Multi-tenant DB initialization skipped (MySQL may be offline or initializing):', err.message);
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
};

module.exports = {
    getDbConnection,
    hashPassword,
    verifyPassword,
    initDatabase
};

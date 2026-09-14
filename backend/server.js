require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const systemRoutes = require('./routes/system');
const appsRoutes = require('./routes/apps');
const dbRoutes = require('./routes/db');
const mongodbRoutes = require('./routes/mongodb');
const logsRoutes = require('./routes/logs');
const filesRoutes = require('./routes/files');
const usersRoutes = require('./routes/users');
const plansRoutes = require('./routes/plans');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/apps', appsRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/mongodb', mongodbRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/plans', plansRoutes);

app.get('/', (req, res) => {
    res.send('VPS Dashboard API is running');
});

const { startStatsCollection } = require('./utils/statsCollector');
const { initDatabase } = require('./utils/dbManager');

app.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);
    startStatsCollection();
    await initDatabase();
});

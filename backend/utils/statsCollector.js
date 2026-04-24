const si = require('systeminformation');
const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, '../stats_history.json');
const MAX_ENTRIES = 60; // Keep 60 minutes of data

let history = [];

// Load existing history if available
if (fs.existsSync(STATS_FILE)) {
    try {
        history = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    } catch (e) {
        history = [];
    }
}

const collectStats = async () => {
    try {
        const [cpu, mem] = await Promise.all([
            si.currentLoad(),
            si.mem()
        ]);

        const entry = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            cpu: parseFloat(cpu.currentLoad.toFixed(2)),
            memory: parseFloat(((mem.active / mem.total) * 100).toFixed(2))
        };

        history.push(entry);

        // Limit history size
        if (history.length > MAX_ENTRIES) {
            history.shift();
        }

        // Save to file
        fs.writeFileSync(STATS_FILE, JSON.stringify(history));
    } catch (err) {
        console.error('Error collecting history stats:', err);
    }
};

// Start collecting every minute
const startStatsCollection = () => {
    collectStats(); // Initial collect
    setInterval(collectStats, 60000);
};

const getHistory = () => history;

module.exports = {
    startStatsCollection,
    getHistory
};

const pm2 = require('pm2');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Email configuration
const EMAIL_USER = process.env.ALERT_EMAIL_USER || 'rajugariventures@gmail.com';
const EMAIL_PASS = (process.env.ALERT_EMAIL_PASS || 'tizr qtsh lwyl pstq').replace(/\s+/g, '');
const ALERT_TO = process.env.ALERT_EMAIL_TO || 'doraswamyraju.ca@gmail.com, rajugariventures@gmail.com';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

// Crash tracking state
// Structure: { [appName]: [timestamp1, timestamp2, ...] }
const crashHistory = {};
const pausedApps = new Set();
const CRASH_THRESHOLD = 5; // 5 crashes
const CRASH_WINDOW_MS = 60 * 1000; // within 60 seconds

// Read last N lines from a log file
const getErrorLogSnippet = (appName, linesCount = 20) => {
    const possiblePaths = [
        `/root/.pm2/logs/${appName}-error.log`,
        path.join(process.env.HOME || '/root', `.pm2/logs/${appName}-error.log`)
    ];

    for (const logPath of possiblePaths) {
        if (fs.existsSync(logPath)) {
            try {
                const data = fs.readFileSync(logPath, 'utf8');
                const lines = data.trim().split('\n');
                return lines.slice(-linesCount).join('\n');
            } catch (e) {
                console.error(`Failed to read log at ${logPath}:`, e.message);
            }
        }
    }
    return 'No error log file found or accessible.';
};

// Send critical email alert
const sendCrashAlertEmail = async ({ appName, appId, crashCount, errorSnippet }) => {
    const timeString = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 25px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e1e4e8; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <div style="background: #dc2626; color: #ffffff; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">🚨 CRITICAL: PM2 App Crash-Loop Detected</h1>
                <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Application Auto-Paused to Protect Server CPU</p>
            </div>
            
            <div style="padding: 24px; color: #333333;">
                <p style="font-size: 15px; margin-top: 0;">
                    PM2 detected rapid crash-restarts for <strong>${appName}</strong> on your Hostinger VPS.
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px; font-weight: bold; width: 35%;">Application:</td>
                        <td style="padding: 10px;"><strong style="color: #dc2626;">${appName}</strong> (PM2 ID: ${appId})</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px; font-weight: bold;">Server / Host:</td>
                        <td style="padding: 10px;">147.93.107.21 (Hostinger VPS)</td>
                    </tr>
                    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px; font-weight: bold;">Crashes in Window:</td>
                        <td style="padding: 10px;"><span style="color: #dc2626; font-weight: bold;">${crashCount} crashes</span> within 60s</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px; font-weight: bold;">Action Taken:</td>
                        <td style="padding: 10px;"><span style="background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-weight: bold;">AUTO-PAUSED (pm2 stop)</span></td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td style="padding: 10px; font-weight: bold;">Timestamp:</td>
                        <td style="padding: 10px;">${timeString} IST</td>
                    </tr>
                </table>

                <h3 style="font-size: 15px; margin-top: 20px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
                    Recent Error Log Trace:
                </h3>
                <pre style="background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 6px; font-size: 12px; line-height: 1.4; overflow-x: auto; white-space: pre-wrap; font-family: monospace;">${errorSnippet}</pre>

                <div style="margin-top: 24px; padding: 15px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; font-size: 13px; color: #1e40af;">
                    <strong>Next Steps:</strong>
                    <ol style="margin: 8px 0 0; padding-left: 20px;">
                        <li>Review the error log snippet above.</li>
                        <li>Fix the issue in the app code or configuration.</li>
                        <li>Restart the app via your VPS dashboard at <a href="https://vps.sriddha.com" style="color: #2563eb; text-decoration: underline;">vps.sriddha.com</a> or run <code>pm2 start ${appName}</code>.</li>
                    </ol>
                </div>
            </div>

            <div style="background: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                Sent automatically by Sriddha VPS Dashboard System Monitor
            </div>
        </div>
    </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"VPS Crash Sentinel" <${EMAIL_USER}>`,
            to: ALERT_TO,
            subject: `🚨 [CRITICAL ALERT] App Paused: ${appName} crashed ${crashCount} times on VPS`,
            html: htmlContent
        });
        console.log(`[Crash Sentinel] Alert email sent for ${appName}: ${info.messageId}`);
    } catch (err) {
        console.error(`[Crash Sentinel] Failed to send alert email for ${appName}:`, err.message);
    }
};

// Handle app crash logic
const handleAppCrash = (appName, appId) => {
    if (pausedApps.has(appName)) return;

    const now = Date.now();
    if (!crashHistory[appName]) {
        crashHistory[appName] = [];
    }

    // Filter crashes within the sliding time window
    crashHistory[appName] = crashHistory[appName].filter(t => (now - t) < CRASH_WINDOW_MS);
    crashHistory[appName].push(now);

    const count = crashHistory[appName].length;
    console.log(`[Crash Sentinel] App "${appName}" crashed (${count}/${CRASH_THRESHOLD} in 60s)`);

    if (count >= CRASH_THRESHOLD) {
        pausedApps.add(appName);
        console.warn(`[Crash Sentinel] ⚠️ Threshold reached for "${appName}"! Executing auto-pause...`);

        // 1. Immediately Stop the app to protect VPS CPU
        exec(`pm2 stop ${appId}`, (err) => {
            if (err) {
                console.error(`[Crash Sentinel] Failed to stop ${appName}:`, err.message);
            } else {
                console.log(`[Crash Sentinel] ✅ Successfully stopped "${appName}" (ID: ${appId})`);
            }
        });

        // 2. Fetch error logs
        const errorSnippet = getErrorLogSnippet(appName);

        // 3. Send Email Alert
        sendCrashAlertEmail({
            appName,
            appId,
            crashCount: count,
            errorSnippet
        });

        // Cooldown: allow alerts again after 10 minutes if user restarts it
        setTimeout(() => {
            pausedApps.delete(appName);
            delete crashHistory[appName];
        }, 10 * 60 * 1000);
    }
};

// Start the PM2 Bus listener
const startCrashMonitor = () => {
    pm2.connect((err) => {
        if (err) {
            console.error('[Crash Sentinel] PM2 connect error:', err);
            return;
        }

        console.log('[Crash Sentinel] Connected to PM2. Launching event bus...');

        pm2.launchBus((busErr, bus) => {
            if (busErr) {
                console.error('[Crash Sentinel] PM2 launchBus error:', busErr);
                return;
            }

            console.log('[Crash Sentinel] 🛡️ PM2 Crash Sentinel is actively watching all applications.');

            // Listen for restart/crash/exit events
            bus.on('process:event', (data) => {
                if (!data || !data.process) return;

                const appName = data.process.name;
                const appId = data.process.pm_id;
                const event = data.event;

                // Watch for restart, exit, or error events
                if (event === 'restart' || event === 'exit' || event === 'error') {
                    handleAppCrash(appName, appId);
                }
            });

            // Listen for uncaught exceptions
            bus.on('process:exception', (data) => {
                if (!data || !data.process) return;
                handleAppCrash(data.process.name, data.process.pm_id);
            });
        });
    });
};

module.exports = {
    startCrashMonitor,
    sendCrashAlertEmail
};

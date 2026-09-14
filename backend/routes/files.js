const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// Helper: Normalize path and resolve default
const resolveSafePath = (targetPath) => {
    if (!targetPath || targetPath === '/' || targetPath === '.') {
        // If Linux/Unix use '/', if Windows use process.cwd() or root drive 'C:\\'
        return os.platform() === 'win32' ? path.parse(process.cwd()).root : '/';
    }
    return path.resolve(targetPath);
};

// Helper: Format permissions
const getPermissions = (mode) => {
    return '0' + (mode & parseInt('777', 8)).toString(8);
};

// 1. List files and directories in path
router.get('/list', async (req, res) => {
    const rawPath = req.query.path || '/';
    const currentPath = resolveSafePath(rawPath);

    try {
        if (!fs.existsSync(currentPath)) {
            return res.status(404).json({ message: 'Path not found' });
        }

        const stat = fs.statSync(currentPath);
        if (!stat.isDirectory()) {
            return res.status(400).json({ message: 'Path is not a directory' });
        }

        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        
        const items = [];
        for (const entry of entries) {
            const itemPath = path.join(currentPath, entry.name);
            let itemStat = null;
            let size = 0;
            let modified = null;
            let permissions = '';
            let isDirectory = false;
            let isFile = false;
            let isSymbolicLink = entry.isSymbolicLink();

            try {
                itemStat = fs.statSync(itemPath);
                size = itemStat.size;
                modified = itemStat.mtime;
                permissions = getPermissions(itemStat.mode);
                isDirectory = itemStat.isDirectory();
                isFile = itemStat.isFile();
            } catch (err) {
                // Inaccessible file/broken symlink
                isDirectory = entry.isDirectory();
                isFile = entry.isFile();
            }

            items.push({
                name: entry.name,
                path: itemPath,
                isDirectory,
                isFile,
                isSymbolicLink,
                size,
                modified,
                permissions,
                extension: isFile ? path.extname(entry.name).toLowerCase() : ''
            });
        }

        // Sort: Directories first, then alphabetical
        items.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

        const parentPath = path.dirname(currentPath);
        const isRoot = currentPath === parentPath || (os.platform() === 'win32' && currentPath === path.parse(currentPath).root);

        res.json({
            currentPath,
            parentPath: isRoot ? null : parentPath,
            isRoot,
            items,
            totalItems: items.length
        });
    } catch (err) {
        console.error('Error listing directory:', err);
        res.status(500).json({ message: 'Failed to list directory', error: err.message });
    }
});

// Cache for storage breakdown to prevent high CPU churn
const breakdownCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// 2. Disk Storage Breakdown for a directory
router.get('/storage-breakdown', async (req, res) => {
    const rawPath = req.query.path || '/';
    const currentPath = resolveSafePath(rawPath);

    // Check cache
    const cached = breakdownCache.get(currentPath);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return res.json(cached.data);
    }

    if (os.platform() !== 'win32') {
        // Linux / Unix fast breakdown using `nice` + `timeout` with virtual kernel filesystem excludes
        const escapedPath = `"${currentPath.replace(/"/g, '\\"')}"`;
        const excludes = `--exclude=/proc --exclude=/sys --exclude=/dev --exclude=/run --exclude=/var/lib/docker`;
        const cmd = `nice -n 19 timeout 6s du -sk ${excludes} ${escapedPath}/* ${escapedPath}/.[!.]* 2>/dev/null | sort -rn | head -n 30`;

        exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, async (error, stdout, stderr) => {
            const results = [];
            if (stdout) {
                const lines = stdout.trim().split('\n');
                for (const line of lines) {
                    const match = line.trim().match(/^(\d+)\s+(.+)$/);
                    if (match) {
                        const sizeKb = parseInt(match[1], 10);
                        const itemPath = match[2];
                        const name = path.basename(itemPath);
                        // Skip virtual/pseudo mount points
                        if (['proc', 'sys', 'dev', 'run'].includes(name) && currentPath === '/') {
                            continue;
                        }
                        let isDir = false;
                        try {
                            isDir = fs.statSync(itemPath).isDirectory();
                        } catch (e) {}

                        results.push({
                            name,
                            path: itemPath,
                            sizeBytes: sizeKb * 1024,
                            isDirectory: isDir
                        });
                    }
                }
            }

            // If empty or command timed out, fallback to instant shallow scan
            if (results.length === 0) {
                return fallbackBreakdown(currentPath, res);
            }

            const totalSize = results.reduce((acc, curr) => acc + curr.sizeBytes, 0);
            const responseData = {
                currentPath,
                totalAnalyzedBytes: totalSize,
                items: results.map(item => ({
                    ...item,
                    percent: totalSize > 0 ? ((item.sizeBytes / totalSize) * 100).toFixed(1) : '0.0'
                }))
            };

            // Save in cache
            breakdownCache.set(currentPath, { timestamp: Date.now(), data: responseData });
            return res.json(responseData);
        });
    } else {
        // Windows fallback
        return fallbackBreakdown(currentPath, res);
    }
});

async function fallbackBreakdown(currentPath, res) {
    try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        const items = [];

        for (const entry of entries) {
            const itemPath = path.join(currentPath, entry.name);
            let sizeBytes = 0;
            try {
                const stat = fs.statSync(itemPath);
                sizeBytes = stat.size;
            } catch (e) {}

            items.push({
                name: entry.name,
                path: itemPath,
                sizeBytes,
                isDirectory: entry.isDirectory()
            });
        }

        // Sort descending by size
        items.sort((a, b) => b.sizeBytes - a.sizeBytes);
        const topItems = items.slice(0, 30);
        const totalSize = topItems.reduce((acc, curr) => acc + curr.sizeBytes, 0);

        res.json({
            currentPath,
            totalAnalyzedBytes: totalSize,
            items: topItems.map(item => ({
                ...item,
                percent: totalSize > 0 ? ((item.sizeBytes / totalSize) * 100).toFixed(1) : '0.0'
            }))
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to analyze directory', error: err.message });
    }
}

// 3. Read file content for preview / edit
router.get('/content', async (req, res) => {
    const rawPath = req.query.path;
    if (!rawPath) {
        return res.status(400).json({ message: 'Path parameter required' });
    }

    const filePath = resolveSafePath(rawPath);
    try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            return res.status(400).json({ message: 'Path is a directory, not a file' });
        }

        // Limit file size for editor to 2 MB
        if (stat.size > 2 * 1024 * 1024) {
            return res.status(400).json({ 
                message: 'File too large to open in web editor (exceeds 2 MB). Please download it instead.',
                size: stat.size,
                tooLarge: true
            });
        }

        const buffer = await fs.promises.readFile(filePath);
        // Quick check for binary data
        let isBinary = false;
        for (let i = 0; i < Math.min(buffer.length, 512); i++) {
            if (buffer[i] === 0) {
                isBinary = true;
                break;
            }
        }

        if (isBinary) {
            return res.json({
                path: filePath,
                name: path.basename(filePath),
                isBinary: true,
                size: stat.size,
                message: 'Binary file cannot be displayed as text.'
            });
        }

        res.json({
            path: filePath,
            name: path.basename(filePath),
            isBinary: false,
            size: stat.size,
            content: buffer.toString('utf-8')
        });
    } catch (err) {
        console.error('Error reading file:', err);
        res.status(500).json({ message: 'Error reading file', error: err.message });
    }
});

// 4. Save file content
router.post('/save', async (req, res) => {
    const { path: rawPath, content } = req.body;
    if (!rawPath) {
        return res.status(400).json({ message: 'Path is required' });
    }

    const filePath = resolveSafePath(rawPath);
    try {
        await fs.promises.writeFile(filePath, content, 'utf-8');
        res.json({ success: true, message: 'File saved successfully' });
    } catch (err) {
        console.error('Error saving file:', err);
        res.status(500).json({ message: 'Failed to save file', error: err.message });
    }
});

// 5. Create new file or directory
router.post('/create', async (req, res) => {
    const { currentPath: rawParent, name, type } = req.body;
    if (!rawParent || !name) {
        return res.status(400).json({ message: 'Current path and name are required' });
    }

    // Sanitize name to prevent path traversal in name
    const sanitizedName = path.basename(name);
    const targetPath = path.join(resolveSafePath(rawParent), sanitizedName);

    try {
        if (fs.existsSync(targetPath)) {
            return res.status(400).json({ message: 'An item with that name already exists' });
        }

        if (type === 'folder') {
            await fs.promises.mkdir(targetPath, { recursive: true });
            res.json({ success: true, message: 'Folder created successfully', path: targetPath });
        } else {
            await fs.promises.writeFile(targetPath, '', 'utf-8');
            res.json({ success: true, message: 'File created successfully', path: targetPath });
        }
    } catch (err) {
        console.error('Error creating item:', err);
        res.status(500).json({ message: 'Failed to create item', error: err.message });
    }
});

// 6. Rename or move item
router.post('/rename', async (req, res) => {
    const { oldPath: rawOld, newName } = req.body;
    if (!rawOld || !newName) {
        return res.status(400).json({ message: 'Old path and new name are required' });
    }

    const oldPath = resolveSafePath(rawOld);
    const newPath = path.join(path.dirname(oldPath), path.basename(newName));

    try {
        if (!fs.existsSync(oldPath)) {
            return res.status(404).json({ message: 'Item not found' });
        }
        if (fs.existsSync(newPath)) {
            return res.status(400).json({ message: 'Target name already exists' });
        }

        await fs.promises.rename(oldPath, newPath);
        res.json({ success: true, message: 'Renamed successfully', newPath });
    } catch (err) {
        console.error('Error renaming item:', err);
        res.status(500).json({ message: 'Failed to rename item', error: err.message });
    }
});

// 7. Delete file or directory
router.delete('/delete', async (req, res) => {
    const rawPath = req.query.path || req.body.path;
    if (!rawPath) {
        return res.status(400).json({ message: 'Path is required' });
    }

    const targetPath = resolveSafePath(rawPath);

    // Guard against deleting root
    if (targetPath === '/' || targetPath === path.parse(targetPath).root) {
        return res.status(400).json({ message: 'Cannot delete root directory' });
    }

    try {
        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
            await fs.promises.rm(targetPath, { recursive: true, force: true });
        } else {
            await fs.promises.unlink(targetPath);
        }

        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting item:', err);
        res.status(500).json({ message: 'Failed to delete item', error: err.message });
    }
});

// 8. Download file
router.get('/download', (req, res) => {
    const rawPath = req.query.path;
    if (!rawPath) {
        return res.status(400).json({ message: 'Path parameter required' });
    }

    const filePath = resolveSafePath(rawPath);
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            return res.status(400).json({ message: 'Cannot download a folder directly' });
        }

        res.download(filePath, path.basename(filePath));
    } catch (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ message: 'Error downloading file', error: err.message });
    }
});

module.exports = router;

/**
 * Dev Server for Mario Kart Clone
 *
 * Provides:
 * - Static file serving on port 3000
 * - POST /log endpoint that writes to /logs folder
 *
 * Usage: node server.js (or run devmode.bat)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const LOGS_DIR = path.join(__dirname, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// MIME types for static file serving
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json'
};

// Handle log POST requests
function handleLogRequest(req, res) {
    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        try {
            const logData = JSON.parse(body);
            const { category, entries } = logData;

            // Validate category to prevent path traversal
            const validCategories = ['game', 'physics', 'network', 'error'];
            if (!validCategories.includes(category)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid category' }));
                return;
            }

            const logFile = path.join(LOGS_DIR, `${category}.log`);
            const logContent = entries.map(e => e.formatted).join('\n') + '\n';

            fs.appendFile(logFile, logContent, (err) => {
                if (err) {
                    console.error(`Failed to write to ${logFile}:`, err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to write log' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, count: entries.length }));
                }
            });
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
}

// Handle static file requests
function handleStaticRequest(req, res) {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

    // Security: prevent path traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

// Create HTTP server
const server = http.createServer((req, res) => {
    // CORS headers for dev
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/log') {
        handleLogRequest(req, res);
    } else if (req.method === 'GET') {
        handleStaticRequest(req, res);
    } else {
        res.writeHead(405);
        res.end('Method Not Allowed');
    }
});

server.listen(PORT, () => {
    console.log(`\n  Mario Kart Dev Server running at http://localhost:${PORT}`);
    console.log(`  Logs will be written to: ${LOGS_DIR}`);
    console.log(`\n  Press Ctrl+C to stop\n`);
});

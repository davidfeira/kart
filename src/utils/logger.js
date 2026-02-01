/**
 * Centralized Logger Module
 *
 * Provides structured logging with levels, timestamps, and module context.
 * Logs are stored in memory and can be exported/downloaded.
 *
 * Usage:
 *   import { Logger } from './src/utils/logger.js';
 *   const log = Logger.getLogger('Physics');
 *   log.info('Collision detected: kart_1 -> banana_3');
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

// Log categories matching the file structure from guidelines
const LOG_CATEGORIES = {
    GAME: 'game',
    PHYSICS: 'physics',
    NETWORK: 'network',
    ERROR: 'error'
};

// Module to category mapping
const MODULE_CATEGORY_MAP = {
    'Game': LOG_CATEGORIES.GAME,
    'Menu': LOG_CATEGORIES.GAME,
    'HUD': LOG_CATEGORIES.GAME,
    'Checkpoint': LOG_CATEGORIES.GAME,
    'Camera': LOG_CATEGORIES.GAME,
    'Input': LOG_CATEGORIES.GAME,
    'Physics': LOG_CATEGORIES.PHYSICS,
    'Kart': LOG_CATEGORIES.PHYSICS,
    'Track': LOG_CATEGORIES.PHYSICS,
    'Collision': LOG_CATEGORIES.PHYSICS,
    'Network': LOG_CATEGORIES.NETWORK,
    'Multiplayer': LOG_CATEGORIES.NETWORK
};

class LoggerCore {
    constructor() {
        this._logs = {
            [LOG_CATEGORIES.GAME]: [],
            [LOG_CATEGORIES.PHYSICS]: [],
            [LOG_CATEGORIES.NETWORK]: [],
            [LOG_CATEGORIES.ERROR]: []
        };
        this._minLevel = LOG_LEVELS.DEBUG;
        this._maxLogsPerCategory = 1000;
        this._batchBuffer = [];
        this._batchTimeout = null;
        this._batchDelay = 100; // ms
        this._enableConsole = true; // Set to false in production

        // Try to restore logs from localStorage
        this._restoreFromStorage();
    }

    /**
     * Set minimum log level (DEBUG, INFO, WARN, ERROR)
     */
    setMinLevel(level) {
        if (typeof level === 'string') {
            this._minLevel = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.DEBUG;
        } else {
            this._minLevel = level;
        }
    }

    /**
     * Enable/disable console output
     */
    setConsoleOutput(enabled) {
        this._enableConsole = enabled;
    }

    /**
     * Get a module-specific logger
     */
    getLogger(moduleName) {
        return {
            debug: (message, data) => this._log(LOG_LEVELS.DEBUG, moduleName, message, data),
            info: (message, data) => this._log(LOG_LEVELS.INFO, moduleName, message, data),
            warn: (message, data) => this._log(LOG_LEVELS.WARN, moduleName, message, data),
            error: (message, data) => this._log(LOG_LEVELS.ERROR, moduleName, message, data)
        };
    }

    /**
     * Internal log method
     */
    _log(level, moduleName, message, data) {
        if (level < this._minLevel) return;

        const timestamp = new Date().toISOString();
        const levelName = LOG_LEVEL_NAMES[level];

        // Format: [TIMESTAMP] [LEVEL] [MODULE] Message
        let formattedMessage = `[${timestamp}] [${levelName}] [${moduleName}] ${message}`;

        if (data !== undefined) {
            try {
                formattedMessage += ` ${JSON.stringify(data)}`;
            } catch (e) {
                formattedMessage += ` [Circular or non-serializable data]`;
            }
        }

        const logEntry = {
            timestamp,
            level: levelName,
            module: moduleName,
            message,
            data,
            formatted: formattedMessage
        };

        // Determine category
        const category = MODULE_CATEGORY_MAP[moduleName] || LOG_CATEGORIES.GAME;

        // Always log errors to error category as well
        if (level === LOG_LEVELS.ERROR && category !== LOG_CATEGORIES.ERROR) {
            this._addToCategory(LOG_CATEGORIES.ERROR, logEntry);
        }

        this._addToCategory(category, logEntry);

        // Console output (development)
        if (this._enableConsole) {
            this._consoleOutput(level, formattedMessage);
        }

        // Batch persist to storage
        this._schedulePersist();
    }

    /**
     * Add entry to category with size limit
     */
    _addToCategory(category, entry) {
        const logs = this._logs[category];
        logs.push(entry);

        // Trim if exceeding max
        if (logs.length > this._maxLogsPerCategory) {
            logs.splice(0, logs.length - this._maxLogsPerCategory);
        }
    }

    /**
     * Console output with appropriate method
     */
    _consoleOutput(level, message) {
        switch (level) {
            case LOG_LEVELS.DEBUG:
                console.debug(message);
                break;
            case LOG_LEVELS.INFO:
                console.info(message);
                break;
            case LOG_LEVELS.WARN:
                console.warn(message);
                break;
            case LOG_LEVELS.ERROR:
                console.error(message);
                break;
        }
    }

    /**
     * Schedule batched persist to localStorage
     */
    _schedulePersist() {
        if (this._batchTimeout) return;

        this._batchTimeout = setTimeout(() => {
            this._persistToStorage();
            this._batchTimeout = null;
        }, this._batchDelay);
    }

    /**
     * Persist logs to localStorage
     */
    _persistToStorage() {
        try {
            const data = {
                timestamp: new Date().toISOString(),
                logs: this._logs
            };
            localStorage.setItem('mariokart_logs', JSON.stringify(data));
        } catch (e) {
            // localStorage might be full or disabled
            console.warn('Failed to persist logs to localStorage:', e.message);
        }
    }

    /**
     * Restore logs from localStorage
     */
    _restoreFromStorage() {
        try {
            const stored = localStorage.getItem('mariokart_logs');
            if (stored) {
                const data = JSON.parse(stored);
                // Only restore if less than 1 hour old
                const storedTime = new Date(data.timestamp).getTime();
                const now = Date.now();
                if (now - storedTime < 3600000) {
                    this._logs = data.logs;
                }
            }
        } catch (e) {
            // Ignore restore errors
        }
    }

    /**
     * Get logs for a specific category
     */
    getLogs(category) {
        return this._logs[category] || [];
    }

    /**
     * Get all logs combined and sorted by timestamp
     */
    getAllLogs() {
        const all = [];
        for (const category of Object.values(LOG_CATEGORIES)) {
            all.push(...this._logs[category]);
        }
        return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    /**
     * Export logs as formatted text (for download)
     */
    exportLogs(category = null) {
        const logs = category ? this.getLogs(category) : this.getAllLogs();
        return logs.map(entry => entry.formatted).join('\n');
    }

    /**
     * Download logs as a file
     */
    downloadLogs(category = null) {
        const content = this.exportLogs(category);
        const filename = category ? `${category}.log` : 'game_all.log';

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        for (const category of Object.values(LOG_CATEGORIES)) {
            this._logs[category] = [];
        }
        localStorage.removeItem('mariokart_logs');
    }

    /**
     * Get log statistics
     */
    getStats() {
        const stats = {};
        for (const [name, category] of Object.entries(LOG_CATEGORIES)) {
            stats[category] = this._logs[category].length;
        }
        return stats;
    }
}

// Singleton instance
const Logger = new LoggerCore();

// Convenience exports
export { Logger, LOG_LEVELS, LOG_CATEGORIES };

// Default export for simple import
export default Logger;

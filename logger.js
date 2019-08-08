"use strict";

const PID = process.pid;

const winston = require('winston');

require('winston-daily-rotate-file');
require('winston-circular-buffer');

const logDirectory = process.cwd() +  '/logs';
const filenamePrefix = (process.env.KOMODO_LOG_FILENAME || "log.");

// const processTitle = process.title;

const logger = winston.createLogger({
    // levels: winston.config.syslog.levels,
    transports: [
        /*
        new (winston.transports.Console)({
            timestamp: process.stdout.isTTY ? moment() : null,
            level: 'verbose',
        }),
        */

        new (winston.transports.Console) ({
            format: winston.format.combine(
                winston.format.metadata(),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
                winston.format.label({ label: `${process.title}[${PID}]`, message: false }),
                winston.format.printf((info) => `${process.stdout.isTTY ? info.timestamp : ''} ${info.label}: ${info.level}: ${info.message} ${info.metadata && Object.keys(info.metadata).length ? JSON.stringify(info.metadata) : ''}`.trim()),
           )
        }),

        new (winston.transports.DailyRotateFile) ({
            filename: `${filenamePrefix}%DATE%`,
            dirname: logDirectory,
            datePattern: 'YYYY-MM-DD',
            
            format: winston.format.combine(
                winston.format.metadata(),
                winston.format.label({ label: `${process.title}[${PID}]`, message: false }),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
                winston.format.json(),
            )
            
        }),

        /*
        new (winston.transports.CircularBuffer) ({
            name: 'logs',
            level: "verbose",
            json: true,
            size: 500
        }),
        */
    ]
});

logger.info('Logger initialized');
require('./logger-circular-buffer-web');

module.exports = logger;

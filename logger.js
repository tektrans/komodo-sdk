"use strict";

const fs = require('fs');
const strftime = require('strftime');
const winston = require('winston');

require('winston-daily-rotate-file');
require('winston-circular-buffer');

const config = require('./config');

var loggerTimestamp = function() {
    return strftime('%F %T', new Date());
}

let logger;

const logDirectory = process.cwd() +  '/logs';
const filenamePrefix = logDirectory + "/log";

fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

logger = new winston.Logger({
    transports: [
        new (winston.transports.Console)({
            timestamp: function() {
                    return strftime('%F %T', new Date());
            },
            level: 'verbose',
        }),

        new (winston.transports.DailyRotateFile) ({
            name: 'log-file-txt',
            filename: filenamePrefix,
            timestamp: loggerTimestamp,
            formatter: function(options) {
                return options.timestamp()
                    +' ' + options.level.toUpperCase()
                    +' ' + (undefined !== options.message ? options.message : '')
                    + (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' );
            },
            level: 'debug',
        }),

        new (winston.transports.CircularBuffer) ({
            name: 'logs',
            level: "verbose",
            json: true,
            size: 500
        })
    ]
});

logger.verbose(__filename + ': initialized');

module.exports = logger;

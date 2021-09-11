/**
 * Logger for komodo environment. It just an alias for tektrans-logger.
 * This is a deprecated module.
 * Please use tektrans-logger directly
 *
 * @deprecated 2021-09-12 please use tektrans-logger directly
 */

/**
 * tektrans-logger
 */
const logger = require('tektrans-logger');
const getStackTrace = require('stack-trace').get;

logger.warn('KOMODO-SDK.LOGGER 7784B11E: This module is deprecated, please use TEKTRANS-LOGGER directly.', {
    trace: getStackTrace()
        .map((item) => [
            item.getFileName(),
            item.getLineNumber
        ].join(':')),
});

// require('./logger-circular-buffer-web');

module.exports = logger;

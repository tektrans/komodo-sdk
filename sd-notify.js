/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */

const MODULE_NAME = 'KOMODO-SDK.SD-NOTIFY';

const logger = require('tektrans-logger');
const matrix = require('./matrix');

module.exports = () => {
    try {
        const notify = require('sd-notify');

        notify.ready();
        matrix.systemd_notified = new Date();

        logger.info(`${MODULE_NAME} 701F8400: Systemd ready notification has been sent`);
    } catch (e) {
        logger.warn(`${MODULE_NAME} A6C99938: Optional dependency not found: sd-notify`);
    }
};

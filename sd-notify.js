/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */

const MODULE_NAME = 'KOMODO-SDK.SD-NOTIFY';

const logger = require('tektrans-logger');
const matrix = require('./matrix');

const notifyUseSdNotify = () => {
    try {
        const sdNotify = require('sd-notify');

        sdNotify.ready();
        matrix.systemd_notified = new Date();

        logger.info(`${MODULE_NAME} 701F8400: Systemd ready notification has been sent using sd-notify module`);
    } catch (e) {
        logger.warn(`${MODULE_NAME} A6C99938: Optional dependency not found: sd-notify`);
    }
};

/**
 *
 * @param {string} statusMsg
 * @returns
 */
module.exports = async (statusMsg) => {
    const { ppid } = process;

    if (ppid !== 1) {
        logger.verbose(`${MODULE_NAME} 74A5B2AF: No need to notify systemd`, { ppid });
        return;
    }

    try {
        const notify = require('systemd-notify');

        const status = statusMsg || 'Ready to go';

        logger.verbose(`${MODULE_NAME} 3B8DF3BC: Trying to notify systemd using systemd-notify package`, { status });

        await notify({
            ready: true,
            status,
        });
    } catch (e) {
        logger.verbose(`${MODULE_NAME} 488B3245: Trying to notify sd-notify package`);
        notifyUseSdNotify();
    }
};

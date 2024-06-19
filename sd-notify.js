/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */

const MODULE_NAME = 'KOMODO-SDK.SD-NOTIFY';

const util = require('util');
const logger = require('tektrans-logger');
const matrix = require('./matrix');

const exec = util.promisify(require('node:child_process').exec);

const notifyUseSystemdNotify = async (statusMsg) => {
    try {
        const notify = require('systemd-notify');

        const status = statusMsg || 'Ready to go';

        logger.verbose(`${MODULE_NAME} 3B8DF3BC: Trying to notify systemd using systemd-notify package`, { status });

        await notify({
            ready: true,
            status,
            pid: process.pid,
        });

        logger.info(`${MODULE_NAME} B905A857: Systemd ready notification has been sent using systemd-notify package`);

        return true;
    } catch (e) {
        logger.verbose(`${MODULE_NAME} 488B3245: Failed to notify using systemd-notify package`, {
            why: e.message || e.toString(),
        });

        return false;
    }
};

const notifyUseSdNotify = () => {
    try {
        const sdNotify = require('sd-notify');

        logger.verbose(`${MODULE_NAME} A200BF49: Trying to notify systemd using sd-notify package`);

        sdNotify.ready();
        matrix.systemd_notified = new Date();

        logger.info(`${MODULE_NAME} 701F8400: Systemd ready notification has been sent using sd-notify package`);

        return true;
    } catch (e) {
        logger.warn(`${MODULE_NAME} A6C99938: Optional dependency not found: sd-notify`);
        return false;
    }
};

const notifyUseBin = async () => {
    try {
        logger.verbose(`${MODULE_NAME} FFBCF4E3: Trying to notify systemd using systemd-notify bin`);
        await exec('systemd-notify --ready');
        logger.info(`${MODULE_NAME} B58921FF: Systemd ready notification has been sent using systemd-notify bin`);

        return true;
    } catch (e) {
        logger.verbose(`${MODULE_NAME} 75237B65: Failed to notify using systemd-notify bin`, {
            eCode: e.code,
            eMessage: e.message || e.toString(),
        });

        return false;
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

    const successOnUsingSystemdNotify = await notifyUseSystemdNotify(statusMsg);
    if (successOnUsingSystemdNotify) {
        return;
    }

    const successOnUsingBin = await notifyUseBin();
    if (successOnUsingBin) {
        return;
    }

    notifyUseSdNotify();
};

/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */

const MODULE_NAME = 'KOMODO-SDK.SD-NOTIFY';

const childProcess = require('child_process');
const which = require('which');
const logger = require('tektrans-logger');
const matrix = require('./matrix');

const hasSystemdNotifyBin = async () => {
    const result = await which('systemd-notify', { nothrow: true });
    return result;
};

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

    const successOnUseSystemdNotify = await notifyUseSystemdNotify(statusMsg);
    if (successOnUseSystemdNotify) {
        return;
    }

    const useExec = await hasSystemdNotifyBin();
    if (useExec) {
        logger.verbose(`${MODULE_NAME} FFBCF4E3: Trying to notify systemd using systemd-notify bin`);
        childProcess.exec('systemd-notify --ready');
        return;
    }

    logger.verbose(`${MODULE_NAME} 9ADD3807: systemd-notify binary not found, fallback to sd-notify package`);

    notifyUseSdNotify();
};

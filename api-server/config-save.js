const MODULE_NAME = 'KOMODO-SDK.API-SERVER.CONFIG-SAVE';

const fs = require('fs');
const logger = require('tektrans-logger');
const moment = require('moment');
const config = require('../config');
const matrix = require('../matrix');

if (!fs.existsSync('config-backup')) fs.mkdirSync('config-backup');

const backup = async (xid) => {
    try {
        const backupFilename = `config-backup/config_${moment().format('YYYYMMDD_HHmmss.SS')}.json`;
        await fs.promises.copyFile('config.json', backupFilename);
        logger.verbose(`${MODULE_NAME} 88213811: Backup saved`, {
            xid,
            backupFilename,
        });

        return backupFilename;
    } catch (e) {
        const newE = new Error(`${MODULE_NAME} 0257A553: Exception on backup`);
        newE.code = 'E_BACKUP_CONFIG';

        logger.warn(newE.message, {
            xid,
            eCode: e.code,
            eMessage: e.message || e,
        });

        throw newE;
    }
};

module.exports = async (xid) => {
    try {
        if (!matrix.config_is_dirty) {
            logger.verbose(`${MODULE_NAME} 4B263CB4: No need to save because config is not dirty`, { xid });
            return;
        }

        const backupFilename = await backup(xid);

        await fs.promises.writeFile(
            'config.json',
            `${JSON.stringify(config, null, 2)}\n`,
            { mode: 0o640 },
        );

        matrix.config_is_dirty = false;

        logger.verbose(`${MODULE_NAME} DE655EEF: Config saved`, { xid, backupFilename });
    } catch (e) {
        const newE = new Error(`${MODULE_NAME} CD9C1BE1: Exception on saving config file`);
        newE.code = 'E_SAVE_CONFIG';

        logger.warn(newE.message, {
            xid,
            eCode: e.code,
            eMessage: e.message || e,
        });

        throw newE;
    }
};

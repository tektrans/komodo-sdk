const fs = require('fs');

const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');
const uuidv1 = require('uuid/v1');

const logger = require('tektrans-logger');
const config = require('../../config');
const configReload = require('../../config-reload');

const misc = require('./misc');

const router = express.Router();

function pageJsonEditor(req, res) {
    res.render(
        `${req.app.locals.cp_views_dir}/config.jsoneditor.html`,
        {
            page_title: 'Edit Konfigurasi',
            jsoneditor_mode: req.query.mode || 'form',
        },
    );
}

function pageData(req, res) {
    res.json(config);
}

function pageDataSubmit(req, res) {
    const backupDir = 'config-backup/';
    const backupFile = `${backupDir}config.backup_${moment().format('YYYYMMDD_HHmmss')}_${uuidv1()}.json`;

    if (!req || !req.body || typeof req.body !== 'object') {
        logger.warn('Invalid new config');
        res.end('Failed, data is not object');
        return;
    }

    if (Object.getOwnPropertyNames(req.body).length <= 0) {
        logger.warn('New config is empty, ignoring');
        res.end('Failed, data is empty');
        return;
    }

    fs.mkdir(backupDir, () => {
        fs.writeFile(backupFile, JSON.stringify(config, null, 4), () => {
            fs.writeFile('config.json', JSON.stringify(req.body, null, 4), (errWriteNewConfig) => {
                if (errWriteNewConfig) {
                    res.end(`Update failed: ${errWriteNewConfig}`);
                    return;
                }

                configReload.replace(req.body);
                res.end('Konfigurasi berhasil diupdate. Beberapa item mungkin perlu restart terlebih dahulu sebelum efektif berlaku.');
            });
        });
    });
}

router.use(misc.needAuthUser);

router.get('/', pageJsonEditor);
router.get('/data', pageData);
router.post('/data', bodyParser.json(), pageDataSubmit);

module.exports = router;

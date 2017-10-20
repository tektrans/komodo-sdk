"use strict";

const module_name = 'CONTROL_PANEL_' + require('path').basename(__filename);

const os = require('os');
const fs = require('fs');

const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');
const uuidv1 = require('uuid/v1');

const config = require('komodo-sdk/config');
const logger = require('komodo-sdk/logger');
const configReload = require('komodo-sdk/config-reload');

const misc = require('./misc');

const router = express.Router();

function pageJsonEditor(req, res, next) {
    res.render(
        req.app.locals.cp_views_dir + '/config.jsoneditor.html',
        {
            page_title: 'Edit Konfigurasi',
            jsoneditor_mode: req.query.mode || "form"
        }
    )
}

function pageData(req, res, next) {
    res.json(config);
}

function pageDataSubmit(req, res, next) {
    const backupDir = 'config-backup/';
    const backupFile = backupDir + 'config.backup_' + moment().format('YYYYMMDD_HHmmss') + '_' + uuidv1() + '.json';

    if (!req || !req.body || typeof req.body !== 'object') {
        logger.warn('Invalid new config');
        return res.end('Failed, data is not object');
    }

    if (Object.getOwnPropertyNames(req.body).length <= 0) {
        logger.warn('New config is empty, ignoring');
        return res.end('Failed, data is empty');
    }

    fs.mkdir(backupDir, function(errMkdir) {
        fs.writeFile(backupFile, JSON.stringify(config, null, 4), function(errBackup) {
            fs.writeFile("config.json", JSON.stringify(req.body, null, 4), function(errWriteNewConfig) {

                if (errWriteNewConfig) {
                    return res.end('Update failed: ' + err);
                }

                configReload.replace(req.body);
                res.end('Konfigurasi berhasil diupdate. Beberapa item mungkin perlu restart terlebih dahulu sebelum efektif berlaku.');

            })
        })
    })
}

router.use(misc.needAuthUser);

router.get('/', pageJsonEditor);
router.get('/data', pageData);
router.post('/data', bodyParser.json(), pageDataSubmit);

module.exports = router;

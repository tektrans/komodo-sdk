const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const jsonQuery = require('json-query');
const dot = require('dot-object');
const copyFile = require('fs-copy-file');
const moment = require('moment');

const config = require('../config');
const matrix = require('../matrix');

const router = express.Router();
module.exports = router;

if (!fs.existsSync('config-backup')) fs.mkdirSync('config-backup');

function getJsonConfig(req, res) {
    res.json(config);
}

function getConfigElement(req, res) {
    const key = ((req && req.params && req.params.key) ? req.params.key : '').replace(/^config\.*/, '').trim();
    res.json(jsonQuery(key, { data: config }).value);
}

function setConfigElement(req, res) {
    if (!req.body || !req.body.key || !req.body.value) {
        res.end('INVALID BODY');
        return;
    }

    dot.str(req.body.key, req.body.value, config);
    matrix.config_is_dirty = true;

    res.json({
        method: '/config/set',
        key: req.body.key,
        value: req.body.value,
        new_config: config,
    });
}

function delConfigElement(req, res) {
    const key = ((req && req.params && req.params.key) ? req.params.key : '').replace(/^config\.*/, '').trim();

    if (!key) {
        res.end('INVALID OBJECT KEY');
    }

    dot.str(key, config);
    matrix.config_is_dirty = true;

    res.json({
        method: '/config/del',
        key: req.body.key,
        new_config: config,
    });
}

function saveConfig(req, res) {
    copyFile('config.json', `config-backup/config_${moment().format('YYYYMMDD_HHmmss.SS')}.json`, (err) => {
        if (err) {
            res.json({
                method: '/config/save',
                error: err.toString(),
            });
            return;
        }

        fs.writeFile('config.json', JSON.stringify(config, null, 2), (errWriteFile) => {
            if (errWriteFile) {
                res.json({
                    method: '/config/save',
                    error: errWriteFile.toString(),
                });

                return;
            }

            matrix.config_is_dirty = false;

            res.json({
                method: '/config/save',
                error: null,
            });
        });
    });
}

function isDirty(req, res) {
    res.json({
        method: '/config/is-dirty',
        error: null,
        dirty: matrix.config_is_dirty || false,
    });
}

router.get('/', getJsonConfig);
router.post('/', getJsonConfig);

router.get('/get', getConfigElement);
router.get('/get/:key', getConfigElement);

router.post('/set/:key', bodyParser.json(), setConfigElement);

router.get('/del/:key', delConfigElement);
router.get('/save', saveConfig);

router.get('/is-dirty', isDirty);

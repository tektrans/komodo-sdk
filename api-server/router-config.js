const MODULE_NAME = 'KOMODO-SDK.API-SERVER.ROUTER-CONFIG';

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const jsonQuery = require('json-query');
const dot = require('dot-object');
const logger = require('tektrans-logger');

const config = require('../config');
const matrix = require('../matrix');
const configSave = require('./config-save');

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

async function saveConfig(req, res) {
    const { xid } = res.locals;
    try {
        await configSave(xid);

        res.json({
            method: '/config/save',
            error: null,
        });
    } catch (e) {
        logger.warn(`${MODULE_NAME} 22E7FCA2: Exception on saving`, {
            xid,
            eCode: e.code,
            eMessage: e.message || e,
        });

        res.json({
            method: '/config/save',
            error: [
                e.code || 'UNKNOWN',
                e.message || 'ERROR',
            ].join(' - '),
        });
    }
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

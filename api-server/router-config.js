"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const jsonQuery = require('json-query');
const dot = require('dot-object');

const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');

const router = express.Router();
module.exports = router;

function getJsonConfig(req, res, next) {
    res.json(config);
}

function getConfigElement(req, res, next) {
    const key = ((req && req.params && req.params.key) ? req.params.key : '').replace(/^config\.*/, '').trim();
    res.json(jsonQuery(key, {data: config}).value);
}

function setConfigElement(req, res, next) {
    if (!req.body || !req.body.key || !req.body.value) {
        res.end('INVALID BODY');
        return;
    }

    dot.str(req.body.key, req.body.value, config);
    res.json({
        method: '/config/set',
        key: req.body.key,
        value: req.body.value,
        new_config: config
    });
}

function delConfigElement(req, res, next) {
    const key = ((req && req.params && req.params.key) ? req.params.key : '').replace(/^config\.*/, '').trim();

    if (!key) {
        res.end('INVALID OBJECT KEY')
    }

    dot.str(key, config);
    res.json({
        method: '/config/del',
        key: req.body.key,
        new_config: config
    });
}

function saveConfig(req, res, next) {
    res.end('NOT YET IMPLEMENTED');
}

router.get('/', getJsonConfig);
router.post('/', getJsonConfig);

router.get('/get', getConfigElement);
router.get('/get/:key', getConfigElement);

router.post('/set/:key', bodyParser.json(), setConfigElement);

router.get('/del/:key', delConfigElement);
router.get('/save', saveConfig);

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
    const key = ((req && req.params && req.params.key) ? req.params.key : '').replace(/^config\.*/, '');
    res.json(jsonQuery(key, {data: config}).value);
}

function setConfigElement(req, res, next) {
    if (!req.params || !req.params.key) {
        res.end('INVALID OBJECT KEY');
        return;
    }

    if (!req.body) {
        res.end('INVALID BODY');
        return;
    }

    res.end('TYPE: ' + typeof req.body);
    return;

    const key = ((req && req.params && req.params.key) ? req.params.key : '').replace(/^config\.*/, '');
    dot.str(key, req.body, config);

    res.json(config);
}

router.get('/', getJsonConfig);
router.post('/', getJsonConfig);

router.get('/get', getConfigElement);
router.get('/get/:key', getConfigElement);

router.post('/set/:key', bodyParser.json(), setConfigElement);

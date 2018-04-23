"use strict";

const express = require('express');
const jsonQuery = require('json-query');

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
    console.log('KEY: ' + key);
    res.json(jsonQuery(key, {data: config})).value;
}

router.get('/', getJsonConfig);
router.post('/', getJsonConfig);

router.get('/get', getConfigElement);
router.get('/get/:key', getConfigElement);

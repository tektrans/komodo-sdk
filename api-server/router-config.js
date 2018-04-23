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
    if (!req || !req.params || !req.params.key) {
        res.json(config);
        return;
    }

    res.json(jsonQuery(rq.params.key, {config: config}));
}

router.get('/', getJsonConfig);
router.post('/', getJsonConfig);
router.use('/get/:key', getConfigElement);

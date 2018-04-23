"use strict";

const express = require('express');

const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');

const router = express.Router();
module.exports = router;

function getJsonConfig(req, res, next) {
    res.json(config);
}

function getConfigElement(req, res, next) {
    const paths = req.path.split('.');
    res.json(paths);
}

router.get('/', getJsonConfig);
router.post('/', getJsonConfig);
router.use('/get', getConfigElement);

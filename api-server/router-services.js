"use strict";

const express = require('express');

const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');

const router = express.Router();
module.exports = router;

function isPause(req, res, next) {
    res.json({
        method: '/services/is-pause',
        error: null,
        result: Boolean(matrix.paused)
    });
}

function pause(req, res, next) {
    matrix.paused = true;
    res.json({
        method: '/services/pause',
        error: null,
        result: Boolean(matrix.paused)
    });
}

function resume(req, res, next) {
    matrix.paused = false;
    res.json({
        method: '/services/resume',
        error: null,
        result: Boolean(matrix.paused)
    });
}

function terminate(req, res, next) {
    res.json({
        method: '/services/terminate',
        error: null,
        message: 'Going to restart in ' + delay + 'ms'
    })
}


router.get('/is-pause', isPause);
router.get('/pause', pause);
router.get('/resume', resume);
router.get('/terminate', terminate);

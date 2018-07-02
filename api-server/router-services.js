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
        result: Boolean(matrix.pause)
    });
}

function pause(req, res, next) {
    matrix.pause = true;
    res.json({
        method: '/services/pause',
        error: null,
        result: Boolean(matrix.pause)
    });
}

function resume(req, res, next) {
    matrix.pause = false;
    res.json({
        method: '/services/resume',
        error: null,
        result: Boolean(matrix.pause)
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

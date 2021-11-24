const MODULE_NAME = 'API-SERVER.ROUTER-SERVICES';

const express = require('express');
const logger = require('tektrans-logger');

const matrix = require('../matrix');

const router = express.Router();
module.exports = router;

function isPause(req, res) {
    res.json({
        method: '/services/is-pause',
        error: null,
        result: Boolean(matrix.paused)
    });
}

function pause(req, res) {
    matrix.paused = true;
    res.json({
        method: '/services/pause',
        error: null,
        result: Boolean(matrix.paused)
    });
}

function resume(req, res) {
    matrix.paused = false;
    res.json({
        method: '/services/resume',
        error: null,
        result: Boolean(matrix.paused)
    });
}

function terminate(req, res) {
    const { xid } = res.locals;
    const delay = 5000;

    res.json({
        method: '/services/terminate',
        error: null,
        message: `Going to restart in ${delay} ms`
    });

    logger.info(`${MODULE_NAME} 9E1EC746: Got a terminate request. Going to restart`, { xid, delay })

    setTimeout(() => {
        process.exit(0);
    }, delay);
}


router.get('/is-pause', isPause);
router.get('/pause', pause);
router.get('/resume', resume);
router.get('/terminate', terminate);

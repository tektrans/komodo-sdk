"use strict";

const express = require('express');
const bodyParser = require('body-parser');

const pull = require('./pull');
const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');

const resendDelay = require('./resend-delay');

const app = express();

function init() {
    if (!config || !config.push_server || !config.push_server.apikey || !config.push_server.cancel || !config.push_server.cancel.url || !config.push_server.cancel.port) {
        return;
    }

    app.listen(config.push_server.cancel.port, function () {
        logger.info('Cancel server listening', {port: config.push_server.cancel.port});
    });
}
init();

function isValidApikey(req, res, next) {
    if (config.push_server && config.push_server.apikey && (req.params.apikey === config.push_server.apikey)) {
        next();
    }
    else {
        res.end('INVALID_APIKEY');
    }
}

function cancelHandler(req, res, next) {

    if (!partner) {
        logger.warn('PUSH-CANCEL: Undefined partner, skipped');
        res.end('UNDEFINED_PARTNER');
        return;
    }

    let task = req.body;

    if (!task || !task.trx_id) {
        logger.warn('PUSH-CANCEL: Invalid task');
        res.end('INVALID_TASK');
        return;
    }

    logger.verbose('PUSH-CANCEL: Got cancel request', {trx_id: task.trx_id});

    resendDelay.cancel(task.trx_id);
}

app.use(bodyParser.json());
app.use('/apikey/:apikey', isValidApikey);
app.use('/apikey/:apikey/cancel', cancelHandler);

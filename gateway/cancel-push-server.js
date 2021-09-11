const express = require('express');
const logger = require('tektrans-logger');

const config = require('../config');

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

function cancelHandler(req, res) {
    let task = req.body;

    if (!task || !task.trx_id) {
        logger.warn('PUSH-CANCEL: Invalid task');
        res.end('INVALID_TASK');
        return;
    }

    logger.verbose('PUSH-CANCEL: Got cancel request', {trx_id: task.trx_id});

    resendDelay.cancel(task.trx_id);
}

app.use(express.json());
app.use('/apikey/:apikey', isValidApikey);
app.use('/apikey/:apikey/cancel', cancelHandler);
